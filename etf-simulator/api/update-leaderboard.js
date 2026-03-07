// Persists live leaderboard portfolio values to Supabase.
// REQUIRES: SUPABASE_SERVICE_ROLE_KEY in Vercel env vars (bypasses RLS to update any user's portfolio).
// Without it, updates will fail — portfolios reset to stale values on every page refresh.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://jhdlzoafhltjyzebougz.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoZGx6b2FmaGx0anl6ZWJvdWd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA5NjAzODIsImV4cCI6MjA1NjUzNjM4Mn0.VxLpb5MqPe8JEFBUX7VdJUNW-Bkt1RJa-_OVr5AN1fU";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { updates } = req.body || {};
  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ error: "No updates" });
  }

  if (!SERVICE_KEY) {
    console.warn("[LB-Persist] No SUPABASE_SERVICE_ROLE_KEY set — cannot persist");
    return res.status(200).json({ updated: 0, failed: updates.length, error: "no_service_key" });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  let updated = 0, failed = 0;

  for (const u of updates.slice(0, 20)) {
    if (!u.id) { failed++; continue; }
    try {
      const { data: row } = await supabase
        .from("portfolios")
        .select("portfolio_data")
        .eq("id", u.id)
        .single();

      const merged = {
        ...(row?.portfolio_data || {}),
        value: u.value,
        gain: u.gain,
        costBasis: u.costBasis,
        holdings: u.holdings,
        lastLiveUpdate: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("portfolios")
        .update({ value: u.value, holdings: u.holdings, portfolio_data: merged })
        .eq("id", u.id);

      if (error) { console.error("[LB-Persist]", u.id, error.message); failed++; }
      else { updated++; }
    } catch (e) {
      console.error("[LB-Persist]", u.id, e.message);
      failed++;
    }
  }

  return res.status(200).json({ updated, failed, total: updates.length });
}
