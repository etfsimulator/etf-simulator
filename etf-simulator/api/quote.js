// Vercel Serverless Finnhub Quote Proxy
// Keeps FINNHUB_API_KEY server-side — never exposed to browser.
// Batches all symbol quotes into one request/response.
//
// Setup:
//   1. Get FREE key at https://finnhub.io/register
//   2. Add FINNHUB_API_KEY to Vercel → Settings → Environment Variables
//   3. Deploy — client calls /api/quote?symbols=AAPL,MSFT,BINANCE:BTCUSDT
//
// Usage: GET /api/quote?symbols=AAPL,MSFT,BINANCE:BTCUSDT

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

  await Promise.all(symbols.map(async (sym) => {
    try {
      const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(sym)}&token=${apiKey}`;
      const r = await fetch(url);
      if (r.status === 429) { errors.push({ symbol: sym, message: "Finnhub rate limited" }); return; }
      if (!r.ok) { errors.push({ symbol: sym, status: r.status, message: `HTTP ${r.status}` }); return; }
      const q = await r.json();
      if (q && q.c > 0 && isFinite(q.c)) {
        const pc = (q.pc > 0 && isFinite(q.pc)) ? q.pc : q.c;
        quotes[sym] = { price: q.c, prevClose: pc, high: q.h || q.c, low: q.l || q.c, open: q.o || pc, timestamp: q.t || Math.floor(Date.now() / 1000) };
      } else {
        errors.push({ symbol: sym, message: "No price data (c=0)" });
      }
    } catch (e) {
      errors.push({ symbol: sym, message: e.message || "fetch failed" });
    }
  }));

  return res.status(200).json({ quotes, count: Object.keys(quotes).length, requested: symbols.length, errors: errors.length > 0 ? errors : undefined, ts: Date.now() });
}
