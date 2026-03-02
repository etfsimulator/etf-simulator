export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=10, stale-while-revalidate=20");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "FINNHUB_API_KEY not configured", keyMissing: true });
  const symbols = (req.query.symbols || "").split(",").map(s => s.trim()).filter(Boolean);
  if (symbols.length === 0) return res.status(400).json({ error: "No symbols" });
  const quotes = {};
  const errors = [];
  await Promise.all(symbols.slice(0, 30).map(async (sym) => {
    try {
      const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(sym)}&token=${apiKey}`);
      if (!r.ok) { errors.push({ symbol: sym, message: `HTTP ${r.status}` }); return; }
      const q = await r.json();
      if (q && q.c > 0) {
        const pc = (q.pc > 0) ? q.pc : q.c;
        quotes[sym] = { price: q.c, prevClose: pc, high: q.h || q.c, low: q.l || q.c, open: q.o || pc };
      } else { errors.push({ symbol: sym, message: "No data" }); }
    } catch (e) { errors.push({ symbol: sym, message: e.message }); }
  }));
  return res.status(200).json({ quotes, count: Object.keys(quotes).length, errors: errors.length > 0 ? errors : undefined });
}
