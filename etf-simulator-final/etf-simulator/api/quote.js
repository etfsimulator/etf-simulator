// Vercel Serverless Quote Proxy
// Primary: Finnhub (free tier, real-time for stocks/ETFs)
// Fallback: Yahoo Finance unofficial API (for tickers Finnhub misses)
//
// Setup:
//   1. Get FREE Finnhub key at https://finnhub.io/register
//   2. Add FINNHUB_API_KEY to Vercel → Settings → Environment Variables
//   3. Deploy — client calls /api/quote?symbols=AAPL,MSFT,BINANCE:BTCUSDT
//
// Usage: GET /api/quote?symbols=AAPL,MSFT,BTC

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "s-maxage=10, stale-while-revalidate=20");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    console.error("[api/quote] FINNHUB_API_KEY not set");
    return res.status(500).json({ error: "FINNHUB_API_KEY not configured. Add it in Vercel Settings → Environment Variables.", keyMissing: true });
  }

  const symbols = (req.query.symbols || "").split(",").map(s => s.trim()).filter(Boolean);
  if (symbols.length === 0) return res.status(400).json({ error: "No symbols. Use ?symbols=AAPL,MSFT" });
  if (symbols.length > 30) return res.status(400).json({ error: "Max 30 symbols per request" });

  const quotes = {};
  const errors = [];
  const needYahooFallback = [];

  // ── STEP 1: Finnhub primary ──
  await Promise.all(symbols.map(async (sym) => {
    try {
      const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(sym)}&token=${apiKey}`;
      const r = await fetch(url);
      if (r.status === 429) {
        errors.push({ symbol: sym, message: "Finnhub rate limited" });
        needYahooFallback.push(sym);
        return;
      }
      if (!r.ok) {
        errors.push({ symbol: sym, status: r.status, message: `HTTP ${r.status}` });
        needYahooFallback.push(sym);
        return;
      }
      const q = await r.json();
      if (q && q.c > 0 && isFinite(q.c)) {
        const pc = (q.pc > 0 && isFinite(q.pc)) ? q.pc : q.c;
        quotes[sym] = {
          price: q.c,
          prevClose: pc,
          high: q.h || q.c,
          low: q.l || q.c,
          open: q.o || pc,
          timestamp: q.t || Math.floor(Date.now() / 1000),
          source: "finnhub"
        };
      } else {
        // Finnhub returned c=0 — queue for Yahoo fallback
        needYahooFallback.push(sym);
      }
    } catch (e) {
      errors.push({ symbol: sym, message: e.message || "fetch failed" });
      needYahooFallback.push(sym);
    }
  }));

  // ── STEP 2: Yahoo Finance fallback for any symbol Finnhub missed ──
  // Uses Yahoo's unofficial chart API — no key required, real-time data
  if (needYahooFallback.length > 0) {
    await Promise.all(needYahooFallback.map(async (sym) => {
      // Skip crypto symbols in EXCHANGE:SYMBOL format (Binance etc.)
      if (sym.includes(":")) return;
      try {
        const yahooSym = encodeURIComponent(sym);
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSym}?interval=1d&range=2d&includePrePost=false`;
        const r = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; ETFSimulator/1.0)",
            "Accept": "application/json"
          }
        });
        if (!r.ok) return;
        const data = await r.json();
        const result = data?.chart?.result?.[0];
        if (!result) return;
        const meta = result.meta;
        const price = meta?.regularMarketPrice;
        const prevClose = meta?.previousClose || meta?.chartPreviousClose || price;
        if (price && price > 0 && isFinite(price)) {
          quotes[sym] = {
            price,
            prevClose: prevClose || price,
            high: meta?.regularMarketDayHigh || price,
            low: meta?.regularMarketDayLow || price,
            open: meta?.regularMarketOpen || prevClose || price,
            timestamp: meta?.regularMarketTime || Math.floor(Date.now() / 1000),
            source: "yahoo"
          };
          // Clear any prior error for this symbol
          const idx = errors.findIndex(e => e.symbol === sym);
          if (idx !== -1) errors.splice(idx, 1);
          console.log(`[api/quote] Yahoo fallback: ${sym} -> $${price}`);
        }
      } catch (e) {
        console.warn(`[api/quote] Yahoo fallback failed for ${sym}:`, e.message);
      }
    }));
  }

  // Final errors for symbols we still couldn't price
  for (const sym of needYahooFallback) {
    if (!quotes[sym] && !errors.find(e => e.symbol === sym)) {
      errors.push({ symbol: sym, message: "No price data (may be delisted or unsupported)" });
    }
  }

  return res.status(200).json({
    quotes,
    count: Object.keys(quotes).length,
    requested: symbols.length,
    errors: errors.length > 0 ? errors : undefined,
    ts: Date.now()
  });
}
