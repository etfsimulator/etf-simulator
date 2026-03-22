// ═══════════════════════════════════════════════════════════
// /api/weekly-digest.js — Weekly Leaderboard Email Digest
// Deploy to: /api/weekly-digest.js in your Vercel project
// 
// Trigger: Vercel Cron Job (add to vercel.json)
// Schedule: Every Monday at 9am ET
//
// Required env vars (already set in Vercel):
//   RESEND_API_KEY
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
// ═══════════════════════════════════════════════════════════

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // Allow manual trigger via POST with secret, or cron job GET
  if (req.method === "POST") {
    const { secret } = req.body || {};
    if (secret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  try {
    // ── 1. Fetch top 5 public portfolios ──
    const { data: topPortfolios } = await supabase
      .from("portfolios")
      .select("id, name, value, portfolio_data->gain, portfolio_data->creator, portfolio_data->holdings")
      .eq("is_public", true)
      .order("value", { ascending: false })
      .limit(5);

    // ── 2. Fetch all user emails from auth ──
    const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const emails = users
      .filter(u => u.email && u.email_confirmed_at)
      .map(u => u.email);

    if (!emails.length) {
      return res.status(200).json({ sent: 0, message: "No confirmed users" });
    }

    // ── 3. Build email HTML ──
    const fmtUSD = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
    const fmtPct = (n) => `${n >= 0 ? "+" : ""}${Number(n).toFixed(2)}%`;

    const topRows = (topPortfolios || []).map((p, i) => {
      const gain = p.gain ?? 0;
      const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
      const color = gain >= 0 ? "#22c55e" : "#ef4444";
      const holdings = Array.isArray(p.holdings) 
        ? p.holdings.slice(0, 4).map(h => `$${h.symbol}`).join(" · ")
        : "";
      return `
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 12px 16px; font-size: 18px;">${medals[i]}</td>
          <td style="padding: 12px 8px;">
            <div style="font-weight: 600; color: #f1f5f9; font-size: 13px;">${p.name || "Unnamed Fund"}</div>
            <div style="color: #64748b; font-size: 11px; margin-top: 2px;">@${p.creator || "anonymous"} · ${holdings}</div>
          </td>
          <td style="padding: 12px 16px; text-align: right; font-family: monospace; font-weight: 700; color: ${color}; white-space: nowrap;">${fmtPct(gain)}</td>
          <td style="padding: 12px 16px; text-align: right; font-family: monospace; color: #94a3b8; white-space: nowrap;">${fmtUSD(p.value || 1000000)}</td>
        </tr>`;
    }).join("");

    const totalAUM = (topPortfolios || []).reduce((s, p) => s + (p.value || 1000000), 0);
    const weekDate = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0; padding:0; background:#0a0f1e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 32px 16px;">
    
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="font-size: 28px; font-weight: 800; color: #f1f5f9; letter-spacing: -0.5px;">
        etf <span style="color: #6366f1;">simulator</span>
      </div>
      <div style="color: #64748b; font-size: 13px; margin-top: 6px;">Weekly Leaderboard Digest · ${weekDate}</div>
    </div>

    <!-- Top Portfolios -->
    <div style="background: #111827; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
      <div style="padding: 16px 20px; border-bottom: 1px solid #1e293b;">
        <div style="color: #6366f1; font-size: 11px; font-family: monospace; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px;">🏆 This Week's Top Performers</div>
        <div style="color: #94a3b8; font-size: 12px;">Ranked by total return since inception</div>
      </div>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 1px solid #1e293b;">
            <th style="padding: 8px 16px; text-align: left; color: #475569; font-size: 10px; font-family: monospace; text-transform: uppercase; font-weight: 600;">#</th>
            <th style="padding: 8px 8px; text-align: left; color: #475569; font-size: 10px; font-family: monospace; text-transform: uppercase; font-weight: 600;">Portfolio</th>
            <th style="padding: 8px 16px; text-align: right; color: #475569; font-size: 10px; font-family: monospace; text-transform: uppercase; font-weight: 600;">Return</th>
            <th style="padding: 8px 16px; text-align: right; color: #475569; font-size: 10px; font-family: monospace; text-transform: uppercase; font-weight: 600;">Value</th>
          </tr>
        </thead>
        <tbody>${topRows}</tbody>
      </table>
    </div>

    <!-- Platform stats -->
    <div style="display: grid; background: #111827; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <div style="color: #64748b; font-size: 11px; font-family: monospace; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">Platform Snapshot</div>
      <div style="display: flex; gap: 24px; flex-wrap: wrap;">
        <div>
          <div style="color: #6366f1; font-size: 22px; font-weight: 800; font-family: monospace;">${fmtUSD(totalAUM)}</div>
          <div style="color: #64748b; font-size: 11px; margin-top: 2px;">Simulated AUM (top 5)</div>
        </div>
        <div>
          <div style="color: #6366f1; font-size: 22px; font-weight: 800; font-family: monospace;">${emails.length}</div>
          <div style="color: #64748b; font-size: 11px; margin-top: 2px;">Investors</div>
        </div>
      </div>
    </div>

    <!-- CTA -->
    <div style="text-align: center; margin-bottom: 32px;">
      <a href="https://etfsimulator.com/#leaderboard" style="display: inline-block; background: #6366f1; color: #ffffff; text-decoration: none; padding: 13px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">View Full Leaderboard →</a>
      <div style="margin-top: 12px;">
        <a href="https://etfsimulator.com/#builder" style="color: #6366f1; font-size: 12px; text-decoration: none;">Build your own AI ETF →</a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; color: #334155; font-size: 11px; line-height: 1.6; border-top: 1px solid #1e293b; padding-top: 20px;">
      <p style="margin: 0 0 6px;">ETF Simulator · Educational platform only · Not financial advice</p>
      <p style="margin: 0;">You're receiving this because you created an account at etfsimulator.com</p>
    </div>

  </div>
</body>
</html>`;

    // ── 4. Send in batches of 50 (Resend rate limit) ──
    let sent = 0;
    const batchSize = 50;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      await Promise.all(batch.map(email =>
        resend.emails.send({
          from: "ETF Simulator <digest@etfsimulator.com>",
          to: email,
          subject: `📊 Weekly Leaderboard: Top fund is ${fmtPct((topPortfolios?.[0]?.gain) ?? 0)} · ${weekDate}`,
          html,
        }).catch(e => console.error(`Failed to send to ${email}:`, e.message))
      ));
      sent += batch.length;
      if (i + batchSize < emails.length) {
        await new Promise(r => setTimeout(r, 1000)); // 1s between batches
      }
    }

    console.log(`[Weekly Digest] ✓ Sent to ${sent} users`);
    return res.status(200).json({ success: true, sent, recipients: emails.length });

  } catch (err) {
    console.error("[Weekly Digest] Error:", err);
    return res.status(500).json({ error: err.message });
  }
}
