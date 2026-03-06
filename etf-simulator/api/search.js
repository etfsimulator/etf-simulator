// Vercel Serverless Finnhub Symbol Search Proxy
// Usage: GET /api/search?q=apple

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "FINNHUB_API_KEY not configured" });

  const q = req.query.q || "";
  if (!q.trim()) return res.status(400).json({ error: "No query. Use ?q=apple" });

  try {
    const r = await fetch(`https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}&token=${apiKey}`);
    const data = await r.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
