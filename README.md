# RSI Divergence Scanner — Server

Receives TradingView webhook alerts and serves them to your TradeLog journal.

## Quick deploy to Railway (free, 5 minutes)

1. Push this folder to a new GitHub repo
2. Go to railway.app → New Project → Deploy from GitHub → select repo
3. Add environment variables in Railway dashboard:
   - `WEBHOOK_SECRET` = your secret (generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
   - `PORT` = 3000
4. Railway gives you a URL like `https://rsi-scanner-production.up.railway.app`
5. Paste that URL into the RSI Scanner tab in your TradeLog journal

## TradingView setup

1. Open TradingView → Pine Script Editor → paste contents of `pine/divergence_alert.pine`
2. Change `webhookSec` input to match your `WEBHOOK_SECRET`
3. Add to chart, then create 4 alerts:
   - Bullish Divergence Confirmed → Webhook URL: `https://YOUR-DOMAIN/webhook`
   - Bearish Divergence Confirmed → same URL
   - Bullish Divergence Forming   → same URL
   - Bearish Divergence Forming   → same URL
4. Set alert message to: `{{strategy.order.alert_message}}`

Repeat for each pair and timeframe you want to scan (M15, M30, H1).

## API

- `POST /webhook`       — receive TradingView alert
- `GET  /api/alerts`    — get all alerts (polled by TradeLog every 30s)
- `DELETE /api/alerts/:id` — delete one alert
- `DELETE /api/alerts`  — clear all alerts

## Test locally

```bash
npm install
cp .env.example .env   # edit with your secret
npm run dev

# In another terminal:
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{"secret":"your_secret","pair":"EURUSD","tf":"H1","direction":"BULL","status":"CONFIRMED","price1":1.07823,"price2":1.07654,"rsi1":28.4,"rsi2":34.1,"note":"Test"}'
```
