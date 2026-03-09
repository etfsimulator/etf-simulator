# ETF Simulator

AI-powered ETF portfolio simulation platform built with React + Vite.

## Features
- **AI ETF Builder** — Grok AI CIO constructs 10-holding $1M portfolios with fund summary, macro analysis, factor exposure, risk analysis, income projection, ESG, exit triggers, and institutional-grade rationale
- **Full Market Research** — Loads EVERY US-listed stock + ETF from Finnhub (10,000+ symbols), plus top 50 crypto and 34 commodity ETFs. Real historical charts + live quotes on click.
- **Live Portfolio Tracking** — Real Finnhub quote-based tracking every 30s with simulated fallback
- **Smart Backtesting** — Asset-type-aware simulation (stocks ~10%/16% vol, crypto ~20%/60% vol, bonds ~4%/5% vol)
- **Auto-Rebalancing** — Drift detection and one-click rebalance to target weights
- **Portfolio Export** — Download full AI analysis as JSON report
- **Community Leaderboard** — Publish portfolios or keep them private
- **Hash Routing** — Bookmarkable URLs, browser back/forward support
- **Mobile Responsive** — Hamburger menu, responsive grids, 768px + 480px breakpoints
- **Theme Toggle** — Dark/light mode switch
- **Rate Limited** — Built-in Finnhub rate limiter (55 req/min)
- **API Proxy Ready** — Serverless proxy included for production key security
- **Legal Disclaimers** — Comprehensive disclaimers across every page

## Quick Start

```bash
npm install
cp .env.example .env.local
# Edit .env.local — add your keys
npm run dev
# Open http://localhost:5173
```

## API Keys

### xAI / Grok (Required — powers AI ETF Builder)
**Option A: Direct (development)**
1. Get a key at https://console.x.ai
2. Add to `.env.local`: `VITE_XAI_API_KEY=xai-...`

**Option B: Server proxy (production — recommended)**
1. Deploy to Vercel
2. Set `XAI_API_KEY` in Vercel Environment Variables
3. Add to `.env.local`: `VITE_API_PROXY_URL=/api/generate`
4. The included `api/generate.js` proxies calls with the key server-side

### Finnhub (Recommended — powers full market data)
1. Get a free key at https://finnhub.io/register (60 calls/min)
2. Add to `.env.local`: `VITE_FINNHUB_API_KEY=...`
3. **With key**: All US stocks/ETFs, real charts, live quotes, company profiles, news
4. **Without key**: 69 featured assets + crypto + commodities with simulated data

## Deploy on Vercel
1. Push to GitHub
2. vercel.com → New Project → Import repo
3. Add environment variables: `XAI_API_KEY`, `VITE_FINNHUB_API_KEY`
4. Add: `VITE_API_PROXY_URL=/api/generate`
5. Deploy — API key is never exposed to client

## Stack
- React 18 + Vite 5
- xAI Grok API (AI portfolio generation)
- Finnhub API (full US market data, live quotes, profiles, candles, news)
- Pure frontend SPA with optional serverless proxy
