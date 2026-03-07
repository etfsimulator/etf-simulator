// Serverless contact form handler — sends email via Resend API
// Requires RESEND_API_KEY environment variable in Vercel

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { name, email, subject, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ error: "Missing required fields: name, email, message" });
  }

  const RESEND_KEY = process.env.RESEND_API_KEY;

  // ── OPTION A: Resend API (preferred — free tier: 100 emails/day) ──
  if (RESEND_KEY) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_KEY}` },
        body: JSON.stringify({
          from: "ETF Simulator <support@etfsimulator.com>",
          to: "support@etfsimulator.com",
          reply_to: email,
          subject: `[ETF Simulator] ${subject || "Contact Form"} — from ${name}`,
          html: `
            <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #0f1118; padding: 20px 24px; border-radius: 8px 8px 0 0;">
                <h2 style="color: #22d3ee; margin: 0; font-size: 18px;">New Contact Form Submission</h2>
              </div>
              <div style="background: #1a1d2e; padding: 24px; border-radius: 0 0 8px 8px; color: #e2e8f0;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 8px 0; color: #94a3b8; width: 80px;">From:</td><td style="padding: 8px 0;"><strong>${name}</strong></td></tr>
                  <tr><td style="padding: 8px 0; color: #94a3b8;">Email:</td><td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #22d3ee;">${email}</a></td></tr>
                  <tr><td style="padding: 8px 0; color: #94a3b8;">Topic:</td><td style="padding: 8px 0;">${subject || "General"}</td></tr>
                </table>
                <hr style="border: none; border-top: 1px solid #2d3748; margin: 16px 0;" />
                <div style="white-space: pre-wrap; line-height: 1.6;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
                <hr style="border: none; border-top: 1px solid #2d3748; margin: 16px 0;" />
                <p style="color: #64748b; font-size: 12px; margin: 0;">Sent via etfsimulator.com contact form</p>
              </div>
            </div>
          `,
        }),
      });
      const data = await r.json();
      if (r.ok) {
        console.log("[Contact] ✓ Email sent via Resend:", data.id);
        return res.status(200).json({ success: true, provider: "resend" });
      } else {
        console.error("[Contact] ✗ Resend error:", data);
        return res.status(500).json({ error: "Email delivery failed", details: data.message || data });
      }
    } catch (e) {
      console.error("[Contact] ✗ Resend exception:", e.message);
      return res.status(500).json({ error: "Email service error", details: e.message });
    }
  }

  // ── OPTION B: No API key configured — log and acknowledge ──
  console.log("[Contact] ⚠ No RESEND_API_KEY set. Message received but not emailed:");
  console.log(`  From: ${name} <${email}>`);
  console.log(`  Subject: ${subject || "General"}`);
  console.log(`  Message: ${message.slice(0, 200)}`);
  return res.status(200).json({
    success: true,
    provider: "logged",
    note: "Message saved. Add RESEND_API_KEY to Vercel env vars to enable email delivery."
  });
}
