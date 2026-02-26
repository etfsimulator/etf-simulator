// Vercel Serverless API Proxy for xAI/Grok
// Keeps your API key server-side — never exposed to the browser.
//
// Setup:
//   1. Add XAI_API_KEY to your Vercel Environment Variables
//   2. Add VITE_API_PROXY_URL=/api/generate to your .env.local
//   3. Deploy — the client will call this proxy instead of xAI directly

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "XAI_API_KEY not configured on server" });

  try {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: "Proxy error: " + err.message });
  }
}
