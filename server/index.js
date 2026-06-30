const express = require('express');
const cors    = require('cors');
const crypto  = require('crypto');

const app  = express();
const PORT = process.env.PORT || 3000;
const SECRET = process.env.WEBHOOK_SECRET || '';

// In-memory store (survives restarts via JSON file on Railway's persistent disk if you add one)
let alerts = [];
let nextId  = 1;

// ── Middleware ─────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static('public'));   // serves dashboard HTML if you add one

// ── Health check ───────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status : 'ok',
    alerts : alerts.length,
    uptime : Math.floor(process.uptime()) + 's'
  });
});

// ── Receive TradingView webhook ────────────────
app.post('/webhook', (req, res) => {
  const body = req.body;

  // Validate secret
  if (SECRET && body.secret !== SECRET) {
    console.warn('[webhook] Invalid secret from', req.ip);
    return res.status(403).json({ error: 'Invalid secret' });
  }

  // Validate required fields
  const { pair, tf, direction, status } = body;
  if (!pair || !tf || !direction || !status) {
    return res.status(400).json({ error: 'Missing required fields: pair, tf, direction, status' });
  }

  // Divergence rules validation:
  // Bullish CONFIRMED: first RSI low must be below 30
  if (direction === 'BULL' && status === 'CONFIRMED') {
    if (body.rsi1 != null && Number(body.rsi1) >= 30) {
      console.warn(`[webhook] Bullish divergence rejected: RSI1 ${body.rsi1} not below 30`);
      return res.status(422).json({ error: 'Bullish: first RSI pivot must be below 30' });
    }
  }
  // Bearish CONFIRMED: first RSI high must be above 70
  if (direction === 'BEAR' && status === 'CONFIRMED') {
    if (body.rsi1 != null && Number(body.rsi1) <= 70) {
      console.warn(`[webhook] Bearish divergence rejected: RSI1 ${body.rsi1} not above 70`);
      return res.status(422).json({ error: 'Bearish: first RSI pivot must be above 70' });
    }
  }

  const alert = {
    id        : String(nextId++),
    pair      : pair.toUpperCase(),
    tf,
    direction : direction.toUpperCase(),
    status    : status.toUpperCase(),
    price1    : body.price1 != null ? Number(body.price1) : null,
    price2    : body.price2 != null ? Number(body.price2) : null,
    rsi1      : body.rsi1  != null ? Number(body.rsi1)  : null,
    rsi2      : body.rsi2  != null ? Number(body.rsi2)  : null,
    note      : body.note  || '',
    ts        : new Date().toISOString()
  };

  alerts.unshift(alert);

  // Keep last 500 alerts
  if (alerts.length > 500) alerts = alerts.slice(0, 500);

  console.log(`[webhook] ${alert.ts} | ${alert.direction} ${alert.status} | ${alert.pair} ${alert.tf} | RSI: ${alert.rsi1} → ${alert.rsi2}`);
  res.status(201).json({ ok: true, id: alert.id });
});

// ── Get all alerts ─────────────────────────────
app.get('/api/alerts', (req, res) => {
  res.json(alerts);
});

// ── Delete one alert ───────────────────────────
app.delete('/api/alerts/:id', (req, res) => {
  const before = alerts.length;
  alerts = alerts.filter(a => a.id !== req.params.id);
  res.json({ deleted: before - alerts.length });
});

// ── Clear all alerts ───────────────────────────
app.delete('/api/alerts', (req, res) => {
  const count = alerts.length;
  alerts = [];
  nextId = 1;
  res.json({ deleted: count });
});

// ── Start ──────────────────────────────────────
app.listen(PORT, () => {
  console.log(`RSI Divergence Scanner running on port ${PORT}`);
  if (!SECRET) console.warn('WARNING: WEBHOOK_SECRET not set — webhooks are unprotected!');
});
