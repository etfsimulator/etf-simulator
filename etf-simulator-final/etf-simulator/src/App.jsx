import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

/* ═══════════════════════════════════════════════════════════════════════
   ERROR BOUNDARY — catches React crashes, shows friendly fallback
   ═══════════════════════════════════════════════════════════════════════ */
import React from "react";
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("[ErrorBoundary] Caught:", error, info); }
  render() {
    if (this.state.hasError) {
      return React.createElement("div", { style: { background: "#0f1118", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Outfit', sans-serif" } },
        React.createElement("div", { style: { textAlign: "center", maxWidth: 480, padding: "40px 20px" } },
          React.createElement("div", { style: { fontSize: 48, marginBottom: 16 } }, "⚠️"),
          React.createElement("h1", { style: { color: "#f1f5f9", fontSize: 24, fontWeight: 700, margin: "0 0 12px" } }, "Something went wrong"),
          React.createElement("p", { style: { color: "#94a3b8", fontSize: 14, lineHeight: 1.6, margin: "0 0 24px" } },
            "We hit an unexpected error. Please refresh the page to try again. If this keeps happening, contact us at support@etfsimulator.com."),
          React.createElement("button", {
            onClick: () => { this.setState({ hasError: false, error: null }); window.location.hash = ""; window.location.reload(); },
            style: { background: "linear-gradient(135deg,#6366f1,#818cf8)", color: "#fff", border: "none", borderRadius: 8, padding: "12px 28px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }
          }, "Refresh Page")
        )
      );
    }
    return this.props.children;
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   CONSTANTS & DATA
   ═══════════════════════════════════════════════════════════════════════ */

const TICKER_SYMBOLS = [
  // Indexes — ETF proxy with multiplier to show real index value
  // Multipliers updated March 2026: SPY~$672→SP500~6932, DIA~$421→DJIA~50115, QQQ~$600→NDX~23031, IWM~$209→RUT~2670
  { symbol: "SPY", label: "S&P 500", mult: 10.31 },
  { symbol: "DIA", label: "DJIA", mult: 119.04 },
  { symbol: "QQQ", label: "NASDAQ", mult: 38.39 },
  { symbol: "IWM", label: "Russell 2000", mult: 12.77 },
  // Commodities — ETF proxy with multiplier to show real commodity price
  // GLD~$472→Gold~4979, SLV~$78→Silver~84, USO~$104→WTI~100
  { symbol: "GLD", label: "Gold", mult: 10.55 },
  { symbol: "USO", label: "Crude Oil", mult: 0.96 },
  { symbol: "SLV", label: "Silver", mult: 1.08 },
  // FX — ETF proxy, % change is accurate, value converted to pair rate
  { symbol: "FXE", label: "EUR/USD", fx: 1.085 },
  { symbol: "FXY", label: "USD/JPY", fx: 149.0 },
  { symbol: "FXB", label: "GBP/USD", fx: 1.265 },
  { symbol: "UUP", label: "DXY Index", mult: 4.0 },
];
// DEFAULT_INDICES: fallback values shown when Finnhub is unreachable.
// Last updated: March 2026. Keep in sync with TICKER_SYMBOLS multipliers.
const DEFAULT_INDICES = [
  { symbol: "S&P 500", value: 6932.00, change: 0.43 },
  { symbol: "DJIA", value: 50115.00, change: -0.25 },
  { symbol: "NASDAQ", value: 23031.00, change: 0.75 },
  { symbol: "Russell 2000", value: 2670.00, change: 0.55 },
  { symbol: "Gold", value: 4262.00, change: 0.64 },
  { symbol: "Crude Oil", value: 100.00, change: -1.29 },
  { symbol: "Silver", value: 84.00, change: 1.12 },
  { symbol: "EUR/USD", value: 1.085, change: 0.11 },
  { symbol: "USD/JPY", value: 149.0, change: -0.25 },
  { symbol: "GBP/USD", value: 1.265, change: 0.18 },
  { symbol: "DXY Index", value: 105.5, change: -0.14 },
];

/* Leaderboard is populated by user-published portfolios — starts empty */

const LEARN_ARTICLES = [
  { id: 1, title: "What Is an ETF and How Does It Work?", cat: "Basics", time: "5 min", body: "Exchange-Traded Funds pool investor money to buy a diversified basket of assets — stocks, bonds, commodities, or crypto — that trade on exchanges like a single stock. Unlike mutual funds, ETFs can be bought and sold throughout the trading day at market price. They typically have lower expense ratios than mutual funds, offer tax efficiency through the creation/redemption mechanism, and provide instant diversification. The first ETF, SPY, launched in 1993 tracking the S&P 500. Today there are over 3,000 ETFs in the US alone covering virtually every asset class and investment strategy imaginable." },
  { id: 2, title: "Understanding Expense Ratios", cat: "Costs", time: "4 min", body: "An expense ratio is the annual management fee expressed as a percentage of fund assets. It covers portfolio management, administration, marketing, and compliance costs. Vanguard's VOO charges just 0.03%, meaning you pay $3 per year for every $10,000 invested. Actively managed funds may charge 0.50–1.00%. Over 30 years on a $100,000 portfolio growing at 8% annually, a 0.03% fund would cost roughly $2,700 in total fees while a 0.75% fund would cost over $58,000 — a difference of $55,000 simply from fees." },
  { id: 3, title: "Diversification: Why It Matters", cat: "Strategy", time: "6 min", body: "Harry Markowitz called diversification the only free lunch in finance. By spreading investments across uncorrelated assets, you reduce portfolio volatility without proportionally reducing expected returns. A classic 60/40 stock/bond portfolio historically captured roughly 80% of equity returns with only 60% of the volatility. Modern diversification goes further: adding 5% gold, 3% crypto, 5% commodities, and 7% international equities can improve risk-adjusted returns. The key is correlation — assets that zig when others zag provide the most diversification benefit." },
  { id: 4, title: "Adding Crypto to a Traditional Portfolio", cat: "Alternative", time: "5 min", body: "Bitcoin and Ethereum have shown low long-term correlation with equities (0.15–0.30 historically). Academic research from Yale and Fidelity suggests a 1–5% portfolio allocation may improve risk-adjusted returns as measured by the Sharpe ratio. However, crypto is extremely volatile: Bitcoin has experienced 50%+ drawdowns multiple times. Position sizing matters — a 2% allocation that doubles adds just 2% to your portfolio, but a 20% allocation that halves costs you 10%. Start small and rebalance systematically." },
  { id: 5, title: "Commodities as Inflation Protection", cat: "Macro", time: "5 min", body: "Gold, silver, oil, and agricultural commodities tend to rise during inflationary periods when stocks and bonds struggle. During the 1970s stagflation, gold returned over 1,400% while the S&P 500 was roughly flat in real terms. Modern commodity exposure through ETFs like GLD (gold), SLV (silver), USO (oil), and DBC (broad commodities) makes access easy. A 5–10% commodity allocation can serve as portfolio insurance. Gold specifically has a near-zero long-term correlation with equities, making it an ideal diversifier." },
  { id: 6, title: "How to Read a Stock Chart", cat: "Technical", time: "8 min", body: "Price charts are the language of markets. Candlestick charts show open, high, low, and close for each period — green candles mean close > open (buyers won), red means close < open (sellers won). Moving averages smooth price action: the 50-day MA shows intermediate trend, the 200-day MA shows long-term trend. When the 50-day crosses above the 200-day, it is called a golden cross (bullish). Volume confirms conviction — a breakout on high volume is more reliable than one on low volume. Support levels mark where buyers concentrate; resistance marks where sellers appear." },
  { id: 7, title: "The Power of Compound Returns", cat: "Basics", time: "4 min", body: "Albert Einstein reportedly called compound interest the eighth wonder of the world. $10,000 invested at 10% annually becomes $25,937 in 10 years, $67,275 in 20 years, and $174,494 in 30 years — without adding a single dollar. This is why starting early matters more than investing large amounts later. A 25-year-old investing $200/month at 10% has $1.3M by 65, while a 35-year-old needs $530/month to reach the same amount. Time is the most powerful factor in wealth building." },
  { id: 8, title: "Risk-Adjusted Returns: Sharpe Ratio Explained", cat: "Strategy", time: "5 min", body: "Raw returns do not tell the full story. A fund returning 15% with wild swings may be worse than one returning 10% smoothly. The Sharpe Ratio measures return per unit of risk: (Portfolio Return - Risk-Free Rate) / Portfolio Standard Deviation. A Sharpe above 1.0 is good, above 2.0 is excellent. The S&P 500 historically has a Sharpe around 0.4–0.6. By diversifying across uncorrelated assets, ETF portfolios can potentially achieve higher Sharpe ratios than any single asset class alone." },
];

const PRICING_TIERS = [
  { name: "Free", price: "$0", period: "forever", active: true, features: ["AI-generated ETF portfolios (up to 20 holdings)", "25 AI generations/day", "$1M simulated starting capital", "Risk profile & time horizon controls", "Weekly AI rebalancing with rationale", "Live market data from Finnhub", "Community leaderboard", "Save up to 5 portfolios", "Social sharing (X, Facebook, LinkedIn)", "Educational content library"] },
  { name: "Pro", price: "—", period: "coming soon", soon: true, features: ["Everything in Free", "Unlimited AI generations", "Unlimited saved portfolios", "Export portfolio reports (PDF)", "Price alerts via email", "Advanced analytics & factor analysis", "Portfolio comparison tools", "Custom benchmarks", "Priority AI generation"] },
  { name: "Institutional", price: "—", period: "coming soon", soon: true, features: ["Everything in Pro", "API access & webhooks", "Team collaboration workspaces", "White-label PDF reports", "Bulk portfolio generation", "Copy trading & social features", "Dedicated support", "Brokerage integration (coming)"] },
];

const FUTURE_PRODUCTS = [
  { icon: "📊", title: "Portfolio Reports", desc: "Export institutional-grade portfolio reports with holdings, thesis, performance, and risk analysis — shareable and printable", eta: "Coming soon", status: "in-progress" },
  { icon: "📧", title: "Alerts & Notifications", desc: "Price alerts, rebalance reminders, and weekly portfolio digests delivered to your inbox", eta: "Coming soon", status: "in-progress" },
  { icon: "🤖", title: "AI Portfolio Advisor", desc: "Chat with AI about your holdings — ask why a stock is dropping, get swap suggestions, and understand macro impact", eta: "Coming soon", status: "planned" },
  { icon: "🏆", title: "Tournaments & Challenges", desc: "Weekly themed portfolio competitions with leaderboard rankings — prove your thesis against the community", eta: "2026", status: "planned" },
  { icon: "📱", title: "Mobile App", desc: "Native iOS and Android experience with push notifications", eta: "2026", status: "planned" },
  { icon: "🔌", title: "Go Live", desc: "Connect a real brokerage account and turn your simulated portfolio into real investments — one click", eta: "2027", status: "future" },
];

/* ═══════════════════════════════════════════════════════════════════════ */

const fmt = (v, d = 2) => new Intl.NumberFormat("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
const fmtUSD = (v) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
// Signed format: handles -0 correctly (avoids "+-0.00" bug)
const fmtSign = (v, d = 2) => { const n = Object.is(v, -0) ? 0 : (Math.abs(v) < Math.pow(10, -d) ? 0 : v); return (n >= 0 ? "+" : "") + fmt(n, d); };
// Smart price formatter: handles everything from BTC ($87,000) to PEPE ($0.000008)
const fmtPrice = (v) => {
  if (v == null || !isFinite(v)) return "—";
  const abs = Math.abs(v);
  if (abs >= 1) return "$" + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (abs >= 0.01) return "$" + v.toFixed(4);
  if (abs >= 0.0001) return "$" + v.toFixed(6);
  return "$" + v.toFixed(8);
};
const shareToX = (text) => {
  const url = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer,width=550,height=420");
};
const shareToFacebook = (text) => {
  const url = `https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(text)}&u=${encodeURIComponent("https://etfsimulator.com")}`;
  window.open(url, "_blank", "noopener,noreferrer,width=600,height=400");
};
const copyToClipboard = async (text) => {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
};
function sr(seed) { let x = Math.sin(seed) * 10000; return x - Math.floor(x); }
function genChart(days, base, seed) {
  const pts = []; let p = base;
  for (let i = 0; i <= days; i++) { p = Math.max(p + (sr(i * 7 + seed * 13 + 1) - 0.47) * base * 0.022, base * 0.4); pts.push({ day: i, price: Math.round(p * 100) / 100 }); }
  return pts;
}
function genBacktest(months, seed, holdings) {
  // Asset-type-aware Monte Carlo simulation based on actual holdings
  const profiles = {
    stock: { ret: 0.10, vol: 0.16 }, etf: { ret: 0.09, vol: 0.14 },
    crypto: { ret: 0.20, vol: 0.60 }, commodity: { ret: 0.05, vol: 0.20 },
    bond: { ret: 0.04, vol: 0.06 }, cash: { ret: 0.045, vol: 0.005 },
  };
  // Sector correlation factors (simplified)
  const sectorCorr = {};
  (holdings || []).forEach((h, i) => { sectorCorr[i] = (h.symbol?.charCodeAt(0) || 65) % 5; });

  const pts = []; let val = 1000000;
  const benchPts = []; let bench = 1000000; // S&P 500 benchmark
  let peak = val, maxDD = 0;
  const monthlyReturns = [];

  for (let i = 0; i <= months; i++) {
    if (i > 0) {
      // Market regime factor (shared across all holdings for correlation)
      const regime = (sr(i * 3 + seed * 2 + 7) - 0.5) * 0.8;
      let monthlyReturn = 0;
      if (holdings && holdings.length > 0) {
        holdings.forEach((h, hi) => {
          const p = profiles[h.type] || profiles.stock;
          const monthRet = p.ret / 12;
          const monthVol = p.vol / Math.sqrt(12);
          // Correlated noise: market regime + idiosyncratic
          const idio = (sr(i * 17 + seed * 7 + (h.symbol?.charCodeAt(0) || 0) + hi * 3 + 3) - 0.5) * 2;
          const noise = regime * 0.6 + idio * 0.4;
          const isShort = h.action === "SHORT";
          const holdRet = isShort ? -(monthRet + monthVol * noise) : (monthRet + monthVol * noise);
          monthlyReturn += ((h.weight || 10) / 100) * holdRet;
        });
        // Account for cash allocation reducing overall return
        const totalWeight = holdings.reduce((s, h) => s + (h.weight || 10), 0);
        if (totalWeight < 100) monthlyReturn += ((100 - totalWeight) / 100) * (0.045 / 12);
      } else {
        const noise = (sr(i * 11 + seed * 7 + 3) - 0.5) * 2;
        monthlyReturn = 0.08 / 12 + (0.12 / Math.sqrt(12)) * noise;
      }
      val *= (1 + monthlyReturn);
      monthlyReturns.push(monthlyReturn);

      // S&P 500 benchmark (10% avg, 16% vol)
      const benchNoise = regime * 0.7 + (sr(i * 19 + seed * 3 + 11) - 0.5) * 0.6;
      bench *= (1 + 0.10 / 12 + (0.16 / Math.sqrt(12)) * benchNoise);
    }
    // Track drawdown
    if (val > peak) peak = val;
    const dd = ((val - peak) / peak) * 100;
    if (dd < maxDD) maxDD = dd;

    const d = new Date(); d.setMonth(d.getMonth() - (months - i));
    pts.push({
      month: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      value: Math.round(val),
      benchmark: Math.round(bench),
      drawdown: Math.round(dd * 100) / 100,
    });
  }

  // Compute professional metrics
  const avgRet = monthlyReturns.length > 0 ? monthlyReturns.reduce((s, r) => s + r, 0) / monthlyReturns.length : 0;
  const stdDev = Math.sqrt(monthlyReturns.reduce((s, r) => s + Math.pow(r - avgRet, 2), 0) / (monthlyReturns.length || 1));
  const annRet = avgRet * 12;
  const annVol = stdDev * Math.sqrt(12);
  const rfRate = 0.045; // Risk-free rate
  const sharpe = annVol > 0 ? (annRet - rfRate) / annVol : 0;
  const downReturns = monthlyReturns.filter(r => r < 0);
  const downDev = Math.sqrt(downReturns.reduce((s, r) => s + r * r, 0) / (downReturns.length || 1));
  const sortino = downDev > 0 ? (annRet - rfRate) / (downDev * Math.sqrt(12)) : 0;
  const cagr = Math.pow(val / 1000000, 12 / months) - 1;
  const totalRet = (val / 1000000 - 1) * 100;
  const benchRet = (bench / 1000000 - 1) * 100;
  const alpha = totalRet - benchRet;
  const winMonths = monthlyReturns.filter(r => r > 0).length;
  const winRate = monthlyReturns.length > 0 ? (winMonths / monthlyReturns.length) * 100 : 0;
  const bestMonth = Math.max(...monthlyReturns, 0) * 100;
  const worstMonth = Math.min(...monthlyReturns, 0) * 100;
  const calmar = maxDD !== 0 ? (cagr * 100) / Math.abs(maxDD) : 0;

  // Attach metrics to the array
  pts.metrics = {
    totalReturn: totalRet, benchReturn: benchRet, alpha, cagr: cagr * 100,
    annualizedVol: annVol * 100, sharpe, sortino, calmar,
    maxDrawdown: maxDD, winRate, bestMonth, worstMonth,
    avgMonthly: avgRet * 100, monthCount: months,
  };
  return pts;
}

/* ═══ SUPABASE CLIENT ═══ */
const SUPABASE_URL = "https://jhdlzoafhltjyzebougz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoZGx6b2FmaGx0anl6ZWJvdWd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMzM4MTQsImV4cCI6MjA4NzgwOTgxNH0.KPwlyW5Fw5nohJgZbeHt61x3o47Np81YHOe-AHI-CmE";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Sanitize username — prevents Apple relay email hashes appearing as usernames
const sanitizeUsername = (raw) => {
  if (!raw) return "Anonymous";
  const cleaned = raw.replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 20);
  return cleaned.length >= 3 ? cleaned : "Anonymous";
};

/* ═══════════════════════════════════════════════════════════════════════
   LOGO SVG — matching uploaded 3D purple/cyan geometric cube
   ═══════════════════════════════════════════════════════════════════════ */

function Logo({ size = 32, showText = false }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
      <img
        src={"/logo.jpeg"}
        alt="ETF Simulator"
        style={{ width: size, height: size, borderRadius: size > 40 ? 8 : 4, objectFit: "contain" }}
      />
      {showText && (
        <span style={{ fontWeight: 800, fontSize: size * 0.5, letterSpacing: -0.5, fontStyle: "italic", lineHeight: 1 }}>
          <span style={{ color: C.text }}>etf </span>
          <span style={{ color: C.accentLight }}>simulator</span>
        </span>
      )}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   CHARTS
   ═══════════════════════════════════════════════════════════════════════ */

function SparkLine({ data, w = 100, h = 32, color }) {
  if (!data || data.length < 2) return null;
  const prices = data.map((d) => d.price != null ? d.price : d.value);
  const mn = Math.min(...prices), mx = Math.max(...prices), rng = mx - mn || 1;
  const c = color || (prices[prices.length - 1] >= prices[0] ? C.green : C.red);
  const pts = prices.map((p, i) => `${(i / (prices.length - 1)) * w},${h - 2 - ((p - mn) / rng) * (h - 4)}`).join(" ");
  return <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: "block" }}><polyline fill="none" stroke={c} strokeWidth="1.5" points={pts} /></svg>;
}

function BigChart({ data, w = 680, h = 280, field = "price" }) {
  if (!data || data.length < 2) return null;
  const vals = data.map((d) => d[field] != null ? d[field] : d.price);
  const mn = Math.min(...vals) * 0.98, mx = Math.max(...vals) * 1.02, rng = mx - mn || 1;
  const pad = { t: 16, r: 56, b: 32, l: 8 }, cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
  const up = vals[vals.length - 1] >= vals[0], clr = up ? C.green : C.red;
  const pts = vals.map((v, i) => `${pad.l + (i / (vals.length - 1)) * cw},${pad.t + ch - ((v - mn) / rng) * ch}`);
  const yTicks = Array.from({ length: 5 }, (_, i) => ({ v: mn + (rng * i) / 4, y: pad.t + ch - (i / 4) * ch }));
  const lp = pts[pts.length - 1].split(",").map(Number);
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={clr} stopOpacity=".12" /><stop offset="100%" stopColor={clr} stopOpacity="0" /></linearGradient></defs>
      {yTicks.map((t, i) => <g key={i}><line x1={pad.l} y1={t.y} x2={w - pad.r} y2={t.y} stroke={C.border} /><text x={w - pad.r + 5} y={t.y + 3} fill={C.dim} fontSize="9" fontFamily="monospace">${fmt(t.v, t.v > 999 ? 0 : 2)}</text></g>)}
      <polygon fill="url(#cg)" points={`${pad.l},${pad.t + ch} ${pts.join(" ")} ${lp[0]},${pad.t + ch}`} />
      <polyline fill="none" stroke={clr} strokeWidth="1.8" points={pts.join(" ")} /><circle cx={lp[0]} cy={lp[1]} r="3" fill={clr} />
    </svg>
  );
}

function BacktestChart({ data, w = 680, h = 260 }) {
  // Legacy wrapper — just calls ProChart
  return <ProChart data={data} w={w} h={h} />;
}

function ProChart({ data, w = 760, h = 340 }) {
  const [showBench, setShowBench] = useState(true);
  const [showMA, setShowMA] = useState(false);
  const [showDD, setShowDD] = useState(false);
  const [logScale, setLogScale] = useState(false);
  const [hover, setHover] = useState(null);
  const svgRef = useRef(null);

  if (!data || data.length < 2) return null;

  const hasBench = data[0].benchmark !== undefined;
  const vals = data.map(d => d.value);
  const benchVals = hasBench ? data.map(d => d.benchmark) : [];
  const ddVals = data.map(d => d.drawdown || 0);

  // Moving averages (3-month and 12-month)
  const ma3 = vals.map((_, i) => {
    if (i < 2) return null;
    return (vals[i] + vals[i - 1] + vals[i - 2]) / 3;
  });
  const ma12 = vals.map((_, i) => {
    if (i < 11) return null;
    let sum = 0; for (let j = 0; j < 12; j++) sum += vals[i - j];
    return sum / 12;
  });

  // Scale computation
  const allVals = [...vals, ...(showBench && hasBench ? benchVals : [])];
  const rawMn = Math.min(...allVals), rawMx = Math.max(...allVals);
  const mn = logScale ? Math.log(rawMn * 0.97) : rawMn * 0.97;
  const mx = logScale ? Math.log(rawMx * 1.03) : rawMx * 1.03;
  const rng = mx - mn || 1;
  const chartH = showDD ? h * 0.7 : h;
  const ddH = h * 0.25;
  const pad = { t: 20, r: 72, b: showDD ? 8 : 38, l: 10 };
  const cw = w - pad.l - pad.r, ch = chartH - pad.t - pad.b;

  const toY = (v) => {
    const sv = logScale ? Math.log(Math.max(v, 1)) : v;
    return pad.t + ch - ((sv - mn) / rng) * ch;
  };
  const toX = (i) => pad.l + (i / (data.length - 1)) * cw;

  const clr = vals[vals.length - 1] >= 1000000 ? C.green : C.red;
  const benchClr = C.accent;

  // Build polyline points
  const mkPts = (arr) => arr.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
  const mkFilteredPts = (arr) => arr.map((v, i) => v !== null ? `${toX(i)},${toY(v)}` : null).filter(Boolean).join(" ");

  const pts = mkPts(vals);
  const benchPts = hasBench ? mkPts(benchVals) : "";
  const ma3Pts = mkFilteredPts(ma3);
  const ma12Pts = mkFilteredPts(ma12);
  const lp = [toX(vals.length - 1), toY(vals[vals.length - 1])];

  // Y-axis ticks
  const yTicks = Array.from({ length: 6 }, (_, i) => {
    const frac = i / 5;
    const rawV = logScale ? Math.exp(mn + rng * frac) : mn + rng * frac;
    return { v: rawV, y: pad.t + ch - frac * ch };
  });

  // X-axis labels
  const step = Math.max(1, Math.floor(data.length / 8));
  const xLabels = data.filter((_, i) => i % step === 0 || i === data.length - 1);

  // Drawdown chart
  const ddMn = Math.min(...ddVals, -1);
  const ddRng = Math.abs(ddMn) || 1;
  const ddTop = chartH + 12;

  // Crosshair hover
  const onMouseMove = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / rect.width * w;
    const idx = Math.round(((mouseX - pad.l) / cw) * (data.length - 1));
    if (idx >= 0 && idx < data.length) setHover(idx);
  };

  const toggleStyle = (active) => ({
    background: active ? C.accentBg : "transparent",
    border: `1px solid ${active ? C.accentBorder : C.border}`,
    color: active ? C.accentLight : C.dim,
    padding: "3px 9px", borderRadius: 4, fontSize: 9.5, cursor: "pointer",
    fontFamily: mono, fontWeight: 600, letterSpacing: 0.3,
  });

  return (
    <div>
      {/* Chart Controls */}
      <div style={{ display: "flex", gap: 5, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ color: C.dim, fontSize: 9, fontFamily: mono, letterSpacing: 0.4 }}>OVERLAYS:</span>
        {hasBench && <button onClick={() => setShowBench(!showBench)} style={toggleStyle(showBench)}>S&P 500</button>}
        <button onClick={() => setShowMA(!showMA)} style={toggleStyle(showMA)}>MA 3/12</button>
        <button onClick={() => setShowDD(!showDD)} style={toggleStyle(showDD)}>DRAWDOWN</button>
        <button onClick={() => setLogScale(!logScale)} style={toggleStyle(logScale)}>LOG</button>
        <div style={{ flex: 1 }} />
        {hover !== null && data[hover] && (
          <div style={{ display: "flex", gap: 10, fontSize: 10, fontFamily: mono, alignItems: "center" }}>
            <span style={{ color: C.sub }}>{data[hover].month}</span>
            <span style={{ color: C.text, fontWeight: 700 }}>{fmtUSD(data[hover].value)}</span>
            {hasBench && showBench && <span style={{ color: benchClr }}>Bench: {fmtUSD(data[hover].benchmark)}</span>}
            {data[hover].drawdown < 0 && <span style={{ color: C.red }}>DD: {fmt(data[hover].drawdown, 1)}%</span>}
          </div>
        )}
      </div>

      <svg ref={svgRef} width="100%" viewBox={`0 0 ${w} ${showDD ? h + ddH + 20 : h}`} style={{ display: "block", cursor: "crosshair" }} onMouseMove={onMouseMove} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={clr} stopOpacity=".1" /><stop offset="100%" stopColor={clr} stopOpacity="0" /></linearGradient>
          <linearGradient id="dg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.red} stopOpacity="0" /><stop offset="100%" stopColor={C.red} stopOpacity=".15" /></linearGradient>
        </defs>

        {/* Grid lines */}
        {yTicks.map((t, i) => <g key={i}><line x1={pad.l} y1={t.y} x2={w - pad.r} y2={t.y} stroke={C.border} strokeOpacity="0.5" /><text x={w - pad.r + 5} y={t.y + 3} fill={C.dim} fontSize="8.5" fontFamily="monospace">${fmt(t.v, t.v > 999999 ? 0 : 0)}</text></g>)}

        {/* $1M baseline */}
        {(() => { const baseY = toY(1000000); return baseY > pad.t && baseY < pad.t + ch ? <><line x1={pad.l} y1={baseY} x2={w - pad.r} y2={baseY} stroke={C.sub} strokeDasharray="4,3" strokeOpacity="0.6" /><text x={w - pad.r + 5} y={baseY + 3} fill={C.sub} fontSize="8.5" fontFamily="monospace">$1M</text></> : null; })()}

        {/* X-axis labels */}
        {!showDD && xLabels.map((d, i) => { const xi = data.indexOf(d); return <text key={i} x={toX(xi)} y={h - 6} fill={C.dim} fontSize="8.5" fontFamily="monospace" textAnchor="middle">{d.month}</text>; })}

        {/* Benchmark line */}
        {showBench && hasBench && <polyline fill="none" stroke={benchClr} strokeWidth="1.2" strokeDasharray="3,2" points={benchPts} opacity="0.7" />}

        {/* Moving averages */}
        {showMA && ma3Pts && <polyline fill="none" stroke={C.gold} strokeWidth="1" points={ma3Pts} opacity="0.7" />}
        {showMA && ma12Pts && <polyline fill="none" stroke={C.teal} strokeWidth="1" points={ma12Pts} opacity="0.7" />}

        {/* Portfolio fill + line */}
        <polygon fill="url(#pg)" points={`${toX(0)},${pad.t + ch} ${pts} ${lp[0]},${pad.t + ch}`} />
        <polyline fill="none" stroke={clr} strokeWidth="2" points={pts} />
        <circle cx={lp[0]} cy={lp[1]} r="3.5" fill={clr} />

        {/* Crosshair */}
        {hover !== null && hover >= 0 && hover < data.length && (
          <>
            <line x1={toX(hover)} y1={pad.t} x2={toX(hover)} y2={pad.t + ch} stroke={C.sub} strokeWidth="0.7" strokeDasharray="2,2" />
            <circle cx={toX(hover)} cy={toY(data[hover].value)} r="4" fill={clr} stroke={C.bg} strokeWidth="1.5" />
            {showBench && hasBench && <circle cx={toX(hover)} cy={toY(data[hover].benchmark)} r="3" fill={benchClr} stroke={C.bg} strokeWidth="1" />}
          </>
        )}

        {/* Legend */}
        <g transform={`translate(${pad.l + 4}, ${pad.t + 4})`}>
          <rect x="0" y="0" width="10" height="3" fill={clr} rx="1" /><text x="14" y="3" fill={C.sub} fontSize="8" fontFamily="monospace">Portfolio</text>
          {showBench && hasBench && <><rect x="70" y="0" width="10" height="3" fill={benchClr} rx="1" /><text x="84" y="3" fill={C.sub} fontSize="8" fontFamily="monospace">S&P 500</text></>}
          {showMA && <><rect x="140" y="0" width="10" height="3" fill={C.gold} rx="1" /><text x="154" y="3" fill={C.sub} fontSize="8" fontFamily="monospace">3mo MA</text><rect x="200" y="0" width="10" height="3" fill={C.teal} rx="1" /><text x="214" y="3" fill={C.sub} fontSize="8" fontFamily="monospace">12mo MA</text></>}
        </g>

        {/* Drawdown sub-chart */}
        {showDD && (
          <g transform={`translate(0, ${ddTop})`}>
            <text x={pad.l} y={0} fill={C.dim} fontSize="8" fontFamily="monospace">DRAWDOWN %</text>
            <line x1={pad.l} y1={8} x2={w - pad.r} y2={8} stroke={C.border} />
            {/* Drawdown bars */}
            {ddVals.map((dd, i) => {
              const barH = (Math.abs(dd) / ddRng) * (ddH - 12);
              return <rect key={i} x={toX(i) - 1} y={8} width={Math.max(2, cw / data.length - 1)} height={barH} fill={C.red} opacity={Math.min(0.8, Math.abs(dd) / 10 + 0.1)} rx="0.5" />;
            })}
            {/* X labels in DD section */}
            {xLabels.map((d, i) => { const xi = data.indexOf(d); return <text key={i} x={toX(xi)} y={ddH + 2} fill={C.dim} fontSize="8" fontFamily="monospace" textAnchor="middle">{d.month}</text>; })}
          </g>
        )}
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   AI SYSTEM PROMPT
   ═══════════════════════════════════════════════════════════════════════ */

const AI_SYSTEM_PROMPT = `You are the Chief Investment Officer at a leading quantitative investment firm with $50B+ AUM. You have 25+ years of experience constructing and ACTIVELY MANAGING institutional-grade thematic ETFs. You manage these like a Goldman Sachs or E*Trade trading account — with real conviction, tactical moves, and the full toolkit: LONG, SHORT, and CASH positions.

You have deep expertise in: modern portfolio theory, factor investing, macroeconomic analysis, sector rotation, quantitative risk modeling, behavioral finance, derivatives overlays, tax-efficient fund structuring, short selling, and tactical cash management.

CRITICAL: You are an ACTIVE FUND MANAGER, not a passive allocator. On every review cycle you must:
1. Evaluate each position individually — provide specific BUY MORE / HOLD / TRIM / SELL / SHORT reasoning
2. React to catalysts: earnings, macro shifts, sector rotation, cultural events, media themes
3. Be willing to go to CASH if the market is dangerous — cash earns money market rate (4.5% APY)
4. Use SHORT positions when you see overvalued securities or downside catalysts
5. Find NEW opportunities — your job is alpha generation, not index hugging

THEMED & CULTURAL INVESTING:
The user may provide ANY thesis including pop culture, TV shows, movies, sports, memes, or trending topics.
Your job is to EXTRACT real investment opportunities from these themes:
- A Simpsons-themed ETF: analyze episodes for corporate references, sector commentary, cultural trends, then map to real tradeable securities. Springfield Nuclear = uranium plays (CCJ, URA). Krusty Burger = fast food (MCD, QSR). Mr. Burns = energy monopolies (XOM, NEE). Homer's job = industrial automation (ROK, ABB).
- A Taylor Swift ETF: companies benefiting from Eras Tour economics, streaming (SPOT), fashion (TPR), travel (LYV, DAL), stadiums (MSG).
- A Reddit/meme ETF: high-sentiment retail favorites with gamma squeeze potential.
For themed ETFs, explain HOW the theme connects to each investment pick. Be creative but financially rigorous.

RESPONSE FORMAT: Return ONLY valid JSON. No markdown, no backticks, no preamble.

{
  "name": "ETF Name (professional fund naming convention, 3-8 words)",
  "ticker": "4-letter ticker suggestion (creative, memorable, relevant to thesis)",
  "strategy": "3-4 sentence fund objective statement.",
  "riskProfile": "conservative | moderate | aggressive",
  "targetReturn": "X-Y% annualized",
  "targetVolatility": "X%",
  "sharpeTarget": "X.X",
  "sortinoTarget": "X.X",
  "maxDrawdown": "X%",
  "rebalanceFrequency": "weekly | monthly | quarterly | semi-annually | annually",
  "benchmark": "Primary benchmark index",
  "fee": 0.15,
  "cashPosition": {
    "amount": 0,
    "weight": 0,
    "rationale": "Why this much cash is held (or why fully invested). Cash earns 4.5% APY money market rate.",
    "moneyMarketRate": "4.5%"
  },
  "fundSummary": {
    "investmentThesis": "2-3 sentences: the core insight this fund captures.",
    "targetInvestor": "Who this fund is for.",
    "competitiveEdge": "What makes this ETF different. Name 2-3 competing ETFs.",
    "scalingPlan": "$1M seed projected milestones."
  },
  "macroAnalysis": {
    "regime": "Current macro regime and impact on thesis.",
    "interestRates": "Rate environment impact.",
    "inflation": "Inflation positioning.",
    "geopolitical": "Key geopolitical risks.",
    "sectorRotation": "Over/underweight sectors."
  },
  "assetAllocation": { "equities": "X%", "fixedIncome": "X%", "crypto": "X%", "commodities": "X%", "alternatives": "X%", "cash": "X%" },
  "factorExposure": { "momentum": "level", "value": "level", "growth": "level", "quality": "level", "lowVolatility": "level", "size": "level" },
  "holdings": [
    {
      "symbol": "TICKER",
      "name": "Full Security Name",
      "description": "One-line description of what this company/asset does.",
      "type": "stock | etf | crypto | commodity",
      "action": "BUY | HOLD | SHORT",
      "allocation": 150000,
      "weight": 15.0,
      "role": "Core | Satellite | Hedge | Growth Kicker | Income | Diversifier | Tactical | Short",
      "sector": "Sector",
      "marketCap": "Mega | Large | Mid | Small | N/A",
      "conviction": "high | medium | low",
      "thesisConnection": "1-2 sentences explaining EXACTLY how this holding connects to the user's investment thesis. Be creative but specific — what episode reference, cultural theme, or thesis element does this capture?",
      "rationale": "3-4 sentences with specific financial analysis: why this is a good investment right now, key catalysts, competitive positioning, and portfolio fit.",
      "financialMetrics": {
        "marketCapValue": "$X.XB or $X.XM",
        "ltmRevenue": "$X.XB or $X.XM",
        "ebitda": "$X.XM or N/A for pre-profit",
        "evRevenue": "X.Xx",
        "evEbitda": "X.Xx or N/A",
        "peRatio": "X.Xx or N/A",
        "revenueGrowth": "X.X% YoY",
        "dividendYield": "X.X% or 0%"
      },
      "exitTrigger": "Specific exit condition",
      "priceTarget": "$X (X% upside/downside from current)",
      "stopLoss": "$X (X% max loss)"
    }
  ],
  "riskAnalysis": {
    "correlationNote": "Diversification analysis.",
    "worstCase": "Max drawdown scenario.",
    "hedgingStrategy": "Defensive positioning.",
    "tailRisk": "Black swan scenario.",
    "liquidityRisk": "Liquidity assessment."
  },
  "incomeProjection": { "estimatedYield": "X.X% — MUST be accurately calculated as the weighted average dividend yield of all holdings. Sum each holding's (weight * dividendYield). For growth stocks with 0% yield, factor that in. Do NOT guess — calculate from the actual dividend yields in financialMetrics.", "annualIncome": "$X — must equal estimatedYield * $1,000,000", "growthVsIncome": "X/Y split (e.g., 90/10 growth means 90% capital appreciation focus)" },
  "weeklyOutlook": "2-3 sentences on what to watch: key events, earnings, macro data, catalysts.",
  "esgConsiderations": "ESG profile for the portfolio. For EACH major holding, note: (1) ESG rating if known (MSCI A-AAA scale), (2) carbon footprint — estimated Scope 1+2 emissions intensity (tons CO2e per $M revenue) or qualitative assessment (low/medium/high emitter), (3) notable ESG flags (controversies, positive initiatives, net-zero commitments). End with an overall portfolio ESG score assessment.",
  "rebalanceRules": "Calendar + drift-based rules."
}

PORTFOLIO CONSTRUCTION RULES:
1. Up to 10 holdings PLUS an optional cash position. On INITIAL build, allocations + cash MUST sum to exactly $1,000,000 (seed capital). NAV on day 1 is ALWAYS $1,000,000 — never show a loss on launch day. On REBALANCE, allocations + cash should sum to the CURRENT NAV (which may be above or below $1M based on performance).
2. "weight" = allocation / 10000 (percentage). Cash weight = cash amount / 10000.
3. "type" must be: "stock", "etf", "crypto", or "commodity".
4. "action" on initial build is always "BUY". On rebalance, use "BUY" (new), "HOLD" (keep), "SHORT" (bet against).
5. SHORT positions: allocation represents margin requirement. Profit when price drops.
6. CASH: When market conditions are dangerous, allocate to cash. Cash earns 4.5% APY. It is SMART to hold cash sometimes.
7. Include "conviction" level (high/medium/low) and "priceTarget" and "stopLoss" for each holding.
8. FINANCIAL METRICS ARE MANDATORY: Every holding MUST include "financialMetrics" with real, current data — marketCapValue, ltmRevenue, ebitda, evRevenue, evEbitda, peRatio, revenueGrowth, dividendYield. Use your training knowledge of actual company financials. For ETFs, use fund AUM as marketCap, expense ratio info in description.
9. INCOME PROJECTION MUST BE ACCURATE: Calculate the portfolio's weighted average dividend yield precisely from each holding's actual dividend yield. A portfolio of mostly growth stocks should show <1% yield. A dividend-focused portfolio should show 3-5%. Do NOT default to generic numbers.

REBALANCE/REVIEW FRAMEWORK:
- WEEKLY: Tactical. React to earnings, macro data, news. May swap 2-4 positions. Short-term catalysts matter.
- MONTHLY: Strategic + tactical. May swap 1-3 positions. Capture macro shifts.
- QUARTERLY: Institutional standard. Major thesis review. May swap 1-2 positions.
- SEMI-ANNUALLY / ANNUALLY: Strategic only. Full thesis reassessment.
On rebalance, for EACH holding provide updated action and reasoning. You may recommend going to cash.

RETURN TARGET FRAMEWORK:
- CONSERVATIVE: Target 5-7% annualized. Capital preservation with steady income. Should outperform savings accounts and CDs with minimal risk. Think pension fund allocation.
- MODERATE: Target 10-14% annualized. Aim to match or slightly beat the S&P 500. Balanced growth and stability. Think 401(k) target-date fund.
- AGGRESSIVE: Target 20-30% annualized. Swing for the fences — high-conviction, high-growth. Accept significant drawdowns for outsized returns. Think hedge fund or VC-style public market exposure.

ASSET ALLOCATION FRAMEWORK:
- CONSERVATIVE: 35-45% equities (blue-chip dividend aristocrats, defensive sectors like JNJ, KO, PG, VZ), 30-40% fixed income (use individual Treasury bonds or bond proxies — avoid bond ETFs), 10-20% commodities (GLD, SLV via commodity stocks like NEM, WPM, or physical commodity allocations), 0-3% crypto. Target Sharpe > 0.8, Sortino > 1.0, vol < 8%, max drawdown < 10%.
- MODERATE: 55-70% equities (mix of growth + value stocks), 10-20% fixed income (individual bonds or dividend stocks as proxies), 5-15% alternatives (commodity stocks, REITs like O, AMT, SPG), 5-10% crypto. Target Sharpe > 1.0, Sortino > 1.3, vol < 16%, max drawdown < 20%.
- AGGRESSIVE: 60-80% equities (growth, momentum, small-cap, emerging market stocks), 0-10% fixed income, 15-25% crypto, 5-15% commodities/alternatives. Target Sharpe > 0.7, Sortino > 0.9, accept vol up to 30%, max drawdown < 40%.

CREATIVITY & ORIGINALITY — CRITICAL:
You are NOT a generic robo-advisor. You are an elite fund manager with a Bloomberg terminal and deep market knowledge. Your picks should surprise and impress:
- DO NOT default to the "usual suspects" (AAPL, NVDA, MSFT, GOOGL, AMZN, META, TSLA) in every portfolio. Use them ONLY when directly relevant to the thesis.
- SEEK OUT hidden gems: mid-caps ($2-50B) that are best-in-class in their niche, emerging disruptors, overlooked sector leaders, international ADRs, specialty ETFs.
- For each thesis, find the 2-3 most SPECIFIC plays that directly capture the theme. A "food trends" ETF should hold companies like HIMS, ELF, CELH, BYND, TTCF, not just KO and PEP.
- Include at least 2-3 holdings that a retail investor would NOT find on their own — deep research picks that demonstrate institutional-level insight.
- Use the FULL universe: small/mid-cap stocks, international ADRs (BABA, TSM, ASML, SAP, SHOP, SE, MELI, NU, GRAB), sector-specific crypto (AAVE, UNI, SOL, LINK, FET, NEAR, INJ, TAO), and specialty commodity plays via individual stocks (uranium miners like CCJ, lithium stocks like ALB, copper plays like FCX, rare earth miners like MP).
- AVOID these tickers — they have pricing issues on our platform: RNDR, RENDER, IBIT, GBTC, ETHE, BITO, ARKB, FBTC, BITB (Bitcoin/crypto spot ETFs are not supported — use BTC, ETH, SOL directly as crypto holdings instead). Also avoid LUNA, UST, FTT (defunct tokens). Also avoid X (U.S. Steel — delisted from NYSE after acquisition by Nippon Steel).
- Think like a fund manager pitching to allocators: What is your EDGE? Why would someone pay 50bps for THIS fund vs buying VOO?

SECURITY SELECTION — USE ONLY REAL, CURRENTLY TRADEABLE TICKERS:
- Stocks: ANY US-listed equity from NYSE, NASDAQ, AMEX. Mega-caps to micro-caps. Prioritize companies with direct thesis alignment over generic large-caps.
- NO INDEX/BOND ETFs AS HOLDINGS: Do NOT include broad index ETFs (SPY, QQQ, VOO, VTI, IVV, BND, AGG, TLT, etc.) or thematic equity ETFs (ARKG, KWEB, XLK, etc.) as holdings.
- EXCEPTION — Commodity ETFs ARE allowed when they are the most direct route to a commodity thesis: GLD, IAU (gold), SLV (silver), USO, UCO (oil), UNG (natural gas), WEAT, CORN (agriculture), URA (uranium), LIT (lithium), CPER (copper), PPLT (platinum), PALL (palladium).
- Crypto: All major coins by market cap — BTC, ETH, SOL, XRP, ADA, AVAX, LINK, DOT, MATIC, DOGE, UNI, AAVE, FET, INJ, NEAR, SUI, APT, SEI, TIA, TON, TRX, TAO, etc.
- Memecoins: DOGE, SHIB, PEPE, WIF, FLOKI, BONK, MEME, BRETT, POPCAT, MEW, TURBO, BOME, SLERF, MOG, PONKE, etc.
- DeFi: AAVE, MKR, UNI, CRV, PENDLE, GMX, DYDX, JUP, LDO, RPL, etc.
- AI tokens: FET, TAO, OCEAN, GRT, AGIX, AR, WLD, AKT, etc.
- Commodities: Use commodity-linked STOCKS and miners — GDX, GDXJ, GLD, SLV, IAU, USO, UNG, WEAT, CORN, CPER, URA, LIT, COPX, PPLT, PALL, WOOD, REMX, or individual commodity stocks like NEM, WPM, FCX, CCJ, ALB, MP, SQM, etc. Prefer individual stocks over commodity ETFs where possible.

RISK MANAGEMENT:
- Max 20% single holding. At least one defensive/hedge position per portfolio.
- Diversify across: sectors (min 3), geographies, market caps, correlation clusters, and factor exposures.
- Core positions (high conviction, broad exposure): 12-20% each. Satellite (thematic bets): 5-12%. Hedge (defensive, uncorrelated): 3-8%. Tactical (short-term catalyst): 3-8%.
- Avoid correlated overweight (e.g., don't hold NVDA + SMH + SOXX simultaneously at high weights). Max 40% in any single sector.
- For crypto: limit to 5% conservative, 10-15% moderate, 20-25% aggressive.

RATIONALE QUALITY — INSTITUTIONAL STANDARD:
- Each holding MUST have "thesisConnection" (how it connects to the user's specific thesis) AND "rationale" (financial analysis).
- "description" must be a single line: what the company does. E.g., "World's largest uranium producer, supplying fuel for nuclear power plants globally."
- "financialMetrics" MUST use real, approximate current data. Key metrics: Market Cap (e.g., "$45.2B"), LTM Revenue (e.g., "$2.1B"), EBITDA (e.g., "$890M"), EV/Revenue (e.g., "8.2x"), EV/EBITDA (e.g., "18.5x"), P/E Ratio, Revenue Growth YoY, Dividend Yield.
- For crypto: marketCap = network value, ltmRevenue = protocol revenue or "N/A", ebitda = "N/A", evRevenue/evEbitda = "N/A".
- For commodity ETFs: marketCap = fund AUM, ltmRevenue = "N/A (commodity)", use expense ratio in description.
- "rationale" should cite specific catalysts, competitive dynamics, and portfolio fit — 3-4 punchy sentences a fund manager would say in an investment committee meeting.
- Reference current market conditions, sector dynamics, macro environment.
- Explain correlation benefit: how this holding's return profile complements the others.

MACRO ANALYSIS QUALITY:
- Reference current economic indicators: GDP growth, unemployment, CPI/PCE, Fed policy, yield curve shape.
- Identify where we are in the economic cycle and how this affects sector allocation.
- Note geopolitical risks and supply chain considerations.

Fee: 0.03-0.12 for passive/index, 0.15-0.35 for active/thematic, 0.40-0.75 for highly specialized/alternative.`;


/* ═══════════════════════════════════════════════════════════════════════
   THEME & STYLES
   ═══════════════════════════════════════════════════════════════════════ */

const DARK = {
  bg: "#0b0d14", surface: "#12141f", card: "rgba(22,25,38,0.85)", border: "rgba(255,255,255,0.06)",
  text: "#f0f2f8", sub: "#9399b2", dim: "#5c6080",
  green: "#22c55e", red: "#ef4444",
  accent: "#6366f1", accentLight: "#818cf8", accentBg: "rgba(99,102,241,.08)", accentBorder: "rgba(99,102,241,.2)",
  gold: "#eab308", goldBg: "rgba(234,179,8,.08)", teal: "#14b8a6", tealBg: "rgba(20,184,166,.08)", cyan: "#22d3ee",
};
const LIGHT = {
  bg: "#f5f6fa", surface: "#ffffff", card: "rgba(255,255,255,0.9)", border: "rgba(0,0,0,0.06)",
  text: "#1a1a2e", sub: "#5a5d72", dim: "#8b8fa3",
  green: "#16a34a", red: "#dc2626",
  accent: "#4f46e5", accentLight: "#6366f1", accentBg: "rgba(79,70,229,.06)", accentBorder: "rgba(79,70,229,.15)",
  gold: "#ca8a04", goldBg: "rgba(202,138,4,.06)", teal: "#0d9488", tealBg: "rgba(13,148,136,.06)", cyan: "#0891b2",
};
let C = { ...DARK };
function setTheme(dark) { Object.assign(C, dark ? DARK : LIGHT); }
const TC = { stock: "#6366f1", etf: "#14b8a6", crypto: "#eab308", commodity: "#a78bfa" };
const cardS = () => ({ background: C.card, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,.15)" });
const inputS = () => ({ background: C.surface, border: `1px solid ${C.border}`, color: C.text, padding: "10px 14px", borderRadius: 10, fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box", marginBottom: 12, fontFamily: "inherit", transition: "border-color .2s", boxShadow: "0 1px 4px rgba(0,0,0,.08)" });
const btnP = () => ({ background: `linear-gradient(135deg, ${C.accent}, #8b5cf6)`, color: "#fff", border: "none", padding: "10px 22px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 2px 8px rgba(99,102,241,.3)", transition: "transform .15s, box-shadow .15s" });
const btnO = () => ({ background: "transparent", color: C.sub, border: `1px solid ${C.border}`, padding: "10px 22px", borderRadius: 10, fontSize: 14, cursor: "pointer", fontFamily: "inherit", transition: "border-color .2s, color .2s" });
const secHd = () => ({ color: C.text, fontSize: 20, fontWeight: 700, marginBottom: 18, letterSpacing: -0.3 });
const mono = "'IBM Plex Mono', monospace";
const badge = (clr) => ({ fontSize: 9.5, padding: "2px 8px", borderRadius: 6, fontWeight: 700, color: clr, background: `${clr}10`, border: `1px solid ${clr}20`, textTransform: "uppercase", width: "fit-content", display: "inline-block" });

/* ═══════════════════════════════════════════════════════════════════════
   TICKER
   ═══════════════════════════════════════════════════════════════════════ */

function Ticker() {
  const [indices, setIndices] = useState(DEFAULT_INDICES);
  const indicesRef = useRef(DEFAULT_INDICES);
  useEffect(() => {
    let cancelled = false;
    const fetchTicker = async () => {
      // Use the shared quote cache to avoid burning Finnhub rate limits
      const pseudoHoldings = TICKER_SYMBOLS.map(t => ({ symbol: t.symbol, type: "etf" }));
      const quotes = await fetchRealQuotes(pseudoHoldings);
      if (cancelled) return;
      const live = TICKER_SYMBOLS.map(t => {
        const q = quotes[t.symbol];
        if (!q || !q.price || q.price <= 0 || !isFinite(q.price)) return null;
        const pc = (q.prevClose && q.prevClose > 0) ? q.prevClose : q.price;
        const pctChange = Math.round(((q.price - pc) / pc) * 10000) / 100;
        if (!isFinite(pctChange)) return null;
        if (t.fx) {
          const liveRate = +(t.fx * (1 + pctChange / 100)).toFixed(4);
          return isFinite(liveRate) ? { symbol: t.label, value: liveRate, change: pctChange } : null;
        }
        const realValue = t.mult ? +(q.price * t.mult).toFixed(2) : q.price;
        return isFinite(realValue) ? { symbol: t.label, value: realValue, change: pctChange } : null;
      }).filter(Boolean);
      if (live.length > 0) {
        const liveLabels = new Set(live.map(l => l.symbol));
        const merged = [...live, ...indicesRef.current.filter(d => !liveLabels.has(d.symbol))];
        indicesRef.current = merged;
        setIndices(merged);
      }
    };
    fetchTicker();
    const iv = setInterval(fetchTicker, 60000); // 60s — ticker bar is less critical than portfolio
    return () => { cancelled = true; clearInterval(iv); };
  }, []);
  const items = [...indices, ...indices];
  return (
    <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, overflow: "hidden", height: 34, display: "flex", alignItems: "center" }}>
      <div style={{ display: "inline-flex", animation: "ticker 50s linear infinite", whiteSpace: "nowrap" }}>
        {items.map((m, i) => {
          const val = isFinite(m.value) ? m.value : 0;
          const chg = isFinite(m.change) ? m.change : 0;
          return (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "0 18px", fontSize: 11.5, fontFamily: mono, borderRight: `1px solid ${C.border}`, height: 34 }}>
              <span style={{ color: C.sub, fontWeight: 600 }}>{m.symbol}</span>
              <span style={{ color: C.text }}>{val > 100 ? val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : val.toFixed(4)}</span>
              <span style={{ color: chg >= 0 ? C.green : C.red }}>{chg >= 0 ? "▲" : "▼"} {Math.abs(chg).toFixed(2)}%</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   AUTH MODAL
   ═══════════════════════════════════════════════════════════════════════ */

// Generate a unique 13-character username with letters, digits, and special characters
const generateRandomUsername = () => {
  const pool = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*_-+=";
  let result = "";
  // Ensure at least 1 uppercase, 1 lowercase, 1 digit, 1 special char
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const special = "!@#$%&*_-+=";
  result += upper[Math.floor(Math.random() * upper.length)];
  result += lower[Math.floor(Math.random() * lower.length)];
  result += digits[Math.floor(Math.random() * digits.length)];
  result += special[Math.floor(Math.random() * special.length)];
  for (let i = 4; i < 13; i++) result += pool[Math.floor(Math.random() * pool.length)];
  // Shuffle so guaranteed chars aren't always at the start
  return result.split("").sort(() => Math.random() - 0.5).join("");
};

// ══════ SHARE MENU — Multi-platform sharing ══════
function ShareMenu({ text, compact, label, style: customStyle }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    const ok = await copyToClipboard(text);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };
  if (compact) {
    return (
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", ...customStyle }}>
        <button onClick={(e) => { e.stopPropagation(); shareToX(text); }} style={{ background: "#000", color: "#fff", border: "none", borderRadius: 5, padding: "4px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 3 }}><span style={{ fontSize: 11 }}>𝕏</span></button>
        <button onClick={(e) => { e.stopPropagation(); shareToFacebook(text); }} style={{ background: "#1877F2", color: "#fff", border: "none", borderRadius: 5, padding: "4px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>f</button>
        <button onClick={(e) => { e.stopPropagation(); handleCopy(); }} style={{ background: C.surface, color: copied ? C.green : C.sub, border: `1px solid ${C.border}`, borderRadius: 5, padding: "4px 10px", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{copied ? "✓" : "📋"}</button>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", ...customStyle }}>
      <button onClick={() => shareToX(text)} style={{ background: "#000", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 14 }}>𝕏</span> Share to X</button>
      <button onClick={() => shareToFacebook(text)} style={{ background: "#1877F2", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>f Facebook</button>
      <button onClick={handleCopy} style={{ background: C.surface, color: copied ? C.green : C.sub, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 18px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>{copied ? "✓ Copied!" : "📋 Copy"}</button>
    </div>
  );
}

function AuthModal({ onClose, onAuth, initMode }) {
  const [mode, setMode] = useState(initMode || "signin"); // signin | signup | forgot | resetSent | resetPassword
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [pw2, setPw2] = useState(""); const [name, setName] = useState(""); const [username, setUsername] = useState(""); const [usernameOk, setUsernameOk] = useState(null); const [err, setErr] = useState(""); const [loading, setLoading] = useState(false);
  const switchMode = (m) => { setMode(m); setErr(""); setPw(""); setPw2(""); setUsernameOk(null); };
  // Check username uniqueness (debounced)
  const checkUsernameRef = useRef(null);
  const checkUsername = (val) => {
    const clean = val.replace(/[^a-zA-Z0-9!@#$%&*_\-+=]/g, "").slice(0, 20);
    setUsername(clean);
    setUsernameOk(null);
    if (clean.length < 3) { setUsernameOk(null); return; }
    clearTimeout(checkUsernameRef.current);
    checkUsernameRef.current = setTimeout(async () => {
      try {
        // Query by exact match (case-insensitive) — avoids fetching up to 500 rows
        const [profilesRes, portfoliosRes] = await Promise.all([
          supabase.from("profiles").select("name", { count: "exact", head: true }).ilike("name", clean),
          supabase.from("portfolios").select("id", { count: "exact", head: true }).eq("portfolio_data->>creator", clean.toLowerCase()),
        ]);
        const taken = (profilesRes.count || 0) + (portfoliosRes.count || 0) > 0;
        setUsernameOk(!taken);
      } catch { setUsernameOk(true); } // If check fails, allow it
    }, 400);
  };
  const submit = async () => {
    setErr("");
    // ── SET NEW PASSWORD (after clicking email reset link) ──
    if (mode === "resetPassword") {
      if (!pw || pw.length < 6) return setErr("Password must be at least 6 characters.");
      if (pw !== pw2) return setErr("Passwords do not match.");
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password: pw });
      setLoading(false);
      if (error) return setErr(error.message);
      // Show success, then close — USER_UPDATED event will clear recovery mode and load portfolios
      setMode("resetSuccess");
      return;
    }
    if (mode === "forgot") {
      if (!email || !email.includes("@") || !email.includes(".")) return setErr("Please enter a valid email address.");
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
      setLoading(false);
      if (error) return setErr(error.message);
      setMode("resetSent");
      return;
    }
    if (!email || !pw) return setErr("Please fill in all fields.");
    // Auto-generate username if not provided
    let finalUsername = username;
    if (mode === "signup" && !finalUsername) {
      finalUsername = generateRandomUsername();
      setUsername(finalUsername);
    }
    if (mode === "signup" && finalUsername.length < 3) {
      finalUsername = generateRandomUsername();
      setUsername(finalUsername);
    }
    if (mode === "signup" && usernameOk === false) return setErr("That username is already taken. Please choose another.");
    if (!email.includes("@") || !email.includes(".")) return setErr("Please enter a valid email address.");
    if (pw.length < 6) return setErr("Password must be at least 6 characters.");
    if (mode === "signup" && pw !== pw2) return setErr("Passwords do not match.");
    setLoading(true);
    if (mode === "signup") {
      console.log("[AuthModal] Attempting signup for:", email, "username:", finalUsername);
      const { data, error } = await supabase.auth.signUp({ email, password: pw, options: { data: { name: name || finalUsername, username: finalUsername } } });
      setLoading(false);
      if (error) { console.error("[AuthModal] Signup error:", error.message); return setErr(error.message); }
      console.log("[AuthModal] Signup response — user:", !!data.user, "session:", !!data.session);
      // Check if Supabase returned an active session (email confirmation disabled) or just a user (email confirmation enabled)
      if (data.session) {
        // Session exists — user is fully authenticated, can save immediately
        console.log("[AuthModal] ✓ Session created on signup. User is fully authenticated.");
        onAuth({ name: name || finalUsername, username: finalUsername, email, id: data.user.id });
      } else if (data.user && !data.session) {
        // User created but no session — email confirmation is likely enabled
        console.warn("[AuthModal] ⚠ User created but NO SESSION. Attempting auto-sign-in...");
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password: pw });
        console.log("[AuthModal] Auto-sign-in result — session:", !!signInData?.session, "error:", signInError?.message || "none");
        if (signInData?.session) {
          console.log("[AuthModal] ✓ Auto-sign-in succeeded.");
          onAuth({ name: name || finalUsername, username: finalUsername, email, id: signInData.user.id });
        } else {
          // Email confirmation IS required — inform user clearly
          console.error("[AuthModal] ✗ Auto-sign-in failed. Email confirmation is likely ON in Supabase.");
          console.error("[AuthModal] FIX: Go to Supabase Dashboard → Authentication → Providers → Email → Disable 'Confirm email'");
          return setErr("Account created! But email confirmation is required before you can sign in. Please check your email inbox (and spam folder) for a confirmation link from Supabase, click it, then come back and sign in.");
        }
      } else {
        console.error("[AuthModal] ✗ Unexpected: signUp returned neither user nor session", data);
        return setErr("Something went wrong during signup. Please try again.");
      }
    } else {
      console.log("[AuthModal] Attempting sign-in for:", email);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pw });
      setLoading(false);
      if (error) {
        console.error("[AuthModal] Sign-in error:", error.message);
        if (error.message?.includes("Email not confirmed")) return setErr("Please confirm your email first. Check your inbox (and spam folder) for the confirmation link from Supabase.");
        if (error.message?.includes("Invalid login")) return setErr("Invalid email or password. Please check your credentials and try again.");
        return setErr(error.message);
      }
      if (!data.session) {
        console.error("[AuthModal] ✗ Sign-in returned no session", data);
        return setErr("Sign-in succeeded but no session was created. Please try again.");
      }
      console.log("[AuthModal] ✓ Sign-in successful. Session created for:", data.user.email);
      const uname = sanitizeUsername(data.user?.user_metadata?.username || data.user?.user_metadata?.name || email.split("@")[0]);
      onAuth({ name: data.user?.user_metadata?.name || uname, username: uname, email, id: data.user.id });
    }
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }} onClick={() => { if (mode !== "resetPassword") onClose(); }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "32px 28px", width: 400, maxWidth: "92vw" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}><Logo size={40} /></div>

        {mode === "resetSuccess" ? (
          <>
            <div style={{ textAlign: "center", marginBottom: 10, fontSize: 36 }}>✅</div>
            <h2 style={{ color: C.green, fontSize: 19, margin: "0 0 10px", textAlign: "center" }}>Password Updated!</h2>
            <p style={{ color: C.sub, fontSize: 13.5, textAlign: "center", lineHeight: 1.6, marginBottom: 20 }}>
              Your password has been changed successfully. You're now signed in.
            </p>
            <button onClick={onClose} style={{ ...btnP(), width: "100%", padding: "12px 0" }}>Continue to ETF Simulator</button>
          </>
        ) : mode === "resetPassword" ? (
          <>
            <div style={{ textAlign: "center", marginBottom: 10, fontSize: 36 }}>🔐</div>
            <h2 style={{ color: C.text, fontSize: 19, margin: "0 0 6px", textAlign: "center" }}>Set New Password</h2>
            <p style={{ color: C.sub, fontSize: 13, textAlign: "center", marginBottom: 18, lineHeight: 1.5 }}>Enter your new password below.</p>
            <input placeholder="New password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} style={inputS()} />
            <input placeholder="Confirm new password" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} style={inputS()} onKeyDown={(e) => e.key === "Enter" && submit()} />
            {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 10 }}>{err}</div>}
            <button onClick={submit} disabled={loading} style={{ ...btnP(), width: "100%", padding: "12px 0", marginBottom: 14, opacity: loading ? 0.6 : 1 }}>{loading ? "Updating…" : "Update Password"}</button>
          </>
        ) : mode === "resetSent" ? (
          <>
            <div style={{ textAlign: "center", marginBottom: 10, fontSize: 36 }}>📧</div>
            <h2 style={{ color: C.text, fontSize: 19, margin: "0 0 10px", textAlign: "center" }}>Check Your Email</h2>
            <p style={{ color: C.sub, fontSize: 13.5, textAlign: "center", lineHeight: 1.6, marginBottom: 20 }}>
              If an account exists for <strong style={{ color: C.text }}>{email}</strong>, we've sent password reset instructions. Check your inbox and spam folder.
            </p>
            <button onClick={() => switchMode("signin")} style={{ ...btnP(), width: "100%", padding: "12px 0" }}>Back to Sign In</button>
          </>
        ) : mode === "forgot" ? (
          <>
            <h2 style={{ color: C.text, fontSize: 19, margin: "0 0 6px", textAlign: "center" }}>Reset Your Password</h2>
            <p style={{ color: C.sub, fontSize: 13, textAlign: "center", marginBottom: 18, lineHeight: 1.5 }}>Enter the email address associated with your account and we'll send you a link to reset your password.</p>
            <input placeholder="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputS()} onKeyDown={(e) => e.key === "Enter" && submit()} />
            {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 10 }}>{err}</div>}
            <button onClick={submit} disabled={loading} style={{ ...btnP(), width: "100%", padding: "12px 0", marginBottom: 14, opacity: loading ? 0.6 : 1 }}>{loading ? "Sending…" : "Send Reset Link"}</button>
            <p style={{ color: C.sub, fontSize: 13, textAlign: "center", margin: 0 }}>
              Remember your password? <span onClick={() => switchMode("signin")} style={{ color: C.accent, cursor: "pointer" }}>Sign in</span>
            </p>
          </>
        ) : (
          <>
            <h2 style={{ color: C.text, fontSize: 19, margin: "0 0 18px", textAlign: "center" }}>{mode === "signin" ? "Sign In to ETF Simulator" : "Create Your Account"}</h2>
            {mode === "signup" && (
              <>
                <div style={{ position: "relative", marginBottom: 12 }}>
                  <input placeholder="Username (optional — auto-generated if blank)" value={username} onChange={(e) => checkUsername(e.target.value)} style={{ ...inputS(), marginBottom: 0, paddingRight: 70, fontFamily: mono }} maxLength={20} />
                  <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", gap: 4 }}>
                    {username.length >= 3 && usernameOk !== null && (
                      <span style={{ fontSize: 16 }}>{usernameOk ? "✅" : "❌"}</span>
                    )}
                    <button type="button" onClick={() => { const gen = generateRandomUsername(); setUsername(gen); setUsernameOk(null); }} style={{ background: C.accentBg, border: `1px solid ${C.accentBorder}`, color: C.accentLight, fontSize: 9, padding: "3px 6px", borderRadius: 4, cursor: "pointer", fontFamily: mono, fontWeight: 600, whiteSpace: "nowrap" }} title="Generate random username">🎲</button>
                  </div>
                </div>
                {username.length >= 3 && usernameOk === false && <div style={{ color: C.red, fontSize: 11, marginBottom: 8, marginTop: -4 }}>Username taken — try another</div>}
                {username.length >= 3 && usernameOk === true && <div style={{ color: C.green, fontSize: 11, marginBottom: 8, marginTop: -4 }}>Username available!</div>}
                <p style={{ color: C.dim, fontSize: 10, margin: "-4px 0 10px", lineHeight: 1.4 }}>Your username is shown publicly on the leaderboard. Leave blank for a random unique ID. Your real name and email are never shared.</p>
                <input placeholder="Full Name (private, never displayed)" value={name} onChange={(e) => setName(e.target.value)} style={inputS()} />
              </>
            )}
            <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputS()} />
            <input placeholder="Password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} style={inputS()} onKeyDown={(e) => e.key === "Enter" && (mode === "signup" ? null : submit())} />
            {mode === "signup" && <input placeholder="Confirm Password" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} style={inputS()} onKeyDown={(e) => e.key === "Enter" && submit()} />}
            {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 10 }}>{err}</div>}
            <button onClick={submit} disabled={loading || (mode === "signup" && username.length >= 3 && usernameOk === false)} style={{ ...btnP(), width: "100%", padding: "12px 0", marginBottom: 14, opacity: loading ? 0.6 : 1 }}>{loading ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}</button>
            {mode === "signin" && (
              <p style={{ color: C.sub, fontSize: 12, textAlign: "center", margin: "0 0 10px" }}>
                <span onClick={() => switchMode("forgot")} style={{ color: C.accent, cursor: "pointer" }}>Forgot your password?</span>
              </p>
            )}
            <p style={{ color: C.sub, fontSize: 13, textAlign: "center", margin: 0 }}>
              {mode === "signin" ? "No account? " : "Have an account? "}
              <span onClick={() => switchMode(mode === "signin" ? "signup" : "signin")} style={{ color: C.accent, cursor: "pointer" }}>{mode === "signin" ? "Sign up free" : "Sign in"}</span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   NAVBAR
   ═══════════════════════════════════════════════════════════════════════ */

function Nav({ page, go, user, openAuth, signOut, isDark, toggleTheme, updateUsername }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [editingUn, setEditingUn] = useState(false);
  const [unInput, setUnInput] = useState("");
  const links = [
    { k: "home", l: "Home" }, { k: "builder", l: "ETF Builder" },
    { k: "portfolios", l: "My Portfolios" }, { k: "leaderboard", l: "Leaderboard" },
    { k: "learn", l: "Learn" }, { k: "roadmap", l: "Roadmap" }, { k: "pricing", l: "Pricing" },
  ];
  return (
    <nav style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 20px", position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", height: 52, justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <span onClick={() => { go("home"); setMobileOpen(false); }}><Logo size={28} showText /></span>
          <div className="nav-links" style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            {links.map((n) => (
              <button key={n.k} onClick={() => go(n.k)} style={{ background: page === n.k ? C.accentBg : "transparent", border: page === n.k ? `1px solid ${C.accentBorder}` : "1px solid transparent", color: page === n.k ? C.accentLight : C.sub, padding: "5px 12px", borderRadius: 6, fontSize: 12.5, cursor: "pointer", fontWeight: 500, fontFamily: "inherit" }}>{n.l}</button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {user ? (
            <>{editingUn ? (
              <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                <input value={unInput} onChange={e => setUnInput(e.target.value.replace(/[^a-zA-Z0-9!@#$%&*_\-+=]/g, "").slice(0, 20))} onKeyDown={async (e) => { if (e.key === "Enter" && unInput.length >= 2) { await updateUsername(unInput); setEditingUn(false); } if (e.key === "Escape") setEditingUn(false); }} autoFocus placeholder="Username" style={{ background: C.bg, border: `1px solid ${C.accent}`, color: C.text, padding: "3px 8px", borderRadius: 4, fontSize: 11, width: 120, outline: "none", fontFamily: mono }} />
                <button onClick={async () => { if (unInput.length >= 2) { await updateUsername(unInput); setEditingUn(false); } }} style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 4, padding: "3px 8px", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>✓</button>
                <button onClick={() => setEditingUn(false)} style={{ background: "transparent", color: C.dim, border: "none", padding: "3px 4px", fontSize: 10, cursor: "pointer" }}>✕</button>
              </span>
            ) : (
              <span className="hide-mobile" style={{ color: C.sub, fontSize: 12.5, cursor: user.usernameEdited ? "default" : "pointer" }} onClick={() => { if (user.usernameEdited) return; setUnInput(user.username || user.name || ""); setEditingUn(true); }} title={user.usernameEdited ? "Username already changed (one-time edit used)" : "Click to change username (one-time only)"}><span style={{ color: C.green }}>{"●"}</span> {user.username || user.name} {!user.usernameEdited && <span style={{ color: C.dim, fontSize: 9 }}>✎</span>}</span>
            )}<button onClick={signOut} style={{ ...btnO(), fontSize: 12, padding: "5px 12px" }}>Sign Out</button></>
          ) : (
            <><button onClick={() => openAuth("signin")} style={{ ...btnO(), fontSize: 12, padding: "5px 12px" }}>Sign In</button><button className="hide-mobile" onClick={() => openAuth("signup")} style={{ ...btnP(), fontSize: 12, padding: "5px 12px" }}>Get Started</button></>
          )}
          <button onClick={toggleTheme} title={isDark ? "Switch to light mode" : "Switch to dark mode"} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.text, padding: "4px 8px", borderRadius: 4, fontSize: 14, cursor: "pointer", lineHeight: 1 }}>{isDark ? "☀" : "🌙"}</button>
          <button className="hamburger-btn" onClick={() => setMobileOpen(!mobileOpen)} style={{ display: "none", background: "transparent", border: `1px solid ${C.border}`, color: C.text, padding: "4px 8px", borderRadius: 4, fontSize: 18, cursor: "pointer", lineHeight: 1 }}>{mobileOpen ? "✕" : "☰"}</button>
        </div>
      </div>
      {mobileOpen && (
        <div className="mobile-menu" style={{ position: "absolute", top: 52, left: 0, right: 0, background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "8px 16px", zIndex: 99, display: "flex", flexDirection: "column", gap: 4 }}>
          {links.map((n) => (
            <button key={n.k} onClick={() => { go(n.k); setMobileOpen(false); }} style={{ background: page === n.k ? C.accentBg : "transparent", border: page === n.k ? `1px solid ${C.accentBorder}` : "1px solid transparent", color: page === n.k ? C.accentLight : C.sub, padding: "10px 14px", borderRadius: 6, fontSize: 14, cursor: "pointer", fontWeight: 500, fontFamily: "inherit", textAlign: "left" }}>{n.l}</button>
          ))}
        </div>
      )}
    </nav>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   HOME PAGE
   ═══════════════════════════════════════════════════════════════════════ */

function Home({ go, openAuth, user, publicPortfolios }) {
  const [liveStats, setLiveStats] = React.useState({ portfolios: 0, aum: 0, users: 0 });
  // Derive portfolio count + AUM from already-loaded publicPortfolios (accurate, uses live values)
  React.useEffect(() => {
    if (publicPortfolios && publicPortfolios.length > 0) {
      const totalAUM = publicPortfolios.reduce((s, p) => s + (p.value || 1000000), 0);
      setLiveStats(prev => ({ ...prev, portfolios: publicPortfolios.length, aum: Math.round(totalAUM) }));
    }
  }, [publicPortfolios?.length]);
  // User count — lightweight separate query (profiles table only)
  React.useEffect(() => {
    supabase.from("profiles").select("id", { count: "exact", head: true })
      .then(({ count }) => { if (count > 0) setLiveStats(prev => ({ ...prev, users: count })); })
      .catch(() => {});
  }, []);
  return (
    <div className="page-container" style={{ maxWidth: 1060, margin: "0 auto", padding: "48px 20px" }}>
      <div style={{ textAlign: "center", marginBottom: 56 }}>
        <div style={{ marginBottom: 18 }}><Logo size={64} /></div>
        <div style={{ display: "inline-block", background: C.accentBg, border: `1px solid ${C.accentBorder}`, borderRadius: 20, padding: "4px 16px", marginBottom: 18, fontSize: 11.5, color: C.accentLight, fontFamily: mono, fontWeight: 600, letterSpacing: 0.5 }}>FREE TIER — NOW IN OPEN BETA</div>
        <h1 className="hero-title" style={{ color: C.text, fontSize: 48, fontWeight: 800, lineHeight: 1.08, margin: "0 0 18px", letterSpacing: -1.5 }}>Build AI-Powered<br /><span style={{ color: C.accent }}>Custom ETF Portfolios</span></h1>
        <p className="hero-sub" style={{ color: C.sub, fontSize: 17, maxWidth: 600, margin: "0 auto 12px", lineHeight: 1.6 }}>
          Describe your investment thesis. Our AI fund manager constructs a diversified 10-holding, $1M portfolio across every US-listed stock, ETF, 64+ crypto assets, and commodities — with institutional-grade allocation, macro analysis, risk modeling, and detailed rationale for every pick. Track with live market data, auto-rebalance, and compare against the market.
        </p>
        <p style={{ color: C.dim, fontSize: 12, marginBottom: 28 }}>No signup required · Try the AI builder instantly · 100% free</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => go("builder")} style={{ ...btnP(), padding: "14px 34px", fontSize: 15 }}>Start Building →</button>
          <button onClick={() => go("leaderboard")} style={{ ...btnO(), padding: "14px 34px", fontSize: 15 }}>View Leaderboard →</button>
        </div>
        {/* Weekly digest opt-in */}
        {!user && (
          <div style={{ marginTop: 20, display: "flex", gap: 8, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ color: C.dim, fontSize: 12 }}>📬 Get the weekly leaderboard digest →</span>
            <button onClick={() => openAuth("signup")} style={{ background: "transparent", border: "none", color: C.accent, fontSize: 12, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline", textUnderlineOffset: 3, padding: 0 }}>
              Create free account
            </button>
          </div>
        )}
      </div>

      {/* Platform Stats — live from Supabase */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 52, textAlign: "center" }}>
        {[
          { n: liveStats.portfolios > 0 ? `${liveStats.portfolios}` : "22+", l: "Active Portfolios", live: true },
          { n: liveStats.aum > 0 ? `$${(liveStats.aum / 1e6).toFixed(1)}M` : "$21M+", l: "Simulated AUM", live: true },
          { n: liveStats.users > 0 ? `${liveStats.users}+` : "100+", l: "Investors", live: true },
          { n: "10,000+", l: "US Stocks & ETFs", live: false },
          { n: "64+", l: "Crypto Assets", live: false },
        ].map((s) => (
          <div key={s.l} style={{ ...cardS(), padding: "18px 14px", position: "relative" }}>
            {s.live && <div style={{ position: "absolute", top: 8, right: 8, width: 6, height: 6, borderRadius: "50%", background: C.green, boxShadow: `0 0 6px ${C.green}` }} />}
            <div style={{ color: C.accent, fontSize: 26, fontWeight: 800, fontFamily: mono, marginBottom: 4 }}>{s.n}</div>
            <div style={{ color: C.sub, fontSize: 12 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* ═══ PLATFORM FEATURES ═══ */}
      <h2 style={secHd()}>What You Get</h2>
      <div className="grid3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 52 }}>
        {[
          { icon: "🤖", t: "AI Portfolio Builder", d: "Describe any thesis — \"nuclear energy & uranium\" or \"Simpsons-themed\" — and Grok-3 constructs 10 holdings with rationale, risk analysis, and macro outlook." },
          { icon: "📊", t: "Live Market Data", d: "Real-time quotes from Finnhub for every position. Live P&L, intraday changes, entry prices, share counts, and institutional-grade weight calculations." },
          { icon: "⚖️", t: "Auto-Rebalancing", d: "Set daily, weekly, monthly, or quarterly rebalancing. AI adjusts weights when drift exceeds your threshold. Expense ratios deducted monthly like real funds." },
          { icon: "💰", t: "Dividend DRIP Engine", d: "Automatic dividend reinvestment for qualifying holdings. Tracks yield, payment frequency, and accumulates shares over time — just like Schwab or Fidelity." },
          { icon: "📈", t: "Performance Backtesting", d: "Simulate 6 months to 5 years of historical performance. See total return, CAGR, Sharpe ratio, max drawdown, alpha vs S&P 500, and win rate." },
          { icon: "🏆", t: "Community Leaderboard", d: "Publish portfolios, compete on returns, compare strategies, and share results on X. Real-time chat with other portfolio builders." },
          { icon: "📱", t: "Custom Holdings", d: "Add up to 10 additional stocks, ETFs, crypto, or commodities with BUY or SHORT positions. Full autocomplete search across 10,000+ securities." },
          { icon: "🔒", t: "No Real Money at Risk", d: "Start with $1M simulated capital. Learn portfolio construction, risk management, and diversification without risking a cent." },
          { icon: "📚", t: "23 Educational Lessons", d: "From ETF basics to Sharpe ratios to crypto allocation. Learn the concepts that professional fund managers use every day." },
        ].map((f) => (
          <div key={f.t} style={cardS()}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{f.icon}</div>
            <h3 style={{ color: C.text, fontSize: 14, margin: "0 0 6px", fontWeight: 700 }}>{f.t}</h3>
            <p style={{ color: C.sub, fontSize: 12.5, margin: 0, lineHeight: 1.5 }}>{f.d}</p>
          </div>
        ))}
      </div>

      {/* ═══ EXAMPLE PORTFOLIOS ═══ */}
      <h2 style={secHd()}>Example AI-Generated Portfolios</h2>
      <p style={{ color: C.sub, fontSize: 13.5, marginTop: -12, marginBottom: 20, lineHeight: 1.5 }}>Here's what the AI builds from a single sentence. Each portfolio includes detailed rationale, risk metrics, and institutional-grade allocation.</p>
      <div className="grid3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 52 }}>
        {[
          { name: "AI & Semiconductor Growth", risk: "aggressive", tickers: ["NVDA", "AMD", "AVGO", "TSM", "QCOM", "ASML"], desc: "Concentrated bet on the AI hardware supply chain. Heavy Nvidia allocation with diversified semiconductor exposure." },
          { name: "Classic 60/40 Balanced", risk: "moderate", tickers: ["VOO", "VTI", "BND", "VXUS", "GLD", "TIP"], desc: "Time-tested balanced portfolio. US equities core with bonds, international exposure, and gold as inflation hedge." },
          { name: "Crypto & DeFi Frontier", risk: "aggressive", tickers: ["BTC", "ETH", "SOL", "LINK", "AVAX", "UNI"], desc: "Blue-chip crypto allocation. Bitcoin and Ethereum anchor with high-potential Layer 1s and DeFi protocols." },
        ].map((ex) => (
          <div key={ex.name} style={{ ...cardS(), cursor: "pointer" }} onClick={() => go("builder")}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h3 style={{ color: C.text, fontSize: 14, margin: 0, fontWeight: 700 }}>{ex.name}</h3>
              <span style={{ ...badge(ex.risk === "aggressive" ? C.red : C.gold), fontSize: 8 }}>{ex.risk}</span>
            </div>
            <p style={{ color: C.sub, fontSize: 12, margin: "0 0 10px", lineHeight: 1.5 }}>{ex.desc}</p>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {ex.tickers.map(t => <span key={t} style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: `${C.accent}12`, color: C.accent, border: `1px solid ${C.accent}28`, fontWeight: 600, fontFamily: mono }}>{t}</span>)}
            </div>
            <div style={{ color: C.accent, fontSize: 11, marginTop: 10, fontWeight: 600 }}>Try this thesis →</div>
          </div>
        ))}
      </div>

      {/* ═══ HOW IT WORKS ═══ */}
      <h2 style={secHd()}>How It Works</h2>
      <div className="grid4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 52 }}>
        {[
          { n: "01", t: "Describe Your Thesis", d: "Sectors, themes, risk tolerance, time horizon — anything goes. Pick your risk profile and rebalance cadence." },
          { n: "02", t: "AI Builds Your ETF", d: "Grok-3 constructs 10 holdings across stocks, ETFs, crypto, and commodities with detailed rationale." },
          { n: "03", t: "Curate & Customize", d: "Edit name, description, and ticker. Remove or add holdings. Adjust weights. Your fund, your rules." },
          { n: "04", t: "Track & Compete", d: "Live pricing, auto-rebalance, P&L tracking, and rank on the community leaderboard." },
        ].map((s) => (
          <div key={s.n} style={cardS()}>
            <div style={{ color: C.accent, fontFamily: mono, fontSize: 12.5, marginBottom: 8, fontWeight: 700 }}>{s.n}</div>
            <h3 style={{ color: C.text, fontSize: 15, margin: "0 0 6px" }}>{s.t}</h3>
            <p style={{ color: C.sub, fontSize: 13, margin: 0, lineHeight: 1.5 }}>{s.d}</p>
          </div>
        ))}
      </div>

      {/* ═══ DATA TRANSPARENCY ═══ */}
      <div style={{ ...cardS(), marginBottom: 52, borderColor: C.accentBorder }}>
        <h3 style={{ color: C.accent, fontSize: 16, margin: "0 0 12px", fontWeight: 700 }}>Data Sources & Methodology</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <p style={{ color: C.sub, fontSize: 13, lineHeight: 1.7, margin: 0 }}><strong style={{ color: C.text }}>Market Data:</strong> Live quotes from Finnhub.io (free tier). Real-time prices for US stocks, ETFs, and crypto. Intraday quotes during market hours with 15-second cache refresh.</p>
          </div>
          <div>
            <p style={{ color: C.sub, fontSize: 13, lineHeight: 1.7, margin: 0 }}><strong style={{ color: C.text }}>AI Engine:</strong> Portfolio generation powered by Grok-3 (xAI). Allocation based on institutional-grade analysis of risk, correlation, macro environment, and sector dynamics.</p>
          </div>
        </div>
        <p style={{ color: C.dim, fontSize: 11, margin: "12px 0 0", lineHeight: 1.5 }}>Asset coverage: 10,000+ US-listed stocks & ETFs, 64+ crypto assets (via Binance & CoinGecko), major commodities (gold, silver, oil via ETF proxies). Market hours: NYSE 9:30 AM–4:00 PM ET (stocks), 24/7 (crypto).</p>
      </div>

      <h2 style={secHd()}>Plans & Pricing</h2>
      <div className="grid3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 52 }}>
        {PRICING_TIERS.map((t) => (
          <div key={t.name} style={{ ...cardS(), border: t.active ? `1px solid ${C.accent}` : `1px solid ${C.border}`, position: "relative", opacity: t.soon ? 0.55 : 1 }}>
            {t.active && <div style={{ position: "absolute", top: -1, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${C.accent},transparent)`, borderRadius: "10px 10px 0 0" }} />}
            {t.soon && <div style={{ position: "absolute", top: 14, right: 14, background: C.tealBg, border: "1px solid rgba(20,184,166,.25)", color: C.teal, fontSize: 9.5, padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>COMING SOON</div>}
            <h3 style={{ color: t.active ? C.accent : C.text, fontSize: 17, margin: "0 0 6px" }}>{t.name}</h3>
            <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginBottom: 18 }}><span style={{ color: C.text, fontSize: 34, fontWeight: 800 }}>{t.price}</span><span style={{ color: C.sub, fontSize: 13 }}>{t.period}</span></div>
            {t.features.map((f, i) => <div key={i} style={{ display: "flex", gap: 7, marginBottom: 7, fontSize: 13, color: C.sub }}><span style={{ color: t.active ? C.green : C.dim }}>{"✓"}</span>{f}</div>)}
            {t.active && !user && <button onClick={() => openAuth("signup")} style={{ ...btnP(), width: "100%", marginTop: 14, padding: "10px 0" }}>Get Started Free</button>}
            {t.active && user && <div style={{ marginTop: 14, textAlign: "center", color: C.green, fontSize: 13, fontWeight: 600 }}>{"✓"} Current Plan</div>}
          </div>
        ))}
      </div>

      <h2 style={secHd()}>Roadmap</h2>
      <p style={{ color: C.sub, fontSize: 13.5, marginTop: -12, marginBottom: 20, lineHeight: 1.5 }}>We're building the most powerful AI portfolio simulation platform. Here's what's coming.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14, marginBottom: 52 }}>
        {FUTURE_PRODUCTS.map((p) => {
          const statusColors = { "in-progress": C.green, planned: C.accent, future: C.dim };
          const statusLabels = { "in-progress": "IN PROGRESS", planned: "PLANNED", future: "FUTURE" };
          return (
          <div key={p.title} style={{ ...cardS(), display: "flex", gap: 14, opacity: p.status === "future" ? 0.7 : 1, position: "relative" }}>
            {p.status === "in-progress" && <div style={{ position: "absolute", top: -1, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${C.green},transparent)`, borderRadius: "10px 10px 0 0" }} />}
            <div style={{ fontSize: 28, lineHeight: 1 }}>{p.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <h4 style={{ color: C.text, fontSize: 14, margin: "0 0 4px" }}>{p.title}</h4>
                <span style={{ ...badge(statusColors[p.status] || C.dim), fontSize: 8.5, whiteSpace: "nowrap", flexShrink: 0 }}>{statusLabels[p.status] || p.status}</span>
              </div>
              <p style={{ color: C.sub, fontSize: 12.5, margin: "0 0 6px", lineHeight: 1.45 }}>{p.desc}</p>
              <span style={{ color: C.dim, fontSize: 11, fontFamily: mono }}>{p.eta}</span>
            </div>
          </div>);
        })}
      </div>

      {/* ═══ CONTACT CTA ═══ */}
      <div style={{ ...cardS(), textAlign: "center", marginBottom: 52, borderColor: C.accentBorder }}>
        <h3 style={{ color: C.text, fontSize: 18, margin: "0 0 8px", fontWeight: 700 }}>Questions or Feedback?</h3>
        <p style={{ color: C.sub, fontSize: 13.5, margin: "0 0 14px" }}>We'd love to hear from you. Reach us anytime at <span style={{ color: C.accent }}>support@etfsimulator.com</span> or visit our <span onClick={() => go("contact")} style={{ color: C.accent, cursor: "pointer", textDecoration: "underline" }}>Contact page</span>.</p>
      </div>

      {/* ═══ EDUCATIONAL DISCLAIMER ═══ */}
      <div style={{ padding: "24px 20px", background: C.surface, borderRadius: 10, border: `1px solid ${C.border}` }}>
        <h3 style={{ color: C.text, fontSize: 14, margin: "0 0 12px", fontFamily: mono, letterSpacing: 0.3 }}>IMPORTANT LEGAL DISCLAIMERS</h3>
        <div style={{ display: "grid", gap: 10, fontSize: 12, color: C.sub, lineHeight: 1.6 }}>
          <p style={{ margin: 0 }}><strong style={{ color: C.text }}>Educational Purpose Only.</strong> ETF Simulator is an educational platform designed to help users learn about portfolio construction, diversification, risk management, and investment strategies. No real money is invested, traded, or at risk at any time. All portfolio values, returns, and performance metrics are simulated and hypothetical.</p>
          <p style={{ margin: 0 }}><strong style={{ color: C.text }}>Not Financial Advice.</strong> Nothing on this platform constitutes financial advice, investment advice, trading advice, or any other form of professional advice. The AI-generated portfolios are algorithmic outputs for educational illustration only and should not be interpreted as personalized investment recommendations.</p>
          <p style={{ margin: 0 }}><strong style={{ color: C.text }}>Live Market Data, Simulated Trading.</strong> Prices shown are real-time quotes from Finnhub.io. However, all trades, portfolio values, and P&L calculations are simulated. Past performance — whether real or simulated — is not indicative of future results. Results do not account for real-world trading costs, slippage, taxes, or market impact.</p>
          <p style={{ margin: 0 }}><strong style={{ color: C.text }}>Consult a Professional.</strong> Before making any actual investment decisions, consult a qualified, licensed financial advisor. Investment in real securities involves risk, including the potential loss of principal.</p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ETF BUILDER
   ═══════════════════════════════════════════════════════════════════════ */

const SEED_CAPITAL = 1000000;
const MONEY_MARKET_RATE = 0.045; // 4.5% APY
const DAILY_MM_RATE = MONEY_MARKET_RATE / 365;

// Market hours awareness — controls when prices can move
// Stocks/ETFs: Mon-Fri 9:30 AM - 4:00 PM ET (NYSE/NASDAQ)
// Commodities: Mon-Fri 9:00 AM - 5:00 PM ET (COMEX/NYMEX rough approximation)
// Crypto: 24/7/365
const isMarketOpen = (assetType) => {
  if (assetType === "crypto") return true; // Crypto never sleeps
  const now = new Date();
  // Use Intl to get REAL Eastern Time (handles DST automatically)
  let etHour, etMin, day;
  try {
    const etStr = now.toLocaleString("en-US", { timeZone: "America/New_York" });
    const etDate = new Date(etStr);
    etHour = etDate.getHours();
    etMin = etDate.getMinutes();
    day = etDate.getDay(); // 0=Sun, 6=Sat
  } catch {
    // Fallback: compute ET offset dynamically (handles DST)
    // US Eastern DST: second Sunday of March to first Sunday of November
    const year = now.getUTCFullYear();
    const mar = new Date(Date.UTC(year, 2, 1)); // March 1
    const nov = new Date(Date.UTC(year, 10, 1)); // Nov 1
    const secondSunMar = new Date(Date.UTC(year, 2, 8 + (7 - mar.getUTCDay()) % 7, 7)); // 2nd Sun March at 2AM ET = 7AM UTC
    const firstSunNov = new Date(Date.UTC(year, 10, 1 + (7 - nov.getUTCDay()) % 7, 6)); // 1st Sun Nov at 2AM EDT = 6AM UTC
    const isDST = now >= secondSunMar && now < firstSunNov;
    const offset = isDST ? 4 : 5; // EDT = UTC-4, EST = UTC-5
    const etMs = now.getTime() - (offset * 3600000);
    const etDate = new Date(etMs);
    etHour = etDate.getUTCHours();
    etMin = etDate.getUTCMinutes();
    day = etDate.getUTCDay();
  }
  // Weekend — everything except crypto is closed
  if (day === 0 || day === 6) return false;
  // Weekday market hours
  if (assetType === "commodity") {
    return etHour >= 9 && etHour < 17; // 9 AM - 5 PM ET
  }
  // Stocks & ETFs: 9:30 AM - 4:00 PM ET
  if (etHour < 9 || etHour >= 16) return false;
  if (etHour === 9 && etMin < 30) return false;
  return true;
};

// Market status label for UI
const getMarketStatus = (assetType) => {
  if (assetType === "crypto") return { open: true, label: "24/7", color: "#22c55e" };
  const open = isMarketOpen(assetType);
  if (open) return { open: true, label: "OPEN", color: "#22c55e" };
  // Use Eastern Time for weekend check — matches isMarketOpen() logic
  const now = new Date();
  let etDay;
  try {
    etDay = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" })).getDay();
  } catch {
    const y = now.getUTCFullYear(), m = new Date(Date.UTC(y,2,1)), n = new Date(Date.UTC(y,10,1));
    const isDST = now >= new Date(Date.UTC(y,2,8+(7-m.getUTCDay())%7,7)) && now < new Date(Date.UTC(y,10,1+(7-n.getUTCDay())%7,6));
    etDay = new Date(now.getTime() - ((isDST ? 4 : 5) * 3600000)).getUTCDay();
  }
  if (etDay === 0 || etDay === 6) return { open: false, label: "WEEKEND", color: "#6b7280" };
  return { open: false, label: "CLOSED", color: "#ef4444" };
};

// Auto-detect asset type from ticker symbol
const TICKER_TYPES = {
  // Major cryptos — Top 50 by market cap
  BTC: "crypto", ETH: "crypto", SOL: "crypto", ADA: "crypto", DOT: "crypto", AVAX: "crypto", MATIC: "crypto", LINK: "crypto", UNI: "crypto", DOGE: "crypto", SHIB: "crypto", XRP: "crypto", BNB: "crypto", LTC: "crypto", ATOM: "crypto", NEAR: "crypto", APT: "crypto", ARB: "crypto", OP: "crypto", FIL: "crypto", ICP: "crypto", HBAR: "crypto", XLM: "crypto", ALGO: "crypto",
  // L1/L2 chains
  SUI: "crypto", SEI: "crypto", TIA: "crypto", INJ: "crypto", FET: "crypto", RNDR: "crypto", TAO: "crypto", KAS: "crypto", TRX: "crypto", TON: "crypto", STX: "crypto", EGLD: "crypto", FLOW: "crypto", MINA: "crypto", ROSE: "crypto", ZIL: "crypto", ONE: "crypto", KAVA: "crypto", CELO: "crypto", OSMO: "crypto", ASTR: "crypto", CKB: "crypto", CFX: "crypto", EOS: "crypto", NEO: "crypto", QTUM: "crypto", ZEC: "crypto", XMR: "crypto", BCH: "crypto", ETC: "crypto", BSV: "crypto",
  // DeFi tokens
  AAVE: "crypto", MKR: "crypto", SNX: "crypto", CRV: "crypto", COMP: "crypto", SUSHI: "crypto", YFI: "crypto", LDO: "crypto", RPL: "crypto", PENDLE: "crypto", GMX: "crypto", DYDX: "crypto", JUP: "crypto", RAY: "crypto", ORCA: "crypto", "1INCH": "crypto", BAL: "crypto", UMA: "crypto", LQTY: "crypto",
  // Memecoins
  PEPE: "crypto", WIF: "crypto", FLOKI: "crypto", BONK: "crypto", MEME: "crypto", DEGEN: "crypto", BRETT: "crypto", NEIRO: "crypto", MOG: "crypto", TURBO: "crypto", BABYDOGE: "crypto", ELON: "crypto", SATS: "crypto", ORDI: "crypto", RATS: "crypto", COQ: "crypto", MYRO: "crypto", SAMO: "crypto", BOME: "crypto", SLERF: "crypto", POPCAT: "crypto", MEW: "crypto", GIGA: "crypto", SPX: "crypto", PONKE: "crypto", TOSHI: "crypto", LADYS: "crypto", WOJAK: "crypto", ANDY: "crypto",
  // AI & data tokens
  OCEAN: "crypto", GRT: "crypto", AGIX: "crypto", AR: "crypto", THETA: "crypto", HNT: "crypto", AKT: "crypto", IOTX: "crypto", WLD: "crypto", JASMY: "crypto", ALEPH: "crypto",
  // Gaming & metaverse
  AXS: "crypto", SAND: "crypto", MANA: "crypto", GALA: "crypto", IMX: "crypto", ENJ: "crypto", ILV: "crypto", PRIME: "crypto", YGG: "crypto", PIXEL: "crypto", PORTAL: "crypto", RONIN: "crypto", BEAM: "crypto",
  // Infrastructure & interoperability
  QNT: "crypto", RUNE: "crypto", VET: "crypto", IOTA: "crypto", ENS: "crypto", SSV: "crypto", ACH: "crypto", API3: "crypto", BAND: "crypto", COTI: "crypto",
  // Stablecoins (for reference)
  USDT: "crypto", USDC: "crypto", DAI: "crypto", FRAX: "crypto", TUSD: "crypto",
  // Major ETFs
  SPY: "etf", QQQ: "etf", IWM: "etf", DIA: "etf", VTI: "etf", VOO: "etf", VEA: "etf", VWO: "etf", EFA: "etf", EEM: "etf", AGG: "etf", BND: "etf", TLT: "etf", LQD: "etf", HYG: "etf", GLD: "etf", SLV: "etf", IAU: "etf", USO: "etf", UNG: "etf", DBC: "etf", PDBC: "etf", XLF: "etf", XLK: "etf", XLE: "etf", XLV: "etf", XLI: "etf", XLP: "etf", XLY: "etf", XLU: "etf", XLB: "etf", XLRE: "etf", XLC: "etf", ARKK: "etf", ARKG: "etf", ARKW: "etf", ARKF: "etf", ARKQ: "etf", SOXX: "etf", SMH: "etf", KWEB: "etf", URA: "etf", ICLN: "etf", TAN: "etf", BITO: "etf", IBIT: "etf", GBTC: "etf", ETHE: "etf", SCHD: "etf", VIG: "etf", DVY: "etf", HDV: "etf", VYM: "etf", JEPI: "etf", JEPQ: "etf", SOXL: "etf", TQQQ: "etf", SQQQ: "etf", SPXL: "etf", UVXY: "etf", VXX: "etf",
  // Commodities (futures-based or physical)
  GC: "commodity", SI: "commodity", CL: "commodity", NG: "commodity", HG: "commodity", PL: "commodity", PA: "commodity", ZW: "commodity", ZC: "commodity", ZS: "commodity",
};
const detectTickerType = (sym) => {
  const s = (sym || "").toUpperCase().trim();
  if (TICKER_TYPES[s]) return TICKER_TYPES[s];
  // Heuristic: common ETF patterns
  if (/^(X[A-Z]{1,2}|V[A-Z]{1,2}|I[A-Z]{1,3}|ARK[A-Z]|SPD[A-Z])$/.test(s)) return "etf";
  return "stock"; // default
};
const detectAssetType = detectTickerType; // Alias for use in price engine

// ═══════════════════════════════════════════════════════════════════════
// DIVIDEND ENGINE — Realistic dividend simulation for stocks & ETFs
// Dividends are paid on schedule based on real-world yields and frequencies.
// DRIP: Dividends automatically reinvested into additional shares.
// ═══════════════════════════════════════════════════════════════════════

// Annual dividend yields (approximate, based on real data) and payment frequency
// frequency: 4 = quarterly, 2 = semi-annual, 12 = monthly, 1 = annual, 0 = none
const DIVIDEND_DATA = {
  // Blue chips — quarterly dividends
  AAPL: { yield: 0.0044, freq: 4 }, MSFT: { yield: 0.0072, freq: 4 }, GOOGL: { yield: 0.0005, freq: 4 },
  AMZN: { yield: 0, freq: 0 }, META: { yield: 0.0036, freq: 4 }, NVDA: { yield: 0.0003, freq: 4 },
  JPM: { yield: 0.021, freq: 4 }, BAC: { yield: 0.024, freq: 4 }, WFC: { yield: 0.025, freq: 4 },
  GS: { yield: 0.022, freq: 4 }, MS: { yield: 0.034, freq: 4 },
  JNJ: { yield: 0.031, freq: 4 }, PFE: { yield: 0.058, freq: 4 }, UNH: { yield: 0.014, freq: 4 },
  XOM: { yield: 0.034, freq: 4 }, CVX: { yield: 0.041, freq: 4 }, COP: { yield: 0.019, freq: 4 },
  MCD: { yield: 0.022, freq: 4 }, KO: { yield: 0.030, freq: 4 }, PEP: { yield: 0.027, freq: 4 },
  WMT: { yield: 0.013, freq: 4 }, COST: { yield: 0.006, freq: 4 }, HD: { yield: 0.024, freq: 4 },
  DIS: { yield: 0.0037, freq: 2 }, NFLX: { yield: 0, freq: 0 }, TSLA: { yield: 0, freq: 0 },
  V: { yield: 0.007, freq: 4 }, MA: { yield: 0.006, freq: 4 }, PYPL: { yield: 0, freq: 0 },
  T: { yield: 0.050, freq: 4 }, VZ: { yield: 0.065, freq: 4 },
  IBM: { yield: 0.031, freq: 4 }, INTC: { yield: 0.005, freq: 4 }, CSCO: { yield: 0.028, freq: 4 },
  PG: { yield: 0.024, freq: 4 }, MMM: { yield: 0.023, freq: 4 }, CAT: { yield: 0.016, freq: 4 },
  BA: { yield: 0, freq: 0 }, LMT: { yield: 0.027, freq: 4 }, RTX: { yield: 0.022, freq: 4 },
  LHX: { yield: 0.024, freq: 4 }, NOC: { yield: 0.018, freq: 4 }, GD: { yield: 0.020, freq: 4 },
  AJRD: { yield: 0, freq: 0 },
  MO: { yield: 0.078, freq: 4 }, PM: { yield: 0.046, freq: 4 }, ABT: { yield: 0.019, freq: 4 },
  TMO: { yield: 0.003, freq: 4 }, LLY: { yield: 0.007, freq: 4 }, ABBV: { yield: 0.036, freq: 4 },
  CCJ: { yield: 0.002, freq: 4 }, ROK: { yield: 0.017, freq: 4 }, SPOT: { yield: 0, freq: 0 },
  LYV: { yield: 0, freq: 0 }, TPR: { yield: 0.028, freq: 4 }, CMG: { yield: 0, freq: 0 },
  F: { yield: 0.048, freq: 4 }, GM: { yield: 0.011, freq: 4 },
  // ETFs — many pay quarterly or monthly
  SPY: { yield: 0.012, freq: 4 }, QQQ: { yield: 0.005, freq: 4 }, DIA: { yield: 0.017, freq: 12 },
  IWM: { yield: 0.012, freq: 4 }, VTI: { yield: 0.013, freq: 4 }, VOO: { yield: 0.013, freq: 4 },
  VEA: { yield: 0.032, freq: 4 }, VWO: { yield: 0.031, freq: 4 }, EFA: { yield: 0.029, freq: 2 },
  AGG: { yield: 0.042, freq: 12 }, BND: { yield: 0.040, freq: 12 }, TLT: { yield: 0.038, freq: 12 },
  LQD: { yield: 0.050, freq: 12 }, HYG: { yield: 0.056, freq: 12 },
  GLD: { yield: 0, freq: 0 }, SLV: { yield: 0, freq: 0 }, IAU: { yield: 0, freq: 0 },
  SCHD: { yield: 0.035, freq: 4 }, VIG: { yield: 0.018, freq: 4 }, DVY: { yield: 0.036, freq: 4 },
  HDV: { yield: 0.038, freq: 4 }, VYM: { yield: 0.030, freq: 4 },
  JEPI: { yield: 0.072, freq: 12 }, JEPQ: { yield: 0.094, freq: 12 },
  XLF: { yield: 0.017, freq: 4 }, XLK: { yield: 0.006, freq: 4 }, XLE: { yield: 0.034, freq: 4 },
  XLV: { yield: 0.015, freq: 4 }, XLI: { yield: 0.015, freq: 4 }, XLP: { yield: 0.026, freq: 4 },
  XLY: { yield: 0.008, freq: 4 }, XLU: { yield: 0.029, freq: 4 },
  ARKK: { yield: 0, freq: 0 }, CORN: { yield: 0, freq: 0 }, USO: { yield: 0, freq: 0 },
  SOXX: { yield: 0.007, freq: 4 }, SMH: { yield: 0.005, freq: 4 },
  IBIT: { yield: 0, freq: 0 }, GBTC: { yield: 0, freq: 0 },
  // Crypto — no dividends
  BTC: { yield: 0, freq: 0 }, ETH: { yield: 0, freq: 0 }, SOL: { yield: 0, freq: 0 },
  XRP: { yield: 0, freq: 0 }, DOGE: { yield: 0, freq: 0 }, ADA: { yield: 0, freq: 0 },
};

// Determine if a dividend is due for a holding based on portfolio creation date and current time
// Returns { isDue, amount, sharesAdded } or null
function checkDividendDue(holding, portfolioCreatedAt, lastDividendTs, currentPrice) {
  const divData = DIVIDEND_DATA[holding.symbol];
  if (!divData || divData.yield === 0 || divData.freq === 0) return null;
  if (!holding.shares || holding.shares <= 0 || !currentPrice || currentPrice <= 0) return null;

  const now = Date.now();
  const created = new Date(portfolioCreatedAt || now).getTime();
  const age = now - created; // ms since portfolio creation
  
  // Payment interval in milliseconds
  const intervalMs = (365.25 * 24 * 60 * 60 * 1000) / divData.freq;
  
  // How many dividends should have been paid by now
  const expectedPayments = Math.floor(age / intervalMs);
  if (expectedPayments <= 0) return null;
  
  // How many have we already recorded?
  const lastPaid = lastDividendTs || created;
  const timeSinceLastDiv = now - lastPaid;
  
  // Is a new dividend due? (at least one interval since last payment)
  if (timeSinceLastDiv < intervalMs) return null;
  
  // Calculate dividend: (annual yield / frequency) × shares × current price
  const dividendPerShare = (divData.yield / divData.freq) * currentPrice;
  const totalDividend = dividendPerShare * holding.shares;
  
  // DRIP: convert dividend to additional shares at current price
  const newShares = totalDividend / currentPrice;
  
  return {
    isDue: true,
    amount: Math.round(totalDividend * 100) / 100,
    dividendPerShare: Math.round(dividendPerShare * 10000) / 10000,
    sharesAdded: Math.round(newShares * 100000000) / 100000000,
    yieldAnnual: divData.yield,
    frequency: divData.freq,
  };
}

function Builder({ user, openAuth, savePortfolio, publishPortfolio, signOut }) {
  const [thesis, setThesis] = useState(""); const [loading, setLoading] = useState(false); const [portfolio, setPortfolio] = useState(null); const [err, setErr] = useState(""); const [openIdx, setOpenIdx] = useState(null); const [saved, setSaved] = useState(false); const [showSaveModal, setShowSaveModal] = useState(false); const [pendingSave, setPendingSave] = useState(false); const [saving, setSaving] = useState(false); const [saveErr, setSaveErr] = useState("");
  const [genStep, setGenStep] = useState(0); // 0=idle 1-5=steps
  const [excludedIdx, setExcludedIdx] = useState(new Set());
  const [refreshingIdx, setRefreshingIdx] = useState(null);
  const [cashBalance, setCashBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [navHistory, setNavHistory] = useState([]);
  const [showTxLog, setShowTxLog] = useState(false);
  const [riskProfile, setRiskProfile] = useState("moderate");
  const [timeHorizon, setTimeHorizon] = useState("3-5 years");
  const [rebalFreq, setRebalFreq] = useState("quarterly");
  const [editName, setEditName] = useState("");
  const [editTicker, setEditTicker] = useState("");
  const [editingWeights, setEditingWeights] = useState({});
  const [editFee, setEditFee] = useState(0.5);
  const [autoSellPct, setAutoSellPct] = useState(0);
  const [lastExpenseTs, setLastExpenseTs] = useState(0);
  const [nameEdited, setNameEdited] = useState(false); // Lock name after first edit
  const [genElapsed, setGenElapsed] = useState(0); // seconds elapsed during AI generation
  const genTimerRef = useRef(null); // interval ref for gen elapsed timer
  const [trendingTheses, setTrendingTheses] = useState([]);
  // Fetch trending theses from recent public portfolios
  useEffect(() => {
    supabase.from("portfolios")
      .select("id, name, portfolio_data->thesis, portfolio_data->riskProfile, portfolio_data->creator")
      .eq("is_public", true)
      .not("portfolio_data->thesis", "is", null)
      .order("created_at", { ascending: false })
      .limit(12)
      .then(({ data }) => {
        if (data && data.length > 0) {
          // Dedupe by thesis content, filter out very short/empty, shuffle for variety
          const seen = new Set();
          const unique = data.filter(p => {
            const t = (p.thesis || "").trim();
            if (!t || t.length < 20 || seen.has(t.slice(0, 40))) return false;
            seen.add(t.slice(0, 40));
            return true;
          }).slice(0, 6);
          setTrendingTheses(unique);
        }
      }).catch(() => {}); // non-critical
  }, []);
  // Cleanup gen elapsed timer if component unmounts mid-generation
  useEffect(() => { return () => { if (genTimerRef.current) { clearInterval(genTimerRef.current); genTimerRef.current = null; } }; }, []);
  // Build mode: "ai" or "manual"
  const [buildMode, setBuildMode] = useState("ai");
  const [manualHoldings, setManualHoldings] = useState([{ symbol: "", name: "", type: "stock", weight: 10 }]);
  const [manualName, setManualName] = useState("My Custom ETF");
  const [manualTicker, setManualTicker] = useState("CUST");
  const [manualCashPct, setManualCashPct] = useState(5);
  const [manualStrategy, setManualStrategy] = useState("");
  // ══════ SYMBOL SEARCH AUTOCOMPLETE ══════
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const searchTimeout = useRef(null);
  const searchRef = useRef(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Local crypto/ETF/commodity database for instant matching
  const localSearch = useCallback((q) => {
    const query = q.toUpperCase();
    const results = [];
    const CRYPTO_NAMES = {
      BTC: "Bitcoin", ETH: "Ethereum", SOL: "Solana", XRP: "Ripple", ADA: "Cardano", DOT: "Polkadot",
      AVAX: "Avalanche", MATIC: "Polygon", LINK: "Chainlink", UNI: "Uniswap", DOGE: "Dogecoin", SHIB: "Shiba Inu",
      BNB: "BNB (Binance)", LTC: "Litecoin", ATOM: "Cosmos", NEAR: "NEAR Protocol", APT: "Aptos", ARB: "Arbitrum",
      OP: "Optimism", FIL: "Filecoin", ICP: "Internet Computer", HBAR: "Hedera", XLM: "Stellar", ALGO: "Algorand",
      SUI: "Sui", SEI: "Sei", TIA: "Celestia", INJ: "Injective", FET: "Fetch.ai", RNDR: "Render",
      TAO: "Bittensor", TRX: "Tron", TON: "Toncoin", STX: "Stacks", PEPE: "Pepe", WIF: "dogwifhat",
      FLOKI: "Floki", BONK: "Bonk", AAVE: "Aave", MKR: "Maker", CRV: "Curve DAO", PENDLE: "Pendle",
      DYDX: "dYdX", JUP: "Jupiter", LDO: "Lido DAO", GRT: "The Graph", AR: "Arweave", THETA: "Theta Network",
      IMX: "Immutable X", GALA: "Gala Games", SAND: "The Sandbox", MANA: "Decentraland", AXS: "Axie Infinity",
      RUNE: "THORChain", VET: "VeChain", ETC: "Ethereum Classic", BCH: "Bitcoin Cash", COMP: "Compound",
      SNX: "Synthetix", KAS: "Kaspa", WLD: "Worldcoin", OCEAN: "Ocean Protocol", EGLD: "MultiversX",
      FLOW: "Flow", ORDI: "Ordinals", BOME: "Book of Meme", ENS: "Ethereum Name Service", GMX: "GMX", QNT: "Quant",
      POPCAT: "Popcat", MEW: "cat in a dogs world", YFI: "Yearn Finance", SUSHI: "SushiSwap",
      RPL: "Rocket Pool", RAY: "Raydium", ORCA: "Orca", "1INCH": "1inch", BAL: "Balancer",
      EOS: "EOS", NEO: "Neo", ZEC: "Zcash", XMR: "Monero", BSV: "Bitcoin SV",
      IOTA: "IOTA", HNT: "Helium", AKT: "Akash Network", JASMY: "JasmyCoin",
    };
    const ETF_NAMES = {
      SPY: "S&P 500 ETF (SPDR)", QQQ: "Nasdaq 100 ETF (Invesco)", IWM: "Russell 2000 ETF", DIA: "Dow Jones ETF (SPDR)",
      VTI: "Vanguard Total Stock Market", VOO: "Vanguard S&P 500", VEA: "Vanguard Developed Markets", VWO: "Vanguard Emerging Markets",
      AGG: "iShares Core U.S. Aggregate Bond", BND: "Vanguard Total Bond Market", TLT: "iShares 20+ Year Treasury",
      GLD: "SPDR Gold Shares", SLV: "iShares Silver Trust", USO: "United States Oil Fund",
      ARKK: "ARK Innovation ETF", ARKG: "ARK Genomic Revolution", ARKW: "ARK Next Gen Internet",
      SOXX: "iShares Semiconductor", SMH: "VanEck Semiconductor", URA: "Global X Uranium",
      ICLN: "iShares Global Clean Energy", TAN: "Invesco Solar ETF",
      IBIT: "iShares Bitcoin Trust", GBTC: "Grayscale Bitcoin Trust", ETHE: "Grayscale Ethereum Trust",
      SCHD: "Schwab U.S. Dividend Equity", JEPI: "JPMorgan Equity Premium Income",
      TQQQ: "ProShares UltraPro QQQ (3x)", SQQQ: "ProShares UltraPro Short QQQ (3x)",
      XLF: "Financial Select SPDR", XLK: "Technology Select SPDR", XLE: "Energy Select SPDR", XLV: "Health Care Select SPDR",
    };
    // Search cryptos
    Object.entries(CRYPTO_NAMES).forEach(([sym, name]) => {
      if (sym.includes(query) || name.toUpperCase().includes(query)) {
        results.push({ symbol: sym, description: name, type: "Crypto" });
      }
    });
    // Search ETFs
    Object.entries(ETF_NAMES).forEach(([sym, name]) => {
      if (sym.includes(query) || name.toUpperCase().includes(query)) {
        results.push({ symbol: sym, description: name, type: "ETF" });
      }
    });
    return results;
  }, []);
  
  // Debounced Finnhub search + local matching
  const handleSymbolSearch = useCallback((q) => {
    setSearchQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!q || q.length < 1) { setSearchResults([]); setSearchOpen(false); return; }
    
    // Instant local results
    const local = localSearch(q);
    if (local.length > 0) { setSearchResults(local.slice(0, 8)); setSearchOpen(true); }
    
    // Debounced API search for stocks
    searchTimeout.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`).catch(() => 
          finnhubFetch(`https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}&token=${FINNHUB_KEY}`)
        );
        const data = await r.json();
        const apiResults = (data.result || []).slice(0, 10).map(r => ({
          symbol: r.displaySymbol || r.symbol,
          description: r.description,
          type: r.type?.includes("Common Stock") ? "Stock" : r.type?.includes("ETF") ? "ETF" : r.type?.includes("Crypto") ? "Crypto" : r.type || "Stock",
        }));
        // Merge: local first (crypto/ETF), then API results (deduped)
        const localSyms = new Set(local.map(l => l.symbol));
        const merged = [...local, ...apiResults.filter(a => !localSyms.has(a.symbol))];
        setSearchResults(merged.slice(0, 10));
        setSearchOpen(true);
      } catch (e) {
        // Keep local results if API fails
        if (local.length > 0) { setSearchResults(local.slice(0, 8)); setSearchOpen(true); }
      }
    }, 300);
  }, [localSearch]);

  const selectSearchResult = useCallback((result) => {
    setSelectedSymbol(result.symbol);
    setSelectedName(result.description);
    setSearchQuery(result.symbol);
    setSearchOpen(false);
    setSearchResults([]);
    // Focus amount field after selection
    setTimeout(() => document.getElementById("custom-alloc")?.focus(), 50);
  }, []);

  // Auto-rebalance timer
  const [rebalDeadline, setRebalDeadline] = useState(null);
  const [rebalCountdown, setRebalCountdown] = useState("");
  const [autoRebalEnabled, setAutoRebalEnabled] = useState(true);
  const [dailyUses, setDailyUses] = useState(() => { try {
    // On first render user is always null (guest), so read guest key.
    // The useEffect below will sync to the correct auth-specific key after sign-in.
    const stored = JSON.parse(localStorage.getItem("etf_daily_uses_guest") || "{}");
    const today = new Date().toISOString().slice(0, 10);
    return stored.date === today ? stored.count : 0;
  } catch { return 0; } });
  const DAILY_LIMIT = user ? 25 : 5;
  // Separate localStorage keys for guest vs authenticated — no bleed-over
  const usageKey = user ? `etf_daily_uses_${user.id}` : "etf_daily_uses_guest";
  // Sync dailyUses to the correct key on user change (e.g. after sign-in)
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(usageKey) || "{}");
      const today = new Date().toISOString().slice(0, 10);
      setDailyUses(stored.date === today ? stored.count : 0);
    } catch {}
  }, [user?.id]);
  const trackUsage = () => { const today = new Date().toISOString().slice(0, 10); const newCount = dailyUses + 1; setDailyUses(newCount); try { localStorage.setItem(usageKey, JSON.stringify({ date: today, count: newCount })); } catch {} return newCount; };

  // Rebalance frequency → simulated milliseconds (demo-friendly timescale)
  const REBAL_MS = { daily: 120000, weekly: 300000, "semi-monthly": 480000, monthly: 600000, quarterly: 1200000, "semi-annually": 1800000, annually: 2700000 };
  const REBAL_LABELS = { daily: "24h", weekly: "7 days", "semi-monthly": "15 days", monthly: "30 days", quarterly: "90 days", "semi-annually": "180 days", annually: "365 days" };

  // Set rebalance deadline when portfolio is created or after each rebalance
  const resetRebalDeadline = useCallback((freq) => {
    const ms = REBAL_MS[freq] || REBAL_MS.quarterly;
    setRebalDeadline(Date.now() + ms);
  }, []);

  // Auto-rebalance countdown timer
  useEffect(() => {
    if (!portfolio || !rebalDeadline) return;
    const iv = setInterval(() => {
      const remaining = rebalDeadline - Date.now();
      if (remaining <= 0) {
        setRebalCountdown("REBALANCING...");
        if (autoRebalEnabled && !loading) {
          clearInterval(iv);
          // Auto-trigger the AI rebalance
          if (weeklyUpdateRef.current) weeklyUpdateRef.current();
        }
        return;
      }
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      const freq = portfolio.userRebalFreq || rebalFreq;
      const totalMs = REBAL_MS[freq] || REBAL_MS.quarterly;
      const pct = Math.round((remaining / totalMs) * 100);
      setRebalCountdown(`${mins}:${String(secs).padStart(2, "0")} remaining (simulating ${REBAL_LABELS[freq] || freq}) — ${pct}%`);
    }, 1000);
    return () => clearInterval(iv);
  }, [portfolio?.id, rebalDeadline, autoRebalEnabled, loading]);

  // Money market accrual on cash (4.5% APY, simulated: 30s = 1 day)
  useEffect(() => {
    if (!portfolio || cashBalance <= 0) return;
    const createdTs = portfolio.createdTs || Date.now();
    const SIM_DAY_MS = 30000; // 30 real seconds = 1 simulated day (matches: 15min/month ÷ 30 days)
    const timer = setInterval(() => {
      if (Date.now() - createdTs < 600000) return; // grace period
      setCashBalance(prev => prev + prev * DAILY_MM_RATE);
    }, SIM_DAY_MS);
    return () => clearInterval(timer);
  }, [portfolio?.id, cashBalance > 0]);

  // Price simulation engine — holdings drift based on volatility
  const [liveAllocations, setLiveAllocations] = useState({});
  
  useEffect(() => {
    if (!portfolio) return;
    // Initialize live allocations — preserve existing live values, only add new ones
    setLiveAllocations(prev => {
      const next = { ...prev };
      portfolio.holdings.forEach((h, i) => { if (next[i] === undefined) next[i] = h.liveValue || h.allocation; });
      return next;
    });
  }, [portfolio?.id, portfolio?.holdings?.length]);

  // ══════ REAL-TIME PRICE ENGINE ══════
  // Fetches actual market prices from Finnhub every 30 seconds.
  // Portfolio value = Σ(shares × currentPrice) for each holding.
  // This is how real brokerages work: you own shares, price moves, value changes.
  const livePricesRef = useRef({}); // { symbol: { price, prevClose } } — avoids React state mutation
  useEffect(() => {
    if (!portfolio) return;
    let cancelled = false;
    const fetchAndUpdate = async () => {
      try {
      const quotes = await fetchRealQuotes(portfolio.holdings);
      if (cancelled) return;
      // Store live prices in ref for display access (no re-render needed, liveAllocations handles that)
      Object.entries(quotes).forEach(([sym, q]) => { livePricesRef.current[sym] = q; });
      setLiveAllocations(prev => {
        const next = { ...prev };
        portfolio.holdings.forEach((h, i) => {
          if (excludedIdx.has(i)) return;
          let q = quotes[h.symbol];
          // Validate price — reject stale ghosts (cap) or bad feeds (>90% drop vs last-good)
          if (q && q.price) {
            const valid = validateQuotePrice(h.symbol, q.price, h.type);
            if (!valid) {
              const fallback = lastGoodPrice[h.symbol];
              q = fallback ? { ...q, price: fallback } : null;
            }
          }
          if (q && h.shares && h.shares > 0) {
            // REAL BROKERAGE MATH: value = shares × current market price
            const costBasis = h.originalAllocation || h.allocation; // originalAllocation = immutable cost anchor
            const isShort = h.action === "SHORT";
            if (isShort) {
              next[i] = costBasis + (h.entryPrice - q.price) * h.shares;
            } else {
              next[i] = h.shares * q.price;
            }
          } else if (!q && !isMarketOpen(h.type)) {
            // Market closed and no quote — keep last value, no random drift
            next[i] = prev[i] || h.allocation;
          }
          // If no quote and market is open, keep last known value (prev[i])
          // Never use random drift — only real prices or frozen values
        });
        return next;
      });
      // ══════ DIVIDEND ENGINE (DRIP) — Builder ══════
      if (portfolio.createdAt) {
        let anyDivs = false;
        const divTxBatch = [];
        const divUpdates = {}; // { index: { shares, lastDividendTs } }
        portfolio.holdings.forEach((h, i) => {
          if (excludedIdx.has(i)) return;
          const q = quotes[h.symbol];
          const cp = q ? q.price : (h.livePrice || h.entryPrice);
          if (!cp) return;
          const divCheck = checkDividendDue(h, portfolio.createdAt, h.lastDividendTs, cp);
          if (!divCheck || !divCheck.isDue) return;
          anyDivs = true;
          const newShares = (h.shares || 0) + divCheck.sharesAdded;
          divUpdates[i] = { shares: newShares, lastDividendTs: Date.now() };
          divTxBatch.push({
            type: "DIVIDEND", symbol: h.symbol, name: h.name || h.symbol,
            amount: divCheck.amount, ts: Date.now(),
            orderId: `DIV-${h.symbol}-${Date.now().toString(36).toUpperCase()}`,
            executionTime: new Date().toISOString(),
            pricePerShare: cp, shares: divCheck.sharesAdded,
            commission: 0, orderType: "DRIP", status: "REINVESTED",
            weight: h.weight, assetType: h.type,
            reason: `Dividend: $${divCheck.dividendPerShare}/share × ${(h.shares || 0).toFixed(4)} shares = $${divCheck.amount.toFixed(2)} → reinvested ${divCheck.sharesAdded.toFixed(6)} shares at $${cp.toFixed(2)} (${(divCheck.yieldAnnual * 100).toFixed(2)}% annual yield)`,
          });
        });
        if (anyDivs && divTxBatch.length > 0) {
          setTransactions(prev => [...prev, ...divTxBatch].slice(-100));
          // Immutable update: create new holdings array with updated shares
          setPortfolio(prev => {
            if (!prev) return prev;
            const updated = prev.holdings.map((h, i) => divUpdates[i] ? { ...h, shares: divUpdates[i].shares, lastDividendTs: divUpdates[i].lastDividendTs } : h);
            return { ...prev, holdings: updated };
          });
        }
      }
      } catch (e) { console.error("[Builder] Price engine error:", e.message); }
    };
    // Fetch immediately on mount, then every 20 seconds
    fetchAndUpdate();
    const timer = setInterval(fetchAndUpdate, 20000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [portfolio?.id, excludedIdx.size, portfolio?.holdings?.length]);
  // Compute live NAV — sum of all holdings (shares × currentPrice) + cash
  const currentNAV = useMemo(() => {
    if (!portfolio) return SEED_CAPITAL;
    const holdingsValue = portfolio.holdings.reduce((s, h, i) => {
      if (excludedIdx.has(i)) return s;
      return s + (liveAllocations[i] || h.allocation);
    }, 0);
    return Math.round(holdingsValue + cashBalance);
  }, [portfolio, liveAllocations, cashBalance, excludedIdx]);

  // NAV history tracking — snapshots every 15s at stable interval
  const cashRef = useRef(cashBalance); cashRef.current = cashBalance;
  useEffect(() => {
    if (!portfolio) return;
    const snap = () => {
      setNavHistory(prev => [...prev.slice(-500), { ts: Date.now(), nav: navRef.current, cash: Math.round(cashRef.current) }]);
    };
    snap();
    const timer = setInterval(snap, 15000);
    return () => clearInterval(timer);
  }, [portfolio?.id]);

  // Expense fee deduction — 1x per simulated month, accrued on fund balance
  // Math: 0.5% annual = 0.04167% monthly. On $1M fund = $416.67/month
  const navRef = useRef(currentNAV); navRef.current = currentNAV;
  const liveAllocRef = useRef(liveAllocations); liveAllocRef.current = liveAllocations;
  useEffect(() => {
    if (!portfolio || editFee <= 0) return;
    // Only run fee simulation AFTER the portfolio is saved — not in Builder preview
    if (!portfolio.dbId && !saved) return;
    const createdTs = portfolio.createdTs || Date.now();
    const SIM_MONTH_MS = 900000; // 15 real minutes = 1 simulated month
    const timer = setInterval(() => {
      if (Date.now() - createdTs < 600000) return; // grace period
      const nav = navRef.current;
      if (nav <= 0) return;
      const monthlyRate = (editFee / 100) / 12; // e.g. 0.5%/yr → 0.04167%/mo
      const deduction = Math.round(nav * monthlyRate);
      if (deduction <= 0) return;
      // Deduct proportionally from ALL holdings (how real ETF expense ratios work)
      setLiveAllocations(prev => {
        const next = { ...prev };
        const allocs = liveAllocRef.current;
        const holdingsTotal = Object.values(allocs).reduce((s, v) => s + v, 0);
        if (holdingsTotal <= 0) return prev;
        portfolio.holdings.forEach((h, i) => {
          if (!next[i] || next[i] <= 0) return;
          const share = next[i] / holdingsTotal; // this holding's share of total
          next[i] = Math.max(0, next[i] - (deduction * share));
        });
        return next;
      });
      setTransactions(prev => [...prev, {
        type: "FEE", symbol: "EXPENSE", amount: deduction, ts: Date.now(),
        reason: `Monthly fund expense (${editFee}% annual ÷ 12 = ${fmt(monthlyRate * 100, 4)}%/mo). Accrued on fund balance of ${fmtUSD(nav)}. Deduction: ${fmtUSD(deduction)} allocated proportionally across all holdings.`
      }]);
      setPortfolio(prev => prev ? { ...prev, fee: editFee } : prev);
    }, SIM_MONTH_MS);
    return () => clearInterval(timer);
  }, [portfolio?.id, editFee, saved]);

  // Auto-sell: if position drifts beyond user threshold, sell to cash
  const excludedRef = useRef(excludedIdx); excludedRef.current = excludedIdx;
  useEffect(() => {
    if (!portfolio || autoSellPct <= 0) return;
    const timer = setInterval(() => {
      const allocs = liveAllocRef.current;
      const excluded = excludedRef.current;
      portfolio.holdings.forEach((h, i) => {
        if (excluded.has(i)) return;
        if (!isMarketOpen(h.type)) return; // Can't sell when market is closed
        const liveVal = allocs[i] || h.allocation;
        // Target = holding's weight% of CURRENT NAV, not the stale initial allocation
        const targetVal = (h.weight / 100) * (navRef.current || h.allocation);
        if (targetVal <= 0) return;
        const driftPct = Math.abs((liveVal - targetVal) / targetVal) * 100;
        if (driftPct >= autoSellPct) {
          const amt = Math.round(liveVal);
          setCashBalance(prev => prev + amt);
          setLiveAllocations(prev => ({ ...prev, [i]: 0 }));
          setExcludedIdx(prev => new Set([...prev, i]));
          setTransactions(prev => [...prev, { type: "AUTO-SELL", symbol: h.symbol, amount: amt, ts: Date.now(), reason: `Auto-sold: ${h.symbol} drifted ${fmt(driftPct, 1)}% from target (threshold: ±${autoSellPct}%). $${amt.toLocaleString()} moved to cash.` }]);
          return; // Skip further checks for this holding
        }
        // ── STOP LOSS: execute if live price breaks below stop ──────────────
        if (h.stopLoss && h.action !== "SHORT") {
          const stopPx = parseFloat(String(h.stopLoss).replace(/[^0-9.]/g, ""));
          const livePx = livePricesRef.current[h.symbol]?.price;
          if (stopPx > 0 && livePx > 0 && livePx <= stopPx) {
            const amt = Math.round(liveVal);
            setCashBalance(prev => prev + amt);
            setLiveAllocations(prev => ({ ...prev, [i]: 0 }));
            setExcludedIdx(prev => new Set([...prev, i]));
            setTransactions(prev => [...prev, { type: "STOP-LOSS", symbol: h.symbol, amount: amt, ts: Date.now(),
              reason: `🛑 Stop-loss triggered: ${h.symbol} hit $${livePx.toFixed(2)} ≤ stop $${stopPx.toFixed(2)}. Position closed, $${amt.toLocaleString()} moved to cash.` }]);
          }
        }
        // ── PRICE TARGET: notify (sell half) if live price exceeds target ──
        if (h.priceTarget && h.action !== "SHORT" && !excludedRef.current.has(i)) {
          const targetPx = parseFloat(String(h.priceTarget).replace(/[^0-9.]/g, ""));
          const livePx = livePricesRef.current[h.symbol]?.price;
          if (targetPx > 0 && livePx > 0 && livePx >= targetPx) {
            // Trim half position at target — classic institutional take-profit
            const trimAmt = Math.round(liveVal * 0.5);
            setCashBalance(prev => prev + trimAmt);
            setLiveAllocations(prev => ({ ...prev, [i]: Math.round(liveVal * 0.5) }));
            // Update shares to reflect half sold
            setPortfolio(prev => { if (!prev) return prev;
              const upd = prev.holdings.map((hh, ii) => ii === i ? { ...hh, shares: Math.round((hh.shares || 0) * 0.5 * 100000000) / 100000000 } : hh);
              return { ...prev, holdings: upd };
            });
            setTransactions(prev => [...prev, { type: "TAKE-PROFIT", symbol: h.symbol, amount: trimAmt, ts: Date.now(),
              reason: `🎯 Price target hit: ${h.symbol} reached $${livePx.toFixed(2)} ≥ target $${targetPx.toFixed(2)}. Trimmed 50% ($${trimAmt.toLocaleString()}) to cash.` }]);
          }
        }
      });
    }, 30000);
    return () => clearInterval(timer);
  }, [portfolio?.id, autoSellPct]);

  const sellToCash = (idx) => {
    if (!portfolio) return;
    const h = portfolio.holdings[idx];
    const liveVal = liveAllocations[idx] || h.allocation;
    setCashBalance(prev => prev + liveVal);
    // NOTE: liveAllocations[idx] intentionally NOT zeroed — frozen value is used by Restore
    // Price sim skips excluded indices, so no further drift occurs
    const n = new Set(excludedIdx); n.add(idx); setExcludedIdx(n);
    setTransactions(prev => [...prev, { type: "SELL", symbol: h.symbol, amount: Math.round(liveVal), ts: Date.now(), reason: `Sold to cash at ${fmtUSD(Math.round(liveVal))} (money market 4.5% APY)` }]);
  };

  const shortHolding = (idx) => {
    if (!portfolio) return;
    const h = portfolio.holdings[idx];
    const liveVal = Math.round(liveAllocations[idx] || h.allocation);
    const updated = { ...portfolio, holdings: portfolio.holdings.map((old, i) => i === idx ? { ...old, action: "SHORT", role: "Short" } : old) };
    setPortfolio(updated);
    setTransactions(prev => [...prev, { type: "SHORT", symbol: h.symbol, amount: liveVal, ts: Date.now(), reason: `Shorted ${h.symbol} at ${fmtUSD(liveVal)} notional. Position will profit if ${h.symbol} declines, lose if it rises.` }]);
  };

  // Auto-open save modal when user signs in after clicking Save
  useEffect(() => { if (user && pendingSave && portfolio && !saved) { setSaveErr(""); setShowSaveModal(true); setPendingSave(false); } }, [user, pendingSave, portfolio, saved]);

  // ── Grok (xAI) — primary AI backend ──
  const callGrok = async (systemPrompt, userPrompt, maxTokens = 8192, temperature = 0.7) => {
    const apiKey = typeof import.meta !== "undefined" ? (import.meta.env?.VITE_XAI_API_KEY || import.meta.env?.VITE_GROK_API_KEY || "") : "";
    const proxyUrl = typeof import.meta !== "undefined" ? (import.meta.env?.VITE_API_PROXY_URL || null) : null;
    const apiUrl = proxyUrl || "https://api.x.ai/v1/chat/completions";
    if (!proxyUrl && !apiKey) throw new Error("API_KEY_MISSING");
    const headers = { "Content-Type": "application/json" };
    if (apiKey && !proxyUrl) headers["Authorization"] = `Bearer ${apiKey}`;
    const res = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "grok-3-latest",
        max_tokens: maxTokens,
        temperature,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      })
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      let errMsg = `API error ${res.status}`;
      try { const j = JSON.parse(errText); errMsg = j.error?.message || j.error || j.detail || errMsg; } catch {}
      if (res.status === 401) throw new Error("API_KEY_INVALID");
      if (res.status === 429) throw new Error("RATE_LIMIT");
      throw new Error(errMsg);
    }
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content || "";
    if (!raw) throw new Error("Grok returned empty response");
    return raw.replace(/```json|```/g, "").trim();
  };

  const generate = async () => {
    if (!thesis.trim()) return setErr("Describe your investment thesis first.");
    if (dailyUses >= DAILY_LIMIT) return setErr(user ? `Daily limit reached (${DAILY_LIMIT} AI generations per day). Your limit resets at midnight. Upgrade to Pro for unlimited generations.` : `Daily limit reached (${DAILY_LIMIT}/day for guests). Sign in for ${25} generations per day!`);
    setLoading(true); setErr(""); setPortfolio(null); setSaved(false); setExcludedIdx(new Set()); setGenStep(1);
    setGenElapsed(0);
    if (genTimerRef.current) clearInterval(genTimerRef.current);
    genTimerRef.current = setInterval(() => setGenElapsed(prev => prev + 1), 1000);
    trackUsage();
    try {
      const userPrompt = `Design a professional ETF portfolio for the following investment thesis:\n\n"${thesis}"\n\nPORTFOLIO PARAMETERS (user-selected):\n- Risk Profile: ${riskProfile.toUpperCase()}\n- Time Horizon: ${timeHorizon}\n- Rebalance/Recommendation Frequency: ${rebalFreq}\n\nAs CIO, construct a fully realized 10-holding portfolio with $1,000,000 in seed capital. Use the "${riskProfile}" risk framework and "${rebalFreq}" rebalance schedule. The portfolio should be designed for a ${timeHorizon} investment horizon.\n\nReturn the complete JSON with ALL fields from the schema populated. Every field matters.`;
      const raw = await callGrok(AI_SYSTEM_PROMPT, userPrompt, 8192, 0.7);
      const p = JSON.parse(raw);
      if (!p.holdings || p.holdings.length < 5 || p.holdings.length > 20) throw new Error(`AI returned ${p.holdings?.length || 0} holdings — expected 5-20. Try regenerating.`);
      setGenStep(2);
      // Force holdings + cash = EXACTLY $1,000,000 (scale proportionally if AI miscalculated)
      const initCash = p.cashPosition?.amount || 0;
      const rawTotal = p.holdings.reduce((s, h) => s + h.allocation, 0) + initCash;
      if (rawTotal > 0 && Math.abs(rawTotal - SEED_CAPITAL) > 1) {
        // Scale all holdings to fill exactly $1M minus cash
        const holdingsTarget = SEED_CAPITAL - initCash;
        const holdingsRaw = p.holdings.reduce((s, h) => s + h.allocation, 0);
        if (holdingsRaw > 0) {
          const scale = holdingsTarget / holdingsRaw;
          p.holdings = p.holdings.map(h => ({ ...h, allocation: Math.round(h.allocation * scale) }));
          // Fix rounding: adjust the largest holding to make it exact
          const adjusted = p.holdings.reduce((s, h) => s + h.allocation, 0);
          const diff = holdingsTarget - adjusted;
          if (diff !== 0) { const maxIdx = p.holdings.reduce((mi, h, i) => h.allocation > p.holdings[mi].allocation ? i : mi, 0); p.holdings[maxIdx].allocation += diff; }
          // Recalculate weights from corrected allocations
          p.holdings = p.holdings.map(h => ({ ...h, weight: Math.round(h.allocation / SEED_CAPITAL * 1000) / 10 }));
        }
      }
      // ══════ FETCH REAL MARKET PRICES AT CREATION ══════
      // This is the core brokerage logic: buy at real prices, compute real shares
      setGenStep(3);
      let realQuotes = await fetchRealQuotes(p.holdings);
      // Retry any symbols that were missed by the batch fetch
      realQuotes = await retryMissingQuotes(p.holdings, realQuotes);
      setGenStep(4);
      console.log("[Builder] Real quotes fetched:", Object.keys(realQuotes).length, "of", p.holdings.length, "holdings");
      
      // Cross-validate problematic tickers before locking entry prices
      for (const h of p.holdings) {
        const q = realQuotes[h.symbol];
        if (q && KNOWN_PROBLEMATIC_TICKERS.has(h.symbol)) {
          const validated = await crossValidateCryptoPrice(h.symbol, q.price);
          if (validated !== q.price) {
            console.log(`[Builder] Price corrected for ${h.symbol}: $${q.price} → $${validated}`);
            realQuotes[h.symbol] = { ...q, price: validated };
          }
        }
      }

      p.holdings = p.holdings.map(h => {
        const q = realQuotes[h.symbol];
        let entryPrice = q ? q.price : null;
        // COMMODITY ETF FALLBACK: use known March 2026 prices when Finnhub fails
        if (!entryPrice && COMMODITY_ETF_KNOWN_PRICES[h.symbol]) {
          entryPrice = COMMODITY_ETF_KNOWN_PRICES[h.symbol];
        }
        // Non-commodity fallback: AI financialMetrics estimate
        if (!entryPrice && !COMMODITY_ETF_KNOWN_PRICES[h.symbol]) {
          entryPrice = h.financialMetrics?.pricePerShare || null;
        }
        // COMMODITY ETF FLOOR: reject AI estimates below known minimum (e.g. GLD AI estimate ~$330 vs real $472)
        const minP = COMMODITY_ETF_MIN_PRICES[h.symbol];
        if (entryPrice && minP && entryPrice < minP) {
          entryPrice = COMMODITY_ETF_KNOWN_PRICES[h.symbol] || null;
        }
        // Final sanity check: reject obviously bad prices
        if (entryPrice && !validateQuotePrice(h.symbol, entryPrice, h.type)) {
          console.warn(`[Builder] Rejected bad price for ${h.symbol}: $${entryPrice}`);
          entryPrice = COMMODITY_ETF_KNOWN_PRICES[h.symbol] || null;
        }
        const shares = entryPrice ? h.allocation / entryPrice : null;
        return {
          ...h,
          targetWeight: h.weight, currentWeight: h.weight,
          action: h.action || "BUY", conviction: h.conviction || "medium",
          // BROKERAGE FIELDS — these persist and drive all P&L calculations
          entryPrice: entryPrice ? Math.round(entryPrice * 10000) / 10000 : null,
          shares: shares ? Math.round(shares * 100000000) / 100000000 : null, // 8 decimal precision for crypto
          entryDate: new Date().toISOString(),
          livePrice: entryPrice, // Initially = entry price, updated by live engine
          liveValue: h.allocation, // Initially = allocation, updated by live engine
        };
      });
      
      // ══════ FINAL NORMALIZATION — force holdings + cash = EXACTLY $1,000,000 ══════
      // The AI + real prices may cause small drift. This is the last line of defense.
      const holdingsSum = p.holdings.reduce((s, h) => s + (h.liveValue || h.allocation || 0), 0);
      const totalCreated = holdingsSum + initCash;
      if (totalCreated > 0 && Math.abs(totalCreated - SEED_CAPITAL) > 1) {
        console.log(`[Builder] Normalizing: holdings($${holdingsSum}) + cash($${initCash}) = $${totalCreated} → $${SEED_CAPITAL}`);
        const targetHoldings = SEED_CAPITAL - initCash;
        const scale = targetHoldings / holdingsSum;
        p.holdings = p.holdings.map(h => {
          const newAlloc = Math.round((h.allocation || 0) * scale);
          const newLive = Math.round((h.liveValue || h.allocation || 0) * scale);
          const newShares = h.entryPrice > 0 ? newAlloc / h.entryPrice : h.shares;
          return { ...h, allocation: newAlloc, liveValue: newLive, originalAllocation: newAlloc, shares: newShares ? Math.round(newShares * 100000000) / 100000000 : h.shares, weight: Math.round(newAlloc / SEED_CAPITAL * 1000) / 10 };
        });
        // Fix rounding on largest holding
        const adjSum = p.holdings.reduce((s, h) => s + h.allocation, 0);
        const diff = targetHoldings - adjSum;
        if (diff !== 0) {
          const maxIdx = p.holdings.reduce((mi, h, i) => h.allocation > p.holdings[mi].allocation ? i : mi, 0);
          p.holdings[maxIdx].allocation += diff;
          p.holdings[maxIdx].liveValue += diff;
          p.holdings[maxIdx].originalAllocation += diff;
        }
        console.log(`[Builder] ✓ Normalized: holdings($${p.holdings.reduce((s,h)=>s+h.allocation,0)}) + cash($${initCash}) = $${p.holdings.reduce((s,h)=>s+h.allocation,0) + initCash}`);
      }
      
      setCashBalance(initCash);
      setNavHistory([{ ts: Date.now(), nav: 1000000, cash: initCash }]);
      const execTime = Date.now();
      const settlementDate = new Date(execTime + 2 * 86400000).toISOString().slice(0, 10); // T+2 settlement
      const initTxs = p.holdings.map((h, i) => ({
        type: h.action === "SHORT" ? "SHORT" : "BUY",
        symbol: h.symbol, name: h.name, amount: h.allocation, ts: execTime,
        orderId: `ORD-${Date.now().toString(36).toUpperCase()}-${String(i + 1).padStart(3, "0")}`,
        executionTime: new Date(execTime).toISOString(),
        pricePerShare: h.entryPrice || 0,
        shares: h.shares || 0,
        commission: 0, settlementDate, orderType: "MARKET", status: "FILLED",
        weight: h.weight, assetType: h.type,
        reason: h.entryPrice
          ? `Initial portfolio construction — ${h.weight}% allocation ($${h.allocation.toLocaleString()}) at ${fmtPrice(h.entryPrice)}/share × ${fmt(h.shares, 4)} shares`
          : `Initial portfolio construction — ${h.weight}% allocation ($${h.allocation.toLocaleString()}) — real-time price unavailable, tracking by allocation`,
      }));
      if (initCash > 0) initTxs.push({ type: "CASH", symbol: "MONEY MKT", name: "Money Market Sweep", amount: initCash, ts: execTime, orderId: `ORD-${Date.now().toString(36).toUpperCase()}-CSH`, executionTime: new Date(execTime).toISOString(), pricePerShare: 1, shares: initCash, commission: 0, settlementDate: new Date(execTime).toISOString().slice(0, 10), orderType: "SWEEP", status: "SETTLED", weight: (initCash / SEED_CAPITAL * 100), assetType: "cash", reason: `Cash sweep to money market fund at 4.5% APY` });
      setTransactions(initTxs);
      setPortfolio({ ...p, id: Date.now(), createdTs: Date.now(), thesis, originalPrompt: thesis, value: 1000000, costBasis: 1000000, initialCashBalance: initCash, createdAt: new Date().toISOString(), trackingData: [{ ts: Date.now(), value: 1000000 }], rebalanceThreshold: 5, userRiskProfile: riskProfile, userTimeHorizon: timeHorizon, userRebalFreq: rebalFreq });
      setEditName(p.name || ""); setEditTicker(p.ticker || ""); setEditingWeights({}); setEditFee(p.fee || 0.5); setAutoSellPct(0); setLastExpenseTs(Date.now()); resetRebalDeadline(rebalFreq); setNameEdited(false);
      setExcludedIdx(new Set()); setOpenIdx(null); setGenStep(5);
      if (genTimerRef.current) { clearInterval(genTimerRef.current); genTimerRef.current = null; }
    } catch (e) {
      if (e.message === "API_KEY_MISSING") setErr("AI key not configured. Add VITE_XAI_API_KEY to Vercel environment variables.");
      else if (e.message === "API_KEY_INVALID") setErr("Invalid API key. Check VITE_XAI_API_KEY in Vercel environment variables.");
      else if (e.message === "RATE_LIMIT") setErr("Rate limit hit — please wait a moment and try again.");
      else setErr("Generation failed: " + (e.message || "Unknown error. Please try again."));
      setGenStep(0);
      if (genTimerRef.current) { clearInterval(genTimerRef.current); genTimerRef.current = null; }
    }
    setLoading(false);
  };

  const refreshHolding = async (idx) => {
    if (!portfolio || refreshingIdx !== null) return;
    if (dailyUses >= DAILY_LIMIT) { setErr(user ? `Daily limit reached (${DAILY_LIMIT}/day). Resets at midnight.` : `Guest limit reached (${DAILY_LIMIT}/day). Sign in for 25/day!`); return; }
    setRefreshingIdx(idx); trackUsage();
    try {
      const h = portfolio.holdings[idx];
      const otherSymbols = portfolio.holdings.filter((_, i) => i !== idx && !excludedIdx.has(i)).map(x => x.symbol).join(", ");
      const refreshPrompt = `You are replacing ONE holding in an existing ETF portfolio.\n\nCurrent portfolio thesis: "${portfolio.thesis || thesis}"\nRisk Profile: ${portfolio.userRiskProfile || riskProfile}\nTime Horizon: ${portfolio.userTimeHorizon || timeHorizon}\n\nHolding being replaced: ${h.symbol} (${h.name}) — Weight: ${h.weight}%, Allocation: $${h.allocation}, Role: ${h.role}\n\nOther holdings already in portfolio (DO NOT duplicate): ${otherSymbols}\n\nFind a REPLACEMENT holding that:\n1. Fills the same role (${h.role}) and approximate weight (${h.weight}%)\n2. Is NOT already in the portfolio\n3. Follows the CREATIVITY rules — avoid obvious mega-caps, find hidden gems\n4. Has similar risk characteristics but potentially better upside\n\nReturn ONLY a JSON object with these fields (no markdown, no explanation):\n{"symbol":"TICK","name":"Full Name","description":"One line description","type":"stock|etf|crypto|commodity","weight":${h.weight},"allocation":${h.allocation},"role":"${h.role}","sector":"...","marketCap":"...","conviction":"high|medium|low","thesisConnection":"How this connects to the thesis","rationale":"3-4 sentence financial rationale","financialMetrics":{"marketCapValue":"$XB","ltmRevenue":"$XB","ebitda":"$XM","evRevenue":"X.Xx","evEbitda":"X.Xx","peRatio":"X.Xx","revenueGrowth":"X%","dividendYield":"X%"},"exitTrigger":"When to sell..."}`;
      const rawH = await callGrok("You are an expert portfolio manager. Return ONLY valid JSON, no markdown fences.", refreshPrompt, 2048, 0.85);
      const newH = JSON.parse(rawH);
      newH.targetWeight = newH.weight;
      newH.currentWeight = newH.weight;
      // Fetch real price for the new holding
      const refreshQuotes = await fetchRealQuotes([newH]);
      const rq = refreshQuotes[newH.symbol];
      if (rq) {
        newH.entryPrice = Math.round(rq.price * 10000) / 10000;
        newH.shares = newH.allocation ? Math.round((newH.allocation / rq.price) * 100000000) / 100000000 : null;
        newH.livePrice = rq.price;
        newH.liveValue = newH.allocation;
      }
      newH.entryDate = new Date().toISOString();
      const updated = { ...portfolio, holdings: portfolio.holdings.map((old, i) => i === idx ? newH : old) };
      setPortfolio(updated);
      // Remove from excluded if it was excluded
      if (excludedIdx.has(idx)) { const n = new Set(excludedIdx); n.delete(idx); setExcludedIdx(n); }
    } catch (e) { alert("Refresh failed: " + (e.message || "Try again")); }
    setRefreshingIdx(null);
  };

  const weeklyUpdateRef = useRef(null);
  const weeklyUpdate = async () => {
    if (!portfolio || loading) return;
    if (dailyUses >= DAILY_LIMIT) { setErr(user ? `Daily limit reached (${DAILY_LIMIT} AI generations per day). Resets at midnight.` : `Guest limit reached (${DAILY_LIMIT}/day). Sign in for 25/day!`); return; }
    setLoading(true); setErr(""); trackUsage();
    try {
      const currentHoldings = portfolio.holdings.filter((_, i) => !excludedIdx.has(i)).map((h, idx) => { const liveVal = liveAllocations[portfolio.holdings.indexOf(h)] || h.allocation; const pnl = ((liveVal / h.allocation) - 1) * 100; return `${h.symbol} (${h.name}) — Original: $${h.allocation} — Live: $${Math.round(liveVal)} (${pnl >= 0 ? '+' : ''}${pnl.toFixed(1)}%) — ${h.role} — ${h.action || 'HOLD'}`; }).join("\n");
      const soldSyms = portfolio.holdings.filter((_, i) => excludedIdx.has(i)).map(h => h.symbol).join(", ");
      const updatePrompt = `SCHEDULED PORTFOLIO REVIEW — ACTIVE TRADING\n\nThesis: "${portfolio.thesis || thesis}"\nRisk: ${portfolio.userRiskProfile || riskProfile} | Horizon: ${portfolio.userTimeHorizon || timeHorizon} | Frequency: ${portfolio.userRebalFreq || rebalFreq}\nCurrent Total NAV: $${Math.round(currentNAV)} (started at $1M seed capital)\nCash Balance: $${Math.round(cashBalance)} (earning 4.5% APY money market)\nInvested in Holdings: $${Math.round(currentNAV - cashBalance)}\n${soldSyms ? "Recently sold to cash: " + soldSyms : ""}\n\nCurrent holdings:\n${currentHoldings}\n\nAs CIO perform a ${portfolio.userRebalFreq || "weekly"} review:\n1. For EACH holding: BUY MORE / HOLD / TRIM / SELL with reasoning\n2. Move proceeds to cash if selling — cash earns 4.5% APY\n3. SHORT overvalued securities if you see downside\n4. Find 1-3 NEW opportunities\n5. Portfolio: up to 10 holdings + cash = $${Math.round(currentNAV)} (current NAV — this may be above or below the original $1M seed)\n6. Include conviction, priceTarget, stopLoss for every holding\n7. Include weeklyOutlook\n\nGoldman Sachs-level active management. Show your edge.\n\nReturn complete JSON.`;
      const rawUpdate = await callGrok(AI_SYSTEM_PROMPT, updatePrompt, 8192, 0.7);
      const p = JSON.parse(rawUpdate);
      if (!p.holdings || p.holdings.length < 5 || p.holdings.length > 20) throw new Error(`AI returned ${p.holdings?.length || 0} holdings — expected 5-20. Try rebalancing again.`);
      const nc2 = p.cashPosition?.amount || 0;
      const total = p.holdings.reduce((s, h) => s + h.allocation, 0);
      const targetNAV = currentNAV; // Always use CURRENT portfolio NAV — never reset to $1M
      const holdingsTarget = targetNAV - nc2;
      if (total > 0 && Math.abs(total - holdingsTarget) > 1) {
        // Proportionally scale ALL holdings to match current NAV exactly
        const scale = holdingsTarget / total;
        p.holdings = p.holdings.map(h => ({ ...h, allocation: Math.round(h.allocation * scale) }));
        // Rounding correction: adjust largest holding for penny-perfect accuracy
        const adj = p.holdings.reduce((s, h) => s + h.allocation, 0);
        const diff2 = Math.round(holdingsTarget - adj);
        if (diff2 !== 0) { const mx = p.holdings.reduce((mi, h, i2) => h.allocation > p.holdings[mi].allocation ? i2 : mi, 0); p.holdings[mx].allocation += diff2; }
        // Recalculate weights from corrected allocations  
        p.holdings = p.holdings.map(h => ({ ...h, weight: Math.round(h.allocation / targetNAV * 1000) / 10 }));
      }
      p.holdings = p.holdings.map(h => ({ ...h, targetWeight: h.weight, currentWeight: h.weight }));
      // Preserve entryPrice/shares for existing holdings, fetch real for new ones
      const oldHoldingsMap = {};
      (portfolio.holdings || []).forEach(oh => { if (oh.entryPrice && oh.shares) oldHoldingsMap[oh.symbol] = oh; });
      let newQuotes = await fetchRealQuotes(p.holdings.filter(h => !oldHoldingsMap[h.symbol]));
      newQuotes = await retryMissingQuotes(p.holdings.filter(h => !oldHoldingsMap[h.symbol]), newQuotes);
      p.holdings = p.holdings.map(h => {
        const old = oldHoldingsMap[h.symbol];
        if (old) {
          // Kept holding — preserve ORIGINAL cost basis so P&L tracks from initial entry
          // Update shares to match new allocation at current live price (brokerage-correct rebalance)
          const liveP = old.livePrice || old.entryPrice;
          const newShares = liveP > 0 ? Math.round((h.allocation / liveP) * 100000000) / 100000000 : old.shares;
          return { ...h, entryPrice: old.entryPrice, shares: newShares, entryDate: old.entryDate,
                   originalAllocation: old.originalAllocation || old.allocation, // ← PRESERVE COST BASIS
                   livePrice: liveP, liveValue: h.allocation };
        }
        // New holding — use real price
        const q = newQuotes[h.symbol];
        const ep = q ? q.price : (h.entryPrice || null);
        const sh = ep ? h.allocation / ep : null;
        return { ...h, entryPrice: ep ? Math.round(ep * 10000) / 10000 : null, shares: sh ? Math.round(sh * 100000000) / 100000000 : null, entryDate: new Date().toISOString(), livePrice: ep, liveValue: h.allocation, originalAllocation: h.allocation };
      });
      const nc = p.cashPosition?.amount || 0;
      setCashBalance(nc);
      const newAllocTotal = p.holdings.reduce((s, h) => s + h.allocation, 0) + nc;
      setNavHistory(prev => [...prev, { ts: Date.now(), nav: Math.round(newAllocTotal), cash: nc }]);
      const rebalTxs = p.holdings.filter(h => h.action !== "HOLD").map(h => ({ type: h.action === "SHORT" ? "SHORT" : h.action === "SELL" ? "SELL" : "BUY", symbol: h.symbol, amount: h.allocation, ts: Date.now(), reason: "Rebalance: " + (h.action || "HOLD") }));
      if (nc > 0) rebalTxs.push({ type: "CASH", symbol: "MONEY MKT", amount: nc, ts: Date.now(), reason: "Cash at 4.5% APY" });
      setTransactions(prev => [...prev, ...rebalTxs]);
      setPortfolio({ ...p, id: portfolio.id || Date.now(), createdTs: portfolio.createdTs, thesis: portfolio.thesis || thesis, originalPrompt: portfolio.originalPrompt || portfolio.thesis || thesis, value: Math.round(newAllocTotal), costBasis: portfolio.costBasis || 1000000, initialCashBalance: portfolio.initialCashBalance || 0, createdAt: portfolio.createdAt || new Date().toISOString(), trackingData: [...(portfolio.trackingData || []), { ts: Date.now(), value: Math.round(newAllocTotal) }], rebalanceThreshold: 5, userRiskProfile: portfolio.userRiskProfile || riskProfile, userTimeHorizon: portfolio.userTimeHorizon || timeHorizon, userRebalFreq: portfolio.userRebalFreq || rebalFreq, lastUpdated: new Date().toISOString() });
      // Reset liveAllocations to match new holdings (deps won't change since id/length stay same)
      const freshAllocs = {}; p.holdings.forEach((h2, j) => { freshAllocs[j] = h2.allocation; }); setLiveAllocations(freshAllocs);
      setExcludedIdx(new Set()); setOpenIdx(null); setEditingWeights({});
      resetRebalDeadline(p.userRebalFreq || portfolio.userRebalFreq || rebalFreq);
    } catch (e) { setErr(e.message?.includes("5-20") 
        ? "AI returned an unexpected number of holdings. Try rebalancing again — this is rare."
        : "Rebalance failed: " + (e.message || "Try again")); }
    setLoading(false);
  };
  weeklyUpdateRef.current = weeklyUpdate;

  // Manual ETF creation — fetches REAL market prices like a brokerage
  const launchManualETF = async () => {
    const totalW = manualHoldings.reduce((s, h) => s + (h.weight || 0), 0) + manualCashPct;
    if (Math.abs(totalW - 100) > 0.5) { setErr(`Weights must total 100%. Currently: ${fmt(totalW, 1)}%`); return; }
    const invalid = manualHoldings.find(h => !h.symbol.trim());
    if (invalid) { setErr("Every holding must have a ticker symbol."); return; }
    if (manualHoldings.length < 1) { setErr("Add at least one holding."); return; }
    setLoading(true); setErr("");
    const cashAmt = Math.round(SEED_CAPITAL * manualCashPct / 100);
    const rawHoldings = manualHoldings.map((h, i) => ({
      symbol: h.symbol.toUpperCase().trim(),
      name: h.name || h.symbol.toUpperCase().trim(),
      type: h.type || "stock",
      weight: h.weight,
      allocation: Math.round(SEED_CAPITAL * h.weight / 100),
      action: "BUY", conviction: "medium",
      role: i === 0 ? "Core" : "Satellite",
      sector: "", description: h.name || "",
      thesisConnection: manualStrategy || "Manual selection by portfolio manager.",
    }));
    // Fetch real prices for all holdings
    let realQuotes = await fetchRealQuotes(rawHoldings);
    realQuotes = await retryMissingQuotes(rawHoldings, realQuotes);
    console.log("[Manual] Real quotes fetched:", Object.keys(realQuotes).length, "of", rawHoldings.length);
    const holdings = rawHoldings.map(h => {
      const q = realQuotes[h.symbol];
      const entryPrice = q ? q.price : null;
      const shares = entryPrice ? h.allocation / entryPrice : null;
      return {
        ...h,
        targetWeight: h.weight, currentWeight: h.weight,
        entryPrice: entryPrice ? Math.round(entryPrice * 10000) / 10000 : null,
        shares: shares ? Math.round(shares * 100000000) / 100000000 : null,
        entryDate: new Date().toISOString(),
        livePrice: entryPrice, liveValue: h.allocation,
      };
    });
    const manualExecTime = Date.now();
    const manualSettlement = new Date(manualExecTime + 2 * 86400000).toISOString().slice(0, 10);
    const initTxs = holdings.map((h, i) => ({
      type: "BUY", symbol: h.symbol, name: h.name, amount: h.allocation, ts: manualExecTime,
      orderId: `ORD-${manualExecTime.toString(36).toUpperCase()}-${String(i + 1).padStart(3, "0")}`,
      executionTime: new Date(manualExecTime).toISOString(),
      pricePerShare: h.entryPrice || 0, shares: h.shares || 0,
      commission: 0, settlementDate: manualSettlement, orderType: "MARKET", status: "FILLED",
      weight: h.weight, assetType: h.type,
      reason: h.entryPrice
        ? `Initial allocation: ${h.weight}% = ${fmtUSD(h.allocation)} at ${fmtPrice(h.entryPrice)}/share × ${fmt(h.shares, 4)} shares`
        : `Initial allocation: ${h.weight}% = ${fmtUSD(h.allocation)} — real-time price unavailable`,
    }));
    if (cashAmt > 0) initTxs.push({ type: "CASH", symbol: "MONEY MKT", name: "Money Market Sweep", amount: cashAmt, ts: manualExecTime, orderId: `ORD-${manualExecTime.toString(36).toUpperCase()}-CSH`, executionTime: new Date(manualExecTime).toISOString(), pricePerShare: 1, shares: cashAmt, commission: 0, settlementDate: new Date(manualExecTime).toISOString().slice(0, 10), orderType: "SWEEP", status: "SETTLED", weight: manualCashPct, assetType: "cash", reason: `Cash sweep to money market fund at 4.5% APY` });
    setCashBalance(cashAmt);
    setTransactions(initTxs);
    setNavHistory([{ ts: Date.now(), nav: SEED_CAPITAL, cash: cashAmt }]);
    const p = {
      name: manualName, ticker: manualTicker.toUpperCase(), strategy: manualStrategy || "Manually constructed portfolio.",
      riskProfile, holdings, value: SEED_CAPITAL, fee: 0.5,
      assetAllocation: { equities: holdings.filter(h => h.type === "stock").reduce((s, h) => s + h.weight, 0), crypto: holdings.filter(h => h.type === "crypto").reduce((s, h) => s + h.weight, 0), cash: manualCashPct },
    };
    setPortfolio({ ...p, id: Date.now(), createdTs: Date.now(), thesis: manualStrategy, originalPrompt: manualStrategy, value: SEED_CAPITAL, createdAt: new Date().toISOString(), trackingData: [{ ts: Date.now(), value: SEED_CAPITAL }], rebalanceThreshold: 5, userRiskProfile: riskProfile, userTimeHorizon: timeHorizon, userRebalFreq: rebalFreq });
    setEditName(p.name); setEditTicker(p.ticker); setEditingWeights({}); setEditFee(0.5); setAutoSellPct(0); resetRebalDeadline(rebalFreq); setNameEdited(true);
    const allocs = {}; holdings.forEach((h, i) => { allocs[i] = h.allocation; }); setLiveAllocations(allocs);
    setSaved(false); setExcludedIdx(new Set()); setErr(""); setLoading(false);
  };

  return (
    <div className="builder-container" style={{ maxWidth: 880, margin: "0 auto", padding: "36px 20px" }}>
      {/* ═══ BUILD MODE TOGGLE ═══ */}
      <div className="build-mode-toggle" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h1 style={{ color: C.text, fontSize: 26, margin: 0 }}>{buildMode === "ai" ? "AI ETF Builder" : "Manual ETF Builder"}</h1>
        <div style={{ display: "flex", gap: 4, background: C.surface, borderRadius: 8, padding: 3, border: `1px solid ${C.border}` }}>
          <button onClick={() => setBuildMode("ai")} style={{ padding: "6px 16px", borderRadius: 6, fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", border: "none", background: buildMode === "ai" ? C.accent : "transparent", color: buildMode === "ai" ? "#fff" : C.sub }}>🤖 AI-Powered</button>
          <button onClick={() => setBuildMode("manual")} style={{ padding: "6px 16px", borderRadius: 6, fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", border: "none", background: buildMode === "manual" ? C.accent : "transparent", color: buildMode === "manual" ? "#fff" : C.sub }}>🛠 Build Manually</button>
        </div>
      </div>
      <p style={{ color: C.sub, fontSize: 13.5, margin: "0 0 24px" }}>{buildMode === "ai" ? "Describe your investment thesis below. Our AI portfolio manager will construct a 10-holding, $1M ETF with institutional-grade asset allocation, risk management, and detailed rationale for every pick." : "Build your own ETF from scratch. Add holdings, set weights, and launch your fund with $1M in simulated capital — just like opening a self-directed brokerage account."}</p>
      {!user && <div style={{ ...cardS(), borderColor: C.accentBorder, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ color: C.sub, fontSize: 13 }}>Generate portfolios freely. <span style={{ color: C.accentLight }}>Sign in to save, track, and publish to the leaderboard.</span></span><button onClick={() => openAuth("signup")} style={{ ...btnP(), fontSize: 12.5, padding: "6px 16px" }}>Sign Up Free</button></div>}

      {buildMode === "ai" && (
      <div style={{ ...cardS(), marginBottom: 20 }}>
        <label style={{ color: C.dim, fontSize: 11, display: "block", marginBottom: 6, fontFamily: mono, letterSpacing: 0.5 }}>INVESTMENT THESIS</label>
        <textarea value={thesis} onChange={(e) => setThesis(e.target.value)} placeholder={"Describe your investment thesis in plain English...\n\ne.g. \"Build an ETF around the AI agent revolution — GPU makers, cloud platforms, and AI tokens. Aggressive risk, 5-year horizon.\"\n\nOr click an idea below to get started instantly ↓"} rows={5} style={{ ...inputS(), resize: "vertical", minHeight: 110, lineHeight: 1.5 }} />
        {/* ═══ THESIS INSPIRATION CARDS ═══ */}
        {!thesis.trim() && (
          <div style={{ marginBottom: 14 }}>
            {/* Trending — live from Supabase */}
            {trendingTheses.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ color: C.accent, fontSize: 10, fontFamily: mono, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>🔥 Trending — from the community</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {trendingTheses.map((p, i) => (
                    <button key={p.id || i} onClick={() => setThesis(p.thesis || "")} style={{ background: `${C.accent}12`, border: `1px solid ${C.accent}35`, borderRadius: 8, padding: "7px 13px", cursor: "pointer", textAlign: "left", color: C.text, fontSize: 11, maxWidth: 280, lineHeight: 1.4 }}>
                      <span style={{ color: C.accent, fontWeight: 600, fontSize: 10, display: "block", marginBottom: 3 }}>@{p.creator || "anonymous"}</span>
                      {(p.thesis || "").length > 80 ? (p.thesis || "").slice(0, 80) + "…" : (p.thesis || "")}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ color: C.dim, fontSize: 10, fontFamily: mono, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>✦ {trendingTheses.length > 0 ? "Or try one of these" : "Need inspiration? Click any to get started"}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
              {[
                { emoji: "🤖", l: "AI & Semiconductors", sub: "GPUs, cloud AI, chip makers", t: "Build an aggressive growth ETF focused on artificial intelligence infrastructure, GPU makers, and cloud AI platforms. Heavy equity allocation with 15% crypto exposure. 5-year horizon targeting 15%+ returns." },
                { emoji: "💰", l: "Dividend Income", sub: "Steady yield, low volatility", t: "Design a conservative income-focused ETF for a retiree. Prioritize high-quality dividend stocks, investment-grade bonds, and gold. Target 4%+ yield with minimal volatility. Capital preservation is the priority." },
                { emoji: "⚡", l: "Clean Energy", sub: "Solar, wind, uranium, EV", t: "Create a moderate-risk ETF capturing the global clean energy transition. Include solar, wind, battery/EV, uranium, and lithium companies. Add some commodity hedges. 7-year horizon targeting 10-12% returns." },
                { emoji: "🔮", l: "Crypto-Forward", sub: "BTC, ETH, SOL + equities", t: "Build an aggressive ETF with maximum crypto exposure balanced by traditional assets. Include BTC, ETH, SOL, and crypto-adjacent equities like COIN and MSTR. Hedge with gold and short-term bonds. High risk tolerance." },
                { emoji: "🎰", l: "Memecoin Degen", sub: "DOGE, PEPE, WIF, BONK", t: "Build a high-risk memecoin and speculative crypto ETF. Include top memecoins like DOGE, SHIB, PEPE, WIF, FLOKI, BONK, and POPCAT alongside BTC and ETH as anchors. Maximum volatility, maximum potential. This is pure speculation for educational purposes. Aggressive risk." },
                { emoji: "🌍", l: "All-Weather", sub: "Stocks, bonds, gold, TIPS", t: "Design a balanced all-weather portfolio inspired by Ray Dalio's approach. Equal risk allocation across stocks, long-term bonds, gold, commodities, and TIPS. Target low volatility with consistent returns across all economic regimes." },
                { emoji: "🛡️", l: "Defense & Aerospace", sub: "LMT, RTX, PLTR, RKLB", t: "Build an aggressive defense and aerospace ETF capitalizing on rising global military budgets, space commercialization, and AI-driven intelligence systems. Include defense primes, missile tech, space launch, and surveillance tech. 5-year horizon." },
                { emoji: "🍔", l: "Vice & Vices", sub: "Alcohol, gambling, fast food", t: "Build a recession-resistant vice ETF capturing industries that thrive regardless of economic conditions — alcohol, tobacco, gambling, fast food, and gaming. These sectors show historically low correlation with broader market downturns." },
              ].map(ex => (
                <button key={ex.l} onClick={() => setThesis(ex.t)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "border-color .15s, background .15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.accentBorder; e.currentTarget.style.background = C.accentBg; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.surface; }}>
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{ex.emoji}</div>
                  <div style={{ color: C.text, fontSize: 12.5, fontWeight: 600, marginBottom: 2 }}>{ex.l}</div>
                  <div style={{ color: C.dim, fontSize: 10.5, lineHeight: 1.4 }}>{ex.sub}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ═══ PORTFOLIO CONTROLS PANEL ═══ */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "14px 16px", marginBottom: 14 }}>
          <div className="controls-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            {/* Risk Profile */}
            <div>
              <label style={{ color: C.dim, fontSize: 10, display: "block", marginBottom: 6, fontFamily: mono, letterSpacing: 0.5 }}>RISK PROFILE</label>
              <div style={{ display: "flex", gap: 4 }}>
                {[
                  { v: "conservative", l: "Conservative", c: C.teal },
                  { v: "moderate", l: "Moderate", c: C.gold },
                  { v: "aggressive", l: "Aggressive", c: C.red },
                ].map(r => (
                  <button key={r.v} onClick={() => setRiskProfile(r.v)} style={{
                    flex: 1, padding: "7px 4px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all .15s",
                    background: riskProfile === r.v ? `${r.c}18` : "transparent",
                    border: `1.5px solid ${riskProfile === r.v ? r.c : C.border}`,
                    color: riskProfile === r.v ? r.c : C.dim,
                  }}>{r.l}</button>
                ))}
              </div>
            </div>
            {/* Time Horizon */}
            <div>
              <label style={{ color: C.dim, fontSize: 10, display: "block", marginBottom: 6, fontFamily: mono, letterSpacing: 0.5 }}>TIME HORIZON</label>
              <select value={timeHorizon} onChange={e => setTimeHorizon(e.target.value)} style={{ background: C.bg, border: `1.5px solid ${C.border}`, color: C.text, padding: "7px 10px", borderRadius: 6, fontSize: 12, width: "100%", cursor: "pointer", fontFamily: "inherit", appearance: "auto" }}>
                {["6 months","1 year","1-2 years","3-5 years","5-10 years","10-20 years","20+ years"].map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            {/* Recommendation Frequency */}
            <div>
              <label style={{ color: C.dim, fontSize: 10, display: "block", marginBottom: 6, fontFamily: mono, letterSpacing: 0.5 }}>REBALANCE FREQUENCY</label>
              <select value={rebalFreq} onChange={e => setRebalFreq(e.target.value)} style={{ background: C.bg, border: `1.5px solid ${C.border}`, color: C.text, padding: "7px 10px", borderRadius: 6, fontSize: 12, width: "100%", cursor: "pointer", fontFamily: "inherit", appearance: "auto" }}>
                {[
                  { v: "daily", l: "Daily" },
                  { v: "weekly", l: "Weekly" },
                  { v: "semi-monthly", l: "Semi-Monthly (2x/mo)" },
                  { v: "monthly", l: "Monthly" },
                  { v: "quarterly", l: "Quarterly" },
                  { v: "semi-annually", l: "Semi-Annually" },
                  { v: "annually", l: "Annually" },
                ].map(f => <option key={f.v} value={f.v}>{f.l}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10.5, color: C.dim, fontFamily: mono }}>
              {riskProfile === "conservative" ? "Target: 5-7% · Vol < 8% · Max DD < 10%" : riskProfile === "moderate" ? "Target: 10-14% · Vol < 16% · Max DD < 20%" : "Target: 20-30% · Vol < 30% · Max DD < 40%"}
            </span>
            <span style={{ fontSize: 10.5, color: C.dim, fontFamily: mono }}>•</span>
            <span style={{ fontSize: 10.5, color: C.dim, fontFamily: mono }}>Horizon: {timeHorizon}</span>
            <span style={{ fontSize: 10.5, color: C.dim, fontFamily: mono }}>•</span>
            <span style={{ fontSize: 10.5, color: C.dim, fontFamily: mono }}>Rebal: {rebalFreq}</span>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, flexWrap: "wrap", gap: 8 }}>
          <span className="hide-mobile" style={{ color: C.dim, fontSize: 11.5 }}>Describe your thesis above — the controls will shape AI allocation</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: "auto", flexWrap: "wrap", justifyContent: "flex-end" }}>

          {/* ═══ GENERATION PROGRESS ═══ */}
          {loading && genStep > 0 && (() => {
            const steps = [
              { n: 1, l: "Analyzing thesis", detail: "Reading your thesis and identifying investment opportunities..." },
              { n: 2, l: "Selecting holdings", detail: "AI is choosing the best securities to match your thesis..." },
              { n: 3, l: "Fetching live prices", detail: "Pulling real-time market data from exchanges..." },
              { n: 4, l: "Calculating positions", detail: "Computing allocations, shares, and portfolio metrics..." },
              { n: 5, l: "Done ✓", detail: "Portfolio ready!" },
            ];
            const activeStep = steps.find(s => s.n === genStep);
            const elapsedStr = genElapsed < 60 ? `${genElapsed}s` : `${Math.floor(genElapsed/60)}m ${genElapsed%60}s`;
            // Pseudo-progress within step 1 (AI call) — advances slowly to signal activity
            const step1Progress = genStep === 1 ? Math.min(95, (genElapsed / 25) * 100) : 100;
            return (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 16px", marginBottom: 4 }}>
                {/* Timer row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ color: C.accent, fontSize: 11, fontFamily: mono, fontWeight: 700 }}>
                    {activeStep?.l || "Processing..."}
                  </span>
                  <span style={{ color: C.dim, fontSize: 10, fontFamily: mono }}>⏱ {elapsedStr}</span>
                </div>
                {/* Progress bar */}
                <div style={{ background: C.card, borderRadius: 4, height: 4, marginBottom: 10, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 4,
                    width: genStep === 1 ? `${step1Progress}%` : `${((genStep - 1) / 4) * 100}%`,
                    background: genStep === 5 ? C.green : `linear-gradient(90deg, ${C.accent}, ${C.accentLight || "#a78bfa"})`,
                    transition: genStep === 1 ? "width 1s linear" : "width 0.4s ease",
                    boxShadow: genStep !== 5 ? `0 0 8px ${C.accent}88` : "none",
                  }} />
                </div>
                {/* Step dots */}
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  {steps.map(s => {
                    const done = genStep > s.n;
                    const active = genStep === s.n;
                    return (
                      <div key={s.n} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{
                          width: 16, height: 16, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center",
                          fontSize: 8, fontWeight: 700, fontFamily: mono,
                          background: done ? C.green : active ? C.accent : C.surface,
                          border: `1px solid ${done ? C.green : active ? C.accent : C.border}`,
                          color: done || active ? "#fff" : C.dim,
                          boxShadow: active ? `0 0 6px ${C.accent}88` : "none",
                          transition: "all .3s",
                          flexShrink: 0,
                        }}>{done ? "✓" : s.n}</span>
                        <span style={{ fontSize: 9.5, color: active ? C.accent : done ? C.green : C.dim, fontFamily: mono, transition: "color .3s", whiteSpace: "nowrap" }}>{s.l}</span>
                        {s.n < 5 && <span style={{ color: C.border, fontSize: 9 }}>›</span>}
                      </div>
                    );
                  })}
                </div>
                {/* Active step detail */}
                {activeStep && genStep < 5 && (
                  <div style={{ marginTop: 8, color: C.dim, fontSize: 9.5, fontStyle: "italic" }}>
                    {activeStep.detail}
                    {genStep === 1 && genElapsed > 15 && <span style={{ color: C.gold, marginLeft: 6 }}>— AI is thinking, this can take up to 75s</span>}
                  </div>
                )}
              </div>
            );
          })()}

            <button onClick={generate} disabled={loading || !thesis.trim() || dailyUses >= DAILY_LIMIT} style={{ ...btnP(), opacity: loading || !thesis.trim() || dailyUses >= DAILY_LIMIT ? 0.45 : 1 }}>{loading ? "Generating…" : dailyUses >= DAILY_LIMIT ? (user ? "Daily Limit Reached" : "Guest Limit — Sign In") : "Generate ETF ◆"}</button>
            <span style={{ color: dailyUses >= DAILY_LIMIT * 0.8 ? C.red : C.dim, fontSize: 10, fontFamily: mono }}>{DAILY_LIMIT - dailyUses}/{DAILY_LIMIT} remaining{user ? " today" : " (guest)"}</span>
          </div>
          {!user && !loading && (
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 11, color: C.dim }}>💾</span>
              <span style={{ fontSize: 11, color: C.dim }}>Results are temporary —{" "}
                <span onClick={() => openAuth("signup")} style={{ color: C.accent, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 2 }}>sign up free</span>
                {" "}to save portfolios, track live P&L, and compete on the leaderboard.
              </span>
            </div>
          )}
        </div>
      </div>
      )}

      {/* ═══ MANUAL ETF BUILDER ═══ */}
      {buildMode === "manual" && !portfolio && (
        <div style={{ ...cardS(), marginBottom: 20 }}>
          <div className="grid2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ color: C.dim, fontSize: 10, display: "block", marginBottom: 4, fontFamily: mono }}>FUND NAME</label>
              <input value={manualName} onChange={e => setManualName(e.target.value)} placeholder="My Custom ETF" style={{ ...inputS(), fontSize: 14, fontWeight: 700 }} />
            </div>
            <div>
              <label style={{ color: C.dim, fontSize: 10, display: "block", marginBottom: 4, fontFamily: mono }}>TICKER (1-5 letters)</label>
              <input value={manualTicker} onChange={e => setManualTicker(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5))} placeholder="CUST" style={{ ...inputS(), fontSize: 14, fontWeight: 600, fontFamily: mono }} maxLength={5} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: C.dim, fontSize: 10, display: "block", marginBottom: 4, fontFamily: mono }}>STRATEGY / THESIS (optional)</label>
            <textarea value={manualStrategy} onChange={e => setManualStrategy(e.target.value)} placeholder="Describe your investment thesis..." rows={2} style={{ ...inputS(), resize: "vertical", lineHeight: 1.4 }} />
          </div>

          {/* Controls */}
          <div className="controls-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ color: C.dim, fontSize: 10, display: "block", marginBottom: 4, fontFamily: mono }}>RISK PROFILE</label>
              <div style={{ display: "flex", gap: 4 }}>
                {[{ v: "conservative", l: "Conservative", c: C.teal }, { v: "moderate", l: "Moderate", c: C.gold }, { v: "aggressive", l: "Aggressive", c: C.red }].map(r => (
                  <button key={r.v} onClick={() => setRiskProfile(r.v)} style={{ flex: 1, padding: "6px 2px", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: `1.5px solid ${riskProfile === r.v ? r.c : C.border}`, background: riskProfile === r.v ? `${r.c}18` : "transparent", color: riskProfile === r.v ? r.c : C.dim }}>{r.l}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ color: C.dim, fontSize: 10, display: "block", marginBottom: 4, fontFamily: mono }}>TIME HORIZON</label>
              <select value={timeHorizon} onChange={e => setTimeHorizon(e.target.value)} style={{ background: C.bg, border: `1.5px solid ${C.border}`, color: C.text, padding: "6px 8px", borderRadius: 6, fontSize: 11, width: "100%", cursor: "pointer", fontFamily: "inherit" }}>
                {["6 months","1 year","1-2 years","3-5 years","5-10 years","10-20 years","20+ years"].map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: C.dim, fontSize: 10, display: "block", marginBottom: 4, fontFamily: mono }}>REBALANCE FREQ</label>
              <select value={rebalFreq} onChange={e => setRebalFreq(e.target.value)} style={{ background: C.bg, border: `1.5px solid ${C.border}`, color: C.text, padding: "6px 8px", borderRadius: 6, fontSize: 11, width: "100%", cursor: "pointer", fontFamily: "inherit" }}>
                {[{ v: "daily", l: "Daily" },{ v: "weekly", l: "Weekly" },{ v: "semi-monthly", l: "Semi-Monthly" },{ v: "monthly", l: "Monthly" },{ v: "quarterly", l: "Quarterly" },{ v: "semi-annually", l: "Semi-Annually" },{ v: "annually", l: "Annually" }].map(f => <option key={f.v} value={f.v}>{f.l}</option>)}
              </select>
            </div>
          </div>

          {/* Holdings Table */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ color: C.dim, fontSize: 10, fontFamily: mono }}>HOLDINGS ({manualHoldings.length})</span>
              <span style={{ color: manualHoldings.reduce((s, h) => s + h.weight, 0) + manualCashPct > 100.5 ? C.red : C.green, fontSize: 10, fontFamily: mono, fontWeight: 700 }}>TOTAL: {fmt(manualHoldings.reduce((s, h) => s + h.weight, 0) + manualCashPct, 1)}% / 100%</span>
            </div>
          <div className="mob-scroll">
            <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 52px 55px 80px 28px", gap: 6, padding: "6px 0", borderBottom: `1px solid ${C.border}`, fontSize: 9, color: C.dim, fontFamily: mono, minWidth: 360 }}>
              <span>TICKER</span><span>NAME</span><span>TYPE</span><span>WEIGHT</span><span>AMOUNT</span><span></span>
            </div>
            {manualHoldings.map((h, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "60px 1fr 52px 55px 80px 28px", gap: 6, padding: "6px 0", borderBottom: `1px solid ${C.border}`, alignItems: "center", minWidth: 360 }}>
                <input value={h.symbol} onChange={e => { const sym = e.target.value.toUpperCase().replace(/[^A-Z0-9.-]/g, "").slice(0, 6); const v = [...manualHoldings]; v[i] = { ...v[i], symbol: sym, type: detectTickerType(sym) }; setManualHoldings(v); }} placeholder="AAPL" style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, padding: "4px 6px", borderRadius: 4, fontSize: 12, fontFamily: mono, fontWeight: 600, textAlign: "center", outline: "none" }} />
                <input value={h.name} onChange={e => { const v = [...manualHoldings]; v[i] = { ...v[i], name: e.target.value }; setManualHoldings(v); }} placeholder="Company Name" style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.sub, padding: "4px 6px", borderRadius: 4, fontSize: 11, outline: "none" }} />
                <span style={{ ...badge(TC[h.type] || C.accent), fontSize: 8, textAlign: "center" }}>{h.type}</span>
                <input type="number" value={h.weight} onChange={e => { const v = [...manualHoldings]; v[i] = { ...v[i], weight: Math.max(0, Math.min(50, parseFloat(e.target.value) || 0)) }; setManualHoldings(v); }} min="0" max="50" step="0.5" style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.accent, padding: "4px", borderRadius: 4, fontSize: 11, fontFamily: mono, textAlign: "center", outline: "none", width: "100%" }} />
                <span style={{ color: C.sub, fontSize: 10, fontFamily: mono, textAlign: "right" }}>{fmtUSD(Math.round(SEED_CAPITAL * h.weight / 100))}</span>
                <button onClick={() => { if (manualHoldings.length > 1) setManualHoldings(manualHoldings.filter((_, j) => j !== i)); }} style={{ background: "transparent", border: "none", color: C.red, cursor: "pointer", fontSize: 14, padding: 0 }}>✕</button>
              </div>
            ))}
            </div>{/* close mob-scroll */}
            <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
              <button onClick={() => { if (manualHoldings.length < 20) setManualHoldings([...manualHoldings, { symbol: "", name: "", type: "stock", weight: 5 }]); }} disabled={manualHoldings.length >= 20} style={{ background: C.accentBg, border: `1px solid ${C.accentBorder}`, color: C.accentLight, padding: "5px 14px", borderRadius: 5, fontSize: 11, cursor: manualHoldings.length >= 20 ? "not-allowed" : "pointer", fontWeight: 600, fontFamily: "inherit" }}>+ Add Holding</button>
              <span style={{ color: C.dim, fontSize: 10 }}>({20 - manualHoldings.length} remaining, max 20)</span>
            </div>
          </div>

          {/* Cash allocation */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "10px 14px", background: C.surface, borderRadius: 8, border: `1px solid ${C.border}` }}>
            <span style={{ color: C.sub, fontSize: 12 }}>Cash (Money Market 4.5% APY):</span>
            <input type="number" value={manualCashPct} onChange={e => setManualCashPct(Math.max(0, Math.min(50, parseFloat(e.target.value) || 0)))} min="0" max="50" step="1" style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.accent, width: 52, fontSize: 13, fontFamily: mono, padding: "4px 6px", borderRadius: 4, textAlign: "center", outline: "none" }} />
            <span style={{ color: C.sub, fontSize: 12 }}>% = {fmtUSD(Math.round(SEED_CAPITAL * manualCashPct / 100))}</span>
          </div>

          {err && <p style={{ color: C.red, fontSize: 12, marginBottom: 10 }}>{err}</p>}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: C.dim, fontSize: 11 }}>Seed capital: <strong style={{ color: C.text }}>{fmtUSD(SEED_CAPITAL)}</strong> · {manualHoldings.length} holdings + cash</span>
            <button onClick={launchManualETF} style={btnP()}>Launch Fund 🚀</button>
          </div>
        </div>
      )}

      {loading && <div style={{ padding: "16px 0" }}>
        <div style={{ ...cardS(), marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}><div style={{ width: "60%", height: 20, background: `linear-gradient(90deg,${C.surface},${C.border},${C.surface})`, backgroundSize: "400px", animation: "shimmer 1.5s infinite linear", borderRadius: 4 }} /><div style={{ width: 100, height: 28, background: `linear-gradient(90deg,${C.surface},${C.border},${C.surface})`, backgroundSize: "400px", animation: "shimmer 1.5s infinite linear", borderRadius: 4 }} /></div>
          <div style={{ width: "80%", height: 12, background: `linear-gradient(90deg,${C.surface},${C.border},${C.surface})`, backgroundSize: "400px", animation: "shimmer 1.5s infinite linear", borderRadius: 4, marginTop: 12 }} />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>{[1,2,3,4].map(i => <div key={i} style={{ width: 70, height: 20, background: `linear-gradient(90deg,${C.surface},${C.border},${C.surface})`, backgroundSize: "400px", animation: "shimmer 1.5s infinite linear", borderRadius: 4 }} />)}</div>
        </div>
        {[1,2,3,4,5].map(i => <div key={i} style={{ height: 48, background: `linear-gradient(90deg,${C.surface},${C.border},${C.surface})`, backgroundSize: "400px", animation: "shimmer 1.5s infinite linear", borderRadius: 6, marginBottom: 4 }} />)}
        <p style={{ color: C.sub, fontSize: 13.5, textAlign: "center", marginTop: 16 }}>AI CIO is analyzing macro conditions and constructing your portfolio…</p>
      </div>}
      {err && <div style={{ ...cardS(), borderColor: C.red, color: C.red, fontSize: 13.5, marginBottom: 16 }}>{err}</div>}

      {portfolio && (
        <div>
          <div style={{ ...cardS(), marginBottom: 14 }}>
            <div className="builder-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 3, flexWrap: "wrap" }}>{nameEdited ? <div style={{ color: C.text, fontSize: 20, fontWeight: 800, fontFamily: "inherit" }}>{editName}</div> : <input value={editName} onChange={e => { setEditName(e.target.value); setPortfolio(prev => ({ ...prev, name: e.target.value })); }} onBlur={() => { if (editName.trim()) setNameEdited(true); }} placeholder="Name your ETF..." style={{ background: "transparent", border: "none", borderBottom: `1px solid ${C.border}`, color: C.text, fontSize: 20, fontWeight: 800, fontFamily: "inherit", outline: "none", minWidth: 0, maxWidth: "100%", padding: "2px 0" }} />}{!nameEdited && <span style={{ color: C.dim, fontSize: 9, fontStyle: "italic" }}>click to edit name</span>}<input value={editTicker} onChange={e => { const v = e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5); setEditTicker(v); setPortfolio(prev => ({ ...prev, ticker: v })); }} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.accentLight, fontSize: 13, fontFamily: mono, fontWeight: 600, outline: "none", width: 70, textAlign: "center", padding: "4px 6px", borderRadius: 6 }} maxLength={5} /></div><p style={{ color: C.sub, fontSize: 13, margin: 0 }}>{portfolio.strategy}</p>{<div style={{ display: "flex", gap: 12, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}><span style={{ color: C.dim, fontSize: 12, fontFamily: mono }}>Balance: <strong style={{ color: currentNAV >= SEED_CAPITAL ? C.green : C.red, fontSize: 15 }}>{fmtUSD(currentNAV)}</strong></span><span style={{ color: currentNAV >= SEED_CAPITAL ? C.green : currentNAV < SEED_CAPITAL ? C.red : C.text, fontSize: 13, fontWeight: 700, fontFamily: mono }}>{currentNAV >= SEED_CAPITAL ? "+" : ""}{fmt((currentNAV / SEED_CAPITAL - 1) * 100, 2)}%</span><span style={{ color: currentNAV >= SEED_CAPITAL ? C.green : currentNAV < SEED_CAPITAL ? C.red : C.text, fontSize: 12, fontFamily: mono }}>({currentNAV >= SEED_CAPITAL ? "+" : ""}{fmtUSD(currentNAV - SEED_CAPITAL)})</span></div>}{portfolio.weeklyOutlook && <p style={{ color: C.teal, fontSize: 12, margin: "6px 0 0", fontStyle: "italic" }}>📅 {portfolio.weeklyOutlook}</p>}{(portfolio.riskProfile || portfolio.targetReturn) && <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>{portfolio.riskProfile && <span style={{ ...badge(portfolio.riskProfile === "aggressive" ? C.red : portfolio.riskProfile === "conservative" ? C.teal : C.gold) }}>{portfolio.riskProfile}</span>}{portfolio.targetReturn && <span style={{ color: C.dim, fontSize: 11, fontFamily: mono }}>Return: {portfolio.targetReturn}</span>}{portfolio.targetVolatility && <span style={{ color: C.dim, fontSize: 11, fontFamily: mono }}>Vol: {portfolio.targetVolatility}</span>}{portfolio.sharpeTarget && <span style={{ color: C.dim, fontSize: 11, fontFamily: mono }}>Sharpe: {portfolio.sharpeTarget}</span>}{portfolio.sortinoTarget && <span style={{ color: C.dim, fontSize: 11, fontFamily: mono }}>Sortino: {portfolio.sortinoTarget}</span>}{portfolio.maxDrawdown && <span style={{ color: C.dim, fontSize: 11, fontFamily: mono }}>Max DD: {portfolio.maxDrawdown}</span>}{portfolio.rebalanceFrequency && <span style={{ color: C.dim, fontSize: 11, fontFamily: mono }}>Rebal: {portfolio.rebalanceFrequency}</span>}{portfolio.userRebalFreq && !portfolio.rebalanceFrequency && <span style={{ color: C.dim, fontSize: 11, fontFamily: mono }}>Rebal: {portfolio.userRebalFreq}</span>}{portfolio.benchmark && <span style={{ color: C.dim, fontSize: 11, fontFamily: mono }}>Bench: {portfolio.benchmark}</span>}{portfolio.userTimeHorizon && <span style={{ color: C.dim, fontSize: 11, fontFamily: mono }}>Horizon: {portfolio.userTimeHorizon}</span>}</div>}</div>
              <div className="builder-nav-right" style={{ textAlign: "right", flexShrink: 0 }}><div style={{ color: currentNAV >= SEED_CAPITAL ? C.green : C.red, fontSize: 22, fontWeight: 800, fontFamily: mono }}>{fmtUSD(currentNAV)}</div><div style={{ color: C.sub, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, flexWrap: "wrap" }}>Expense Ratio: <input type="number" value={editFee} onChange={e => { const v = Math.max(0, Math.min(5, parseFloat(e.target.value) || 0)); setEditFee(v); setPortfolio(prev => prev ? { ...prev, fee: v } : prev); }} step="0.05" min="0" max="5" style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.accent, width: 52, fontSize: 12, fontFamily: mono, padding: "2px 4px", borderRadius: 4, textAlign: "center", outline: "none" }} />%/yr</div><div style={{ color: C.dim, fontSize: 10.5 }}>({fmt(editFee / 12, 3)}%/mo · {fmtUSD(Math.round(currentNAV * editFee / 100 / 12))}/mo)</div>{portfolio && <div style={{ marginTop: 4, display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>{[...new Set(portfolio.holdings.map(h => h.type))].map(t => { const s = getMarketStatus(t); return <span key={t} style={{ fontSize: 8.5, fontFamily: mono, color: s.color, background: `${s.color}15`, padding: "1px 6px", borderRadius: 3, border: `1px solid ${s.color}30` }}>● {t.toUpperCase()} {s.label}</span>; })}</div>}</div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              {Object.entries(portfolio.holdings.reduce((a, h) => { a[h.type] = (a[h.type] || 0) + h.weight; return a; }, {})).map(([t, w]) => <span key={t} style={{ ...badge(TC[t]), fontSize: 11, padding: "3px 10px" }}>{t}: {fmt(w, 1)}%</span>)}
            </div>
            {portfolio.assetAllocation && <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>{Object.entries(portfolio.assetAllocation).map(([k, v]) => <span key={k} style={{ color: C.dim, fontSize: 11, fontFamily: mono }}>{k}: {v}</span>)}</div>}
          </div>

          {/* Fund Summary */}
          {portfolio.fundSummary && (
            <div style={{ ...cardS(), marginBottom: 14 }}>
              <div style={{ fontSize: 10.5, color: C.dim, marginBottom: 10, fontFamily: mono, letterSpacing: 0.3 }}>FUND SUMMARY</div>
              <div style={{ display: "grid", gap: 8 }}>
                {portfolio.fundSummary.investmentThesis && <div><span style={{ color: C.accent, fontSize: 10.5, fontFamily: mono, fontWeight: 600 }}>THESIS: </span><span style={{ color: C.sub, fontSize: 12.5, lineHeight: 1.5 }}>{portfolio.fundSummary.investmentThesis}</span></div>}
                {portfolio.fundSummary.targetInvestor && <div><span style={{ color: C.accent, fontSize: 10.5, fontFamily: mono, fontWeight: 600 }}>TARGET INVESTOR: </span><span style={{ color: C.sub, fontSize: 12.5 }}>{portfolio.fundSummary.targetInvestor}</span></div>}
                {portfolio.fundSummary.competitiveEdge && <div><span style={{ color: C.accent, fontSize: 10.5, fontFamily: mono, fontWeight: 600 }}>COMPETITIVE EDGE: </span><span style={{ color: C.sub, fontSize: 12.5 }}>{portfolio.fundSummary.competitiveEdge}</span></div>}
                {portfolio.fundSummary.scalingPlan && <div><span style={{ color: C.accent, fontSize: 10.5, fontFamily: mono, fontWeight: 600 }}>SCALING: </span><span style={{ color: C.sub, fontSize: 12.5 }}>{portfolio.fundSummary.scalingPlan}</span></div>}

              </div>
            </div>
          )}

          {/* Market Hours Banner */}
          {(() => {
            const types = [...new Set(portfolio.holdings.map(h => h.type))];
            const openTypes = types.filter(t => isMarketOpen(t));
            const closedTypes = types.filter(t => !isMarketOpen(t));
            if (closedTypes.length === 0) return null; // All markets open — no banner needed
            const now = new Date();
            const day = now.getUTCDay();
            const isWeekend = day === 0 || day === 6;
            return (
              <div style={{ padding: "10px 16px", marginBottom: 14, borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 16 }}>{openTypes.length > 0 ? "⏰" : "🌙"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: C.text, fontSize: 12, fontWeight: 600 }}>
                    {closedTypes.length === types.length ? (isWeekend ? "Markets Closed — Weekend" : "Markets Closed") : `Some Markets Closed`}
                  </div>
                  <div style={{ color: C.sub, fontSize: 11, marginTop: 2 }}>
                    {closedTypes.map(t => t.toUpperCase()).join(", ")} — prices frozen until market open.
                    {openTypes.length > 0 && <span style={{ color: C.green }}> {openTypes.map(t => t.toUpperCase()).join(", ")} trading live.</span>}
                    {isWeekend && closedTypes.includes("stock") && " US equities resume Monday 9:30 AM ET."}
                  </div>
                </div>
              </div>
            );
          })()}

          <div style={{ ...cardS(), padding: 0, overflow: "hidden", marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 18px", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 10, color: C.dim, fontFamily: mono, textTransform: "uppercase", letterSpacing: 0.5 }}>HOLDINGS</span>
                <span style={{ ...badge(C.green), fontSize: 10 }}>{portfolio.holdings.length - excludedIdx.size} active</span>
                {excludedIdx.size > 0 && <span style={{ ...badge(C.red), fontSize: 10 }}>{excludedIdx.size} removed</span>}
              </div>
              {excludedIdx.size > 0 && <button onClick={() => { let cashDeduct = 0; excludedIdx.forEach(i => { cashDeduct += liveAllocations[i] || portfolio.holdings[i]?.allocation || 0; }); setCashBalance(prev => Math.max(0, prev - cashDeduct)); setTransactions(prev => [...prev, { type: "RESTORE", symbol: "ALL", amount: Math.round(cashDeduct), ts: Date.now(), reason: `Restored ${excludedIdx.size} holdings. $${Math.round(cashDeduct).toLocaleString()} moved from cash back to positions.` }]); setExcludedIdx(new Set()); }} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.sub, fontSize: 10.5, padding: "3px 10px", borderRadius: 4, cursor: "pointer", fontFamily: "inherit" }}>Restore All</button>}
            </div>
            <div className="mob-scroll">
            <div style={{ display: "grid", gridTemplateColumns: "38px 56px 1fr 72px 110px 120px", padding: "8px 18px", borderBottom: `1px solid ${C.border}`, fontSize: 10, color: C.dim, fontFamily: mono, textTransform: "uppercase", letterSpacing: 0.5, minWidth: 520 }}><span>#</span><span>Type</span><span>Holding</span><span>Weight</span><span>Allocation</span><span style={{ textAlign: "center" }}>Actions</span></div>
            {portfolio.holdings.map((h, i) => {
              const isExcluded = excludedIdx.has(i);
              const liveVal = liveAllocations[i] || h.allocation;
              const liveActiveTotal = portfolio.holdings.reduce((s, hh, j) => s + (excludedIdx.has(j) ? 0 : (liveAllocations[j] || hh.allocation)), 0);
              const adjWeight = isExcluded ? 0 : (liveVal / liveActiveTotal * 100);
              const adjAlloc = isExcluded ? 0 : Math.round(liveVal);
              // Inline edit handlers for weight and allocation
              const onWeightChange = (newW) => {
                if (isExcluded) return;
                const w = Math.max(0, Math.min(40, newW));
                setEditingWeights(prev => ({ ...prev, [i]: w }));
                const navForCalc = liveActiveTotal + cashBalance;
                const newAlloc = Math.round((w / 100) * navForCalc);
                const oldAlloc = Math.round(liveAllocations[i] || h.allocation);
                const delta = newAlloc - oldAlloc;
                setCashBalance(prev => Math.max(0, prev - delta));
                setLiveAllocations(prev => ({ ...prev, [i]: newAlloc }));
                if (Math.abs(delta) > 10) setTransactions(prev => [...prev, { type: delta > 0 ? "BUY" : "TRIM", symbol: h.symbol, amount: Math.abs(Math.round(delta)), ts: Date.now(), reason: `Weight adjusted to ${fmt(w,1)}%. ${delta > 0 ? "Bought" : "Trimmed"} ${fmtUSD(Math.abs(Math.round(delta)))} ${delta > 0 ? "from cash" : "to cash"}.` }]);
              };
              const onAllocChange = (newA) => {
                if (isExcluded) return;
                const a = Math.max(0, Math.min(currentNAV, newA));
                const oldAlloc = Math.round(liveAllocations[i] || h.allocation);
                const delta = a - oldAlloc;
                setCashBalance(prev => Math.max(0, prev - delta));
                setLiveAllocations(prev => ({ ...prev, [i]: a }));
                if (Math.abs(delta) > 10) setTransactions(prev => [...prev, { type: delta > 0 ? "BUY" : "TRIM", symbol: h.symbol, amount: Math.abs(Math.round(delta)), ts: Date.now(), reason: `Allocation adjusted to ${fmtUSD(a)}. ${delta > 0 ? "Bought" : "Trimmed"} ${fmtUSD(Math.abs(Math.round(delta)))} ${delta > 0 ? "from cash" : "to cash"}.` }]);
              };
              return (
              <div key={i} style={{ opacity: isExcluded ? 0.4 : 1, transition: "opacity .2s" }}>
                <div style={{ display: "grid", gridTemplateColumns: "38px 56px 1fr 72px 110px 120px", padding: "12px 18px", borderBottom: `1px solid ${C.border}`, alignItems: "center", background: openIdx === i ? C.surface : "transparent", transition: "background .12s", minWidth: 520 }}>
                  <span style={{ color: C.dim, fontSize: 12, fontFamily: mono }}>{String(i + 1).padStart(2, "0")}</span>
                  <span style={badge(TC[h.type])}>{h.type}</span>{h.action === "SHORT" && <span style={{ ...badge("#f59e0b"), fontSize: 8, marginLeft: 2 }}>SHORT</span>}
                  <div onClick={() => setOpenIdx(openIdx === i ? null : i)} style={{ cursor: "pointer" }}><div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ color: C.text, fontSize: 13.5, fontWeight: 600, textDecoration: isExcluded ? "line-through" : "none" }}>{h.symbol}</span><span style={{ color: C.dim, fontSize: 9, opacity: 0.6 }}>{openIdx === i ? "▾" : "▸"}</span></div><div style={{ color: C.sub, fontSize: 11.5 }}>{h.name}</div>{h.description && <div style={{ color: C.dim, fontSize: 10, marginTop: 1, maxWidth: 350, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.description}</div>}</div>
                  {isExcluded ? <span style={{ color: C.dim, fontFamily: mono, fontSize: 12 }}>—</span> : <input type="number" value={editingWeights[i] !== undefined ? editingWeights[i] : parseFloat(fmt(adjWeight, 1))} onChange={e => onWeightChange(parseFloat(e.target.value) || 0)} step="0.5" min="0" max="40" style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontFamily: mono, fontSize: 11.5, width: 52, padding: "3px 4px", borderRadius: 4, textAlign: "center", outline: "none" }} title="Edit allocation weight" />}
                  {isExcluded ? <span style={{ color: C.dim, fontFamily: mono, fontSize: 12 }}>—</span> : <input type="number" value={adjAlloc} onChange={e => onAllocChange(parseInt(e.target.value) || 0)} step="1000" min="0" style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontFamily: mono, fontSize: 11, width: 90, padding: "3px 4px", borderRadius: 4, textAlign: "right", outline: "none" }} title="Edit dollar allocation" />}
                  <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                    <button onClick={(e) => { e.stopPropagation(); const n = new Set(excludedIdx); if (isExcluded) { n.delete(i); const restoreVal = liveAllocations[i] || 0; if (restoreVal > 0) setCashBalance(prev => Math.max(0, prev - restoreVal)); } else { n.add(i); const liqVal = liveAllocations[i] || h.allocation; setCashBalance(prev => prev + liqVal); setTransactions(prev => [...prev, { type: "LIQUIDATE", symbol: h.symbol, amount: Math.round(liqVal), ts: Date.now(), reason: `Removed ${h.symbol}. $${Math.round(liqVal).toLocaleString()} to cash.` }]); } setExcludedIdx(n); }} style={{ background: isExcluded ? "rgba(239,68,68,.1)" : "rgba(34,197,94,.1)", border: `1px solid ${isExcluded ? "rgba(239,68,68,.3)" : "rgba(34,197,94,.3)"}`, color: isExcluded ? C.red : C.green, fontSize: 10.5, padding: "4px 10px", borderRadius: 4, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>{isExcluded ? "✗ Removed" : "✓ Keep"}</button>
                    <button onClick={(e) => { e.stopPropagation(); refreshHolding(i); }} disabled={refreshingIdx !== null} title="AI generates a replacement" style={{ background: refreshingIdx === i ? "rgba(45,212,191,.15)" : "rgba(99,102,241,.08)", border: `1px solid ${refreshingIdx === i ? "rgba(45,212,191,.4)" : "rgba(99,102,241,.2)"}`, color: refreshingIdx === i ? C.teal : "#818cf8", fontSize: 10.5, padding: "4px 8px", borderRadius: 4, cursor: refreshingIdx !== null ? "not-allowed" : "pointer", fontWeight: 600, fontFamily: "inherit" }}>{refreshingIdx === i ? "⏳" : "🔄"}</button>
                  </div>
                </div>
                {openIdx === i && <div style={{ padding: "14px 18px 14px 18px", background: C.surface, borderBottom: `1px solid ${C.border}`, fontSize: 13, color: C.sub, lineHeight: 1.7 }}>
                  {h.description && <p style={{ color: C.text, fontSize: 12.5, margin: "0 0 8px", fontStyle: "italic", borderLeft: `2px solid ${C.accent}`, paddingLeft: 10 }}>{h.description}</p>}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>{h.role && <span style={{ ...badge(h.role === "Hedge" ? C.teal : h.role === "Core" ? C.accent : h.role === "Growth Kicker" ? C.gold : h.role === "Income" ? C.green : C.sub) }}>{h.role}</span>}{h.sector && <span style={{ ...badge(C.dim) }}>{h.sector}</span>}{h.marketCap && h.marketCap !== "N/A" && <span style={{ ...badge(C.dim) }}>{h.marketCap}</span>}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>{h.action && <span style={{ ...badge(h.action === "BUY" ? C.green : h.action === "SHORT" ? "#f59e0b" : h.action === "SELL" ? C.red : C.teal), fontSize: 10 }}>{h.action}</span>}{h.conviction && <span style={{ ...badge(h.conviction === "high" ? C.green : h.conviction === "medium" ? C.gold : C.dim), fontSize: 10 }}>{h.conviction} conviction</span>}{(() => { const lv = liveAllocations[i] || h.allocation; const costB = h.originalAllocation || h.allocation; const pnl = ((lv / costB) - 1) * 100; return <span style={{ color: pnl >= 0 ? C.green : C.red, fontSize: 11, fontWeight: 700, fontFamily: mono }}>P&L: {fmtSign(pnl, 1)}% ({fmtUSD(Math.round(lv - costB))})</span>; })()}{h.entryPrice && <span style={{ color: C.dim, fontSize: 10, fontFamily: mono }}>Entry: {fmtPrice(h.entryPrice)}</span>}{(() => { const lp = livePricesRef.current[h.symbol]?.price || h.livePrice; const isShort = h.action === "SHORT"; const priceGood = isShort ? (lp <= (h.entryPrice || 0)) : (lp >= (h.entryPrice || 0)); return lp ? <span style={{ color: priceGood ? C.green : C.red, fontSize: 10, fontFamily: mono }}>Now: {fmtPrice(lp)}</span> : null; })()}{h.shares && <span style={{ color: C.dim, fontSize: 10, fontFamily: mono }}>Shares: {h.shares < 1 ? h.shares.toFixed(6) : fmt(h.shares, 4)}</span>}{!h.entryPrice && !h.livePrice && !livePricesRef.current[h.symbol]?.price && <span title="Live price unavailable for this ticker — may be delisted, OTC-only, or unsupported by our data providers. Portfolio is tracking this position by its original allocation value." style={{ color: C.gold, fontSize: 9, fontFamily: mono, cursor: "help", borderBottom: "1px dashed currentColor" }}>⚠ No price data — tracking by allocation</span>}{h.priceTarget && <span style={{ color: C.green, fontSize: 11, fontFamily: mono }}>Target: {h.priceTarget}</span>}{h.stopLoss && <span style={{ color: C.red, fontSize: 11, fontFamily: mono }}>Stop: {h.stopLoss}</span>}</div>
                  {h.thesisConnection && <div style={{ marginBottom: 10, padding: "8px 12px", background: C.accentBg, border: `1px solid ${C.accentBorder}`, borderRadius: 6 }}><span style={{ color: C.accentLight, fontWeight: 700, fontSize: 10, fontFamily: mono, letterSpacing: 0.3 }}>THESIS CONNECTION: </span><span style={{ color: C.text, fontSize: 12 }}>{h.thesisConnection}</span></div>}
                  {h.financialMetrics && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))", gap: 6, marginBottom: 10 }}>
                    {[["Mkt Cap", h.financialMetrics.marketCapValue], ["LTM Rev", h.financialMetrics.ltmRevenue], ["EBITDA", h.financialMetrics.ebitda], ["EV/Rev", h.financialMetrics.evRevenue], ["EV/EBITDA", h.financialMetrics.evEbitda], ["P/E", h.financialMetrics.peRatio], ["Rev Growth", h.financialMetrics.revenueGrowth], ["Div Yield", h.financialMetrics.dividendYield]].filter(([,v]) => v && v !== "N/A").map(([k, v]) => (
                      <div key={k} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 5, padding: "5px 8px", textAlign: "center" }}>
                        <div style={{ color: C.dim, fontSize: 8, fontFamily: mono, fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase" }}>{k}</div>
                        <div style={{ color: C.text, fontSize: 11, fontWeight: 600, fontFamily: mono }}>{v}</div>
                      </div>
                    ))}
                  </div>}
                  <div style={{ marginBottom: 10 }}><span style={{ color: C.accent, fontWeight: 700, fontSize: 10.5, fontFamily: mono, letterSpacing: 0.3 }}>AI RATIONALE: </span>{h.rationale}</div>
                  {h.exitTrigger && <div style={{ marginBottom: 10, padding: "8px 12px", background: "rgba(239,68,68,.06)", border: `1px solid rgba(239,68,68,.15)`, borderRadius: 6 }}><span style={{ color: C.red, fontWeight: 700, fontSize: 10.5, fontFamily: mono, letterSpacing: 0.3 }}>EXIT TRIGGER: </span><span style={{ color: C.sub, fontSize: 12 }}>{h.exitTrigger}</span></div>}
                  <div style={{ color: C.dim, fontSize: 10, marginBottom: 8, fontStyle: "italic" }}>Tip: Edit weight % or $ amount directly in the table row above.</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                    <button onClick={() => { const n = new Set(excludedIdx); if (isExcluded) { n.delete(i); const restoreVal = liveAllocations[i] || 0; if (restoreVal > 0) setCashBalance(prev => Math.max(0, prev - restoreVal)); } else { n.add(i); const liqVal = liveAllocations[i] || h.allocation; setCashBalance(prev => prev + liqVal); setTransactions(prev => [...prev, { type: "LIQUIDATE", symbol: h.symbol, amount: Math.round(liqVal), ts: Date.now(), reason: `Removed ${h.symbol} from portfolio. $${Math.round(liqVal).toLocaleString()} proceeds moved to cash.` }]); } setExcludedIdx(n); }} style={{ background: isExcluded ? "rgba(34,197,94,.1)" : "rgba(239,68,68,.08)", border: `1px solid ${isExcluded ? "rgba(34,197,94,.3)" : "rgba(239,68,68,.2)"}`, color: isExcluded ? C.green : C.red, fontSize: 11, padding: "6px 16px", borderRadius: 5, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>{isExcluded ? "✓ Add Back to Portfolio" : "✗ Remove from Portfolio"}</button>
                    {!isExcluded && <button onClick={() => sellToCash(i)} style={{ background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.15)", color: C.red, fontSize: 11, padding: "6px 16px", borderRadius: 5, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>💵 Sell to Cash</button>}
                    {!isExcluded && h.action !== "SHORT" && <button onClick={() => shortHolding(i)} style={{ background: "rgba(245,158,11,.06)", border: "1px solid rgba(245,158,11,.2)", color: "#f59e0b", fontSize: 11, padding: "6px 16px", borderRadius: 5, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>📉 Short</button>}
                    <button onClick={() => refreshHolding(i)} disabled={refreshingIdx !== null} style={{ background: "rgba(99,102,241,.08)", border: "1px solid rgba(99,102,241,.2)", color: "#818cf8", fontSize: 11, padding: "6px 16px", borderRadius: 5, cursor: refreshingIdx !== null ? "not-allowed" : "pointer", fontWeight: 600, fontFamily: "inherit" }}>{refreshingIdx === i ? "⏳ Refreshing..." : "🔄 Replace"}</button>
                    <span onClick={() => setOpenIdx(null)} style={{ color: C.dim, fontSize: 11.5, cursor: "pointer", padding: "6px 12px" }}>▲ Collapse</span>
                  </div>
                </div>}
              </div>
            );})}
          </div>{/* close mob-scroll */}
          </div>{/* close card */}

          {/* ══════ ADD CUSTOM HOLDINGS ══════ */}
          {portfolio.holdings.length < 20 && (() => {
            const activeCount = portfolio.holdings.length - excludedIdx.size;
            const maxAdd = 20 - portfolio.holdings.length;
            return (
            <div style={{ ...cardS(), marginBottom: 14, borderColor: C.accentBorder }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
                <div>
                  <span style={{ fontSize: 10.5, color: C.dim, fontFamily: mono, letterSpacing: 0.3 }}>ADD CUSTOM HOLDINGS</span>
                  <span style={{ ...badge(C.accent), fontSize: 9, marginLeft: 8 }}>+{maxAdd} slots</span>
                </div>
                <span style={{ color: C.dim, fontSize: 10 }}>{activeCount}/20 positions · Search by name or ticker</span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div style={{ flex: "1 1 280px", minWidth: 200, position: "relative" }} ref={searchRef}>
                  <div style={{ color: C.dim, fontSize: 9, fontFamily: mono, marginBottom: 3 }}>TICKER SYMBOL OR COMPANY NAME</div>
                  <input 
                    id="custom-sym" 
                    placeholder="Type ticker or name — e.g. AAPL, SPY, BTC, Tesla" 
                    value={searchQuery}
                    autoComplete="off"
                    onChange={e => {
                      const val = e.target.value;
                      handleSymbolSearch(val);
                      setSelectedSymbol("");
                      setSelectedName("");
                    }}
                    onFocus={() => { if (searchResults.length > 0) setSearchOpen(true); }}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (searchOpen && searchResults.length > 0) {
                          selectSearchResult(searchResults[0]);
                        } else {
                          setSearchOpen(false);
                          setSearchResults([]);
                          document.getElementById("custom-alloc")?.focus();
                        }
                      } else if (e.key === "Escape") {
                        setSearchOpen(false);
                      }
                    }}
                    style={{ background: C.surface, border: `1px solid ${searchOpen ? C.accent : C.border}`, color: C.text, padding: "7px 10px", borderRadius: 5, fontSize: 13, fontFamily: mono, fontWeight: 700, width: "100%", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }} 
                  />
                  {selectedSymbol && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                      <span style={{ ...badge(detectTickerType(selectedSymbol) === "crypto" ? "#f59e0b" : detectTickerType(selectedSymbol) === "etf" ? "#3b82f6" : C.accent), fontSize: 8.5 }}>
                        {detectTickerType(selectedSymbol) === "etf" ? "ETF ✓" : detectTickerType(selectedSymbol).toUpperCase()}
                      </span>
                      <span style={{ color: C.text, fontSize: 12, fontWeight: 700, fontFamily: mono }}>{selectedSymbol}</span>
                      <span style={{ color: C.sub, fontSize: 11 }}>{selectedName}</span>
                    </div>
                  )}
                  {!selectedSymbol && searchQuery.length >= 1 && !searchOpen && (
                    <div style={{ color: C.dim, fontSize: 9, marginTop: 3 }}>
                      ↵ Press Enter or click <strong style={{ color: C.text }}>+ Add to ETF</strong> to use <span style={{ color: C.accent, fontFamily: mono }}>{searchQuery.toUpperCase()}</span> directly &nbsp;·&nbsp; Stocks, ETFs, crypto all supported
                    </div>
                  )}
                  {/* Search results dropdown */}
                  {searchOpen && searchResults.length > 0 && (
                    <div style={{ 
                      position: "absolute", top: "100%", left: 0, right: 0, 
                      background: C.card, border: `1px solid ${C.accent}`, borderRadius: 6, 
                      marginTop: 2, zIndex: 999, maxHeight: 260, overflowY: "auto",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                    }}>
                      {searchResults.map((r, i) => {
                        const typeBg = r.type === "Crypto" ? "#f59e0b" : r.type === "ETF" ? "#3b82f6" : C.accent;
                        return (
                          <div key={r.symbol + i} onClick={() => selectSearchResult(r)}
                            style={{ 
                              display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", 
                              cursor: "pointer", borderBottom: `1px solid ${C.border}`,
                              transition: "background 0.15s",
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = "rgba(139,92,246,0.1)"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          >
                            <span style={{ ...badge(typeBg), fontSize: 8, minWidth: 40, textAlign: "center" }}>{r.type?.toUpperCase() || "STOCK"}</span>
                            <span style={{ color: C.text, fontWeight: 700, fontFamily: mono, fontSize: 13, minWidth: 60 }}>{r.symbol}</span>
                            <span style={{ color: C.sub, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.description}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div style={{ flex: "0 0 90px" }}>
                  <div style={{ color: C.dim, fontSize: 9, fontFamily: mono, marginBottom: 3 }}>ACTION</div>
                  <select id="custom-action" defaultValue="BUY" style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.green, padding: "7px 6px", borderRadius: 5, fontSize: 12, fontWeight: 700, width: "100%", outline: "none", cursor: "pointer", fontFamily: mono, boxSizing: "border-box" }} onChange={e => { e.target.style.color = e.target.value === "SHORT" ? "#f59e0b" : C.green; }}>
                    <option value="BUY" style={{ color: "#22c55e" }}>BUY</option>
                    <option value="SHORT" style={{ color: "#f59e0b" }}>SHORT</option>
                  </select>
                </div>
                <div style={{ flex: "0 0 110px" }}>
                  <div style={{ color: C.dim, fontSize: 9, fontFamily: mono, marginBottom: 3 }}>AMOUNT ($)</div>
                  <input id="custom-alloc" type="number" defaultValue={50000} min={1000} max={500000} step={1000} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, padding: "7px 8px", borderRadius: 5, fontSize: 12, fontFamily: mono, width: "100%", outline: "none", textAlign: "right", boxSizing: "border-box" }} />
                </div>
                <button onClick={async () => {
                  const actionEl = document.getElementById("custom-action");
                  const allocEl = document.getElementById("custom-alloc");
                  const sym = (selectedSymbol || searchQuery).toUpperCase().trim().replace(/[^A-Z0-9.-]/g, "");
                  const name = selectedName.trim() || sym;
                  const action = actionEl?.value || "BUY";
                  const alloc = parseInt(allocEl?.value) || 50000;
                  
                  if (!sym) { setErr("Enter a ticker symbol (e.g. AAPL, SPY, BTC) or search by company name"); return; }
                  if (portfolio.holdings.length >= 20) { setErr("Maximum 20 holdings reached"); return; }
                  if (portfolio.holdings.some(h => h.symbol === sym && !excludedIdx.has(portfolio.holdings.indexOf(h)))) { setErr(`${sym} is already in your portfolio`); return; }
                  if (alloc < 1000) { setErr("Minimum allocation is $1,000"); return; }
                  if (alloc > cashBalance) { setErr(`Insufficient cash. Available: ${fmtUSD(Math.round(cashBalance))}. Remove a holding to free up cash.`); return; }
                  
                  setErr(""); setLoading(true);
                  try {
                    // Fetch real price from Finnhub
                    // Check if ticker is known unsupported
                    if (UNSUPPORTED_TICKERS.has(sym)) {
                      const msg = sym === "RNDR" || sym === "RENDER"
                        ? `${sym} rebranded to RENDER — try adding RENDER instead.`
                        : `${sym} is not supported on our platform (Finnhub free tier limitation). For Bitcoin exposure, add BTC directly as a crypto holding.`;
                      setErr(msg);
                      setLoading(false);
                      return;
                    }
                    
                    const type = detectTickerType(sym);
                    let quotes = await fetchRealQuotes([{ symbol: sym, type }]);
                    let q = quotes[sym];
                    let entryPrice = q ? q.price : null;
                    
                    // Cross-validate problematic tickers
                    if (entryPrice && KNOWN_PROBLEMATIC_TICKERS.has(sym)) {
                      entryPrice = await crossValidateCryptoPrice(sym, entryPrice);
                      if (!validateQuotePrice(sym, entryPrice, type)) entryPrice = null;
                    }
                    
                    if (!entryPrice || entryPrice <= 0) {
                      setErr(`Could not fetch price for ${sym}. Check the symbol and try again.`);
                      setLoading(false);
                      return;
                    }
                    
                    const shares = alloc / entryPrice;
                    const now = Date.now();
                    
                    // Build the new holding
                    const newHolding = {
                      symbol: sym, name: name || sym, type,
                      weight: 0, // Will be recalculated
                      allocation: alloc,
                      action, conviction: "medium", role: "Custom",
                      rationale: `User-added ${action} position: ${alloc.toLocaleString()} at ${fmtPrice(entryPrice)}/share`,
                      thesisConnection: `Custom ${action} — added by portfolio manager`,
                      entryPrice: Math.round(entryPrice * 10000) / 10000,
                      shares: Math.round(shares * 100000000) / 100000000,
                      entryDate: new Date().toISOString(),
                      livePrice: entryPrice,
                      liveValue: alloc,
                      originalAllocation: alloc,
                      targetWeight: 0, currentWeight: 0,
                      sector: type === "crypto" ? "Digital Assets" : type === "etf" ? "Fund" : type === "commodity" ? "Commodities" : "Equities",
                    };
                    
                    // Build the transaction
                    const tx = {
                      type: action === "SHORT" ? "SHORT" : "BUY",
                      symbol: sym, name: name || sym, amount: alloc, ts: now,
                      orderId: `ORD-CUSTOM-${now.toString(36).toUpperCase()}`,
                      executionTime: new Date(now).toISOString(),
                      pricePerShare: newHolding.entryPrice,
                      shares: newHolding.shares,
                      commission: 0,
                      settlementDate: new Date(now + 2 * 86400000).toISOString().slice(0, 10),
                      orderType: "MARKET", status: "FILLED",
                      weight: 0, assetType: type,
                      reason: `Custom ${action}: ${sym} — $${alloc.toLocaleString()} at ${fmtPrice(entryPrice)}/share × ${shares.toFixed(4)} shares`,
                    };
                    
                    // Deduct from cash if available, otherwise it's new capital
                    if (cashBalance >= alloc) {
                      setCashBalance(prev => prev - alloc);
                    }
                    
                    // Add holding to portfolio
                    const updatedHoldings = [...portfolio.holdings, newHolding];
                    
                    // Recalculate all weights based on live values
                    // updatedHoldings already includes newHolding, so reduce covers it
                    const totalVal = updatedHoldings.reduce((s, h, idx) => {
                      if (excludedIdx.has(idx)) return s;
                      return s + (idx === updatedHoldings.length - 1 ? alloc : (liveAllocations[idx] || h.allocation));
                    }, 0);
                    
                    updatedHoldings.forEach((h, idx) => {
                      const val = idx === updatedHoldings.length - 1 ? alloc : (liveAllocations[idx] || h.allocation);
                      h.weight = Math.round(val / totalVal * 1000) / 10;
                      h.targetWeight = h.weight;
                      h.currentWeight = h.weight;
                    });
                    
                    // Initialize live allocation for the new holding
                    setLiveAllocations(prev => ({ ...prev, [updatedHoldings.length - 1]: alloc }));
                    
                    setPortfolio(prev => ({ ...prev, holdings: updatedHoldings }));
                    setTransactions(prev => [...prev, tx]);
                    
                    // Clear inputs
                    setSearchQuery("");
                    setSelectedSymbol("");
                    setSelectedName("");
                    setSearchResults([]);
                    if (allocEl) allocEl.value = "50000";
                    
                    console.log(`[Custom] ✓ Added ${action} ${sym}: ${shares.toFixed(4)} shares @ ${fmtPrice(entryPrice)}, $${alloc.toLocaleString()}`);
                  } catch (e) {
                    setErr(`Failed to add ${sym}: ${e.message}`);
                  }
                  setLoading(false);
                }} disabled={loading} style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 6, padding: "7px 18px", fontSize: 12, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap", opacity: loading ? 0.6 : 1, marginBottom: 0, alignSelf: "flex-end" }}>
                  {loading ? "⏳ Fetching price..." : "+ Add to ETF"}
                </button>
              </div>
              <div style={{ color: C.dim, fontSize: 10, marginTop: 8, lineHeight: 1.4 }}>
                Allocations are funded from your cash balance. Real market price is fetched from Finnhub at execution. Shares = Amount ÷ Price.
              </div>
            </div>
            );
          })()}

          <div style={{ ...cardS(), marginBottom: 14 }}>
            <div style={{ fontSize: 10.5, color: C.dim, marginBottom: 7, fontFamily: mono, letterSpacing: 0.3 }}>ALLOCATION BREAKDOWN {excludedIdx.size > 0 ? `(${portfolio.holdings.length - excludedIdx.size} of ${portfolio.holdings.length} active)` : ""}</div>
            <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", height: 22 }}>
              {portfolio.holdings.map((h, i) => { if (excludedIdx.has(i)) return null; const liveVal = liveAllocations[i] || h.allocation; const liveActiveTotal = portfolio.holdings.reduce((s, hh, j) => s + (excludedIdx.has(j) ? 0 : (liveAllocations[j] || hh.allocation)), 0); const adjW = liveVal / liveActiveTotal * 100; return <div key={i} title={`${h.symbol}: ${fmt(adjW, 1)}% (${fmtUSD(Math.round(liveVal))})`} style={{ width: `${adjW}%`, background: TC[h.type] || C.accent, opacity: 0.55 + (i % 3) * 0.15, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8.5, color: "#fff", fontWeight: 700, borderRight: "1px solid rgba(0,0,0,.3)" }}>{adjW >= 8 ? h.symbol : ""}</div>; })}
            </div>
          </div>

          {/* Cash Position */}
          {(cashBalance > 0 || portfolio.cashPosition?.amount > 0) && (
            <div className="cash-position" style={{ ...cardS(), marginBottom: 14, borderColor: "rgba(45,212,191,.25)" }}>
              <div className="cash-inner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 10.5, color: C.dim, marginBottom: 4, fontFamily: mono, letterSpacing: 0.3 }}>CASH — MONEY MARKET (4.5% APY)</div>
                  <div style={{ color: C.teal, fontSize: 24, fontWeight: 800, fontFamily: mono }}>{fmtUSD(Math.round(cashBalance))}</div>
                  <div style={{ color: C.dim, fontSize: 11.5, marginTop: 2 }}>Accruing {fmt(DAILY_MM_RATE * 100, 4)}% daily &bull; Est. {fmtUSD(Math.round(cashBalance * MONEY_MARKET_RATE))}/yr</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: C.green, fontSize: 13, fontWeight: 700, fontFamily: mono }}>{fmt(cashBalance / currentNAV * 100, 1)}% of portfolio</div>
                  {portfolio.cashPosition?.rationale && <div style={{ color: C.sub, fontSize: 11.5, maxWidth: 280, marginTop: 4 }}>{portfolio.cashPosition.rationale}</div>}
                </div>
              </div>
            </div>
          )}

          {/* NAV Tracking Chart */}
          {navHistory.length > 1 && (
            <div style={{ ...cardS(), marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 10.5, color: C.dim, fontFamily: mono, letterSpacing: 0.3 }}>PORTFOLIO BALANCE — {portfolio.ticker || "SIM"}</div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span style={{ color: navHistory[navHistory.length - 1]?.nav >= 1000000 ? C.green : C.red, fontSize: 15, fontWeight: 700, fontFamily: mono }}>{fmtUSD(navHistory[navHistory.length - 1]?.nav || 1000000)}</span>
                  <span style={{ color: navHistory[navHistory.length - 1]?.nav >= 1000000 ? C.green : C.red, fontSize: 12, fontFamily: mono }}>({navHistory[navHistory.length - 1]?.nav >= 1000000 ? "+" : ""}{fmt((navHistory[navHistory.length - 1]?.nav / 1000000 - 1) * 100, 2)}%)</span>
                </div>
              </div>
              <SparkLine data={navHistory.map(n => ({ day: 0, price: n.nav }))} w={780} h={60} color={navHistory[navHistory.length - 1]?.nav >= 1000000 ? C.green : C.red} />
            </div>
          )}

          {/* Transaction Log */}
          <div style={{ ...cardS(), marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setShowTxLog(!showTxLog)}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 10.5, color: C.dim, fontFamily: mono, letterSpacing: 0.3 }}>TRANSACTION LOG</span>
                <span style={{ ...badge(C.accent), fontSize: 10 }}>{transactions.length} trades</span>
              </div>
              <span style={{ color: C.dim, fontSize: 13 }}>{showTxLog ? "▲ Hide" : "▼ Show"}</span>
            </div>
            {showTxLog && transactions.length > 0 && (
              <div style={{ marginTop: 10, maxHeight: 300, overflowY: "auto" }}>
                {[...transactions].reverse().map((tx, i) => (
                  <div key={i} className="tx-item" style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}`, fontSize: 12, alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 0, flex: 1 }}>
                      <span style={{ ...badge(tx.type === "BUY" ? C.green : tx.type === "SELL" || tx.type === "AUTO-SELL" ? C.red : tx.type === "SHORT" ? "#f59e0b" : tx.type === "FEE" ? "#a855f7" : C.teal), fontSize: 9, minWidth: 44, textAlign: "center", flexShrink: 0 }}>{tx.type}</span>
                      <span style={{ color: C.text, fontWeight: 600, fontFamily: mono, fontSize: 12, flexShrink: 0 }}>{tx.symbol}</span>
                      <span className="hide-mobile" style={{ color: C.dim, fontSize: 10.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{tx.reason}</span>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ color: C.text, fontFamily: mono, fontSize: 12 }}>{fmtUSD(tx.amount)}</div>
                      <div style={{ color: C.dim, fontSize: 10 }}>{new Date(tx.ts).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Risk Analysis */}
          {portfolio.riskAnalysis && (
            <div style={{ ...cardS(), marginBottom: 14 }}>
              <div style={{ fontSize: 10.5, color: C.dim, marginBottom: 10, fontFamily: mono, letterSpacing: 0.3 }}>RISK ANALYSIS</div>
              <div style={{ display: "grid", gap: 8 }}>
                {portfolio.riskAnalysis.correlationNote && <div><span style={{ color: C.teal, fontSize: 10.5, fontFamily: mono, fontWeight: 600 }}>CORRELATION: </span><span style={{ color: C.sub, fontSize: 12.5, lineHeight: 1.5 }}>{portfolio.riskAnalysis.correlationNote}</span></div>}
                {portfolio.riskAnalysis.worstCase && <div><span style={{ color: C.red, fontSize: 10.5, fontFamily: mono, fontWeight: 600 }}>WORST CASE: </span><span style={{ color: C.sub, fontSize: 12.5 }}>{portfolio.riskAnalysis.worstCase}</span></div>}
                {portfolio.riskAnalysis.hedgingStrategy && <div><span style={{ color: C.green, fontSize: 10.5, fontFamily: mono, fontWeight: 600 }}>HEDGING: </span><span style={{ color: C.sub, fontSize: 12.5 }}>{portfolio.riskAnalysis.hedgingStrategy}</span></div>}
                {portfolio.riskAnalysis.tailRisk && <div><span style={{ color: C.gold, fontSize: 10.5, fontFamily: mono, fontWeight: 600 }}>TAIL RISK: </span><span style={{ color: C.sub, fontSize: 12.5 }}>{portfolio.riskAnalysis.tailRisk}</span></div>}
                {portfolio.riskAnalysis.liquidityRisk && <div><span style={{ color: C.cyan, fontSize: 10.5, fontFamily: mono, fontWeight: 600 }}>LIQUIDITY: </span><span style={{ color: C.sub, fontSize: 12.5 }}>{portfolio.riskAnalysis.liquidityRisk}</span></div>}
              </div>
            </div>
          )}

          {/* Macro Analysis */}
          {portfolio.macroAnalysis && (
            <div style={{ ...cardS(), marginBottom: 14 }}>
              <div style={{ fontSize: 10.5, color: C.dim, marginBottom: 10, fontFamily: mono, letterSpacing: 0.3 }}>MACRO ENVIRONMENT ANALYSIS</div>
              <div style={{ display: "grid", gap: 8 }}>
                {portfolio.macroAnalysis.regime && <div><span style={{ color: C.accent, fontSize: 10.5, fontFamily: mono, fontWeight: 600 }}>REGIME: </span><span style={{ color: C.sub, fontSize: 12.5, lineHeight: 1.5 }}>{portfolio.macroAnalysis.regime}</span></div>}
                {portfolio.macroAnalysis.interestRates && <div><span style={{ color: C.teal, fontSize: 10.5, fontFamily: mono, fontWeight: 600 }}>RATES: </span><span style={{ color: C.sub, fontSize: 12.5 }}>{portfolio.macroAnalysis.interestRates}</span></div>}
                {portfolio.macroAnalysis.inflation && <div><span style={{ color: C.gold, fontSize: 10.5, fontFamily: mono, fontWeight: 600 }}>INFLATION: </span><span style={{ color: C.sub, fontSize: 12.5 }}>{portfolio.macroAnalysis.inflation}</span></div>}
                {portfolio.macroAnalysis.geopolitical && <div><span style={{ color: C.red, fontSize: 10.5, fontFamily: mono, fontWeight: 600 }}>GEOPOLITICAL: </span><span style={{ color: C.sub, fontSize: 12.5 }}>{portfolio.macroAnalysis.geopolitical}</span></div>}
                {portfolio.macroAnalysis.sectorRotation && <div><span style={{ color: C.green, fontSize: 10.5, fontFamily: mono, fontWeight: 600 }}>SECTOR ROTATION: </span><span style={{ color: C.sub, fontSize: 12.5 }}>{portfolio.macroAnalysis.sectorRotation}</span></div>}
              </div>
            </div>
          )}

          {/* Factor Exposure + Income side by side */}
          <div className="grid3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            {portfolio.factorExposure && (() => {
              const factorDescriptions = {
                momentum: "Tendency to continue recent price trends — high means the portfolio favors stocks that have been rising",
                value: "Exposure to undervalued stocks based on fundamentals like P/E, P/B ratios",
                growth: "Exposure to companies with above-average revenue and earnings growth rates",
                quality: "Exposure to companies with strong balance sheets, high ROE, and stable earnings",
                lowVolatility: "Exposure to stocks with lower price fluctuations — low means higher volatility tolerance",
                size: "Exposure across market cap spectrum — 'mid' means mid-cap tilt, 'large' means mega-cap focus",
              };
              return (
              <div style={cardS()}>
                <div style={{ fontSize: 10.5, color: C.dim, marginBottom: 10, fontFamily: mono, letterSpacing: 0.3 }}>FACTOR EXPOSURE</div>
                <div style={{ display: "grid", gap: 8 }}>
                  {Object.entries(portfolio.factorExposure).map(([k, v]) => {
                    const level = typeof v === "string" ? v.split("—")[0].trim().toLowerCase() : "";
                    const color = level === "high" ? C.green : level === "medium" ? C.gold : C.dim;
                    const desc = factorDescriptions[k] || "";
                    return <div key={k}><div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}><span style={{ color: C.sub, fontSize: 12, textTransform: "capitalize" }}>{k.replace(/([A-Z])/g, " $1")}</span><span style={{ color, fontSize: 11.5, fontFamily: mono, fontWeight: 600 }}>{typeof v === "string" ? v.split("—")[0].trim() : v}</span></div>{desc && <div style={{ color: C.dim, fontSize: 9.5, marginTop: 1, lineHeight: 1.4 }}>{desc}</div>}</div>;
                  })}
                </div>
              </div>
            );})()}
            {portfolio.incomeProjection && (
              <div style={cardS()}>
                <div style={{ fontSize: 10.5, color: C.dim, marginBottom: 10, fontFamily: mono, letterSpacing: 0.3 }}>DIVIDEND INCOME PROJECTION</div>
                <div style={{ display: "grid", gap: 8 }}>
                  {portfolio.incomeProjection.estimatedYield && <div><span style={{ color: C.green, fontSize: 10.5, fontFamily: mono, fontWeight: 600 }}>YIELD: </span><span style={{ color: C.text, fontSize: 14, fontFamily: mono, fontWeight: 700 }}>{portfolio.incomeProjection.estimatedYield}</span></div>}
                  {portfolio.incomeProjection.annualIncome && <div><span style={{ color: C.accent, fontSize: 10.5, fontFamily: mono, fontWeight: 600 }}>ANNUAL INCOME: </span><span style={{ color: C.text, fontSize: 13, fontFamily: mono }}>{portfolio.incomeProjection.annualIncome}</span></div>}
                  {portfolio.incomeProjection.growthVsIncome && <div><span style={{ color: C.teal, fontSize: 10.5, fontFamily: mono, fontWeight: 600 }}>SPLIT: </span><span style={{ color: C.sub, fontSize: 12.5 }}>{portfolio.incomeProjection.growthVsIncome}</span></div>}
                </div>
              </div>
            )}
          </div>

          {/* ESG + Rebalance Rules */}
          {(portfolio.esgConsiderations || portfolio.rebalanceRules) && (
            <div className="grid3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              {portfolio.esgConsiderations && (
                <div style={cardS()}>
                  <div style={{ fontSize: 10.5, color: C.dim, marginBottom: 8, fontFamily: mono, letterSpacing: 0.3 }}>ESG CONSIDERATIONS</div>
                  <p style={{ color: C.sub, fontSize: 12.5, lineHeight: 1.5, margin: 0 }}>{portfolio.esgConsiderations}</p>
                </div>
              )}
              {portfolio.rebalanceRules && (
                <div style={cardS()}>
                  <div style={{ fontSize: 10.5, color: C.dim, marginBottom: 8, fontFamily: mono, letterSpacing: 0.3 }}>REBALANCE RULES</div>
                  <p style={{ color: C.sub, fontSize: 12.5, lineHeight: 1.5, margin: "0 0 14px" }}>{portfolio.rebalanceRules}</p>
                </div>
              )}
            </div>
          )}

          {/* ═══ AUTO-REBALANCE TIMER ═══ */}
          {rebalDeadline && (
            <div style={{ ...cardS(), marginBottom: 14, padding: "12px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div>
                  <span style={{ color: C.dim, fontSize: 10, fontFamily: mono, letterSpacing: 0.3 }}>NEXT REBALANCE</span>
                  <div style={{ color: rebalCountdown.includes("REBALANCING") ? C.teal : C.text, fontSize: 13, fontWeight: 700, fontFamily: mono, marginTop: 2 }}>⏱ {rebalCountdown}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input type="checkbox" checked={autoRebalEnabled} onChange={e => setAutoRebalEnabled(e.target.checked)} style={{ cursor: "pointer" }} />
                    <span style={{ color: autoRebalEnabled ? C.green : C.dim, fontSize: 11, fontWeight: 600 }}>Auto-rebalance {autoRebalEnabled ? "ON" : "OFF"}</span>
                  </label>
                </div>
              </div>
              {(() => {
                const freq = portfolio.userRebalFreq || rebalFreq;
                const totalMs = REBAL_MS[freq] || REBAL_MS.quarterly;
                const remaining = Math.max(0, rebalDeadline - Date.now());
                const pct = Math.max(0, Math.min(100, (remaining / totalMs) * 100));
                return <div style={{ height: 4, borderRadius: 2, background: C.surface, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", borderRadius: 2, background: pct > 20 ? C.teal : C.red, transition: "width 1s linear" }} />
                </div>;
              })()}
              <div style={{ fontSize: 10, color: C.dim, marginTop: 6 }}>
                {autoRebalEnabled ? `AI will automatically rebalance when the timer expires. You can manually trigger it anytime with the button below.` : `Auto-rebalance is OFF. Click the review button below to manually trigger a rebalance before the period ends.`}
              </div>
            </div>
          )}

          <div className="builder-actions" style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => { weeklyUpdate(); }} disabled={loading || refreshingIdx !== null} style={{ ...btnP(), fontSize: 12.5, padding: "8px 16px", background: loading ? C.surface : "rgba(45,212,191,.1)", color: loading ? C.dim : C.teal, border: `1px solid ${loading ? C.border : "rgba(45,212,191,.3)"}` }}>{loading ? "⏳ Updating..." : `🔄 ${(portfolio.userRebalFreq || rebalFreq || "weekly").charAt(0).toUpperCase() + (portfolio.userRebalFreq || rebalFreq || "weekly").slice(1)} Review`}</button>
            <button onClick={() => { setPortfolio(null); setThesis(""); setSaved(false); setExcludedIdx(new Set()); setCashBalance(0); setTransactions([]); setNavHistory([]); setLiveAllocations({}); setRebalDeadline(null); setRebalCountdown(""); setEditingWeights({}); setNameEdited(false); setGenStep(0); setGenElapsed(0); livePricesRef.current = {}; if (genTimerRef.current) { clearInterval(genTimerRef.current); genTimerRef.current = null; } }} style={btnO()}>Start Over</button>
            <ShareMenu compact text={`🚀 Just built "${portfolio.name}" ${portfolio.ticker ? `($${portfolio.ticker})` : ""} with AI on ETF Simulator!\n\n${portfolio.holdings.length} holdings | ${portfolio.riskProfile || "moderate"} risk | ${portfolio.fee || 0}% fee\n💡 ${portfolio.holdings.slice(0, 4).map(h => "$" + h.symbol).join(" ")}\n\n${portfolio.strategy ? portfolio.strategy.slice(0, 80) + "..." : ""}\n\nBuild yours → etfsimulator.com`} label="Share" style={{ fontSize: 11 }} />
            {saved ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
                <span style={{ ...btnP(), opacity: 0.5, cursor: "default" }}>✓ Saved</span>
                {portfolio && !portfolio.isPublic && (
                  <button onClick={() => { setSaveErr(""); setShowSaveModal(true); }} style={{ background: "transparent", border: "none", color: C.accent, fontSize: 11.5, cursor: "pointer", padding: "0 2px", fontFamily: "inherit", textDecoration: "underline", textUnderlineOffset: 3 }}>
                    🏆 Want to compete? Publish to the leaderboard →
                  </button>
                )}
              </div>
            ) : <button onClick={() => { if (!user) { setPendingSave(true); openAuth("signin"); return; } setSaveErr(""); setShowSaveModal(true); }} style={btnP()}>Save Portfolio ◆</button>}
          </div>

          {/* ── SOFT GATE — guest banner after portfolio generation ── */}
          {!user && portfolio && !saved && (
            <div style={{ margin: "12px 0 0", padding: "14px 18px", background: `linear-gradient(135deg, ${C.accent}18, ${C.teal}12)`, border: `1px solid ${C.accent}40`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>🔒</span>
                <div>
                  <div style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>Sign in to save, track & compete</div>
                  <div style={{ color: C.sub, fontSize: 11, marginTop: 2 }}>Free account · keeps your portfolio forever · live P&L · leaderboard ranking</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setPendingSave(true); openAuth("signin"); }} style={{ ...btnP(), fontSize: 12, padding: "7px 16px" }}>Sign In</button>
                <button onClick={() => { setPendingSave(true); openAuth("signup"); }} style={{ ...btnO(), fontSize: 12, padding: "7px 16px", color: C.accent, borderColor: C.accent }}>Create Account</button>
              </div>
            </div>
          )}

          {/* Save Modal — public/private choice */}
          {showSaveModal && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 998 }} onClick={() => !saving && setShowSaveModal(false)}>
              <div onClick={(e) => e.stopPropagation()} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "28px 24px", width: 420, maxWidth: "92vw" }}>
                <h3 style={{ color: C.text, fontSize: 17, margin: "0 0 6px" }}>Save Portfolio</h3>
                <p style={{ color: C.sub, fontSize: 13, margin: "0 0 14px", lineHeight: 1.5 }}>Choose how to save <strong style={{ color: C.text }}>{portfolio.name}</strong>:</p>
                <div style={{ fontSize: 11, color: C.dim, marginBottom: 14, padding: "6px 10px", background: C.surface, borderRadius: 6, border: `1px solid ${C.border}` }}>
                  {user ? <span><span style={{ color: C.green }}>●</span> Signed in as <span style={{ color: C.accent, fontFamily: mono }}>{user.username || user.email}</span></span> : <span style={{ color: C.red }}>● Not signed in</span>}
                </div>
                {saveErr && <div style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)", borderRadius: 8, padding: "10px 14px", marginBottom: 14, color: C.red, fontSize: 12, lineHeight: 1.6 }}>⚠ {saveErr}{saveErr.includes("sign out") || saveErr.includes("session") ? <><br/><button onClick={() => { setShowSaveModal(false); signOut(); setTimeout(() => openAuth("signin"), 300); }} style={{ ...btnP(), marginTop: 8, fontSize: 11, padding: "6px 14px", background: C.red }}>Sign Out & Re-Sign In →</button></> : null}</div>}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <button disabled={saving} onClick={async () => {
                    setSaving(true); setSaveErr("");
                    try {
                      const active = portfolio.holdings.filter((_, i) => !excludedIdx.has(i));
                      const cashAdj = Math.round(cashBalance);
                      const liveTotal = active.reduce((s, h) => { const origIdx = portfolio.holdings.indexOf(h); return s + (liveAllocations[origIdx] || h.allocation); }, 0);
                      const adjusted = { ...portfolio, holdings: active.map(h => { const origIdx = portfolio.holdings.indexOf(h); const liveVal = liveAllocations[origIdx] || h.allocation; return { ...h, weight: Math.round(liveVal / (liveTotal + cashAdj) * 1000) / 10, liveValue: Math.round(liveVal), originalAllocation: h.originalAllocation || h.allocation, targetWeight: h.weight, currentWeight: Math.round(liveVal / (liveTotal + cashAdj) * 1000) / 10 }; }), value: Math.round(liveTotal + cashAdj), cashBalance: cashAdj, autoSellPct, transactions, navHistory };
                      const result = await savePortfolio(adjusted, false);
                      if (result === true) { setSaved(true); setShowSaveModal(false); }
                      else if (typeof result === "string") { setSaveErr(result); }
                      else { setSaveErr("Save failed. Please try again."); }
                    } catch (e) { setSaveErr(e.message || "Unexpected error"); }
                    setSaving(false);
                  }} style={{ ...cardS(), cursor: saving ? "wait" : "pointer", border: `1px solid ${C.border}`, textAlign: "left", background: C.surface, opacity: saving ? 0.6 : 1 }}>
                    <div style={{ color: C.text, fontSize: 14, fontWeight: 600, marginBottom: 3 }}>{saving ? "⏳ Saving…" : "🔒 Keep Private"}</div>
                    <div style={{ color: C.sub, fontSize: 12 }}>Only you can see this portfolio in "My Portfolios."{excludedIdx.size > 0 ? ` (${portfolio.holdings.length - excludedIdx.size} holdings, ${excludedIdx.size} removed)` : ""}</div>
                  </button>
                  <button disabled={saving} onClick={async () => {
                    setSaving(true); setSaveErr("");
                    try {
                      const active = portfolio.holdings.filter((_, i) => !excludedIdx.has(i));
                      const cashAdj2 = Math.round(cashBalance);
                      const liveTotal2 = active.reduce((s, h) => { const origIdx = portfolio.holdings.indexOf(h); return s + (liveAllocations[origIdx] || h.allocation); }, 0);
                      const adjusted = { ...portfolio, holdings: active.map(h => { const origIdx = portfolio.holdings.indexOf(h); const liveVal = liveAllocations[origIdx] || h.allocation; return { ...h, weight: Math.round(liveVal / (liveTotal2 + cashAdj2) * 1000) / 10, liveValue: Math.round(liveVal), originalAllocation: h.originalAllocation || h.allocation, targetWeight: h.weight, currentWeight: Math.round(liveVal / (liveTotal2 + cashAdj2) * 1000) / 10 }; }), value: Math.round(liveTotal2 + cashAdj2), cashBalance: cashAdj2, autoSellPct, transactions, navHistory };
                      const result = await savePortfolio(adjusted, true);
                      if (result === true) { setSaved(true); setShowSaveModal(false); }
                      else if (typeof result === "string") { setSaveErr(result); }
                      else { setSaveErr("Publish failed. Please try again."); }
                    } catch (e) { setSaveErr(e.message || "Unexpected error"); }
                    setSaving(false);
                  }} style={{ ...cardS(), cursor: saving ? "wait" : "pointer", border: `1px solid ${C.accentBorder}`, textAlign: "left", background: C.accentBg, opacity: saving ? 0.6 : 1 }}>
                    <div style={{ color: C.accentLight, fontSize: 14, fontWeight: 600, marginBottom: 3 }}>{saving ? "⏳ Publishing…" : "📊 Publish to Leaderboard"}</div>
                    <div style={{ color: C.sub, fontSize: 12 }}>Share with the community. If your portfolio ranks in the top 10 by return, it will appear on the leaderboard.</div>
                  </button>
                </div>
                <button onClick={() => { setShowSaveModal(false); setSaveErr(""); }} disabled={saving} style={{ ...btnO(), width: "100%", marginTop: 14, fontSize: 12.5 }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
      <div style={{ marginTop: 20, padding: "12px 16px", background: C.surface, borderRadius: 8, border: `1px solid ${C.border}` }}>
        <p style={{ color: C.dim, fontSize: 11, margin: 0, lineHeight: 1.5 }}>Educational Disclaimer: AI-generated portfolios are simulated and hypothetical. They do not constitute financial advice or personalized investment recommendations. All allocations, rationale, and performance projections are for learning purposes only. Past performance, whether real or simulated, does not guarantee future results. Consult a licensed financial advisor before making any investment decisions.</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   FINNHUB — Live market data for ticker bar
   ═══════════════════════════════════════════════════════════════════════ */

const FINNHUB_KEY = (typeof import.meta !== "undefined" && (import.meta.env?.VITE_FINNHUB_API_KEY || import.meta.env?.VITE_FINNHUB_KEY)) || "demo"; // Get free key at finnhub.io/register
if (FINNHUB_KEY === "demo") console.error("[ETF Simulator] 🚨 Using Finnhub DEMO key — MOST QUOTES WILL FAIL. Set VITE_FINNHUB_API_KEY in your Vercel env vars. Get a FREE key at https://finnhub.io/register");

// Rate limiter: max 55 requests per minute for Finnhub free tier
const rateLimiter = { queue: [], lastMinute: [], maxPerMin: 55 };
function finnhubFetch(url) {
  const now = Date.now();
  rateLimiter.lastMinute = rateLimiter.lastMinute.filter(t => now - t < 60000);
  if (rateLimiter.lastMinute.length >= rateLimiter.maxPerMin) {
    console.warn("[Finnhub] ⚠ Rate limited — waiting for cooldown (55/min limit)");
    return Promise.resolve(new Response(JSON.stringify({ s: "rate_limited" }), { status: 429 }));
  }
  rateLimiter.lastMinute.push(now);
  return fetch(url);
}

// ═══════════════════════════════════════════════════════════════════════
//   REAL PRICE ENGINE — Maps symbols to Finnhub format, fetches real quotes
//   This is the core of the brokerage: real entry prices, real shares, real P&L
// ═══════════════════════════════════════════════════════════════════════

// Crypto → Finnhub BINANCE exchange format
const CRYPTO_FINNHUB = {
  BTC: "BINANCE:BTCUSDT", ETH: "BINANCE:ETHUSDT", SOL: "BINANCE:SOLUSDT", XRP: "BINANCE:XRPUSDT",
  ADA: "BINANCE:ADAUSDT", DOT: "BINANCE:DOTUSDT", AVAX: "BINANCE:AVAXUSDT", MATIC: "BINANCE:MATICUSDT",
  LINK: "BINANCE:LINKUSDT", UNI: "BINANCE:UNIUSDT", DOGE: "BINANCE:DOGEUSDT", SHIB: "BINANCE:SHIBUSDT",
  BNB: "BINANCE:BNBUSDT", LTC: "BINANCE:LTCUSDT", ATOM: "BINANCE:ATOMUSDT", NEAR: "BINANCE:NEARUSDT",
  APT: "BINANCE:APTUSDT", ARB: "BINANCE:ARBUSDT", OP: "BINANCE:OPUSDT", FIL: "BINANCE:FILUSDT",
  ICP: "BINANCE:ICPUSDT", HBAR: "BINANCE:HBARUSDT", XLM: "BINANCE:XLMUSDT", ALGO: "BINANCE:ALGOUSDT",
  SUI: "BINANCE:SUIUSDT", SEI: "BINANCE:SEIUSDT", TIA: "BINANCE:TIAUSDT", INJ: "BINANCE:INJUSDT",
  FET: "BINANCE:FETUSDT", RNDR: "BINANCE:RNDRUSDT", RENDER: "BINANCE:RENDERUSDT", TAO: "BINANCE:TAOUSDT", TRX: "BINANCE:TRXUSDT",
  TON: "BINANCE:TONUSDT", STX: "BINANCE:STXUSDT", PEPE: "BINANCE:PEPEUSDT", WIF: "BINANCE:WIFUSDT",
  FLOKI: "BINANCE:FLOKIUSDT", BONK: "BINANCE:BONKUSDT", MEME: "BINANCE:MEMEUSDT", BRETT: "BINANCE:BRETTUSDT",
  POPCAT: "BINANCE:POPCATUSDT", MOG: "BINANCE:MOGUSDT", PONKE: "BINANCE:PONKEUSDT",
  MEW: "BINANCE:MEWUSDT",
  AAVE: "BINANCE:AAVEUSDT", MKR: "BINANCE:MKRUSDT",
  CRV: "BINANCE:CRVUSDT", PENDLE: "BINANCE:PENDLEUSDT", DYDX: "BINANCE:DYDXUSDT", JUP: "BINANCE:JUPUSDT",
  LDO: "BINANCE:LDOUSDT", GRT: "BINANCE:GRTUSDT", AR: "BINANCE:ARUSDT", THETA: "BINANCE:THETAUSDT",
  IMX: "BINANCE:IMXUSDT", GALA: "BINANCE:GALAUSDT", SAND: "BINANCE:SANDUSDT", MANA: "BINANCE:MANAUSDT",
  AXS: "BINANCE:AXSUSDT", RUNE: "BINANCE:RUNEUSDT", VET: "BINANCE:VETUSDT", ETC: "BINANCE:ETCUSDT",
  BCH: "BINANCE:BCHUSDT", COMP: "BINANCE:COMPUSDT", SNX: "BINANCE:SNXUSDT", KAS: "BINANCE:KASUSDT",
  WLD: "BINANCE:WLDUSDT", OCEAN: "BINANCE:OCEANUSDT", EGLD: "BINANCE:EGLDUSDT", FLOW: "BINANCE:FLOWUSDT",
  NEAR: "BINANCE:NEARUSDT", ORDI: "BINANCE:ORDIUSDT", BOME: "BINANCE:BOMEUSDT", ENS: "BINANCE:ENSUSDT",
  GMX: "BINANCE:GMXUSDT", QNT: "BINANCE:QNTUSDT",
};

// Convert any symbol to Finnhub API format
// ADR / foreign ticker → Finnhub-friendly symbol mapping
const TICKER_ALIASES = {
  "ADS": "ADDYY",    // Adidas AG → US ADR
  "UIPath": "PATH",  // UiPath Inc → US listing
  "BABA": "BABA",    // Alibaba (already US-listed)
};
const toFinnhub = (sym, type) => {
  if (type === "crypto" || CRYPTO_FINNHUB[sym]) return CRYPTO_FINNHUB[sym] || `BINANCE:${sym}USDT`;
  return TICKER_ALIASES[sym] || sym; // Check aliases first, then use ticker as-is
};

// ═══════════════════════════════════════════════════════════════════════
// GLOBAL QUOTE CACHE — shared between ticker bar, builder, and portfolio tracker
// ═══════════════════════════════════════════════════════════════════════
const quoteCache = { data: {}, ts: {} };
let lastGoodPrice = {}; // persistent — never cleared, survives cache expiry
const QUOTE_CACHE_TTL = 15000; // 15s freshness

// Batch-fetch real quotes via serverless proxy (/api/quote).
// ONE request fetches ALL symbols → API key stays server-side, no CORS/rate issues.
// Falls back to direct Finnhub if proxy not deployed (local dev).
// Returns { SYMBOL: { price, prevClose, high, low, open } }
// ══════ PRICE SANITY VALIDATOR ══════
// Catches stale/delisted pairs that return ghost data (e.g. RNDR→RENDER rebrand).
// Cross-validates: if two different exchange symbols return wildly different prices, flag it.
const KNOWN_PROBLEMATIC_TICKERS = new Set(["RNDR", "RENDER", "LUNA", "UST", "FTT",
  "FET", "AGIX", "OCEAN", "TAO", "INJ", "SEI", "TIA", "SUI", "APT", "NEAR",
  "ARB", "OP", "STX", "GRT", "LDO", "AAVE", "MKR", "CRV", "SNX", "COMP",
]);
// Per-token max price caps — any price ABOVE this is a stale/ghost price from Finnhub
// Set at ~3x the realistic current market price so real pumps still work, but ATH ghosts get rejected
const PRICE_CAPS = {
  // ── AI / DeFi tokens (Finnhub returns stale ATH ghost prices) ──
  // Caps set at ~5-10x current March 2026 price to block ghosts while allowing real moves
  "FET": 1.50,    // real ~$0.50, Finnhub ghost = $1.23 — raised cap to allow real upside
  "AGIX": 0.60,   // real ~$0.08
  "OCEAN": 1.00,  // real ~$0.25
  "TAO": 900,     // real ~$380
  "INJ": 50,      // real ~$11
  "SEI": 1.00,    // real ~$0.22
  "TIA": 8,       // real ~$2.5
  "GRT": 0.50,    // real ~$0.11
  "LDO": 3.00,    // real ~$0.75
  "ARB": 1.50,    // real ~$0.37
  "OP": 3.00,     // real ~$0.73
  "STX": 2.50,    // real ~$0.60
  "AAVE": 400,    // real ~$150
  "MKR": 2000,    // real ~$800
  "COMP": 100,    // real ~$40
  "CRV": 1.50,    // real ~$0.50
  "SNX": 3.00,    // real ~$1.00
  "UNI": 15,      // real ~$5.50
  "LINK": 30,     // real ~$12
  "MATIC": 1.00,  // real ~$0.35
  "SUI": 5.00,    // real ~$2.00
  "APT": 10,      // real ~$4.00
  "NEAR": 5.00,   // real ~$2.00
  "ATOM": 8.00,   // real ~$3.50
  "DOT": 7.00,    // real ~$3.50
  // ── Memecoins — caps at ~10x current price ──
  "DOGE": 0.80,   // real ~$0.17
  "SHIB": 0.00003, // real ~$0.00001
  "PEPE": 0.00002, // real ~$0.000008
  "BONK": 0.00005, // real ~$0.00001
  "FLOKI": 0.0005, // real ~$0.00003
  "WIF": 2.00,    // real ~$0.17 — old cap $12 was stale ATH
  "BRETT": 0.10,  // real ~$0.007
  "POPCAT": 2.00, // real ~$0.15 — old cap $3 was stale
  "MOG": 0.00003, // real ~$0.0000015
  "PONKE": 0.50,  // real ~$0.030
  "BOME": 0.05,   // real ~$0.0004
  "MEW": 0.05,    // real ~$0.003
  "MEME": 0.08,   // real ~$0.01
  "TURBO": 0.02,  // real ~$0.003
  "NEIRO": 0.004, // real ~$0.0005
  // ── Delisted/rebranded ──
  "RNDR": 15, "RENDER": 15, "LUNA": 1, "UST": 0.05, "FTT": 5,
  // ── Small/mid-cap stocks in live funds ──
  "NNE": 100,   // Nano Nuclear Energy — volatile, give headroom
  "OKLO": 100,  // Oklo Inc — volatile, give headroom
  "LEU": 300,   // Centrus Energy
  "UEC": 30,    // Uranium Energy Corp
  "BWXT": 300,  // BWX Technologies
  "GEV": 1200,  // GE Vernova — live price confirmed $839 Mar 2026, raised from $700
  "MP": 60,     // MP Materials
  "RKLB": 80,   // Rocket Lab — has rallied significantly
  "CELH": 150,  // Celsius Holdings
  "ON": 200,    // ON Semiconductor
  // ── Mega-cap stocks — safety caps to block Finnhub stale ghost prices ──
  "NVDA": 400,  // real ~$114 post-10:1-split Mar 2026 (pre-split ghost ~$900)
  "TSLA": 1500, // real ~$250-400 range Mar 2026
  "AAPL": 600,  // real ~$220-260 range, ATH $260
  "MSFT": 1000, // real ~$390-490 range, ATH $490
  "GOOGL": 500, // real ~$170-210 range
  "AMZN": 600,  // real ~$200-230 range
  "META": 1500, // real ~$600-750 range
  "NFLX": 2500, // real ~$900-1100 range
  "PLTR": 300,  // real ~$50-130 range, volatile
  "AMD": 400,   // real ~$100-200 range
  "INTC": 100,  // real ~$20-45 range
  "PYPL": 200,  // real ~$65-100 range
  "CRM": 500,   // real ~$290-350 range
  "UBER": 150,  // real ~$65-90 range
  "SHOP": 500,  // real ~$80-120 range (USD), post-split
  "SNOW": 300,  // real ~$130-190 range
  "COIN": 600,  // real ~$200-400 range, volatile
  // ── Commodity ETFs — caps updated March 2026 (gold confirmed $4,262/oz) ──
  "GLD": 700,   // real ~$472 (gold ETF, 1/10 oz per share)
  "IAU": 100,   // real ~$47 (iShares gold, 1/100 oz per share)
  "SLV": 120,   // real ~$78 — no cap previously, needed to block stale ghosts
  "USO": 200,   // real ~$104 (US Oil Fund)
  "UNG": 30,    // real ~$15 (natural gas ETF)
  "GDX": 250,   // real ~$115 Mar 2026 — gold miners rallied with gold at $4,262/oz
  "GDXJ": 300,  // real ~$137 Mar 2026 — junior gold miners high beta to gold rally
  "URA": 60,    // real ~$30 (uranium ETF)
  "LIT": 70,    // real ~$35 (lithium ETF)
  "CPER": 70,   // real ~$34 (copper ETF)
  // ── Major crypto — generous caps, Binance is the source ──
  "BNB": 1500,  // real ~$580
  "BTC": 200000,
  "ETH": 10000,
  "SOL": 500,
  "XRP": 5,
  "ADA": 3,
  "AVAX": 100,
};

// Known accurate March 2026 prices for commodity ETFs — used as fallback when Finnhub fails
// Prevents stale AI training-data estimates (e.g. GLD ~$330) from corrupting portfolio entry prices
const COMMODITY_ETF_KNOWN_PRICES = {
  "GLD": 404,   // Gold ETF: $4,262/oz ÷ 10.55 = $404 (confirmed live Mar 2026)
  "IAU": 40.4,  // iShares Gold: $4,262/oz ÷ 105.5 = $40.4
  "SLV": 62.5,  // Silver ETF: $67.47/oz ÷ 1.08 = $62.5 (confirmed live Mar 2026)
  "USO": 104.2, // US Oil Fund: $100/bbl ÷ 0.96 = $104.2
  "UNG": 15.0, "WEAT": 6.0, "CORN": 22.0,
  "GDX": 115.0, "GDXJ": 137.0, "URA": 30.0,
  "LIT": 35.0, "CPER": 34.0, "PPLT": 90.0, "PALL": 80.0,
};
// Minimum prices below which a commodity ETF price is definitely a stale AI estimate
const COMMODITY_ETF_MIN_PRICES = {
  "GLD": 300, "IAU": 30, "SLV": 45, "USO": 70, "GDX": 80, "GDXJ": 90,
};

// Tickers that Finnhub free tier does NOT support — mostly Bitcoin/crypto spot ETFs
// NOTE: X (U.S. Steel) was NOT removed — Nippon Steel acquisition was blocked; X still trades on NYSE
const UNSUPPORTED_TICKERS = new Set(["IBIT", "GBTC", "ETHE", "BITO", "ARKB", "FBTC", "BITB", "EZBC", "HODL", "BTCO", "DEFI", "BTCW", "RNDR", "RENDER", "AJRD"]);
const validateQuotePrice = (symbol, price, type) => {
  if (!price || price <= 0 || !isFinite(price)) return false;
  // 1. Per-token price cap — rejects stale ATH ghost prices (too high)
  const cap = PRICE_CAPS[symbol];
  if (cap && price > cap) {
    console.warn(`[Price Validator] ⚠ ${symbol} $${price} exceeds cap $${cap} — rejecting stale ghost`);
    return false;
  }
  // 2. Known problematic tickers — only reject if no cap AND price seems like a ghost (>$50)
  // $5 threshold was too aggressive — tokens like LINK, UNI legitimately trade above $5
  if (KNOWN_PROBLEMATIC_TICKERS.has(symbol) && !cap && price > 50) {
    console.warn(`[Price Validator] ⚠ ${symbol} $${price} flagged — known problematic ticker, likely ghost price`);
    return false;
  }
  // 3. Relative sanity check against last known-good price (catches bad low feeds)
  // If a new price is >90% below the last good price in a single fetch, it's a feed error.
  // Real 90% single-cycle crashes don't happen on liquid assets.
  const last = lastGoodPrice[symbol];
  if (last && last > 0 && price < last * 0.10) {
    console.warn(`[Price Validator] ⚠ ${symbol} $${price} is >90% below last-good $${last} — rejecting bad feed, keeping last-good`);
    return false; // caller will use lastGoodPrice[symbol] as fallback
  }
  return true;
};

// Cross-validate a crypto price by fetching from a second exchange
const crossValidateCryptoPrice = async (symbol, primaryPrice) => {
  if (!primaryPrice || primaryPrice <= 0) return primaryPrice;
  // CoinGecko IDs for cross-validation — the source of truth for crypto spot prices
  const CG_VALIDATE_IDS = {
    "BTC":"bitcoin","ETH":"ethereum","SOL":"solana","BNB":"binancecoin","AVAX":"avalanche-2",
    "DOT":"polkadot","LINK":"chainlink","FET":"artificial-superintelligence-alliance","TAO":"bittensor",
    "DOGE":"dogecoin","SHIB":"shiba-inu","PEPE":"pepe","BONK":"bonk","FLOKI":"floki",
    "WIF":"dogwifcoin","BRETT":"brett","POPCAT":"popcat-sol","MOG":"mog-coin",
    "PONKE":"ponke","BOME":"book-of-meme","MEW":"cat-in-a-dogs-world","MEME":"memecoin-2",
    "TURBO":"turbo","NEIRO":"neiro-on-eth","RNDR":"render-token","RENDER":"render-token",
  };
  const cgId = CG_VALIDATE_IDS[symbol];
  if (!cgId) return primaryPrice;
  try {
    const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${cgId}&vs_currencies=usd`);
    if (r.ok) {
      const data = await r.json();
      const cgPrice = data[cgId]?.usd;
      if (cgPrice && cgPrice > 0) {
        const diff = Math.abs(cgPrice - primaryPrice) / Math.max(cgPrice, primaryPrice);
        if (diff > 0.40) { // >40% divergence = bad feed, use CoinGecko
          console.warn(`[CrossValidate] ⚠ ${symbol}: Binance $${primaryPrice} vs CoinGecko $${cgPrice} — ${(diff*100).toFixed(0)}% divergence → using CoinGecko`);
          return cgPrice;
        }
      }
    }
  } catch (e) { /* use primary */ }
  return primaryPrice;
};

const fetchRealQuotes = async (holdings) => {
  const quotes = {};
  const unique = [...new Set((holdings || []).map(h => h.symbol))];
  const now = Date.now();

  // Return cached quotes for symbols still fresh
  const needFetch = [];
  const sym2fh = {}; // originalSymbol → finnhubSymbol
  const fh2sym = {}; // finnhubSymbol → originalSymbol

  unique.forEach(sym => {
    const cachedEntry = quoteCache.data[sym];
    // Use shorter TTL for CoinGecko-primary tokens to avoid serving stale Finnhub ghost prices
    const effectiveTTL = (cachedEntry && cachedEntry.source && (cachedEntry.source.startsWith("coingecko") || cachedEntry.source.startsWith("binance-primary"))) ? 60000 : QUOTE_CACHE_TTL;
    if (cachedEntry && (now - (quoteCache.ts[sym] || 0)) < effectiveTTL) {
      quotes[sym] = quoteCache.data[sym];
    } else {
      const type = detectAssetType(sym);
      const fhSym = toFinnhub(sym, type);
      sym2fh[sym] = fhSym;
      fh2sym[fhSym] = sym;
      needFetch.push(sym);
    }
  });

  if (needFetch.length === 0) return quotes;

  // ── BINANCE REST PRIMARY — fetch meme/micro-cap cryptos directly from Binance public API ──
  // Finnhub returns stale ATH prices for these tokens. Binance REST is free, no-auth, CORS-friendly.
  const BINANCE_PRIMARY_SYMBOLS = new Set([
    // Memecoins WITH verified Binance USDT pairs — others go via CoinGecko
    // EXCLUDED: BRETT, PONKE, MOG — no BRETTUSDT/PONKEUSDT/MOGUSDT on Binance → poisons entire batch with 400
    "WIF","BONK","PEPE","FLOKI","SHIB","BOME","POPCAT","MEW","DOGE",
    "MEME","TURBO","NEIRO","GIGA","SPX","ORDI","SATS","BABYDOGE",
    // AI & mid-cap tokens — Finnhub free tier returns stale/ghost prices
    "BNB","FET","AGIX","OCEAN","TAO","RENDER","INJ","SEI","TIA","SUI","APT","NEAR",
    "ARB","OP","STX","HBAR","ICP","ALGO","XLM","VET","THETA","GRT","LDO",
    "AAVE","MKR","CRV","SNX","COMP","UNI","LINK","MATIC","FIL","ATOM","DOT",
  ]);
  const binancePrimaryNeeded = needFetch.filter(sym => BINANCE_PRIMARY_SYMBOLS.has(sym) && !quotes[sym]);
  if (binancePrimaryNeeded.length > 0) {
    try {
      // Binance batch ticker endpoint — free, no API key, real-time
      const symsParam = JSON.stringify(binancePrimaryNeeded.map(s => `${s}USDT`));
      const r = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(symsParam)}&type=MINI`);
      if (r.ok) {
        const tickers = await r.json();
        if (Array.isArray(tickers)) {
          for (const t of tickers) {
            const sym = t.symbol?.replace("USDT", "");
            const price = parseFloat(t.lastPrice);
            const prevClose = parseFloat(t.prevClosePrice) || price;
            if (sym && price > 0 && BINANCE_PRIMARY_SYMBOLS.has(sym)) {
              const entry = { price, prevClose, high: parseFloat(t.highPrice)||price, low: parseFloat(t.lowPrice)||price, fetchedAt: Date.now(), source: "binance-primary" };
              quotes[sym] = entry;
              quoteCache.data[sym] = entry;
              if (entry?.price) lastGoodPrice[sym] = entry.price;
              quoteCache.ts[sym] = Date.now();
              console.log(`[Quotes] ✓ Binance primary: ${sym} → $${price}`);
            }
          }
        }
      } else {
        if (r.status === 400) {
          console.warn("[Quotes] Binance batch 400 — likely invalid symbol in batch. Tokens will fall through to CoinGecko.");
        } else {
          console.warn("[Quotes] Binance primary HTTP", r.status);
        }
      }
    } catch (e) { console.warn("[Quotes] Binance primary fetch failed:", e.message); }
  }
  // ══════ COINGECKO PRIMARY — runs BEFORE Finnhub to prevent stale ghost prices ══════
  // Finnhub free tier returns stale ATH prices for AI/mid-cap tokens (e.g. FET=$1.23 instead of ~$0.14)
  // CoinGecko is free, CORS-friendly, and always accurate. Must run FIRST.
  const COINGECKO_IDS = {
    // Major crypto
    "BTC": "bitcoin", "ETH": "ethereum", "SOL": "solana", "BNB": "binancecoin", "XRP": "ripple",
    "ADA": "cardano", "AVAX": "avalanche-2", "DOT": "polkadot", "ATOM": "cosmos",
    "LTC": "litecoin", "BCH": "bitcoin-cash", "XLM": "stellar", "ALGO": "algorand",
    "VET": "vechain", "ICP": "internet-computer", "HBAR": "hedera-hashgraph",
    "FIL": "filecoin", "THETA": "theta-token", "EOS": "eos",
    // DeFi
    "LINK": "chainlink", "UNI": "uniswap", "AAVE": "aave", "MKR": "maker",
    "CRV": "curve-dao-token", "SNX": "havven", "COMP": "compound-governance-token",
    "LDO": "lido-dao", "GRT": "the-graph",
    // AI tokens — Finnhub returns STALE prices for ALL of these
    "FET": "artificial-superintelligence-alliance",
    "AGIX": "singularitynet", "OCEAN": "ocean-protocol", "TAO": "bittensor",
    "RENDER": "render-token", "INJ": "injective-protocol", "SEI": "sei-network",
    "TIA": "celestia", "GRT": "the-graph",
    // Layer 2 / newer chains
    "SUI": "sui", "APT": "aptos", "NEAR": "near", "ARB": "arbitrum",
    "OP": "optimism", "STX": "blockstack", "MATIC": "matic-network",
    // Memecoins
    "DOGE": "dogecoin", "SHIB": "shiba-inu", "PEPE": "pepe", "WIF": "dogwifcoin",
    "BONK": "bonk", "FLOKI": "floki", "BRETT": "brett", "POPCAT": "popcat-sol",
    "MEW": "cat-in-a-dogs-world", "PONKE": "ponke", "MOG": "mog-coin",
    "BOME": "book-of-meme", "MEME": "memecoin-2",
    "TURBO": "turbo", "NEIRO": "neiro-on-eth",
  };
  const COINGECKO_CACHE_TTL = 60000; // 1 min cache
  const cgNeeded = needFetch.filter(sym => !quotes[sym] && COINGECKO_IDS[sym]);
  if (cgNeeded.length > 0) {
    const needCGFetch = cgNeeded.filter(sym => {
      const cached = quoteCache.data[sym];
      if (cached && cached.source === "coingecko" && (Date.now() - (cached.fetchedAt || 0)) < COINGECKO_CACHE_TTL) {
        quotes[sym] = cached; return false;
      }
      return true;
    });
    if (needCGFetch.length > 0) {
      console.log("[Quotes] CoinGecko PRIMARY for:", needCGFetch.join(", "));
      try {
        const ids = needCGFetch.map(sym => COINGECKO_IDS[sym]).filter(Boolean).join(",");
        const cgR = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`);
        if (cgR.ok) {
          const cgData = await cgR.json();
          const cgNow = Date.now();
          for (const sym of needCGFetch) {
            const cgId = COINGECKO_IDS[sym];
            const d = cgData[cgId];
            if (d && d.usd > 0) {
              const price = d.usd;
              const change24h = d.usd_24h_change || 0;
              const prevClose = price / (1 + change24h / 100);
              const entry = { price, prevClose, fetchedAt: cgNow, source: "coingecko" };
                lastGoodPrice[sym] = price; // persist last known-good
              quotes[sym] = entry;
              quoteCache.data[sym] = entry;
              if (entry?.price) lastGoodPrice[sym] = entry.price;
              quoteCache.ts[sym] = cgNow;
              console.log(`[Quotes] ✓ CoinGecko PRIMARY: ${sym} → $${price}`);
            }
          }
        }
      } catch (e) { console.warn("[Quotes] CoinGecko primary failed:", e.message); }
    }
  }

  // Remove already-fetched symbols so Finnhub CANNOT overwrite with stale data
  const needFetchFiltered = needFetch.filter(sym => !quotes[sym]);
  // Rebuild sym2fh/fh2sym for remaining symbols only
  const filteredSym2fh = {};
  const filteredFh2sym = {};
  needFetchFiltered.forEach(sym => {
    filteredSym2fh[sym] = sym2fh[sym];
    filteredFh2sym[sym2fh[sym]] = sym;
  });

  const fhSymbols = needFetchFiltered.map(s => filteredSym2fh[s]).filter(Boolean).join(",");

  // ── PRIMARY: Serverless proxy (API key server-side, 1 batch request) ──
  if (fhSymbols) try {
    const r = await fetch(`/api/quote?symbols=${encodeURIComponent(fhSymbols)}`);
    if (r.ok) {
      const data = await r.json();
      if (data.keyMissing) {
        console.error("[Quotes] 🚨 FINNHUB_API_KEY not set in Vercel Environment Variables!");
      } else if (data.quotes && typeof data.quotes === "object") {
        Object.entries(data.quotes).forEach(([fhSym, q]) => {
          const origSym = filteredFh2sym[fhSym] || fhSym;
          if (quotes[origSym]) return; // Don't overwrite CoinGecko-primary prices
          const entry = { ...q, fetchedAt: now };
          quotes[origSym] = entry;
          quoteCache.data[origSym] = entry;
          if (entry?.price) lastGoodPrice[origSym] = entry.price;
          quoteCache.ts[origSym] = now;
        });
        const cnt = Object.keys(data.quotes).length;
        const cached = unique.length - needFetch.length;
        if (cnt > 0) console.log(`[Quotes] ✓ ${cnt} live (proxy), ${cached} cached`);
        else console.warn("[Quotes] ⚠ Proxy returned 0 quotes", data.errors?.slice(0, 3));
        return quotes;
      }
    }
  } catch (proxyErr) {
    console.warn("[Quotes] Proxy unavailable, trying direct Finnhub:", proxyErr.message);
  }

  // ── FALLBACK: Direct Finnhub calls (local dev or proxy not deployed) ──
  await Promise.all(needFetchFiltered.slice(0, 25).map(async (sym) => {
    try {
      const fhSym = filteredSym2fh[sym];
      const r = await finnhubFetch(`https://finnhub.io/api/v1/quote?symbol=${fhSym}&token=${FINNHUB_KEY}`);
      const q = await r.json();
      if (q && q.c > 0 && isFinite(q.c) && !quotes[sym]) {
        const pc = (q.pc > 0 && isFinite(q.pc)) ? q.pc : q.c;
        const entry = { price: q.c, prevClose: pc, high: q.h || q.c, low: q.l || q.c, open: q.o || pc, fetchedAt: now };
        quotes[sym] = entry;
        quoteCache.data[sym] = entry;
        if (entry?.price) lastGoodPrice[sym] = entry.price;
        quoteCache.ts[sym] = now;
      }
    } catch (e) { console.warn(`[Quote] ✗ ${sym}: ${e.message}`); }
  }));

  const success = Object.keys(quotes).length;
  if (success === 0 && needFetch.length > 0) console.error("[Quotes] 🚨 ALL quotes failed — add FINNHUB_API_KEY to Vercel env vars (https://finnhub.io/register)");
  else if (success > 0) console.log(`[Quotes] ✓ ${success} live (direct fallback)`);

  // Auto-retry failed crypto symbols with alternative exchange prefixes
  const CRYPTO_FALLBACKS = {
    "RNDR": ["BINANCE:RENDERUSDT", "BINANCE:RNDRUSDT", "COINBASE:RNDR-USD"],
    "RENDER": ["BINANCE:RENDERUSDT", "BINANCE:RNDRUSDT"],
    "MEME": ["BINANCE:MEMEUSDT", "COINBASE:MEME-USD"],
    "BRETT": ["BINANCE:BRETTUSDT", "BYBIT:BRETTUSDT", "MEXC:BRETTUSDT", "COINBASE:BRETT-USD"],
    "POPCAT": ["BINANCE:POPCATUSDT", "BYBIT:POPCATUSDT", "MEXC:POPCATUSDT"],
    "MOG": ["BINANCE:MOGUSDT", "BYBIT:MOGUSDT", "MEXC:MOGUSDT"],
    "PONKE": ["BINANCE:PONKEUSDT", "BYBIT:PONKEUSDT", "MEXC:PONKEUSDT"],
    "MEW": ["BINANCE:MEWUSDT", "BYBIT:MEWUSDT", "MEXC:MEWUSDT"],
    "BCH": ["COINBASE:BCH-USD", "BINANCE:BCHUSDT", "KRAKEN:BCHUSD"],
    "LTC": ["COINBASE:LTC-USD", "BINANCE:LTCUSDT"],
    "ETC": ["COINBASE:ETC-USD", "BINANCE:ETCUSDT"],
    "XMR": ["KRAKEN:XMRUSD"],
    "ZEC": ["COINBASE:ZEC-USD", "BINANCE:ZECUSDT"],
  };
  // Also try COINBASE fallback for ANY failed crypto that's not in the explicit list
  const failedCrypto = needFetch.filter(sym => !quotes[sym] && (CRYPTO_FALLBACKS[sym] || CRYPTO_FINNHUB[sym]));
  if (failedCrypto.length > 0) {
    console.log("[Quotes] Retrying", failedCrypto.length, "failed crypto:", failedCrypto.join(", "));
    for (const sym of failedCrypto) {
      // Use explicit fallbacks or try generic COINBASE format
      const alts = CRYPTO_FALLBACKS[sym] || [`COINBASE:${sym}-USD`, `BINANCE:${sym}USDT`];
      for (const alt of alts) {
        try {
          const r = await fetch(`/api/quote?symbols=${encodeURIComponent(alt)}`);
          if (r.ok) {
            const data = await r.json();
            const q = data.quotes?.[alt] || Object.values(data.quotes || {})[0];
            if (q && q.price > 0) {
              quotes[sym] = { ...q, fetchedAt: Date.now() };
              quoteCache.data[sym] = quotes[sym];
              quoteCache.ts[sym] = Date.now();
              console.log(`[Quotes] ✓ Crypto retry: ${sym} via ${alt} → $${q.price}`);
              break;
            }
          }
        } catch (e) { /* continue */ }
      }
    }
  }

  return quotes;
};

// Retry individual symbols that were missed by batch fetch.
const retryMissingQuotes = async (holdings, existingQuotes) => {
  const missing = (holdings || []).filter(h => h.symbol && !existingQuotes[h.symbol]);
  if (missing.length === 0) return existingQuotes;
  console.log("[Quotes] Retrying", missing.length, "missing symbols:", missing.map(h => h.symbol).join(", "));
  const quotes = { ...existingQuotes };
  const now = Date.now();
  // Symbol variant mappings for tickers that need special handling
  const RETRY_VARIANTS = {
    "ADS": ["ADDYY", "ADDSF"],
    "UIPath": ["PATH"],
    "X": ["X:US", "NYSE:X"],  // US Steel — single letter ticker needs explicit exchange
    "RNDR": ["BINANCE:RENDERUSDT", "BINANCE:RNDRUSDT", "COINBASE:RNDR-USD"],
    "RENDER": ["BINANCE:RENDERUSDT", "BINANCE:RNDRUSDT", "COINBASE:RNDR-USD"],
    "MEME": ["BINANCE:MEMEUSDT", "COINBASE:MEME-USD"],
    "BRETT": ["BINANCE:BRETTUSDT", "BYBIT:BRETTUSDT", "MEXC:BRETTUSDT", "COINBASE:BRETT-USD"],
    "POPCAT": ["BINANCE:POPCATUSDT", "BYBIT:POPCATUSDT", "MEXC:POPCATUSDT"],
    "MOG": ["BINANCE:MOGUSDT", "BYBIT:MOGUSDT", "MEXC:MOGUSDT"],
    "PONKE": ["BINANCE:PONKEUSDT", "BYBIT:PONKEUSDT", "MEXC:PONKEUSDT"],
    "MEW": ["BINANCE:MEWUSDT", "BYBIT:MEWUSDT", "MEXC:MEWUSDT"],
  };
  for (const h of missing.slice(0, 15)) {
    const variants = RETRY_VARIANTS[h.symbol] || [];
    // Also try the default crypto format if it's a crypto type
    if (h.type === "crypto" && variants.length === 0) {
      variants.push(`BINANCE:${h.symbol}USDT`, `COINBASE:${h.symbol}-USD`);
    }
    // Try stock as-is first, then variants
    const trySymbols = h.type === "crypto" ? variants : [h.symbol, ...variants];
    for (const sym of trySymbols) {
      try {
        const r = await fetch(`/api/quote?symbols=${encodeURIComponent(sym)}`);
        if (r.ok) {
          const data = await r.json();
          if (data.quotes) {
            const q = data.quotes[sym] || Object.values(data.quotes)[0];
            if (q && q.price > 0) {
              quotes[h.symbol] = { ...q, fetchedAt: now };
              quoteCache.data[h.symbol] = quotes[h.symbol];
              quoteCache.ts[h.symbol] = now;
              console.log(`[Quotes] ✓ Retry: ${h.symbol} via ${sym} → $${q.price}`);
              break;
            }
          }
        }
      } catch (e) { /* continue */ }
    }
  }
  // ══════ COINGECKO FALLBACK for retryMissingQuotes ══════
  const COINGECKO_IDS_RETRY = {
    "BRETT": "brett", "POPCAT": "popcat-sol", "MEW": "cat-in-a-dogs-world",
    "PONKE": "ponke", "MOG": "mog-coin", "SHIB": "shiba-inu", "PEPE": "pepe",
    "WIF": "dogwifcoin", "BONK": "bonk", "FLOKI": "floki", "BOME": "book-of-meme",
    "DOGE": "dogecoin", "BTC": "bitcoin", "ETH": "ethereum", "SOL": "solana",
    "BNB": "binancecoin", "AVAX": "avalanche-2", "TAO": "bittensor",
    "LINK": "chainlink", "FET": "artificial-superintelligence-alliance",
  };
  const stillMissing = (holdings || []).filter(h => h.symbol && !quotes[h.symbol] && COINGECKO_IDS_RETRY[h.symbol]);
  if (stillMissing.length > 0) {
    console.log("[Quotes] CoinGecko retry for:", stillMissing.map(h => h.symbol).join(", "));
    try {
      const ids = stillMissing.map(h => COINGECKO_IDS_RETRY[h.symbol]).filter(Boolean).join(",");
      const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`);
      if (r.ok) {
        const data = await r.json();
        const now = Date.now();
        for (const h of stillMissing) {
          const cgId = COINGECKO_IDS_RETRY[h.symbol];
          const cgData = data[cgId];
          if (cgData && cgData.usd > 0) {
            const price = cgData.usd;
            const change24h = cgData.usd_24h_change || 0;
            const prevClose = price / (1 + change24h / 100);
            quotes[h.symbol] = { price, prevClose, fetchedAt: now, source: "coingecko" };
            quoteCache.data[h.symbol] = quotes[h.symbol];
            quoteCache.ts[h.symbol] = now;
            console.log(`[Quotes] ✓ CoinGecko retry: ${h.symbol} → $${price}`);
          }
        }
      }
    } catch (e) { console.warn("[Quotes] CoinGecko retry failed:", e.message); }
  }
  return quotes;
};

function Portfolios({ user, openAuth, portfolios, go, updatePortfolio, publicPortfolios }) {
  const [btIdx, setBtIdx] = useState(null); const [btMonths, setBtMonths] = useState(60); const [btData, setBtData] = useState(null);
  const [rebalIdx, setRebalIdx] = useState(null);
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [activeTab, setActiveTab] = useState("overview"); // overview | holdings | transactions | performance | compare
  const [compareWith, setCompareWith] = useState(null);
  const [liveLoading, setLiveLoading] = useState(true);
  const [lastQuoteTs, setLastQuoteTs] = useState(null);
  const [quoteCount, setQuoteCount] = useState(0);
  const [editingPortIdx, setEditingPortIdx] = useState(null); // Which portfolio is being edited
  const [editFields, setEditFields] = useState({ name: "", ticker: "", strategy: "", fee: 0 }); // Editable fields
  const [editSaving, setEditSaving] = useState(false);
  const portfoliosRef = useRef(portfolios); portfoliosRef.current = portfolios;
  const lastPersistTs = useRef(0);
  const fetchLiveRef = useRef(null); // Expose manual refresh

  // Start editing a portfolio's metadata
  const startEditing = (idx, p, e) => {
    e.stopPropagation();
    setEditingPortIdx(idx);
    setEditFields({ name: p.name || "", ticker: p.ticker || "", strategy: p.strategy || "", fee: p.fee || 0 });
  };
  // Save edits to local state + Supabase
  const saveEdits = async (idx, p) => {
    setEditSaving(true);
    const strategyChanged = editFields.strategy.trim() !== (p.strategy || "").trim();
    const feeChanged = editFields.fee !== (p.fee || 0);
    const updated = { ...p, name: editFields.name.trim() || p.name, ticker: editFields.ticker.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5), strategy: editFields.strategy.trim(), fee: Math.max(0, Math.min(5, editFields.fee)) };
    // Mark thesis as edited if strategy was changed (one-time edit)
    if (strategyChanged && editFields.strategy.trim()) updated.thesisEdited = true;
    // Mark fee as edited if changed (one-time edit — can reduce or remove)
    if (feeChanged) updated.feeEdited = true;
    updatePortfolio(idx, updated);
    // Persist to Supabase if saved
    if (p.dbId) {
      try {
        const pd = { ...(p.portfolio_data || p), name: updated.name, ticker: updated.ticker, strategy: updated.strategy, fee: updated.fee, thesisEdited: updated.thesisEdited || p.thesisEdited || false, feeEdited: updated.feeEdited || p.feeEdited || false };
        await supabase.from("portfolios").update({ name: updated.name, ticker: updated.ticker, strategy: updated.strategy, fee: updated.fee, portfolio_data: pd }).eq("id", p.dbId);
        console.log("[Edit] ✓ Saved edits for", updated.name, feeChanged ? "(fee edited — locked)" : "", strategyChanged ? "(thesis edited — locked)" : "");
      } catch (e) { console.warn("[Edit] ✗ Save failed:", e.message); }
    }
    setEditingPortIdx(null);
    setEditSaving(false);
  };

  // Remove a holding from a saved portfolio, redistribute its weight
  const removeHolding = async (idx, holdingSymbol) => {
    const p = portfolios[idx];
    if (!p) return;
    if (!confirm(`Remove ${holdingSymbol} from "${p.name}"? Its allocation will be redistributed to remaining holdings.`)) return;
    const removed = p.holdings.find(h => h.symbol === holdingSymbol);
    const remaining = p.holdings.filter(h => h.symbol !== holdingSymbol);
    if (remaining.length === 0) { alert("Cannot remove the last holding."); return; }
    // Redistribute weight proportionally
    const removedWeight = removed?.weight || removed?.currentWeight || 0;
    const totalRemaining = remaining.reduce((s, h) => s + (h.weight || 0), 0);
    const reweighted = remaining.map(h => {
      const newWeight = totalRemaining > 0 ? h.weight + (removedWeight * h.weight / totalRemaining) : 100 / remaining.length;
      return { ...h, weight: Math.round(newWeight * 100) / 100, targetWeight: Math.round(newWeight * 100) / 100 };
    });
    // Add SELL transaction
    const tx = { type: "SELL", symbol: holdingSymbol, name: removed?.name || holdingSymbol, amount: removed?.liveValue || removed?.allocation || 0, price: removed?.livePrice || removed?.entryPrice || 0, shares: removed?.shares || 0, date: new Date().toISOString(), reason: "Manual removal — allocation redistributed", orderId: `RM-${Date.now().toString(36).toUpperCase()}` };
    const updated = { ...p, holdings: reweighted, transactions: [...(p.transactions || []), tx] };
    // Recalculate value
    updated.value = reweighted.reduce((s, h) => s + (h.liveValue || h.allocation || 0), 0) + (p.cashBalance || 0);
    updatePortfolio(idx, updated);
    // Persist to Supabase
    if (p.dbId) {
      try {
        const holdingsClean = reweighted.map(h => ({ symbol: h.symbol, name: h.name, type: h.type, weight: h.weight, allocation: h.allocation, rationale: h.rationale, entryPrice: h.entryPrice, shares: h.shares, livePrice: h.livePrice, liveValue: h.liveValue, originalAllocation: h.originalAllocation || h.allocation, targetWeight: h.targetWeight || h.weight, currentWeight: h.currentWeight || h.weight, lastDividendTs: h.lastDividendTs || null }));
        await supabase.from("portfolios").update({ holdings: holdingsClean, value: updated.value, portfolio_data: { ...updated } }).eq("id", p.dbId);
        console.log("[Remove] ✓ Removed", holdingSymbol, "from", p.name);
      } catch (e) { console.warn("[Remove] ✗ Save failed:", e.message); }
    }
  };

  // Remove a specific transaction from history
  const removeTransaction = async (idx, txIndex) => {
    const p = portfolios[idx];
    if (!p) return;
    const tx = (p.transactions || [])[txIndex];
    if (!confirm(`Delete transaction: ${tx?.type} ${tx?.symbol} (${fmtUSD(tx?.amount || 0)})?`)) return;
    const newTxs = [...(p.transactions || [])];
    newTxs.splice(txIndex, 1);
    const updated = { ...p, transactions: newTxs };
    updatePortfolio(idx, updated);
    if (p.dbId) {
      try {
        await supabase.from("portfolios").update({ portfolio_data: { ...updated } }).eq("id", p.dbId);
        console.log("[TxRemove] ✓ Deleted transaction", txIndex);
      } catch (e) { console.warn("[TxRemove] ✗ Save failed:", e.message); }
    }
  };

  // Helper: compute portfolio cost basis from holdings
  const getPortfolioCostBasis = (p) => {
    const holdingsCost = (p.holdings || []).reduce((s, h) => {
      const cost = h.originalAllocation || h.allocation || 0; // Use originalAllocation, not entryPrice*shares (avoids rounding drift)
      return s + cost;
    }, 0);
    const initialCash = p.initialCashBalance ?? p.cashBalance ?? p.cashPosition?.amount ?? 0;
    return p.costBasis || (holdingsCost + initialCash) || 1000000;
  };

  // ══════ REAL-TIME PORTFOLIO TRACKING ══════
  // Fetches actual market prices and computes: holdingValue = shares × currentPrice
  // This is identical to how TD Ameritrade, E*Trade, Schwab compute your balance.
  useEffect(() => {
    if (!user || portfolios.length === 0) return;
    let cancelled = false;
    const fetchLiveValues = async (isFirst = false) => {
      if (isFirst) setLiveLoading(true);
      try {
      // Collect all unique symbols across all portfolios
      const allHoldings = portfoliosRef.current.flatMap(p => (p.holdings || []));
      // Fetch with retry (3 attempts)
      let quotes = {};
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          quotes = await fetchRealQuotes(allHoldings);
          if (Object.keys(quotes).length > 0) break;
          console.warn("[Portfolios] Attempt", attempt, ": 0 quotes, retrying...");
          if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * attempt));
        } catch (e) {
          console.error("[Portfolios] Attempt", attempt, "failed:", e.message);
          if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * attempt));
        }
      }
      if (cancelled) return;
      const quotedCount = Object.keys(quotes).length;
      if (quotedCount > 0) {
        console.log("[Portfolios] Live quotes:", quotedCount, "symbols —", portfoliosRef.current.length, "portfolios");
        setLastQuoteTs(Date.now());
      } else {
        console.warn("[Portfolios] ⚠ No quotes returned after 3 attempts");
      }
      setQuoteCount(quotedCount);
      if (isFirst) setLiveLoading(false);
      
      portfoliosRef.current.forEach((p, idx) => {
        if (!p.holdings || p.holdings.length === 0) return;
        const hasAnyQuote = p.holdings.some(h => quotes[h.symbol]);
        
        let liveTotal = 0;
        const newHoldings = p.holdings.map(h => {
          const q = quotes[h.symbol];
          if (q && h.shares && h.shares > 0) {
            // REAL BROKERAGE MATH: value = shares × current market price
            const costBasis = h.originalAllocation || h.allocation; // Anchored to avoid rounding drift
            const isShort = h.action === "SHORT";
            let holdingVal;
            if (isShort) {
              holdingVal = costBasis + (h.entryPrice - q.price) * h.shares;
            } else {
              holdingVal = h.shares * q.price;
            }
            const pnl = holdingVal - costBasis;
            const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
            // DAY CHANGE: If bought today, baseline = entry price (not yesterday's close)
            // If bought on a prior day, baseline = prevClose (standard brokerage behavior)
            const boughtToday = h.entryDate && new Date(h.entryDate).toDateString() === new Date().toDateString();
            const baseline = boughtToday ? (h.entryPrice || q.prevClose || 0) : (q.prevClose || 0);
            const dayChange = (baseline > 0) ? ((q.price - baseline) / baseline) * 100 : 0;
            liveTotal += holdingVal;
            return {
              ...h, noQuote: false,

              livePrice: q.price, liveValue: Math.round(holdingVal),
              dailyChange: isFinite(dayChange) ? dayChange : 0,
              pnl: Math.round(pnl), pnlPct: isFinite(pnlPct) ? pnlPct : 0,
              // currentWeight computed in second pass below
            };
          } else if (q && h.allocation > 0) {
            // Has quote but no shares data (legacy portfolio) — estimate shares from allocation/prevClose
            const estimatedShares = h.allocation / (q.prevClose || q.price);
            const holdingVal = estimatedShares * q.price;
            const boughtToday = h.entryDate && new Date(h.entryDate).toDateString() === new Date().toDateString();
            const baseline = boughtToday ? (h.entryPrice || q.prevClose || 0) : (q.prevClose || 0);
            const dayChange = (baseline > 0) ? ((q.price - baseline) / baseline) * 100 : 0;
            liveTotal += holdingVal;
            return {
              ...h, noQuote: false,
              livePrice: q.price, liveValue: Math.round(holdingVal),
              dailyChange: isFinite(dayChange) ? dayChange : 0,
              shares: estimatedShares, entryPrice: h.entryPrice || q.prevClose,
              originalAllocation: h.originalAllocation || h.allocation,
            };
          } else {
            // No quote available — freeze at last known value
            liveTotal += h.liveValue || h.allocation;
            return { ...h, liveValue: h.liveValue || h.allocation, noQuote: !h.livePrice };
          }
        });
        
        // ══════ SECOND PASS: Compute real weights ══════
        // Weight = (holdingValue / totalPortfolioValue) * 100
        // This is how Schwab, Fidelity, and every real brokerage computes weight.
        const cashBal = p.cashBalance || p.cashPosition?.amount || 0;
        const totalPortfolioVal = liveTotal + cashBal;
        const weightedHoldings = newHoldings.map(h => ({
          ...h,
          currentWeight: totalPortfolioVal > 0 ? Math.round((h.liveValue || h.allocation) / totalPortfolioVal * 1000) / 10 : h.weight,
        }));
        
        // ══════ DIVIDEND ENGINE (DRIP) ══════
        // Check each holding for pending dividends based on real payment schedules
        // Dividends are reinvested at current market price (DRIP)
        const divTxs = [];
        const finalHoldings = weightedHoldings.map(h => {
          const q = quotes[h.symbol];
          const currentPrice = q ? q.price : (h.livePrice || h.entryPrice);
          if (!currentPrice || currentPrice <= 0) return h;
          const divCheck = checkDividendDue(h, p.createdAt, h.lastDividendTs, currentPrice);
          if (!divCheck || !divCheck.isDue) return h;
          // DRIP: add shares, record transaction
          const newShares = (h.shares || 0) + divCheck.sharesAdded;
          const newValue = newShares * currentPrice;
          divTxs.push({
            type: "DIVIDEND", symbol: h.symbol, name: h.name || h.symbol,
            amount: divCheck.amount, ts: Date.now(),
            orderId: `DIV-${h.symbol}-${Date.now().toString(36).toUpperCase()}`,
            executionTime: new Date().toISOString(),
            pricePerShare: currentPrice, shares: divCheck.sharesAdded,
            commission: 0, orderType: "DRIP", status: "REINVESTED",
            weight: h.weight, assetType: h.type,
            reason: `Dividend: $${divCheck.dividendPerShare}/share × ${(h.shares || 0).toFixed(4)} shares = $${divCheck.amount.toFixed(2)} → reinvested ${divCheck.sharesAdded.toFixed(6)} shares at $${currentPrice.toFixed(2)} (${(divCheck.yieldAnnual * 100).toFixed(2)}% annual yield, ${divCheck.frequency === 4 ? "quarterly" : divCheck.frequency === 12 ? "monthly" : divCheck.frequency === 2 ? "semi-annual" : "annual"})`,
          });
          return { ...h, shares: newShares, liveValue: Math.round(newValue), lastDividendTs: Date.now() };
        });
        // Recalculate liveTotal from finalHoldings (includes any DRIP additions)
        liveTotal = finalHoldings.reduce((s, h) => s + (h.liveValue || h.allocation), 0);
        
        const existingTxs = p.transactions || [];
        const allTxs = divTxs.length > 0 ? [...existingTxs, ...divTxs].slice(-100) : existingTxs;
        
        const newVal = Math.round(liveTotal + cashBal);
        const costBasis = getPortfolioCostBasis(p);
        // Recompute weights after dividends
        const normalizedFinal = finalHoldings.map(h => ({
          ...h,
          currentWeight: (liveTotal + cashBal) > 0 ? Math.round((h.liveValue || h.allocation) / (liveTotal + cashBal) * 1000) / 10 : h.weight,
        }));
        const newTracking = [...(p.trackingData || []), { ts: Date.now(), value: newVal }].slice(-200);
        updatePortfolio(idx, { ...p, value: newVal, costBasis, trackingData: newTracking, holdings: normalizedFinal, liveData: hasAnyQuote, transactions: allTxs, lastLiveUpdate: Date.now() });
        
        // ══════ AUTO-PERSIST TO SUPABASE ══════
        // Save live values every 3 minutes so they survive page refresh
        const now = Date.now();
        if (p.dbId && hasAnyQuote && (now - lastPersistTs.current > 60000)) {
          lastPersistTs.current = now;
          try {
            const pd = { ...p, value: newVal, costBasis, holdings: normalizedFinal, trackingData: newTracking, transactions: allTxs, lastLiveUpdate: now };
            supabase.from("portfolios").update({ portfolio_data: pd, holdings: normalizedFinal, value: newVal }).eq("id", p.dbId)
              .then(() => console.log("[AutoSave] ✓ Persisted live data for", p.name))
              .catch(e => console.warn("[AutoSave] ✗", e.message));
          } catch (e) { /* non-critical */ }
        }
      });
      } catch (e) {
        console.error("[Portfolios] Engine error:", e.message);
        if (isFirst) setLiveLoading(false);
      }
    };
    fetchLiveRef.current = () => fetchLiveValues(false);
    // Fast start: fetch immediately, then every 20s
    fetchLiveValues(true);
    const iv = setInterval(() => fetchLiveValues(false), 20000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [user, portfolios.length]);

  const runBacktest = (idx, months) => { setBtIdx(idx); setBtMonths(months); setBtData(genBacktest(months, portfolios[idx]?.id || idx, portfolios[idx]?.holdings || [])); };

  const doRebalance = (idx) => {
    const p = portfolios[idx];
    const totalVal = p.value || 1000000;
    const rebalanced = p.holdings.map(h => {
      const newAlloc = Math.round((h.targetWeight / 100) * totalVal);
      const currentPrice = h.livePrice || h.entryPrice;
      // Rebalance = sell old position, buy new one at current price → new cost basis
      const newShares = currentPrice ? newAlloc / currentPrice : h.shares;
      return {
        ...h,
        currentWeight: h.targetWeight,
        allocation: newAlloc,
        originalAllocation: newAlloc, // New cost basis after rebalance
        entryPrice: currentPrice || h.entryPrice,
        shares: newShares ? Math.round(newShares * 100000000) / 100000000 : h.shares,
        entryDate: new Date().toISOString(),
        liveValue: newAlloc,
      };
    });
    updatePortfolio(idx, { ...p, holdings: rebalanced, lastRebalance: Date.now() });
    setRebalIdx(null);
  };

  if (!user) return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 44, marginBottom: 14 }}>{"🔒"}</div>
      <h2 style={{ color: C.text, fontSize: 21, margin: "0 0 10px" }}>Sign in to view your portfolios</h2>
      <p style={{ color: C.sub, fontSize: 14, marginBottom: 22 }}>Build, save, track, and rebalance AI-generated ETFs.</p>
      <button onClick={() => openAuth("signin")} style={btnP()}>Sign In</button>
    </div>
  );

  const tabBtn = (tab, label, icon) => ({
    background: activeTab === tab ? C.accentBg : "transparent",
    border: `1px solid ${activeTab === tab ? C.accentBorder : C.border}`,
    color: activeTab === tab ? C.accentLight : C.sub,
    padding: "5px 14px", borderRadius: 5, fontSize: 11, cursor: "pointer", fontWeight: 600, fontFamily: "inherit",
  });

  return (
    <div className="page-container" style={{ maxWidth: 1000, margin: "0 auto", padding: "36px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ color: C.text, fontSize: 26, margin: "0 0 3px" }}>My Portfolios</h1>
          <p style={{ color: C.sub, fontSize: 13, margin: 0 }}>{portfolios.length}/5 used (Free tier) · Values update in real time · Logged in as <span style={{ color: C.accent, fontFamily: mono }}>{user.username || user.name}</span></p>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
            {liveLoading ? (
              <span style={{ color: C.gold, fontSize: 11, fontFamily: mono }}>⏳ Fetching live market prices...</span>
            ) : lastQuoteTs ? (
              <span style={{ color: quoteCount > 0 ? C.green : C.red, fontSize: 10, fontFamily: mono }}>
                {quoteCount > 0 ? "●" : "○"} {quoteCount} quotes · Updated {new Date(lastQuoteTs).toLocaleTimeString()} · Auto-refresh 20s
              </span>
            ) : (
              <span style={{ color: C.red, fontSize: 10, fontFamily: mono }}>○ No market data — add FINNHUB_API_KEY to Vercel env vars</span>
            )}
            <button onClick={() => { if (fetchLiveRef.current) { setLiveLoading(true); fetchLiveRef.current(); setTimeout(() => setLiveLoading(false), 3000); } }} disabled={liveLoading} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.sub, borderRadius: 4, padding: "2px 8px", fontSize: 10, cursor: liveLoading ? "not-allowed" : "pointer", fontFamily: mono, opacity: liveLoading ? 0.5 : 1 }}>
              🔄 Refresh
            </button>
          </div>
        </div>
        <button onClick={() => go("builder")} style={btnP()}>+ New ETF</button>
      </div>

      {portfolios.length === 0 ? (
        <div style={{ ...cardS(), textAlign: "center", padding: 44 }}><div style={{ marginBottom: 12 }}><Logo size={40} /></div><h3 style={{ color: C.text, fontSize: 17, margin: "0 0 6px" }}>No portfolios yet</h3><p style={{ color: C.sub, fontSize: 13.5, marginBottom: 18 }}>Build your first AI-generated ETF in seconds.</p><button onClick={() => go("builder")} style={btnP()}>Build Your First ETF →</button></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {portfolios.map((p, idx) => {
            if (!p) return null;
            p = { ...p, holdings: p.holdings || [] }; // Ensure holdings is always an array
            const holdings = p.holdings;
            const costBasis = getPortfolioCostBasis(p);
            const gain = costBasis > 0 ? (((p.value || costBasis) - costBasis) / costBasis) * 100 : 0;
            const isExpanded = expandedIdx === idx;
            const trackPts = (p.trackingData || []).length > 1 ? p.trackingData.map((t) => ({ price: t.value })) : null;
            const maxDrift = holdings.length > 0 ? Math.max(...holdings.map(h => Math.abs((h.currentWeight || h.weight) - (h.targetWeight || h.weight)))) : 0;
            const needsRebalance = maxDrift > (p.rebalanceThreshold || 5);
            const txs = p.transactions || [];
            const navPts = p.navHistory || [];
            const cashBal = p.cashBalance || p.cashPosition?.amount || 0;
            // Compute key metrics
            const totalHoldingsVal = holdings.reduce((s, h) => s + (h.liveValue || h.allocation), 0);
            const dayChange = holdings.reduce((s, h) => s + ((h.dailyChange || 0) * (h.liveValue || h.allocation) / 100), 0);
            const typeBreakdown = {};
            holdings.forEach(h => { typeBreakdown[h.type] = (typeBreakdown[h.type] || 0) + (h.currentWeight || h.weight); });

            return (
              <div key={idx} style={{ ...cardS(), padding: 0, overflow: "hidden" }}>
                {/* Card Header — always visible */}
                <div className="port-card-header" onClick={() => { if (editingPortIdx === idx) return; setExpandedIdx(isExpanded ? null : idx); setActiveTab("overview"); setCompareWith(null); }} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "18px 20px", cursor: editingPortIdx === idx ? "default" : "pointer", background: isExpanded ? C.surface : "transparent", transition: "background .15s" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      {editingPortIdx === idx ? (
                        <>
                          <input value={editFields.name} onChange={e => setEditFields(prev => ({ ...prev, name: e.target.value }))} placeholder="ETF Name..." style={{ background: C.bg, border: `1px solid ${C.accent}55`, color: C.text, fontSize: 17, fontWeight: 700, fontFamily: "inherit", outline: "none", padding: "4px 8px", borderRadius: 6, maxWidth: 280 }} onClick={e => e.stopPropagation()} />
                          <input value={editFields.ticker} onChange={e => setEditFields(prev => ({ ...prev, ticker: e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5) }))} placeholder="TICK" maxLength={5} style={{ background: C.bg, border: `1px solid ${C.accent}55`, color: C.accentLight, fontSize: 12, fontFamily: mono, fontWeight: 600, outline: "none", width: 60, textAlign: "center", padding: "4px 6px", borderRadius: 6 }} onClick={e => e.stopPropagation()} />
                          {/* Fee edit — one-time only */}
                          {!p.feeEdited ? (
                            <span onClick={e => e.stopPropagation()} style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                              <span style={{ color: C.dim, fontSize: 10, fontFamily: mono }}>Fee:</span>
                              <input type="number" value={editFields.fee} onChange={e => setEditFields(prev => ({ ...prev, fee: parseFloat(e.target.value) || 0 }))} min="0" max="5" step="0.1" style={{ background: C.bg, border: `1px solid ${C.accent}55`, color: C.gold, fontSize: 11, fontFamily: mono, fontWeight: 600, outline: "none", width: 48, textAlign: "center", padding: "4px 4px", borderRadius: 6 }} />
                              <span style={{ color: C.dim, fontSize: 9, fontFamily: mono }}>%</span>
                            </span>
                          ) : (
                            <span style={{ color: C.dim, fontSize: 9, fontFamily: mono }}>Fee: {p.fee}% (locked)</span>
                          )}
                        </>
                      ) : (
                        <>
                          <h3 style={{ color: C.text, fontSize: 17, margin: 0, fontWeight: 700 }}>{p.name}</h3>
                          {p.ticker && <span style={{ ...badge(C.accent), fontSize: 9 }}>{p.ticker}</span>}
                        </>
                      )}
                      {p.riskProfile && <span style={{ ...badge(p.riskProfile === "aggressive" ? C.red : p.riskProfile === "conservative" ? C.teal : C.gold), fontSize: 9 }}>{p.riskProfile}</span>}
                      {p.isPublic && <span style={{ ...badge(C.green), fontSize: 8 }}>PUBLIC</span>}
                      {editingPortIdx === idx ? (
                        <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
                          <button onClick={() => saveEdits(idx, p)} disabled={editSaving} style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 5, padding: "3px 12px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>{editSaving ? "Saving..." : "✓ Save"}</button>
                          <button onClick={() => setEditingPortIdx(null)} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.sub, borderRadius: 5, padding: "3px 10px", fontSize: 10, cursor: "pointer" }}>Cancel</button>
                        </div>
                      ) : (
                        <>
                          <button onClick={(e) => startEditing(idx, p, e)} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.dim, borderRadius: 4, padding: "2px 8px", fontSize: 9, cursor: "pointer", fontFamily: mono, opacity: 0.7 }} title="Edit name, ticker & description">✏️ Edit</button>
                          <span style={{ color: C.dim, fontSize: 10 }}>{isExpanded ? "▾" : "▸"}</span>
                        </>
                      )}
                    </div>
                    {editingPortIdx === idx ? (
                      !p.thesisEdited ? <textarea value={editFields.strategy} onChange={e => setEditFields(prev => ({ ...prev, strategy: e.target.value }))} onClick={e => e.stopPropagation()} placeholder="Describe your ETF strategy..." rows={2} style={{ background: C.bg, border: `1px solid ${C.accent}33`, color: C.sub, fontSize: 12, fontFamily: "inherit", outline: "none", padding: "6px 8px", borderRadius: 6, width: "100%", maxWidth: 500, resize: "vertical", lineHeight: 1.4, marginBottom: 8 }} /> : <p style={{ color: C.sub, fontSize: 11.5, margin: "0 0 8px", maxWidth: 500, lineHeight: 1.4 }}>{(p.strategy || "").slice(0, 120)}{(p.strategy || "").length > 120 ? "…" : ""} <span style={{ color: C.dim, fontSize: 8 }}>(thesis locked after edit)</span></p>
                    ) : (
                      <p style={{ color: C.sub, fontSize: 11.5, margin: "0 0 8px", maxWidth: 500, lineHeight: 1.4 }}>{(p.strategy || "").slice(0, 120)}{(p.strategy || "").length > 120 ? "…" : ""}</p>
                    )}
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {p.holdings.slice(0, 8).map((h) => <span key={h.symbol} style={{ fontSize: 9, padding: "2px 5px", borderRadius: 3, background: `${TC[h.type] || C.accent}12`, color: TC[h.type] || C.accent, border: `1px solid ${TC[h.type] || C.accent}28`, fontWeight: 600, fontFamily: mono }}>{h.symbol}</span>)}
                      {p.holdings.length > 8 && <span style={{ fontSize: 9, color: C.dim }}>+{p.holdings.length - 8}</span>}
                    </div>
                  </div>
                  <div className="port-card-right" style={{ textAlign: "right", minWidth: 140, flexShrink: 0 }}>
                    <div style={{ color: C.text, fontSize: 22, fontWeight: 800, fontFamily: mono }}>{fmtUSD(p.value)}</div>
                    <div style={{ color: gain >= 0 ? C.green : C.red, fontSize: 14, fontFamily: mono, fontWeight: 700 }}>{fmtSign(gain, 2)}% <span style={{ fontSize: 11, fontWeight: 600 }}>({(p.value - costBasis) >= 0 ? "+" : ""}{fmtUSD(Math.round(Math.abs(p.value - costBasis)))})</span></div>
                    <div style={{ color: C.dim, fontSize: 10.5, marginTop: 2 }}>Fee: {p.fee || 0}%{p.feeEdited ? " ✓" : ""} · {(() => { const types = [...new Set((p.holdings || []).map(h => h.type))]; const openTypes = types.filter(t => isMarketOpen(t)); const allClosed = openTypes.length === 0; return allClosed ? <span style={{ color: "#6b7280", fontSize: 9 }}>● MARKETS CLOSED</span> : <span style={{ color: C.green, fontSize: 9 }}>● LIVE ({openTypes.join(", ")})</span>; })()}</div>
                    {Math.abs(dayChange) > 0.5 && <div style={{ color: dayChange >= 0 ? C.green : C.red, fontSize: 10, fontFamily: mono, marginTop: 2 }}>Today: {dayChange >= 0 ? "+" : "-"}{fmtUSD(Math.round(Math.abs(dayChange)))}</div>}
                    {trackPts && <div style={{ marginTop: 6 }}><SparkLine data={trackPts} w={130} h={32} /></div>}
                  </div>
                </div>

                {/* Expanded Detail Panels */}
                {isExpanded && (
                  <div style={{ borderTop: `1px solid ${C.border}` }}>
                    {/* Tab Bar */}
                    <div className="tab-bar" style={{ display: "flex", gap: 6, padding: "10px 20px", borderBottom: `1px solid ${C.border}`, flexWrap: "wrap" }}>
                      <button onClick={() => setActiveTab("overview")} style={tabBtn("overview")}>📊 Overview</button>
                      <button onClick={() => setActiveTab("holdings")} style={tabBtn("holdings")}>💼 Holdings ({p.holdings.length})</button>
                      <button onClick={() => setActiveTab("transactions")} style={tabBtn("transactions")}>📋 Transactions ({txs.length})</button>
                      <button onClick={() => { setActiveTab("performance"); if (!btData || btIdx !== idx) runBacktest(idx, 60); }} style={tabBtn("performance")}>📈 Performance</button>
                      <button onClick={() => setActiveTab("rebalance")} style={tabBtn("rebalance")}>{needsRebalance ? "⚠" : "⚖"} Rebalance</button>
                      <button onClick={() => setActiveTab("compare")} style={tabBtn("compare")}>🔀 Compare</button>
                      <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                        <button onClick={() => {
                          const report = { name: p.name, ticker: p.ticker, strategy: p.strategy, riskProfile: p.riskProfile, benchmark: p.benchmark, fee: p.fee, value: p.value, createdAt: p.createdAt, thesis: p.thesis, holdings: (p.holdings || []).map(h => ({ symbol: h.symbol, name: h.name, type: h.type, weight: h.weight, allocation: h.allocation, rationale: h.rationale })), transactions: txs };
                          const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
                          const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${(p.ticker || "etf").replace(/\s+/g, "-")}-report.json`; a.click(); URL.revokeObjectURL(url);
                        }} style={{ ...btnO(), fontSize: 10, padding: "4px 10px" }}>📄 Export</button>
                        <button onClick={() => shareToX(`📊 My ETF "${p.name}" ${p.ticker ? `($${p.ticker})` : ""} is ${gain >= 0 ? "up" : "down"} ${fmtSign(gain, 2)}% — now at ${fmtUSD(p.value)} from ${fmtUSD(Math.round(costBasis))} seed capital!\n\n${(p.holdings || []).length} holdings | ${p.fee || 0}% expense ratio | ${p.riskProfile || "moderate"} risk\n\nBuild your own AI-powered ETF free at etfsimulator.com 🚀`)} style={{ ...btnO(), fontSize: 10, padding: "4px 10px" }}>𝕏 Share</button>
                        <button onClick={async () => {
                          if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
                          if (p.dbId) {
                            const { error } = await supabase.from("portfolios").delete().eq("id", p.dbId);
                            if (error) { alert("Delete failed: " + error.message); return; }
                          }
                          setPortfolios(prev => prev.filter((_, i) => i !== idx));
                          setExpandedIdx(null);
                        }} style={{ ...btnO(), fontSize: 10, padding: "4px 10px", color: C.red, borderColor: `${C.red}44` }}>🗑 Delete</button>
                      </div>
                    </div>

                    {/* OVERVIEW TAB */}
                    {activeTab === "overview" && (
                      <div className="tab-content" style={{ padding: 20 }}>
                        {/* Key Metrics Grid */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 16 }}>
                          {(() => { const divYield = holdings.reduce((s, h) => { const dd = DIVIDEND_DATA[h.symbol]; return s + (dd ? dd.yield * (h.weight || 0) / 100 : 0); }, 0); return [
                            { l: "Portfolio Value", v: fmtUSD(p.value), c: C.text },
                            { l: "Cost Basis", v: fmtUSD(Math.round(costBasis)), c: C.sub },
                            { l: "Total Return", v: `${fmtSign(gain, 2)}%`, c: gain >= 0 ? C.green : C.red },
                            { l: "P&L", v: `${fmtSign(gain, 2).startsWith("+") ? "+" : ""}${fmtUSD(Math.round(p.value - costBasis))}`, c: gain >= 0 ? C.green : C.red },
                            { l: "Today", v: `${dayChange >= 0 ? "+" : "-"}${fmtUSD(Math.round(Math.abs(dayChange)))}`, c: dayChange >= 0 ? C.green : C.red },
                            { l: "Cash Balance", v: fmtUSD(Math.round(cashBal)), c: C.teal },
                            { l: "Expense Ratio", v: `${p.fee || 0}%/yr`, c: C.sub },
                            { l: "Dividend Yield", v: `${fmt(divYield * 100, 2)}%/yr`, c: divYield > 0 ? C.green : C.dim },
                            { l: "Holdings", v: `${p.holdings.length} positions`, c: C.sub },
                            { l: "Max Drift", v: `${fmt(maxDrift, 1)}%`, c: maxDrift > 5 ? C.red : C.green },
                            { l: "Trades", v: `${txs.length}`, c: C.sub },
                          ]; })().map((m) => (
                            <div key={m.l} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px" }}>
                              <div style={{ color: C.dim, fontSize: 9, fontFamily: mono, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 4 }}>{m.l}</div>
                              <div style={{ color: m.c, fontSize: 15, fontWeight: 700, fontFamily: mono }}>{m.v}</div>
                            </div>
                          ))}
                        </div>
                        {/* Asset Type Breakdown */}
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ color: C.dim, fontSize: 10, fontFamily: mono, marginBottom: 6, letterSpacing: 0.3 }}>ASSET ALLOCATION</div>
                          <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", height: 24, marginBottom: 6 }}>
                            {Object.entries(typeBreakdown).map(([type, w]) => (
                              <div key={type} title={`${type}: ${fmt(w, 1)}%`} style={{ width: `${w}%`, background: TC[type] || C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8.5, color: "#fff", fontWeight: 700, borderRight: "1px solid rgba(0,0,0,.3)" }}>{w >= 10 ? `${type.toUpperCase()} ${fmt(w, 0)}%` : ""}</div>
                            ))}
                          </div>
                          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                            {Object.entries(typeBreakdown).map(([type, w]) => (
                              <span key={type} style={{ fontSize: 10, color: TC[type] || C.accent, fontFamily: mono }}>● {type}: {fmt(w, 1)}%</span>
                            ))}
                            {cashBal > 0 && <span style={{ fontSize: 10, color: C.teal, fontFamily: mono }}>● cash: {fmt(cashBal / p.value * 100, 1)}%</span>}
                          </div>
                        </div>
                        {/* Mini Performance Chart */}
                        {trackPts && trackPts.length > 2 && (
                          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
                            <div style={{ color: C.dim, fontSize: 10, fontFamily: mono, marginBottom: 8, letterSpacing: 0.3 }}>LIVE PERFORMANCE</div>
                            <SparkLine data={trackPts} w={900} h={80} />
                          </div>
                        )}
                        {/* Strategy & Thesis */}
                        {/* Original User Prompt — always read-only */}
                        {(p.originalPrompt || p.thesis) && <div style={{ marginTop: 14, padding: "10px 14px", background: C.surface, borderRadius: 8, border: `1px solid ${C.border}` }}>
                          <div style={{ color: C.dim, fontSize: 10, fontFamily: mono, marginBottom: 4, letterSpacing: 0.3 }}>ORIGINAL PROMPT</div>
                          <p style={{ color: C.dim, fontSize: 11.5, margin: 0, lineHeight: 1.5, fontStyle: "italic" }}>"{p.originalPrompt || p.thesis}"</p>
                        </div>}
                        {/* AI-Generated Investment Thesis — editable once */}
                        {(p.strategy || editingPortIdx === idx) && <div style={{ marginTop: 10, padding: "10px 14px", background: C.surface, borderRadius: 8, border: `1px solid ${C.border}` }}>
                          <div style={{ color: C.dim, fontSize: 10, fontFamily: mono, marginBottom: 4, display: "flex", justifyContent: "space-between", alignItems: "center", letterSpacing: 0.3 }}>AI-GENERATED INVESTMENT THESIS{editingPortIdx !== idx && !p.thesisEdited && <button onClick={(e) => startEditing(idx, p, e)} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.dim, borderRadius: 3, padding: "1px 6px", fontSize: 8, cursor: "pointer" }}>✏️ Edit once</button>}{p.thesisEdited && <span style={{ fontSize: 8, color: C.dim, fontFamily: mono }}>✓ Edited</span>}</div>
                          {editingPortIdx === idx ? <textarea value={editFields.strategy} onChange={e => setEditFields(prev => ({ ...prev, strategy: e.target.value }))} rows={3} style={{ background: C.bg, border: `1px solid ${C.accent}33`, color: C.sub, fontSize: 12, fontFamily: "inherit", outline: "none", padding: "6px 8px", borderRadius: 6, width: "100%", resize: "vertical", lineHeight: 1.5 }} /> : <p style={{ color: C.sub, fontSize: 12, margin: 0, lineHeight: 1.5 }}>{p.strategy}</p>}
                        </div>}
                        {/* Share Portfolio */}
                        <div className="share-row" style={{ marginTop: 14, padding: "12px 16px", background: `${C.accent}08`, borderRadius: 8, border: `1px solid ${C.accentBorder}` }}>
                          <div style={{ marginBottom: 10 }}>
                            <div style={{ color: C.text, fontSize: 12.5, fontWeight: 600, marginBottom: 2 }}>Share your portfolio performance</div>
                            <div style={{ color: C.dim, fontSize: 10.5 }}>Post your gains (or losses) to social media and challenge friends to beat you</div>
                          </div>
                          <ShareMenu text={`📊 My AI-built ETF "${p.name}" ${p.ticker ? `($${p.ticker})` : ""}\n\n${gain >= 0 ? "📈" : "📉"} ${fmtSign(gain, 2)}% return (${fmtUSD(p.value)} from ${fmtUSD(Math.round(costBasis))})\n🎯 ${p.holdings.length} holdings | ${p.fee || 0}% fee | ${p.riskProfile || "moderate"} risk\n💡 Top picks: ${p.holdings.slice(0, 3).map(h => "$" + h.symbol).join(" ")}\n\nBuild yours free → etfsimulator.com`} />
                        </div>
                      </div>
                    )}

                    {/* HOLDINGS TAB */}
                    {activeTab === "holdings" && (
                      <div className="mob-scroll" style={{ padding: "0" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "38px 50px 1fr 70px 90px 80px 70px 30px", padding: "8px 20px", borderBottom: `1px solid ${C.border}`, fontSize: 9, color: C.dim, fontFamily: mono, textTransform: "uppercase", letterSpacing: 0.4, minWidth: 560 }}>
                          <span>#</span><span>Type</span><span>Holding</span><span>Weight</span><span>Value</span><span>Day Chg</span><span>P&L</span><span></span>
                        </div>
                        {p.holdings.map((h, i) => {
                          const holdVal = h.liveValue || h.allocation || 0;
                          const costBasis = h.originalAllocation || h.allocation; // Anchored to original allocation to avoid entryPrice*shares rounding drift
                          const pnl = (holdVal || 0) - (costBasis || 0);
                          const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
                          const isShort = h.action === "SHORT";
                          const dayChg = h.dailyChange || 0;
                          // For SHORT: negative price move = profit (green), positive = loss (red)
                          const dayColor = isShort ? (dayChg <= 0 ? C.green : C.red) : (dayChg >= 0 ? C.green : C.red);
                          const priceColor = isShort ? ((h.livePrice || 0) <= (h.entryPrice || 0) ? C.green : C.red) : ((h.livePrice || 0) >= (h.entryPrice || 0) ? C.green : C.red);
                          return (
                            <div key={i} style={{ borderBottom: `1px solid ${C.border}`, minWidth: 560 }}>
                              <div style={{ display: "grid", gridTemplateColumns: "38px 50px 1fr 70px 90px 80px 70px 30px", padding: "10px 20px", alignItems: "center", fontSize: 12 }}>
                              <span style={{ color: C.dim, fontFamily: mono }}>{String(i + 1).padStart(2, "0")}</span>
                              <span style={{ ...badge(TC[h.type] || C.accent), fontSize: 8 }}>{isShort ? "SHORT" : h.type}</span>
                              <div>
                                <span style={{ color: C.text, fontWeight: 600 }}>{h.symbol}</span>
                                <span style={{ color: C.dim, fontSize: 10, marginLeft: 6 }}>{h.name}</span>
                                {isShort && <span style={{ color: "#f59e0b", fontSize: 8, marginLeft: 4, fontWeight: 700 }}>⬇ SHORT</span>}
                                <div style={{ display: "flex", gap: 8, marginTop: 2, flexWrap: "wrap" }}>
                                  {h.entryPrice && <span style={{ color: C.dim, fontSize: 8.5, fontFamily: mono }}>Entry: {fmtPrice(h.entryPrice)}</span>}
                                  {h.livePrice && <span style={{ color: priceColor, fontSize: 8.5, fontFamily: mono }}>Now: {fmtPrice(h.livePrice)}</span>}
                                  {h.shares && <span style={{ color: C.dim, fontSize: 8.5, fontFamily: mono }}>{h.shares < 1 ? h.shares.toFixed(6) : fmt(h.shares, 2)} shares</span>}
                                  {h.noQuote && !h.livePrice && <span style={{ color: C.gold, fontSize: 8, fontFamily: mono }}>⚠ No live quote</span>}
                                  {!h.entryPrice && !h.livePrice && !h.noQuote && <span style={{ color: C.dim, fontSize: 8, fontFamily: mono }}>Awaiting price data...</span>}
                                  {(() => { const dd = DIVIDEND_DATA[h.symbol]; return dd && dd.yield > 0 ? <span style={{ color: C.gold, fontSize: 8.5, fontFamily: mono }}>💰 {fmt(dd.yield * 100, 2)}% yield ({dd.freq === 4 ? "quarterly" : dd.freq === 12 ? "monthly" : dd.freq === 2 ? "semi-annual" : "annual"})</span> : null; })()}
                                </div>
                                {h.role && <span style={{ color: C.sub, fontSize: 9 }}>{h.role}{h.conviction ? ` · ${h.conviction} conviction` : ""}</span>}
                              </div>
                              <span style={{ color: C.text, fontFamily: mono, fontSize: 11.5 }}>{fmt(h.currentWeight || h.weight, 1)}%</span>
                              <span style={{ color: C.text, fontFamily: mono, fontSize: 11.5 }}>{fmtUSD(Math.round(holdVal))}</span>
                              <span style={{ color: dayColor, fontFamily: mono, fontSize: 11 }}>{isShort ? (dayChg <= 0 ? "+" : "") + fmt(Math.abs(dayChg), 2) + "%" : fmtSign(dayChg, 2) + "%"}</span>
                              <span style={{ color: pnl >= 0 ? C.green : C.red, fontFamily: mono, fontSize: 11, fontWeight: 600 }}>{fmtSign(pnlPct, 1)}%</span>
                              <button onClick={() => removeHolding(idx, h.symbol)} title={`Remove ${h.symbol}`} style={{ background: "transparent", border: "none", color: C.dim, cursor: "pointer", fontSize: 11, padding: 0, opacity: 0.5 }}>✕</button>
                              </div>
                              {/* Rationale & thesis connection — institutional detail */}
                              {(h.rationale || h.thesisConnection) && (
                                <div style={{ padding: "0 20px 10px 86px", lineHeight: 1.4 }}>
                                  {h.thesisConnection && <div style={{ color: C.accent, fontSize: 10, marginBottom: 2 }}>📌 {h.thesisConnection}</div>}
                                  {h.rationale && <div style={{ color: C.dim, fontSize: 9.5 }}>{h.rationale}</div>}
                                  {h.description && <div style={{ color: C.dim, fontSize: 9, fontStyle: "italic", marginTop: 2 }}>{h.description}</div>}
                                  <div style={{ marginTop: 6 }}>
                                    <ShareMenu compact text={`${isShort ? "🔻 SHORT" : "📈 LONG"} $${h.symbol} — ${h.name}\n\nWeight: ${fmt(h.currentWeight || h.weight, 1)}% | ${h.conviction || "medium"} conviction\n${h.thesisConnection ? "💡 " + h.thesisConnection + "\n" : ""}${h.rationale ? h.rationale.slice(0, 150) + "..." : ""}\n\nPart of my "${p.name}" ETF on etfsimulator.com`} label="Share Position" />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {cashBal > 0 && (
                          <div style={{ display: "grid", gridTemplateColumns: "38px 50px 1fr 70px 90px 80px 70px 30px", padding: "10px 20px", borderBottom: `1px solid ${C.border}`, alignItems: "center", fontSize: 12, background: C.surface, minWidth: 560 }}>
                            <span style={{ color: C.dim, fontFamily: mono }}>—</span>
                            <span style={{ ...badge(C.teal), fontSize: 8 }}>cash</span>
                            <span style={{ color: C.text, fontWeight: 600 }}>Money Market (4.5% APY)</span>
                            <span style={{ color: C.teal, fontFamily: mono, fontSize: 11.5 }}>{fmt(cashBal / p.value * 100, 1)}%</span>
                            <span style={{ color: C.teal, fontFamily: mono, fontSize: 11.5 }}>{fmtUSD(Math.round(cashBal))}</span>
                            <span style={{ color: C.green, fontFamily: mono, fontSize: 11 }}>+4.5%/yr</span>
                            <span style={{ color: C.dim }}>—</span>
                            <span></span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TRANSACTIONS TAB */}
                    {activeTab === "transactions" && (
                      <div className="mob-scroll" style={{ padding: "0", maxHeight: 500, overflowY: "auto" }}>
                        {txs.length === 0 ? (
                          <div style={{ padding: "40px 20px", textAlign: "center", color: C.dim }}>No transaction history saved for this portfolio. Transaction logs are preserved when you save from the Builder.</div>
                        ) : (
                          <>
                            {/* Summary Bar */}
                            <div style={{ display: "flex", gap: 16, padding: "12px 20px", background: C.surface, borderBottom: `1px solid ${C.border}`, flexWrap: "wrap" }}>
                              <span style={{ color: C.dim, fontSize: 10, fontFamily: mono }}>TOTAL ORDERS: <span style={{ color: C.text, fontWeight: 700 }}>{txs.length}</span></span>
                              <span style={{ color: C.dim, fontSize: 10, fontFamily: mono }}>BUYS: <span style={{ color: C.green, fontWeight: 700 }}>{txs.filter(t => t.type === "BUY").length}</span></span>
                              <span style={{ color: C.dim, fontSize: 10, fontFamily: mono }}>SELLS: <span style={{ color: C.red, fontWeight: 700 }}>{txs.filter(t => t.type === "SELL" || t.type === "TRIM" || t.type === "LIQUIDATE" || t.type === "AUTO-SELL").length}</span></span>
                              <span style={{ color: C.dim, fontSize: 10, fontFamily: mono }}>TOTAL INVESTED: <span style={{ color: C.text, fontWeight: 700 }}>{fmtUSD(txs.filter(t => t.type === "BUY").reduce((s, t) => s + (t.amount || 0), 0))}</span></span>
                              {txs.some(t => t.type === "DIVIDEND") && <span style={{ color: C.dim, fontSize: 10, fontFamily: mono }}>DIVIDENDS: <span style={{ color: C.gold, fontWeight: 700 }}>{fmtUSD(txs.filter(t => t.type === "DIVIDEND").reduce((s, t) => s + (t.amount || 0), 0))} ({txs.filter(t => t.type === "DIVIDEND").length})</span></span>}
                            </div>
                            {/* Column Headers */}
                            <div style={{ display: "grid", gridTemplateColumns: "70px 70px 90px 80px 80px 1fr 24px", padding: "8px 20px", borderBottom: `1px solid ${C.border}`, fontSize: 9, color: C.dim, fontFamily: mono, textTransform: "uppercase", letterSpacing: 0.4, minWidth: 540 }}>
                              <span>Action</span><span>Symbol</span><span>Amount</span><span>Price</span><span>Shares</span><span>Details</span><span></span>
                            </div>
                            {[...txs].reverse().map((tx, i) => {
                              const realIdx = txs.length - 1 - i; // reverse index to original array
                              return (
                              <div key={i} style={{ display: "grid", gridTemplateColumns: "70px 70px 90px 80px 80px 1fr 24px", padding: "10px 20px", borderBottom: `1px solid ${C.border}`, alignItems: "start", fontSize: 12, minWidth: 540, background: i === 0 && tx.status === "FILLED" ? `${C.green}06` : "transparent" }}>
                                <span style={{ ...badge(tx.type === "BUY" ? C.green : tx.type === "SELL" || tx.type === "TRIM" || tx.type === "LIQUIDATE" || tx.type === "AUTO-SELL" ? C.red : tx.type === "SHORT" ? "#f59e0b" : tx.type === "DIVIDEND" ? C.gold : tx.type === "FEE" ? C.dim : C.teal), fontSize: 9 }}>{tx.type === "DIVIDEND" ? "💰 DRIP" : tx.type}</span>
                                <div>
                                  <span style={{ color: C.text, fontFamily: mono, fontWeight: 600, fontSize: 11, display: "block" }}>{tx.symbol}</span>
                                  {tx.name && <span style={{ color: C.dim, fontSize: 8.5, display: "block", lineHeight: 1.2 }}>{tx.name.slice(0, 20)}</span>}
                                </div>
                                <span style={{ color: C.text, fontFamily: mono, fontSize: 11, fontWeight: 600 }}>{fmtUSD(tx.amount || 0)}</span>
                                <span style={{ color: C.sub, fontFamily: mono, fontSize: 10 }}>{tx.pricePerShare ? fmtUSD(tx.pricePerShare) : "—"}</span>
                                <span style={{ color: C.sub, fontFamily: mono, fontSize: 10 }}>{tx.shares ? fmt(tx.shares, 4) : "—"}</span>
                                <div style={{ minWidth: 0 }}>
                                  <span style={{ color: C.sub, fontSize: 11, lineHeight: 1.4, display: "block" }}>{tx.reason || "—"}</span>
                                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 3 }}>
                                    {tx.orderId && <span style={{ color: C.dim, fontSize: 8, fontFamily: mono, background: C.surface, padding: "1px 4px", borderRadius: 3 }}>{tx.orderId}</span>}
                                    {tx.orderType && <span style={{ color: C.dim, fontSize: 8, fontFamily: mono, background: C.surface, padding: "1px 4px", borderRadius: 3 }}>{tx.orderType}</span>}
                                    {tx.status && <span style={{ color: tx.status === "FILLED" || tx.status === "SETTLED" ? C.green : C.dim, fontSize: 8, fontFamily: mono, background: C.surface, padding: "1px 4px", borderRadius: 3 }}>{tx.status}</span>}
                                    {tx.settlementDate && <span style={{ color: C.dim, fontSize: 8, fontFamily: mono, background: C.surface, padding: "1px 4px", borderRadius: 3 }}>Settles: {tx.settlementDate}</span>}
                                  </div>
                                  {tx.ts && <span style={{ color: C.dim, fontSize: 8.5, fontFamily: mono, marginTop: 2, display: "block" }}>{new Date(tx.ts).toLocaleString()}</span>}
                                </div>
                                <button onClick={() => removeTransaction(idx, realIdx)} title="Delete transaction" style={{ background: "transparent", border: "none", color: C.dim, cursor: "pointer", fontSize: 10, padding: 0, opacity: 0.4, alignSelf: "center" }}>✕</button>
                              </div>
                              );
                            })}
                          </>
                        )}
                      </div>
                    )}

                    {/* PERFORMANCE TAB */}
                    {activeTab === "performance" && (
                      <div className="perf-tab" style={{ padding: 20 }}>
                        {/* Disclaimer */}
                        <div style={{ background: `${C.gold}08`, border: `1px solid ${C.gold}22`, borderRadius: 6, padding: "8px 12px", marginBottom: 14, fontSize: 10.5, color: C.gold, lineHeight: 1.5 }}>
                          ⚠️ <strong>Hypothetical Historical Simulation.</strong> This chart uses Monte Carlo methods to model how your portfolio's asset mix <em>might have</em> performed over the selected lookback period based on each asset class's historical risk/return profile. It does NOT use actual historical prices and is NOT a projection of future returns. For educational purposes only.
                        </div>
                        {/* Time horizon selector */}
                        <div style={{ display: "flex", gap: 6, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ color: C.dim, fontSize: 10, fontFamily: mono, letterSpacing: 0.4 }}>LOOKBACK PERIOD:</span>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {[6, 12, 24, 36, 60].map((m) => <button key={m} onClick={() => runBacktest(idx, m)} style={{ background: btMonths === m && btIdx === idx ? C.accentBg : "transparent", border: btMonths === m && btIdx === idx ? `1px solid ${C.accentBorder}` : `1px solid ${C.border}`, color: btMonths === m && btIdx === idx ? C.accentLight : C.sub, padding: "5px 14px", borderRadius: 4, fontSize: 11, cursor: "pointer", fontFamily: mono, fontWeight: 600 }}>{m < 12 ? `${m}mo` : `${m / 12}yr`}</button>)}
                          </div>
                        </div>

                        {btData && btIdx === idx && (
                          <>
                            {/* Main chart */}
                            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 14px 8px" }}>
                              <ProChart data={btData} w={920} h={360} />
                            </div>

                            {/* KPI Summary Bar */}
                            <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 14 }}>
                              {[
                                { l: "STARTING VALUE", v: fmtUSD(1000000), c: C.sub },
                                { l: "ENDING VALUE", v: fmtUSD(btData[btData.length - 1].value), c: C.text },
                                { l: "PEAK VALUE", v: fmtUSD(Math.max(...btData.map(d => d.value))), c: C.green },
                                { l: "TROUGH VALUE", v: fmtUSD(Math.min(...btData.map(d => d.value))), c: C.red },
                              ].map((s) => <div key={s.l} style={{ textAlign: "center", background: C.surface, borderRadius: 8, padding: "10px 6px", border: `1px solid ${C.border}` }}><div style={{ color: C.dim, fontSize: 8.5, marginBottom: 3, fontFamily: mono, letterSpacing: 0.4 }}>{s.l}</div><div style={{ color: s.c, fontSize: 15, fontWeight: 700, fontFamily: mono }}>{s.v}</div></div>)}
                            </div>

                            {/* Professional Metrics Dashboard */}
                            {btData.metrics && (() => {
                              const m = btData.metrics;
                              const metricColor = (v, positive) => v > 0 === positive ? C.green : v === 0 ? C.sub : C.red;
                              return (
                                <div style={{ marginTop: 16 }}>
                                  <div style={{ color: C.dim, fontSize: 10, fontFamily: mono, letterSpacing: 0.4, marginBottom: 10 }}>RISK-ADJUSTED PERFORMANCE METRICS</div>
                                  <div className="metrics-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
                                    {[
                                      { l: "Total Return", v: `${m.totalReturn >= 0 ? "+" : ""}${fmt(m.totalReturn, 2)}%`, c: metricColor(m.totalReturn, true), tip: "Cumulative return over period" },
                                      { l: "CAGR", v: `${m.cagr >= 0 ? "+" : ""}${fmt(m.cagr, 2)}%`, c: metricColor(m.cagr, true), tip: "Compound Annual Growth Rate" },
                                      { l: "Alpha vs S&P", v: `${m.alpha >= 0 ? "+" : ""}${fmt(m.alpha, 2)}%`, c: metricColor(m.alpha, true), tip: "Excess return over S&P 500 benchmark" },
                                      { l: "S&P 500 Return", v: `${m.benchReturn >= 0 ? "+" : ""}${fmt(m.benchReturn, 2)}%`, c: metricColor(m.benchReturn, true), tip: "Benchmark return over same period" },
                                      { l: "Sharpe Ratio", v: fmt(m.sharpe, 2), c: m.sharpe >= 1 ? C.green : m.sharpe >= 0.5 ? C.gold : C.red, tip: "Risk-adjusted return (>1 = good, >2 = excellent)" },
                                      { l: "Sortino Ratio", v: fmt(m.sortino, 2), c: m.sortino >= 1.5 ? C.green : m.sortino >= 0.8 ? C.gold : C.red, tip: "Downside risk-adjusted return" },
                                      { l: "Calmar Ratio", v: fmt(m.calmar, 2), c: m.calmar >= 1 ? C.green : m.calmar >= 0.5 ? C.gold : C.red, tip: "CAGR / Max Drawdown" },
                                      { l: "Annualized Vol", v: `${fmt(m.annualizedVol, 1)}%`, c: m.annualizedVol <= 15 ? C.green : m.annualizedVol <= 25 ? C.gold : C.red, tip: "Annualized standard deviation of returns" },
                                      { l: "Max Drawdown", v: `${fmt(m.maxDrawdown, 1)}%`, c: m.maxDrawdown > -10 ? C.green : m.maxDrawdown > -20 ? C.gold : C.red, tip: "Largest peak-to-trough decline" },
                                      { l: "Win Rate", v: `${fmt(m.winRate, 0)}%`, c: m.winRate >= 55 ? C.green : m.winRate >= 45 ? C.gold : C.red, tip: "% of months with positive return" },
                                      { l: "Best Month", v: `+${fmt(m.bestMonth, 1)}%`, c: C.green, tip: "Highest single-month return" },
                                      { l: "Worst Month", v: `${fmt(m.worstMonth, 1)}%`, c: C.red, tip: "Lowest single-month return" },
                                    ].map((metric) => (
                                      <div key={metric.l} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px" }} title={metric.tip}>
                                        <div style={{ color: C.dim, fontSize: 8.5, fontFamily: mono, letterSpacing: 0.3, marginBottom: 4, textTransform: "uppercase" }}>{metric.l}</div>
                                        <div style={{ color: metric.c, fontSize: 16, fontWeight: 800, fontFamily: mono }}>{metric.v}</div>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Return Attribution */}
                                  <div className="comparison-grid" style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
                                      <div style={{ color: C.dim, fontSize: 9, fontFamily: mono, letterSpacing: 0.4, marginBottom: 8 }}>RETURN COMPARISON</div>
                                      <div style={{ display: "flex", alignItems: "end", gap: 16, height: 80 }}>
                                        {[
                                          { l: "Your ETF", v: m.totalReturn },
                                          { l: "S&P 500", v: m.benchReturn },
                                        ].map((bar) => {
                                          const maxAbs = Math.max(Math.abs(m.totalReturn), Math.abs(m.benchReturn), 1);
                                          const barH = (Math.abs(bar.v) / maxAbs) * 60;
                                          return (
                                            <div key={bar.l} style={{ flex: 1, textAlign: "center" }}>
                                              <div style={{ color: bar.v >= 0 ? C.green : C.red, fontSize: 14, fontWeight: 700, fontFamily: mono, marginBottom: 4 }}>{bar.v >= 0 ? "+" : ""}{fmt(bar.v, 1)}%</div>
                                              <div style={{ height: barH, background: bar.l === "Your ETF" ? (bar.v >= 0 ? C.green : C.red) : C.accent, borderRadius: "4px 4px 0 0", opacity: 0.7 }} />
                                              <div style={{ color: C.dim, fontSize: 9, fontFamily: mono, marginTop: 4 }}>{bar.l}</div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
                                      <div style={{ color: C.dim, fontSize: 9, fontFamily: mono, letterSpacing: 0.4, marginBottom: 8 }}>RISK PROFILE</div>
                                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                        {[
                                          { l: "Volatility", v: m.annualizedVol, max: 40, c: m.annualizedVol <= 15 ? C.green : m.annualizedVol <= 25 ? C.gold : C.red },
                                          { l: "Drawdown Risk", v: Math.abs(m.maxDrawdown), max: 40, c: Math.abs(m.maxDrawdown) <= 10 ? C.green : Math.abs(m.maxDrawdown) <= 20 ? C.gold : C.red },
                                          { l: "Win Rate", v: m.winRate, max: 100, c: m.winRate >= 55 ? C.green : m.winRate >= 45 ? C.gold : C.red },
                                        ].map((bar) => (
                                          <div key={bar.l}>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                                              <span style={{ color: C.sub, fontSize: 10, fontFamily: mono }}>{bar.l}</span>
                                              <span style={{ color: bar.c, fontSize: 10, fontFamily: mono, fontWeight: 700 }}>{fmt(bar.v, 1)}%</span>
                                            </div>
                                            <div style={{ height: 5, background: C.card, borderRadius: 3, overflow: "hidden" }}>
                                              <div style={{ height: "100%", width: `${Math.min(100, (bar.v / bar.max) * 100)}%`, background: bar.c, borderRadius: 3, opacity: 0.8 }} />
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Disclaimer + Share */}
                                  <div className="share-row" style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "stretch" }}>
                                    <div style={{ flex: 1, padding: "8px 12px", background: C.card, borderRadius: 6, border: `1px solid ${C.border}` }}>
                                      <p style={{ color: C.dim, fontSize: 9.5, margin: 0, lineHeight: 1.5 }}>
                                        Simulated performance using Monte Carlo methods based on historical asset-class return/volatility profiles. Risk-free rate: 4.5%. Benchmark: S&P 500 (10% ann. return, 16% vol). Past simulated performance is not indicative of future results. This is not financial advice.
                                      </p>
                                    </div>
                                    <button onClick={() => shareToX(`📈 ${btMonths / 12}yr backtest of my ETF "${p.name}":\n\n💰 ${m.totalReturn >= 0 ? "+" : ""}${fmt(m.totalReturn, 1)}% total return (CAGR: ${m.cagr >= 0 ? "+" : ""}${fmt(m.cagr, 1)}%)\n⚡ Sharpe: ${fmt(m.sharpe, 2)} | Alpha: ${m.alpha >= 0 ? "+" : ""}${fmt(m.alpha, 1)}% vs S&P\n📉 Max DD: ${fmt(m.maxDrawdown, 1)}% | Win Rate: ${fmt(m.winRate, 0)}%\n\nSimulate your own → etfsimulator.com`)} style={{ background: "#000", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", flexShrink: 0 }}>
                                      <span style={{ fontSize: 13 }}>𝕏</span> Share Results
                                    </button>
                                  </div>
                                </div>
                              );
                            })()}
                          </>
                        )}

                        {/* Live NAV history if available */}
                        {navPts.length > 2 && (
                          <div style={{ marginTop: 16, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
                            <div style={{ color: C.dim, fontSize: 10, fontFamily: mono, marginBottom: 6 }}>SESSION NAV HISTORY ({navPts.length} data points)</div>
                            <SparkLine data={navPts.map(n => ({ price: n.nav || n.value }))} w={900} h={70} />
                          </div>
                        )}
                      </div>
                    )}

                    {/* REBALANCE TAB */}
                    {activeTab === "rebalance" && (
                      <div style={{ padding: 20 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                          <span style={{ color: C.dim, fontSize: 10.5, fontFamily: mono, letterSpacing: 0.3 }}>DRIFT ANALYSIS — Threshold: {p.rebalanceThreshold || 5}%</span>
                          <button onClick={() => doRebalance(idx)} style={{ ...btnP(), fontSize: 11, padding: "5px 14px" }}>Rebalance Now</button>
                        </div>
                        <div className="mob-scroll">
                        <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 70px 70px 70px", padding: "6px 0", borderBottom: `1px solid ${C.border}`, fontSize: 10, color: C.dim, fontFamily: mono, textTransform: "uppercase", minWidth: 380 }}><span>Symbol</span><span>Name</span><span>Target</span><span>Current</span><span>Drift</span></div>
                        {p.holdings.map((h, i) => {
                          const drift = (h.currentWeight || h.weight) - (h.targetWeight || h.weight);
                          return (
                            <div key={i} style={{ display: "grid", gridTemplateColumns: "80px 1fr 70px 70px 70px", padding: "6px 0", borderBottom: `1px solid ${C.border}`, fontSize: 12, alignItems: "center", minWidth: 380 }}>
                              <span style={{ color: C.text, fontFamily: mono, fontWeight: 600 }}>{h.symbol}</span>
                              <span style={{ color: C.sub, fontSize: 11 }}>{h.name}</span>
                              <span style={{ color: C.sub, fontFamily: mono }}>{fmt(h.targetWeight || h.weight, 1)}%</span>
                              <span style={{ color: C.text, fontFamily: mono }}>{fmt(h.currentWeight || h.weight, 1)}%</span>
                              <span style={{ color: Math.abs(drift) > 5 ? C.red : Math.abs(drift) > 2 ? C.gold : C.green, fontFamily: mono, fontWeight: 600 }}>{drift >= 0 ? "+" : ""}{fmt(drift, 1)}%</span>
                            </div>
                          );
                        })}
                        </div>{/* close mob-scroll */}
                      </div>
                    )}

                    {/* COMPARE TAB */}
                    {activeTab === "compare" && (
                      <div style={{ padding: 20 }}>
                        <div style={{ color: C.dim, fontSize: 10, fontFamily: mono, marginBottom: 10, letterSpacing: 0.3 }}>COMPARE WITH COMMUNITY PORTFOLIOS</div>
                        {(publicPortfolios || []).length === 0 ? (
                          <p style={{ color: C.dim, fontSize: 12 }}>No community portfolios available for comparison yet.</p>
                        ) : (
                          <>
                            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                              {(publicPortfolios || []).filter(cp => cp.id !== p.id).slice(0, 6).map(cp => (
                                <button key={cp.id} onClick={() => setCompareWith(compareWith === cp.id ? null : cp)} style={{ background: compareWith?.id === cp.id ? C.accentBg : C.surface, border: `1px solid ${compareWith?.id === cp.id ? C.accentBorder : C.border}`, color: compareWith?.id === cp.id ? C.accentLight : C.sub, padding: "6px 12px", borderRadius: 6, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                                  {cp.name} ({cp.creator})
                                </button>
                              ))}
                            </div>
                            {compareWith && (
                              <div className="comparison-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                                {[{ label: "YOUR ETF", d: p, g: gain }, { label: "COMPARISON", d: compareWith, g: compareWith.gain || 0 }].map(({ label, d, g }) => (
                                  <div key={label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
                                    <div style={{ color: C.dim, fontSize: 9, fontFamily: mono, marginBottom: 6 }}>{label}</div>
                                    <div style={{ color: C.text, fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{d.name}</div>
                                    <div style={{ color: C.text, fontSize: 18, fontWeight: 800, fontFamily: mono }}>{fmtUSD(d.value)}</div>
                                    <div style={{ color: g >= 0 ? C.green : C.red, fontSize: 13, fontFamily: mono, fontWeight: 700 }}>{g >= 0 ? "+" : ""}{fmt(g, 2)}%</div>
                                    <div style={{ color: C.dim, fontSize: 10, marginTop: 6 }}>Fee: {d.fee || 0}% · {d.holdings?.length || 0} holdings</div>
                                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                                      {(d.holdings || []).slice(0, 6).map(h => <span key={h.symbol} style={{ fontSize: 8, padding: "1px 4px", borderRadius: 3, background: `${TC[h.type] || C.accent}12`, color: TC[h.type] || C.accent, fontFamily: mono }}>{h.symbol}</span>)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   LEADERBOARD
   ═══════════════════════════════════════════════════════════════════════ */


// ══════ PORTFOLIO COMMENTS COMPONENT ══════
function PortfolioComments({ portfolioId, user }) {
  const [comments, setComments] = React.useState([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [posting, setPosting] = React.useState(false);

  React.useEffect(() => {
    if (!portfolioId) return;
    setLoading(true);
    supabase.from("portfolio_comments")
      .select("id, message, username, created_at")
      .eq("portfolio_id", portfolioId)
      .order("created_at", { ascending: true })
      .limit(50)
      .then(({ data }) => { setComments(data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [portfolioId]);

  const post = async () => {
    const msg = input.trim();
    if (!msg || !user || posting || msg.length > 280) return;
    setPosting(true);
    const username = user.username || user.user_metadata?.username || user.email?.split("@")[0] || "anon";
    const { data, error } = await supabase.from("portfolio_comments").insert({
      portfolio_id: portfolioId,
      message: msg,
      username,
      user_id: user.id,
    }).select();
    if (!error && data) {
      setComments(prev => [...prev, data[0]]);
      setInput("");
    }
    setPosting(false);
  };

  const timeAgo = (ts) => {
    const d = Date.now() - new Date(ts).getTime();
    if (d < 60000) return "just now";
    if (d < 3600000) return `${Math.floor(d/60000)}m ago`;
    if (d < 86400000) return `${Math.floor(d/3600000)}h ago`;
    return `${Math.floor(d/86400000)}d ago`;
  };

  return (
    <div style={{ borderTop: `1px solid ${C.border}`, padding: "16px 20px", background: C.bg }}>
      <div style={{ color: C.dim, fontSize: 10, fontFamily: mono, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
        💬 Comments {comments.length > 0 && `(${comments.length})`}
      </div>

      {loading ? (
        <div style={{ color: C.dim, fontSize: 11, padding: "8px 0" }}>Loading...</div>
      ) : (
        <>
          {comments.length === 0 && (
            <div style={{ color: C.dim, fontSize: 11, padding: "4px 0 12px", fontStyle: "italic" }}>No comments yet — be the first.</div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: comments.length > 0 ? 14 : 0 }}>
            {comments.map(c => (
              <div key={c.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${C.accent}25`, border: `1px solid ${C.accent}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: C.accent, flexShrink: 0 }}>
                  {(c.username || "?")[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 3 }}>
                    <span style={{ color: C.accent, fontSize: 11, fontWeight: 600, fontFamily: mono }}>@{c.username}</span>
                    <span style={{ color: C.dim, fontSize: 9 }}>{timeAgo(c.created_at)}</span>
                  </div>
                  <div style={{ color: C.text, fontSize: 12, lineHeight: 1.5, wordBreak: "break-word" }}>{c.message}</div>
                </div>
              </div>
            ))}
          </div>

          {user ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && post()}
                placeholder="Add a comment… (280 chars)"
                maxLength={280}
                style={{ ...inputS(), flex: 1, fontSize: 12, padding: "7px 12px" }}
              />
              <button
                onClick={post}
                disabled={posting || !input.trim()}
                style={{ ...btnP(), fontSize: 12, padding: "7px 16px", opacity: posting || !input.trim() ? 0.5 : 1 }}
              >
                {posting ? "…" : "Post"}
              </button>
            </div>
          ) : (
            <div style={{ color: C.dim, fontSize: 11, padding: "6px 0", fontStyle: "italic" }}>
              Sign in to leave a comment.
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Leaderboard({ publicPortfolios, user, lbLoading, lbLastUpdate, deepLinkedPortfolioId, onDeepLinkConsumed }) {
  const [expanded, setExpanded] = useState(null);
  const [sortBy, setSortBy] = useState("gain"); // gain | value | fee | holdings
  const [copiedLinkId, setCopiedLinkId] = useState(null); // tracks which portfolio's link was just copied
  const [lbTab, setLbTab] = useState("overview"); // overview | holdings | transactions | performance | thesis | metrics
  const [lbBtMonths, setLbBtMonths] = useState(60);
  const [lbBtData, setLbBtData] = useState(null);
  // ══════ COMMUNITY CHAT — 24hr ephemeral ══════
  const [chatMsgs, setChatMsgs] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const chatEndRef = useRef(null);

  const CHAT_TTL = 24 * 60 * 60 * 1000; // 24 hours in ms
  const timeAgo = (ts) => {
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return "24h+";
  };

  // Load chat messages + auto-refresh every 15s + cleanup old
  useEffect(() => {
    let cancelled = false;
    const loadChat = async () => {
      try {
        // Cleanup server-side (best-effort, non-blocking)
        supabase.rpc("cleanup_old_chat").catch(() => {});
        const cutoff = new Date(Date.now() - CHAT_TTL).toISOString();
        const { data, error: chatErr } = await supabase
          .from("chat_messages")
          .select("*")
          .gte("created_at", cutoff)
          .order("created_at", { ascending: true })
          .limit(100);
        if (chatErr) { console.warn("[Chat] Non-critical:", chatErr.message); return; }
        if (!cancelled && data) setChatMsgs(data);
      } catch (e) { /* chat is non-critical */ }
    };
    loadChat();
    const iv = setInterval(loadChat, 15000);
    return () => { cancelled = true; clearInterval(iv); };
  }, []);

  // Auto-scroll on new messages (only when messages exist, not on initial load)
  const chatInitialized = useRef(false);
  useEffect(() => {
    if (chatMsgs.length > 0) {
      if (chatInitialized.current) chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      chatInitialized.current = true;
    }
  }, [chatMsgs.length]);

  // Auto-open deep-linked portfolio when arriving via #portfolio/ID
  useEffect(() => {
    if (deepLinkedPortfolioId && publicPortfolios?.length > 0) {
      const target = publicPortfolios.find(p => p.id === deepLinkedPortfolioId);
      if (target) {
        setExpanded(deepLinkedPortfolioId);
        setLbTab("overview");
        // Scroll to the portfolio row after a short delay
        setTimeout(() => {
          const el = document.getElementById(`lb-portfolio-${deepLinkedPortfolioId}`);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 300);
        if (onDeepLinkConsumed) onDeepLinkConsumed();
      }
    }
  }, [deepLinkedPortfolioId, publicPortfolios?.length]);

  const postChat = async () => {
    const msg = chatInput.trim();
    if (!msg || !user || msg.length > 500) return;
    setChatLoading(true);
    try {
      const { error } = await supabase.from("chat_messages").insert({
        user_id: user.id,
        username: user.username || user.name || "Anonymous",
        message: msg,
      });
      if (!error) {
        setChatInput("");
        // Optimistic update
        setChatMsgs(prev => [...prev, { id: Date.now(), user_id: user.id, username: user.username || user.name, message: msg, created_at: new Date().toISOString() }]);
      }
    } catch (e) { /* silent */ }
    setChatLoading(false);
  };

  const deleteChat = async (msgId) => {
    await supabase.from("chat_messages").delete().eq("id", msgId);
    setChatMsgs(prev => prev.filter(m => m.id !== msgId));
  };
  const sorted = [...(publicPortfolios || [])].sort((a, b) => {
    if (sortBy === "gain") return b.gain - a.gain;
    if (sortBy === "value") return b.value - a.value;
    if (sortBy === "fee") return a.fee - b.fee;
    if (sortBy === "holdings") return (b.holdingCount || (b.holdings||[]).length || 0) - (a.holdingCount || (a.holdings||[]).length || 0);
    return (b.holdingCount || 10) - (a.holdingCount || 10);
  }).slice(0, 50);

  // Backtest generator for leaderboard portfolios
  const runLbBacktest = (p, months) => {
    if (!p?.holdings) return;
    setLbBtMonths(months);
    const pts = months;
    const data = []; const spData = [];
    let nav = 1000000; let sp = 1000000;
    const seed = (p.id ? String(p.id).split("").reduce((a,c) => a + c.charCodeAt(0), 0) : 0)
               + (p.name ? p.name.split("").reduce((a,c) => a + c.charCodeAt(0), 0) : 0) + 42;
    for (let i = 0; i <= pts; i++) {
      const regime = (sr(i * 3 + seed * 2 + 7) - 0.5) * 0.8;
      const monthReturn = (p.holdings || []).reduce((s, h, hi) => {
        const typeRet = h.type === "crypto" ? 0.015 : h.type === "commodity" ? 0.004 : h.type === "etf" ? 0.007 : 0.008;
        const typeVol = h.type === "crypto" ? 0.08 : h.type === "commodity" ? 0.04 : 0.035;
        const idio = (sr(i * 17 + seed * 7 + (h.symbol?.charCodeAt(0) || 0) + hi * 3 + 3) - 0.5) * 2;
        return s + (h.weight / 100) * (typeRet + typeVol * (regime * 0.6 + idio * 0.4));
      }, 0);
      nav = Math.round(nav * (1 + monthReturn));
      const spNoise = regime * 0.7 + (sr(i * 19 + seed * 3 + 11) - 0.5) * 0.6;
      sp = Math.round(sp * (1 + 0.008 + 0.04 * spNoise));
      data.push({ month: i, value: nav });
      spData.push({ month: i, value: sp });
    }
    // Merge sp500 into portfolio data as benchmark field so ProChart renders it
    const merged = data.map((pt, i) => ({ ...pt, benchmark: spData[i]?.value }));
    setLbBtData({ portfolio: merged, sp: spData, name: p.name });
  };

  const lbTabBtn = (tab) => ({
    background: lbTab === tab ? C.accentBg : "transparent",
    border: `1px solid ${lbTab === tab ? C.accentBorder : C.border}`,
    color: lbTab === tab ? C.accentLight : C.sub,
    padding: "5px 14px", borderRadius: 5, fontSize: 11, cursor: "pointer", fontWeight: 600, fontFamily: "inherit",
  });
  const sortBtn = (key, label) => ({ background: sortBy === key ? C.accentBg : "transparent", border: `1px solid ${sortBy === key ? C.accentBorder : C.border}`, color: sortBy === key ? C.accentLight : C.sub, padding: "3px 10px", borderRadius: 4, fontSize: 10, cursor: "pointer", fontFamily: mono, fontWeight: 600 });
  return (
    <div className="page-container" style={{ maxWidth: 920, margin: "0 auto", padding: "36px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ color: C.text, fontSize: 26, margin: "0 0 6px" }}>Leaderboard</h1>
          <p style={{ color: C.sub, fontSize: 13, margin: "0 0 8px" }}>Top community portfolios ranked by performance. Publish your ETF to compete.</p>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.22)", borderRadius: 6, padding: "3px 10px" }}>
              <span style={{ color: "#f59e0b", fontSize: 10, fontWeight: 700, fontFamily: mono, letterSpacing: 0.5 }}>SIMULATED</span>
              <span style={{ color: C.dim, fontSize: 10 }}>·</span>
              <span style={{ color: "#94a3b8", fontSize: 10 }}>All values are paper trading — educational only. No real money at risk.</span>
            </div>
            {publicPortfolios.length > 0 && (() => {
              const totalAUM = publicPortfolios.reduce((s, p) => s + (p.value || 0), 0);
              const avgReturn = publicPortfolios.reduce((s, p) => s + (p.gain || 0), 0) / publicPortfolios.length;
              return <span style={{ fontSize: 10.5, fontFamily: mono, color: C.dim }}>
                {publicPortfolios.length} portfolios · <span style={{ color: C.teal }}>{fmtUSD(Math.round(totalAUM))} simulated AUM</span> · avg <span style={{ color: avgReturn >= 0 ? C.green : C.red }}>{fmtSign(avgReturn, 2)}%</span>
              </span>;
            })()}
          </div>
        </div>
        <div className="sort-controls" style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ color: C.dim, fontSize: 10, fontFamily: mono }}>Sort:</span>
          <button onClick={() => setSortBy("gain")} style={sortBtn("gain", "Return")}>Return</button>
          <button onClick={() => setSortBy("value")} style={sortBtn("value", "Value")}>Value</button>
          <button onClick={() => setSortBy("fee")} style={sortBtn("fee", "Fee")}>Low Fee</button>
          <button onClick={() => setSortBy("holdings")} style={sortBtn("holdings", "Holdings")}>Holdings</button>
        </div>
      </div>

      {lbLoading && <div style={{ textAlign: "center", padding: "8px 0", marginBottom: 10 }}><span style={{ color: C.accent, fontSize: 11, fontFamily: mono }}>⟳ Updating live prices...</span></div>}
      {!lbLoading && lbLastUpdate && isFinite(lbLastUpdate) && <div style={{ textAlign: "right", marginBottom: 6 }}><span style={{ color: C.dim, fontSize: 9, fontFamily: mono }}>● Live · updated {Math.round((Date.now() - lbLastUpdate) / 1000)}s ago</span></div>}

      {sorted.length === 0 ? (
        <div style={{ ...cardS(), textAlign: "center", padding: "52px 20px" }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>🏆</div>
          <h3 style={{ color: C.text, fontSize: 18, margin: "0 0 8px" }}>No published portfolios yet</h3>
          <p style={{ color: C.sub, fontSize: 13.5, maxWidth: 400, margin: "0 auto 18px", lineHeight: 1.5 }}>Be the first to publish! Build an AI-powered ETF and choose "Publish to Leaderboard" when saving.</p>
        </div>
      ) : (
        <div className="mob-scroll" style={{ ...cardS(), padding: 0, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "46px 1fr 100px 100px 76px 70px 50px", padding: "9px 18px", borderBottom: `1px solid ${C.border}`, fontSize: 10, color: C.dim, fontFamily: mono, textTransform: "uppercase", letterSpacing: 0.4, minWidth: 560 }}><span>Rank</span><span>Portfolio</span><span>Manager</span><span>Value</span><span>Return</span><span>Fee</span><span></span></div>
          {sorted.map((p, i) => {
            const isOpen = expanded === p.id;
            const isOwn = user && p.creator === (user.username || user.name);
            return (
            <div key={p.id} id={`lb-portfolio-${p.id}`}>
              <div onClick={() => { if (isOpen) { setExpanded(null); } else { setExpanded(p.id); setLbTab("overview"); setLbBtData(null); } }} style={{ display: "grid", gridTemplateColumns: "46px 1fr 100px 100px 76px 70px 50px", padding: "12px 18px", borderBottom: `1px solid ${C.border}`, alignItems: "center", cursor: "pointer", background: isOpen ? C.surface : "transparent", transition: "background .12s", minWidth: 560 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: i === 0 ? C.gold : i === 1 ? "#a8a29e" : i === 2 ? "#d97706" : C.dim }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}</span>
                <div>
                  <span style={{ color: C.text, fontSize: 13.5, fontWeight: 600 }}>{p.name}</span>
                  {isOwn && <span style={{ color: C.accent, fontSize: 9, marginLeft: 6, fontWeight: 700 }}>(YOU)</span>}
                  {p.isLiveFund && <span style={{ fontSize: 8, background: `${C.teal}18`, color: C.teal, border: `1px solid ${C.teal}30`, borderRadius: 3, padding: "1px 5px", fontFamily: mono, fontWeight: 700, marginLeft: 6, verticalAlign: "middle" }}>LIVE</span>}
                </div>
                <span style={{ color: p.isLiveFund ? C.teal : C.accent, fontSize: 11.5, fontFamily: mono, fontWeight: 600 }}>{p.isLiveFund ? "ETF Simulator" : `@${p.creator}`}</span>
                <span style={{ color: C.text, fontFamily: mono, fontSize: 12 }}>{fmtUSD(p.value)}</span>
                <span style={{ color: p.gain >= 0 ? C.green : C.red, fontFamily: mono, fontSize: 12, fontWeight: 700 }}>{fmtSign(p.gain, 2)}%</span>
                <span style={{ color: C.sub, fontFamily: mono, fontSize: 12 }}>{p.fee}%</span>
                <span style={{ color: C.dim, fontSize: 10 }}>{isOpen ? "▾" : "▸"}</span>
              </div>
              {isOpen && (
                <div style={{ borderTop: `1px solid ${C.border}`, background: C.surface }}>
                  {/* Tab Bar */}
                  <div className="tab-bar" style={{ display: "flex", gap: 6, padding: "10px 18px", borderBottom: `1px solid ${C.border}`, flexWrap: "wrap" }}>
                    <button onClick={() => setLbTab("overview")} style={lbTabBtn("overview")}>📊 Overview</button>
                    <button onClick={() => setLbTab("holdings")} style={lbTabBtn("holdings")}>💼 Holdings ({(p.holdings || []).length})</button>
                    <button onClick={() => setLbTab("transactions")} style={lbTabBtn("transactions")}>📋 Transactions</button>
                    <button onClick={() => { setLbTab("performance"); runLbBacktest(p, lbBtMonths); }} style={lbTabBtn("performance")}>📈 Performance</button>
                    <button onClick={() => setLbTab("thesis")} style={lbTabBtn("thesis")}>💡 Thesis</button>
                    <button onClick={() => setLbTab("metrics")} style={lbTabBtn("metrics")}>📐 Metrics</button>
                    <button onClick={(e) => { e.stopPropagation(); const url = `${window.location.origin}${window.location.pathname}#portfolio/${p.id}`; navigator.clipboard.writeText(url).then(() => { setCopiedLinkId(p.id); setTimeout(() => setCopiedLinkId(null), 2000); }); }} style={{ ...btnO(), fontSize: 10, padding: "4px 10px", marginLeft: "auto", background: copiedLinkId === p.id ? `${C.green}22` : "transparent", color: copiedLinkId === p.id ? C.green : C.dim, border: `1px solid ${copiedLinkId === p.id ? C.green : C.border}`, borderRadius: 6 }} title="Copy shareable link">
                      {copiedLinkId === p.id ? "✓ Link Copied!" : "🔗 Copy Link"}
                    </button>
                  </div>

                  {/* OVERVIEW TAB */}
                  {lbTab === "overview" && (
                    <div style={{ padding: 18 }}>
                      {/* KPI Grid */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 16 }}>
                        {(() => { const cashBal = p.cashBalance || p.cashPosition?.amount || 0; const divYield = (p.holdings || []).reduce((s, h) => { const dd = DIVIDEND_DATA[h.symbol]; return s + (dd ? dd.yield * (h.weight || 0) / 100 : 0); }, 0); return [
                          { l: "Portfolio Value", v: fmtUSD(p.value), c: C.text },
                          { l: "Total Return", v: `${fmtSign(p.gain, 2)}%`, c: p.gain >= 0 ? C.green : C.red },
                          { l: "P&L", v: `${(p.gain || 0) >= 0 ? "+" : ""}${fmtUSD(Math.round((p.value || 1000000) - (p.costBasis || 1000000)))}`, c: (p.gain || 0) >= 0 ? C.green : C.red },
                          { l: "Cash Balance", v: fmtUSD(Math.round(cashBal)), c: cashBal > 0 ? C.teal : C.dim },
                          { l: "Expense Ratio", v: `${p.fee || 0}%/yr`, c: C.sub },
                          { l: "Dividend Yield", v: `${fmt(divYield * 100, 2)}%/yr`, c: divYield > 0 ? C.green : C.dim },
                          { l: "Holdings", v: `${(p.holdings || []).length} positions`, c: C.sub },
                          { l: "Risk Profile", v: p.riskProfile || "moderate", c: C.gold },
                          { l: p.isLiveFund ? "Fund Type" : "Manager", v: p.isLiveFund ? "🟢 Live Fund · ETF Simulator" : `@${p.creator}`, c: p.isLiveFund ? C.teal : C.accent },
                          { l: "Benchmark", v: p.benchmark || "S&P 500", c: C.sub },
                          ...(p.isLiveFund ? [{ l: "Inception", v: p.inceptionDate ? new Date(p.inceptionDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Mar 10, 2026", c: C.gold }, { l: "Review Schedule", v: "Annual", c: C.dim }] : []),
                        ]; })().map(m => (
                          <div key={m.l} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px" }}>
                            <div style={{ color: C.dim, fontSize: 9, fontFamily: mono, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 4 }}>{m.l}</div>
                            <div style={{ color: m.c, fontSize: 15, fontWeight: 700, fontFamily: mono }}>{m.v}</div>
                          </div>
                        ))}
                      </div>
                      {/* Asset Allocation */}
                      {p.holdings && p.holdings.length > 0 && (() => {
                        const tb = {}; p.holdings.forEach(h => { tb[h.type] = (tb[h.type] || 0) + (h.weight || 0); });
                        return (
                          <div style={{ marginBottom: 14 }}>
                            <div style={{ color: C.dim, fontSize: 10, fontFamily: mono, marginBottom: 6 }}>ASSET ALLOCATION</div>
                            <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", height: 24, marginBottom: 6 }}>
                              {Object.entries(tb).map(([type, w]) => (
                                <div key={type} title={`${type}: ${fmt(w, 1)}%`} style={{ width: `${w}%`, background: TC[type] || C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8.5, color: "#fff", fontWeight: 700, borderRight: "1px solid rgba(0,0,0,.3)" }}>{w >= 10 ? `${type.toUpperCase()} ${fmt(w, 0)}%` : ""}</div>
                              ))}
                            </div>
                            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                              {Object.entries(tb).map(([type, w]) => (
                                <span key={type} style={{ fontSize: 10, color: TC[type] || C.accent, fontFamily: mono }}>● {type}: {fmt(w, 1)}%</span>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                      {/* Strategy preview */}
                      {p.strategy && <div style={{ padding: "10px 14px", background: C.card, borderRadius: 8, border: `1px solid ${C.border}` }}><div style={{ color: C.dim, fontSize: 10, fontFamily: mono, marginBottom: 4 }}>STRATEGY</div><p style={{ color: C.sub, fontSize: 12, margin: 0, lineHeight: 1.5 }}>{p.strategy}</p></div>}
                      {/* Share */}
                      <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
                        <ShareMenu compact text={`🏆 Check out "${p.name}" by @${p.creator || "Anonymous"} on the ETF Simulator leaderboard!\n\n${p.gain >= 0 ? "📈" : "📉"} ${fmtSign(p.gain, 2)}% return | ${fmtUSD(p.value)} NAV\n${(p.holdings || []).slice(0, 4).map(h => "$" + h.symbol).join(" ")}\n\nBuild your own AI ETF free → etfsimulator.com`} label="Share" />
                      </div>
                    </div>
                  )}

                  {/* HOLDINGS TAB — Institutional-grade portfolio dashboard */}
                  {lbTab === "holdings" && p.holdings && (
                    <div className="mob-scroll" style={{ padding: 0 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "38px 50px 1fr 70px 90px 70px 70px", padding: "8px 18px", borderBottom: `1px solid ${C.border}`, fontSize: 9, color: C.dim, fontFamily: mono, textTransform: "uppercase", letterSpacing: 0.4, minWidth: 520 }}>
                        <span>#</span><span>Type</span><span>Holding</span><span>Weight</span><span>Value</span><span>Day Chg</span><span>P&L</span>
                      </div>
                      {p.holdings.map((h, hi) => {
                        const holdVal = h.liveValue || h.allocation || 0;
                        const costBasis = h.originalAllocation || h.allocation; // Always anchor to original allocation — avoids entryPrice*shares rounding drift
                        const pnl = (holdVal || 0) - (costBasis || 0);
                        const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
                        return (
                        <div key={hi} style={{ borderBottom: `1px solid ${C.border}`, minWidth: 520 }}>
                          <div style={{ display: "grid", gridTemplateColumns: "38px 50px 1fr 70px 90px 70px 70px", padding: "10px 18px", alignItems: "center", fontSize: 12 }}>
                            <span style={{ color: C.dim, fontFamily: mono }}>{String(hi + 1).padStart(2, "0")}</span>
                            <span style={{ ...badge(TC[h.type] || C.accent), fontSize: 8 }}>{h.type}</span>
                            <div>
                              <span style={{ color: C.text, fontWeight: 600 }}>{h.symbol}</span>
                              <span style={{ color: C.dim, fontSize: 10, marginLeft: 6 }}>{h.name}</span>
                              <div style={{ display: "flex", gap: 8, marginTop: 2, flexWrap: "wrap" }}>
                                {h.entryPrice && <span style={{ color: C.dim, fontSize: 8.5, fontFamily: mono }}>Entry: {fmtPrice(h.entryPrice)}</span>}
                                {h.livePrice && <span style={{ color: (h.livePrice >= (h.entryPrice || 0)) ? C.green : C.red, fontSize: 8.5, fontFamily: mono }}>Now: {fmtPrice(h.livePrice)}</span>}
                                {h.shares && <span style={{ color: C.dim, fontSize: 8.5, fontFamily: mono }}>{h.shares < 1 ? h.shares.toFixed(6) : fmt(h.shares, 2)} shares</span>}
                                {!h.entryPrice && !h.livePrice && <span title="Live price unavailable for this ticker — may be delisted, OTC-only, or unsupported by our data providers. Portfolio is tracking this position by its original allocation value." style={{ color: C.gold, fontSize: 8, fontFamily: mono, cursor: "help", borderBottom: "1px dashed currentColor" }}>⚠ No price data — tracking by allocation</span>}
                                {(() => { const dd = DIVIDEND_DATA[h.symbol]; return dd && dd.yield > 0 ? <span style={{ color: C.gold, fontSize: 8.5, fontFamily: mono }}>💰 {fmt(dd.yield * 100, 2)}% yield ({dd.freq === 4 ? "quarterly" : dd.freq === 12 ? "monthly" : dd.freq === 2 ? "semi-annual" : "annual"})</span> : null; })()}
                              </div>
                              {h.role && <span style={{ color: C.sub, fontSize: 9 }}>{h.role}{h.conviction ? ` · ${h.conviction} conviction` : ""}</span>}
                            </div>
                            <span style={{ color: C.accent, fontFamily: mono, fontWeight: 700, fontSize: 12 }}>{fmt(h.currentWeight || h.weight || 0, 1)}%</span>
                            <span style={{ color: C.text, fontFamily: mono, fontSize: 11 }}>{fmtUSD(Math.round(holdVal))}</span>
                            <span style={{ color: (h.dailyChange || 0) >= 0 ? C.green : C.red, fontFamily: mono, fontSize: 11 }}>{fmtSign(h.dailyChange || 0, 2)}%</span>
                            <span style={{ color: pnl >= 0 ? C.green : C.red, fontFamily: mono, fontSize: 11, fontWeight: 600 }}>
                              {!h.livePrice && h.type === "crypto" ? <span style={{ color: C.dim }}>…</span> : `${fmtSign(pnlPct, 1)}%`}
                            </span>
                          </div>
                          {/* Rationale & thesis connection */}
                          {(h.rationale || h.thesisConnection) && (
                            <div style={{ padding: "0 18px 10px 86px", lineHeight: 1.4 }}>
                              {h.thesisConnection && <div style={{ color: C.accent, fontSize: 10, marginBottom: 2 }}>📌 {h.thesisConnection}</div>}
                              {h.rationale && <div style={{ color: C.dim, fontSize: 9.5 }}>{h.rationale}</div>}
                              {h.description && <div style={{ color: C.dim, fontSize: 9, fontStyle: "italic", marginTop: 2 }}>{h.description}</div>}
                              <div style={{ marginTop: 6 }}>
                                <ShareMenu compact text={`${h.action === "SHORT" ? "🔻 SHORT" : "📈 LONG"} $${h.symbol} — ${h.name}\n\n${h.thesisConnection ? "💡 " + h.thesisConnection + "\n" : ""}${h.rationale ? h.rationale.slice(0, 150) + "..." : ""}\n\nFrom "${p.name}" by @${p.creator || "Anonymous"} on etfsimulator.com`} label="Share" />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                      })}
                      {(() => { const lbCash = p.cashBalance || p.cashPosition?.amount || 0; return lbCash > 0 ? (
                        <div style={{ display: "grid", gridTemplateColumns: "38px 50px 1fr 70px 90px 70px 70px", padding: "10px 18px", borderBottom: `1px solid ${C.border}`, alignItems: "center", fontSize: 12, background: C.surface, minWidth: 520 }}>
                          <span style={{ color: C.dim, fontFamily: mono }}>—</span>
                          <span style={{ ...badge(C.teal), fontSize: 8 }}>cash</span>
                          <span style={{ color: C.text, fontWeight: 600 }}>Money Market (4.5% APY)</span>
                          <span style={{ color: C.teal, fontFamily: mono, fontSize: 11.5 }}>{fmt(lbCash / (p.value || 1000000) * 100, 1)}%</span>
                          <span style={{ color: C.teal, fontFamily: mono, fontSize: 11.5 }}>{fmtUSD(Math.round(lbCash))}</span>
                          <span style={{ color: C.green, fontFamily: mono, fontSize: 11 }}>+4.5%/yr</span>
                          <span style={{ color: C.dim }}>—</span>
                        </div>
                      ) : null; })()}
                    </div>
                  )}

                  {/* TRANSACTIONS TAB */}
                  {lbTab === "transactions" && (
                    <div className="mob-scroll" style={{ padding: 0, maxHeight: 400, overflowY: "auto" }}>
                      {(!p.transactions || p.transactions.length === 0) ? (
                        <div style={{ padding: "40px 18px", textAlign: "center", color: C.dim, fontSize: 12 }}>{p.isLiveFund ? "Transactions will appear here as dividends, fees, and stop-losses execute over time." : "Transaction history is available when the portfolio manager saves their ETF with transaction logs."}</div>
                      ) : (
                        <>
                          <div style={{ display: "flex", gap: 16, padding: "10px 18px", background: C.card, borderBottom: `1px solid ${C.border}`, flexWrap: "wrap" }}>
                            <span style={{ color: C.dim, fontSize: 10, fontFamily: mono }}>TOTAL ORDERS: <span style={{ color: C.text, fontWeight: 700 }}>{p.transactions.length}</span></span>
                            <span style={{ color: C.dim, fontSize: 10, fontFamily: mono }}>INVESTED: <span style={{ color: C.text, fontWeight: 700 }}>{fmtUSD(p.transactions.filter(t => t.type === "BUY").reduce((s, t) => s + (t.amount || 0), 0))}</span></span>
                            {p.transactions.some(t => t.type === "DIVIDEND") && <span style={{ color: C.dim, fontSize: 10, fontFamily: mono }}>DIVIDENDS: <span style={{ color: C.green, fontWeight: 700 }}>{fmtUSD(p.transactions.filter(t => t.type === "DIVIDEND").reduce((s, t) => s + (t.amount || 0), 0))} ({p.transactions.filter(t => t.type === "DIVIDEND").length} payments)</span></span>}
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "60px 70px 80px 70px 1fr", padding: "8px 18px", borderBottom: `1px solid ${C.border}`, fontSize: 9, color: C.dim, fontFamily: mono, textTransform: "uppercase", minWidth: 420 }}>
                            <span>Action</span><span>Symbol</span><span>Amount</span><span>Price</span><span>Details</span>
                          </div>
                          {[...p.transactions].reverse().map((tx, ti) => (
                            <div key={ti} style={{ display: "grid", gridTemplateColumns: "60px 70px 80px 70px 1fr", padding: "8px 18px", borderBottom: `1px solid ${C.border}`, alignItems: "start", fontSize: 11, minWidth: 420 }}>
                              <span style={{ ...badge(tx.type === "BUY" ? C.green : tx.type === "SELL" || tx.type === "AUTO-SELL" ? C.red : tx.type === "DIVIDEND" ? C.gold : tx.type === "FEE" ? C.dim : C.teal), fontSize: 8 }}>{tx.type === "DIVIDEND" ? "💰 DRIP" : tx.type}</span>
                              <span style={{ color: C.text, fontFamily: mono, fontWeight: 600, fontSize: 10 }}>{tx.symbol}</span>
                              <span style={{ color: C.text, fontFamily: mono, fontSize: 10 }}>{fmtUSD(tx.amount || 0)}</span>
                              <span style={{ color: C.sub, fontFamily: mono, fontSize: 9 }}>{tx.pricePerShare ? fmtUSD(tx.pricePerShare) : "—"}</span>
                              <div>
                                <span style={{ color: C.sub, fontSize: 10 }}>{(tx.reason || "—").slice(0, 100)}</span>
                                {tx.ts && <span style={{ color: C.dim, fontSize: 8, fontFamily: mono, display: "block", marginTop: 2 }}>{new Date(tx.ts).toLocaleString()}</span>}
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}

                  {/* PERFORMANCE TAB */}
                  {lbTab === "performance" && (
                    <div style={{ padding: 18 }}>
                      <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
                        <span style={{ color: C.dim, fontSize: 10, fontFamily: mono, marginRight: 6 }}>PERIOD:</span>
                        {[6, 12, 24, 36, 60].map(m => <button key={m} onClick={() => runLbBacktest(p, m)} style={{ background: lbBtMonths === m ? C.accentBg : "transparent", border: `1px solid ${lbBtMonths === m ? C.accentBorder : C.border}`, color: lbBtMonths === m ? C.accentLight : C.sub, padding: "4px 12px", borderRadius: 4, fontSize: 10, cursor: "pointer", fontFamily: mono, fontWeight: 600 }}>{m < 12 ? `${m}mo` : `${m / 12}yr`}</button>)}
                      </div>
                      {lbBtData ? (
                        <>
                          <BacktestChart data={lbBtData.portfolio} spData={lbBtData.sp} name={lbBtData.name} months={lbBtMonths} />
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8, marginTop: 14 }}>
                            {(() => {
                              const d = lbBtData.portfolio || [];
                              const finalVal = d[d.length - 1]?.value || 1000000;
                              const spFinal = lbBtData.sp[lbBtData.sp.length - 1]?.value || 1000000;
                              const totalRet = ((finalVal - 1000000) / 1000000) * 100;
                              const spRet = ((spFinal - 1000000) / 1000000) * 100;
                              const annRet = (Math.pow(finalVal / 1000000, 12 / lbBtMonths) - 1) * 100;
                              const vals = d.map(pt => pt.value);
                              if (d.length < 2) return null;
                              const maxVal = Math.max(...vals);
                              const maxDD = ((maxVal - Math.min(...vals.slice(vals.indexOf(maxVal)))) / maxVal) * 100;
                              const monthlyRets = d.slice(1).map((pt, i) => (pt.value - d[i].value) / d[i].value);
                              const avgMonthly = monthlyRets.reduce((s, r) => s + r, 0) / monthlyRets.length;
                              const stdDev = Math.sqrt(monthlyRets.reduce((s, r) => s + Math.pow(r - avgMonthly, 2), 0) / monthlyRets.length);
                              const annVol = stdDev * Math.sqrt(12) * 100;
                              const sharpe = annVol > 0 ? (annRet - 4.5) / annVol : 0;
                              return [
                                { l: "Total Return", v: `${totalRet >= 0 ? "+" : ""}${fmt(totalRet, 2)}%`, c: totalRet >= 0 ? C.green : C.red },
                                { l: "S&P 500", v: `${spRet >= 0 ? "+" : ""}${fmt(spRet, 2)}%`, c: spRet >= 0 ? C.green : C.red },
                                { l: "Alpha", v: `${totalRet - spRet >= 0 ? "+" : ""}${fmt(totalRet - spRet, 2)}%`, c: totalRet - spRet >= 0 ? C.green : C.red },
                                { l: "Ann. Return", v: `${fmt(annRet, 2)}%`, c: C.text },
                                { l: "Ann. Volatility", v: `${fmt(annVol, 1)}%`, c: annVol > 20 ? C.red : C.green },
                                { l: "Sharpe Ratio", v: fmt(sharpe, 2), c: sharpe > 1 ? C.green : sharpe > 0.5 ? C.gold : C.red },
                                { l: "Max Drawdown", v: `-${fmt(maxDD, 2)}%`, c: maxDD > 20 ? C.red : C.green },
                                { l: "Final Value", v: fmtUSD(finalVal), c: C.text },
                              ].map(m => (
                                <div key={m.l} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px" }}>
                                  <div style={{ color: C.dim, fontSize: 8, fontFamily: mono, textTransform: "uppercase", marginBottom: 3 }}>{m.l}</div>
                                  <div style={{ color: m.c, fontSize: 13, fontWeight: 700, fontFamily: mono }}>{m.v}</div>
                                </div>
                              ));
                            })()}
                          </div>
                        </>
                      ) : (
                        <div style={{ textAlign: "center", padding: 30, color: C.dim }}>Select a time period to simulate performance</div>
                      )}
                    </div>
                  )}

                  {/* THESIS TAB */}
                  {lbTab === "thesis" && (
                    <div style={{ padding: 18 }}>
                      {/* User's original prompt */}
                      {(p.originalPrompt || p.thesis) && <div style={{ padding: "14px 18px", background: C.card, borderRadius: 8, border: `1px solid ${C.border}`, marginBottom: 14 }}>
                        <div style={{ color: C.dim, fontSize: 10, fontFamily: mono, marginBottom: 6 }}>ORIGINAL PROMPT</div>
                        <p style={{ color: C.text, fontSize: 13, margin: 0, lineHeight: 1.6, fontStyle: "italic" }}>"{p.originalPrompt || p.thesis}"</p>
                      </div>}
                      {/* AI-Generated Strategy */}
                      {p.strategy && p.strategy !== (p.originalPrompt || p.thesis) && <div style={{ padding: "14px 18px", background: C.card, borderRadius: 8, border: `1px solid ${C.border}`, marginBottom: 14 }}>
                        <div style={{ color: C.dim, fontSize: 10, fontFamily: mono, marginBottom: 6 }}>AI-GENERATED STRATEGY</div>
                        <p style={{ color: C.sub, fontSize: 12, margin: 0, lineHeight: 1.6 }}>{p.strategy}</p>
                      </div>}
                      {/* Fund Summary */}
                      {p.fundSummary && <div style={{ padding: "14px 18px", background: C.card, borderRadius: 8, border: `1px solid ${C.border}`, marginBottom: 14 }}>
                        <div style={{ color: C.dim, fontSize: 10, fontFamily: mono, marginBottom: 6 }}>FUND SUMMARY</div>
                        {typeof p.fundSummary === "object" ? <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {p.fundSummary.investmentThesis && <div><span style={{ color: C.accent, fontSize: 10, fontFamily: mono, fontWeight: 600 }}>THESIS: </span><span style={{ color: C.sub, fontSize: 12, lineHeight: 1.5 }}>{p.fundSummary.investmentThesis}</span></div>}
                          {p.fundSummary.targetInvestor && <div><span style={{ color: C.accent, fontSize: 10, fontFamily: mono, fontWeight: 600 }}>TARGET INVESTOR: </span><span style={{ color: C.sub, fontSize: 12 }}>{p.fundSummary.targetInvestor}</span></div>}
                          {p.fundSummary.competitiveEdge && <div><span style={{ color: C.accent, fontSize: 10, fontFamily: mono, fontWeight: 600 }}>COMPETITIVE EDGE: </span><span style={{ color: C.sub, fontSize: 12 }}>{p.fundSummary.competitiveEdge}</span></div>}
                          {p.fundSummary.scalingPlan && <div><span style={{ color: C.accent, fontSize: 10, fontFamily: mono, fontWeight: 600 }}>SCALING: </span><span style={{ color: C.sub, fontSize: 12 }}>{p.fundSummary.scalingPlan}</span></div>}
                        </div> : <p style={{ color: C.sub, fontSize: 12, margin: 0, lineHeight: 1.5 }}>{String(p.fundSummary)}</p>}
                      </div>}
                      {/* Macro Analysis */}
                      {p.macroAnalysis && <div style={{ padding: "14px 18px", background: C.card, borderRadius: 8, border: `1px solid ${C.border}`, marginBottom: 14 }}>
                        <div style={{ color: C.dim, fontSize: 10, fontFamily: mono, marginBottom: 6 }}>MACRO ENVIRONMENT ANALYSIS</div>
                        {typeof p.macroAnalysis === "object" ? <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {p.macroAnalysis.regime && <div><span style={{ color: C.accent, fontSize: 10, fontFamily: mono, fontWeight: 600 }}>REGIME: </span><span style={{ color: C.sub, fontSize: 12, lineHeight: 1.5 }}>{p.macroAnalysis.regime}</span></div>}
                          {p.macroAnalysis.interestRates && <div><span style={{ color: C.accent, fontSize: 10, fontFamily: mono, fontWeight: 600 }}>RATES: </span><span style={{ color: C.sub, fontSize: 12 }}>{p.macroAnalysis.interestRates}</span></div>}
                          {p.macroAnalysis.inflation && <div><span style={{ color: C.accent, fontSize: 10, fontFamily: mono, fontWeight: 600 }}>INFLATION: </span><span style={{ color: C.sub, fontSize: 12 }}>{p.macroAnalysis.inflation}</span></div>}
                          {p.macroAnalysis.geopolitical && <div><span style={{ color: C.accent, fontSize: 10, fontFamily: mono, fontWeight: 600 }}>GEOPOLITICAL: </span><span style={{ color: C.sub, fontSize: 12 }}>{p.macroAnalysis.geopolitical}</span></div>}
                          {p.macroAnalysis.sectorRotation && <div><span style={{ color: C.accent, fontSize: 10, fontFamily: mono, fontWeight: 600 }}>SECTOR ROTATION: </span><span style={{ color: C.sub, fontSize: 12 }}>{p.macroAnalysis.sectorRotation}</span></div>}
                        </div> : <p style={{ color: C.sub, fontSize: 12, margin: 0, lineHeight: 1.5 }}>{String(p.macroAnalysis)}</p>}
                      </div>}
                      {/* Rebalance Rules */}
                      {p.rebalanceRules && <div style={{ padding: "14px 18px", background: C.card, borderRadius: 8, border: `1px solid ${C.border}` }}>
                        <div style={{ color: C.dim, fontSize: 10, fontFamily: mono, marginBottom: 6 }}>REBALANCE RULES</div>
                        <p style={{ color: C.sub, fontSize: 12, margin: 0, lineHeight: 1.5 }}>{typeof p.rebalanceRules === "object" ? JSON.stringify(p.rebalanceRules) : p.rebalanceRules}</p>
                      </div>}
                      {/* Share Thesis */}
                      <div style={{ marginTop: 14 }}>
                        <ShareMenu compact text={`💡 Investment Thesis: "${p.name}" by @${p.creator}\n\n${p.originalPrompt || p.thesis ? `"${(p.originalPrompt || p.thesis).slice(0, 200)}${(p.originalPrompt || p.thesis).length > 200 ? "..." : ""}"` : ""}\n\n${p.strategy ? p.strategy.slice(0, 150) + "..." : ""}\n\n${p.gain >= 0 ? "📈" : "📉"} ${fmtSign(p.gain, 2)}% return\n\nExplore on etfsimulator.com`} label="Share Thesis" />
                      </div>
                    </div>
                  )}

                  {/* METRICS TAB */}
                  {lbTab === "metrics" && (
                    <div style={{ padding: 18 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                        {p.riskAnalysis && <div style={{ padding: "14px 18px", background: C.card, borderRadius: 8, border: `1px solid ${C.border}` }}>
                          <div style={{ color: C.dim, fontSize: 10, fontFamily: mono, marginBottom: 6 }}>RISK ANALYSIS</div>
                          {typeof p.riskAnalysis === "object" ? <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {p.riskAnalysis.correlationNote && <div><span style={{ color: C.teal, fontSize: 9, fontFamily: mono, fontWeight: 600 }}>CORRELATION: </span><span style={{ color: C.sub, fontSize: 11, lineHeight: 1.5 }}>{p.riskAnalysis.correlationNote}</span></div>}
                            {p.riskAnalysis.worstCase && <div><span style={{ color: C.red, fontSize: 9, fontFamily: mono, fontWeight: 600 }}>WORST CASE: </span><span style={{ color: C.sub, fontSize: 11 }}>{p.riskAnalysis.worstCase}</span></div>}
                            {p.riskAnalysis.hedgingStrategy && <div><span style={{ color: C.green, fontSize: 9, fontFamily: mono, fontWeight: 600 }}>HEDGING: </span><span style={{ color: C.sub, fontSize: 11 }}>{p.riskAnalysis.hedgingStrategy}</span></div>}
                            {p.riskAnalysis.tailRisk && <div><span style={{ color: C.gold, fontSize: 9, fontFamily: mono, fontWeight: 600 }}>TAIL RISK: </span><span style={{ color: C.sub, fontSize: 11 }}>{p.riskAnalysis.tailRisk}</span></div>}
                            {p.riskAnalysis.liquidityRisk && <div><span style={{ color: C.accent, fontSize: 9, fontFamily: mono, fontWeight: 600 }}>LIQUIDITY: </span><span style={{ color: C.sub, fontSize: 11 }}>{p.riskAnalysis.liquidityRisk}</span></div>}
                          </div> : <p style={{ color: C.sub, fontSize: 11, margin: 0, lineHeight: 1.5 }}>{String(p.riskAnalysis)}</p>}
                        </div>}
                        {p.incomeProjection && <div style={{ padding: "14px 18px", background: C.card, borderRadius: 8, border: `1px solid ${C.border}` }}>
                          <div style={{ color: C.dim, fontSize: 10, fontFamily: mono, marginBottom: 6 }}>DIVIDEND INCOME PROJECTION</div>
                          {typeof p.incomeProjection === "object" ? <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {p.incomeProjection.estimatedYield && <div><span style={{ color: C.green, fontSize: 9, fontFamily: mono, fontWeight: 600 }}>YIELD: </span><span style={{ color: C.sub, fontSize: 11 }}>{p.incomeProjection.estimatedYield}</span></div>}
                            {p.incomeProjection.annualIncome && <div><span style={{ color: C.green, fontSize: 9, fontFamily: mono, fontWeight: 600 }}>ANNUAL INCOME: </span><span style={{ color: C.sub, fontSize: 11 }}>{p.incomeProjection.annualIncome}</span></div>}
                            {p.incomeProjection.growthVsIncome && <div><span style={{ color: C.accent, fontSize: 9, fontFamily: mono, fontWeight: 600 }}>SPLIT: </span><span style={{ color: C.sub, fontSize: 11 }}>{p.incomeProjection.growthVsIncome}</span></div>}
                          </div> : <p style={{ color: C.sub, fontSize: 11, margin: 0, lineHeight: 1.5 }}>{String(p.incomeProjection)}</p>}
                        </div>}
                        {p.esgConsiderations && <div style={{ padding: "14px 18px", background: C.card, borderRadius: 8, border: `1px solid ${C.border}` }}>
                          <div style={{ color: C.dim, fontSize: 10, fontFamily: mono, marginBottom: 6 }}>ESG CONSIDERATIONS</div>
                          <p style={{ color: C.sub, fontSize: 11, margin: 0, lineHeight: 1.5 }}>{typeof p.esgConsiderations === "object" ? JSON.stringify(p.esgConsiderations) : p.esgConsiderations}</p>
                        </div>}
                        {p.factorExposure && <div style={{ padding: "14px 18px", background: C.card, borderRadius: 8, border: `1px solid ${C.border}` }}>
                          <div style={{ color: C.dim, fontSize: 10, fontFamily: mono, marginBottom: 6 }}>FACTOR EXPOSURE</div>
                          {typeof p.factorExposure === "object" && !Array.isArray(p.factorExposure) ? (() => {
                            const fd = { momentum: "Trend-following bias", value: "Undervalued stock exposure", growth: "Revenue/earnings growth tilt", quality: "Balance sheet strength", lowVolatility: "Price stability preference", size: "Market cap tilt" };
                            return <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {Object.entries(p.factorExposure).map(([k, v]) => <div key={k}><div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.sub, fontSize: 11, textTransform: "capitalize" }}>{k.replace(/([A-Z])/g, " $1")}</span><span style={{ color: v === "high" ? C.green : v === "low" ? C.dim : C.gold, fontSize: 11, fontWeight: 600, fontFamily: mono }}>{v}</span></div>{fd[k] && <div style={{ color: C.dim, fontSize: 8.5, marginTop: 1 }}>{fd[k]}</div>}</div>)}
                          </div>; })() : <p style={{ color: C.sub, fontSize: 11, margin: 0, lineHeight: 1.5 }}>{String(p.factorExposure)}</p>}
                        </div>}
                      </div>
                      {/* Holdings financial metrics — only render if at least one holding has real data */}
                      {(() => {
                        const hasFm = (fm) => fm && typeof fm === "object" && (fm.marketCapValue || fm.peRatio || fm.revenueGrowth || fm.dividendYield || fm.ltmRevenue);
                        const holdingsWithFm = (p.holdings || []).filter(h => hasFm(h.financialMetrics));
                        if (holdingsWithFm.length === 0) return null;
                        return (
                          <div style={{ marginTop: 14 }}>
                            <div style={{ color: C.dim, fontSize: 10, fontFamily: mono, marginBottom: 8 }}>HOLDING FUNDAMENTALS</div>
                            <div className="mob-scroll" style={{ borderRadius: 8, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                              <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 80px 70px 70px 70px", padding: "6px 14px", fontSize: 9, color: C.dim, fontFamily: mono, textTransform: "uppercase", borderBottom: `1px solid ${C.border}`, minWidth: 420 }}>
                                <span>Ticker</span><span>Name</span><span>Mkt Cap</span><span>P/E</span><span>Rev Gr</span><span>Div Yield</span>
                              </div>
                              {holdingsWithFm.map((h, hi) => {
                                const fm = h.financialMetrics;
                                return (
                                  <div key={hi} style={{ display: "grid", gridTemplateColumns: "60px 1fr 80px 70px 70px 70px", padding: "8px 14px", fontSize: 10, borderBottom: `1px solid ${C.border}`, alignItems: "center", minWidth: 420 }}>
                                    <span style={{ color: C.text, fontWeight: 700, fontFamily: mono }}>{h.symbol}</span>
                                    <span style={{ color: C.sub, fontSize: 9 }}>{h.name?.slice(0, 28)}</span>
                                    <span style={{ color: C.sub, fontFamily: mono }}>{fm.marketCapValue || "—"}</span>
                                    <span style={{ color: fm.peRatio && fm.peRatio !== "N/A" ? C.text : C.dim, fontFamily: mono }}>{fm.peRatio || "—"}</span>
                                    <span style={{ color: fm.revenueGrowth ? (parseFloat(fm.revenueGrowth) > 0 ? C.green : C.red) : C.dim, fontFamily: mono }}>{fm.revenueGrowth || "—"}</span>
                                    <span style={{ color: fm.dividendYield && fm.dividendYield !== "0%" ? C.gold : C.dim, fontFamily: mono }}>{fm.dividendYield || "—"}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                      {/* Empty state — shown when portfolio has no analytics data (older published portfolios) */}
                      {!p.riskAnalysis && !p.incomeProjection && !p.esgConsiderations && !p.factorExposure &&
                        !(p.holdings || []).some(h => h.financialMetrics && typeof h.financialMetrics === "object" && (h.financialMetrics.marketCapValue || h.financialMetrics.peRatio || h.financialMetrics.revenueGrowth)) && (
                        <div style={{ textAlign: "center", padding: "36px 20px", color: C.dim }}>
                          <div style={{ fontSize: 32, marginBottom: 10 }}>📐</div>
                          <div style={{ color: C.sub, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>No advanced metrics for this portfolio</div>
                          <div style={{ color: C.dim, fontSize: 11.5, lineHeight: 1.6, maxWidth: 380, margin: "0 auto" }}>
                            AI-generated portfolios include risk analysis, factor exposure, income projections, and per-holding fundamental data (market cap, P/E, revenue growth, dividend yield). This portfolio predates those features or was built manually.
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ══════ COMMENTS SECTION ══════ */}
                  {isOpen && (
                    <PortfolioComments portfolioId={p.id} user={user} />
                  )}

                </div>
              )}
            </div>
          );})}
        </div>
      )}
      {/* ══════ COMMUNITY CHAT — 24hr ephemeral ══════ */}
      <div style={{ ...cardS(), marginTop: 20, padding: 0, overflow: "hidden" }}>
        <div onClick={() => setChatOpen(p => !p)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", cursor: "pointer", background: C.surface, borderBottom: chatOpen ? `1px solid ${C.border}` : "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>💬</span>
            <span style={{ color: C.text, fontSize: 14, fontWeight: 700 }}>Community Chat</span>
            <span style={{ ...badge(C.teal), fontSize: 9 }}>24h</span>
            {chatMsgs.length > 0 && <span style={{ color: C.dim, fontSize: 10, fontFamily: mono }}>{chatMsgs.length} messages</span>}
          </div>
          <span style={{ color: C.dim, fontSize: 11 }}>{chatOpen ? "▾" : "▸"}</span>
        </div>
        {chatOpen && (
          <div>
            {/* Messages */}
            <div style={{ maxHeight: 320, overflowY: "auto", padding: "10px 16px" }}>
              {chatMsgs.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 10px", color: C.dim, fontSize: 12 }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
                  No messages yet. Be the first to start the conversation!
                  <div style={{ fontSize: 10, marginTop: 6, color: C.dim }}>Messages auto-delete after 24 hours</div>
                </div>
              ) : chatMsgs.map(m => {
                const isOwn = user && m.user_id === user.id;
                return (
                  <div key={m.id} style={{ marginBottom: 8, display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: isOwn ? C.accentBg : C.surface, border: `1px solid ${isOwn ? C.accentBorder : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: isOwn ? C.accent : C.dim, fontWeight: 700, fontFamily: mono, flexShrink: 0 }}>
                      {(m.username || "?")[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ color: isOwn ? C.accent : C.text, fontSize: 11.5, fontWeight: 700, fontFamily: mono }}>@{m.username}</span>
                        {isOwn && <span style={{ fontSize: 8, color: C.accent, fontWeight: 700 }}>(YOU)</span>}
                        <span style={{ color: C.dim, fontSize: 9, fontFamily: mono }}>{timeAgo(m.created_at)}</span>
                        {isOwn && <span onClick={() => deleteChat(m.id)} style={{ color: C.dim, fontSize: 9, cursor: "pointer", marginLeft: "auto" }} title="Delete">✕</span>}
                      </div>
                      <p style={{ color: C.sub, fontSize: 12.5, margin: "2px 0 0", lineHeight: 1.45, wordBreak: "break-word" }}>{m.message}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>
            {/* Input */}
            <div style={{ padding: "10px 16px", borderTop: `1px solid ${C.border}`, background: C.surface }}>
              {user ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value.slice(0, 500))}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postChat(); } }}
                    placeholder="Share a thought, strategy, or hot take..."
                    style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: "8px 12px", borderRadius: 6, fontSize: 12.5, fontFamily: "inherit", outline: "none" }}
                    maxLength={500}
                    disabled={chatLoading}
                  />
                  <button onClick={postChat} disabled={!chatInput.trim() || chatLoading} style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: !chatInput.trim() || chatLoading ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: !chatInput.trim() || chatLoading ? 0.5 : 1, whiteSpace: "nowrap" }}>
                    {chatLoading ? "..." : "Send"}
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "6px 0", color: C.dim, fontSize: 12 }}>
                  Sign in to join the conversation
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <span style={{ color: C.dim, fontSize: 9 }}>Messages disappear after 24 hours · Be respectful</span>
                {chatInput.length > 0 && <span style={{ color: chatInput.length > 450 ? C.red : C.dim, fontSize: 9, fontFamily: mono }}>{chatInput.length}/500</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 20, padding: "12px 16px", background: C.surface, borderRadius: 8, border: `1px solid ${C.border}` }}>
        <p style={{ color: C.dim, fontSize: 10.5, margin: 0, lineHeight: 1.5 }}>All leaderboard data is displayed using usernames only — no real names or personal data are shared. Rankings are based on simulated portfolio performance for educational purposes only. No real money is at risk.</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   LEARN
   ═══════════════════════════════════════════════════════════════════════ */

function Learn() {
  const [open, setOpen] = useState(null);
  const [openPath, setOpenPath] = useState(null);
  const [activeCourse, setActiveCourse] = useState(null);
  const [activeLesson, setActiveLesson] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [completedLessons, setCompletedLessons] = useState(new Set());
  const [courseScores, setCourseScores] = useState({});

  const paths = [
    { icon: "⚙️", title: "Beginner Investor", desc: "Start your investment journey from scratch", duration: "6-8 weeks", topics: ["ETF Basics", "Portfolio Construction Intro", "Risk Fundamentals"], color: C.teal },
    { icon: "📈", title: "Active Trader", desc: "Learn to analyze markets and make informed decisions", duration: "10-12 weeks", topics: ["Market Analysis", "Technical Indicators", "Risk Management"], color: C.accent },
    { icon: "💰", title: "Long-Term Investor", desc: "Build wealth through strategic asset allocation", duration: "8-10 weeks", topics: ["Portfolio Construction", "Rebalancing Strategies", "Tax Optimization"], color: C.green },
  ];

  const courseData = [
    { icon: "📖", title: "ETF Basics", desc: "Understanding Exchange-Traded Funds and how they work", level: "Beginner", lessons: [
      { title: "What is an ETF?", content: "An Exchange-Traded Fund (ETF) is a type of investment fund that trades on stock exchanges, much like stocks. ETFs hold assets such as stocks, commodities, bonds, or a mixture of investment types. They offer investors a way to pool their money in a fund that makes investments in stocks, bonds, or other assets and, in return, receive an interest in that investment pool.", quiz: { q: "What is an ETF primarily designed to do?", opts: ["Replace individual stocks entirely", "Pool investor money into a diversified basket of assets", "Guarantee returns above inflation", "Provide insurance against market crashes"], correct: 1 }},
      { title: "ETFs vs. Mutual Funds", content: "While both ETFs and mutual funds pool investor money, they differ in key ways. ETFs trade throughout the day like stocks at market prices, while mutual funds trade once daily at their net asset value (NAV). ETFs typically have lower expense ratios (0.03%-0.75%) compared to mutual funds (0.50%-1.50%). ETFs also offer tax efficiency through the in-kind creation/redemption mechanism.", quiz: { q: "What is a key advantage of ETFs over mutual funds?", opts: ["They always outperform mutual funds", "They can be traded throughout the day like stocks", "They are guaranteed by the government", "They never lose money"], correct: 1 }},
      { title: "Types of ETFs", content: "There are several major types of ETFs: Equity ETFs track stock indices or sectors (SPY, QQQ, XLK). Bond ETFs hold fixed income securities (BND, TLT, HYG). Commodity ETFs track raw materials like gold or oil (GLD, USO). Sector ETFs focus on specific industries (XLF for financials, XLE for energy). International ETFs provide exposure to foreign markets (EFA, VWO, KWEB).", quiz: { q: "Which ETF would give you exposure to the technology sector?", opts: ["BND (Vanguard Total Bond)", "XLK (Technology Select Sector)", "GLD (SPDR Gold Shares)", "VWO (Vanguard Emerging Markets)"], correct: 1 }},
      { title: "How ETF Pricing Works", content: "An ETF's market price is determined by supply and demand during trading hours. The NAV (Net Asset Value) represents the actual value of the underlying holdings. Authorized Participants (APs) keep the market price close to NAV through arbitrage — if the ETF trades above NAV, APs create new shares; if below, they redeem shares. This mechanism keeps ETF prices efficient.", quiz: { q: "What keeps an ETF's market price close to its NAV?", opts: ["Government regulation", "Arbitrage by Authorized Participants", "Automatic price adjustments by the exchange", "Daily rebalancing by the fund manager"], correct: 1 }},
      { title: "Understanding Expense Ratios", content: "The expense ratio is the annual cost of owning an ETF, expressed as a percentage of assets. Vanguard's VOO charges 0.03%, meaning $3 per year per $10,000 invested. Over 30 years on $100,000 growing at 8%, a 0.03% fund costs ~$2,700 in total fees vs. $58,000 for a 0.75% fund — a $55,000 difference from fees alone.", quiz: { q: "A $100,000 investment in a fund with 0.03% expense ratio costs how much per year in fees?", opts: ["$3", "$30", "$300", "$3,000"], correct: 1 }},
    ]},
    { icon: "🔧", title: "Portfolio Construction", desc: "Learn asset allocation and diversification strategies", level: "Intermediate", lessons: [
      { title: "Asset Allocation Basics", content: "Asset allocation is the process of dividing your investments among different asset categories — stocks, bonds, commodities, and cash. The classic 60/40 portfolio (60% stocks, 40% bonds) has been a cornerstone strategy. Your ideal allocation depends on your risk tolerance, time horizon, and financial goals. Younger investors typically hold more stocks; those nearing retirement shift toward bonds.", quiz: { q: "What does the classic 60/40 portfolio consist of?", opts: ["60% bonds, 40% stocks", "60% stocks, 40% cash", "60% stocks, 40% bonds", "60% real estate, 40% stocks"], correct: 2 }},
      { title: "Diversification Strategy", content: "Diversification means spreading investments across different assets to reduce risk. 'Don't put all your eggs in one basket.' Effective diversification goes beyond holding multiple stocks — you need assets that are uncorrelated. During the 2008 crisis, stocks and real estate fell together, but Treasury bonds and gold rose. True diversification means holding assets that behave differently in various market conditions.", quiz: { q: "What makes diversification truly effective?", opts: ["Owning many stocks in the same sector", "Holding assets that are uncorrelated with each other", "Investing only in the largest companies", "Putting equal amounts in every available ETF"], correct: 1 }},
      { title: "Rebalancing Your Portfolio", content: "Over time, your portfolio drifts from its target allocation as different assets grow at different rates. If stocks surge, your 60/40 portfolio might become 75/25. Rebalancing means selling winners and buying underperformers to restore your target. You can rebalance on a schedule (quarterly, annually) or when allocations drift beyond a threshold (e.g., 5% from target).", quiz: { q: "Why is portfolio rebalancing important?", opts: ["It guarantees higher returns", "It maintains your desired risk level", "It eliminates all investment risk", "It reduces your tax bill"], correct: 1 }},
      { title: "Core-Satellite Strategy", content: "The core-satellite approach uses a low-cost index fund (like VOO or VTI) as the 'core' (60-80% of portfolio) for broad market exposure, surrounded by 'satellite' positions (20-40%) in thematic ETFs or individual stocks for potential outperformance. This balances cost efficiency with the opportunity for alpha generation.", quiz: { q: "In a core-satellite strategy, what typically makes up the core?", opts: ["High-risk individual stocks", "A broad, low-cost index fund", "Cryptocurrency", "Cash and money market funds"], correct: 1 }},
    ]},
    { icon: "🛡️", title: "Risk Management", desc: "Understanding and managing investment risk", level: "Intermediate", lessons: [
      { title: "Standard Deviation & Volatility", content: "Standard deviation measures how much an investment's returns vary from its average. Higher standard deviation = more volatility = more risk. The S&P 500's annualized standard deviation is roughly 15-20%. Bitcoin's is closer to 60-80%. A portfolio's volatility can be reduced below any individual holding's volatility through proper diversification.", quiz: { q: "What does a higher standard deviation indicate about an investment?", opts: ["Higher guaranteed returns", "More price volatility and risk", "Better diversification", "Lower expense ratios"], correct: 1 }},
      { title: "The Sharpe Ratio", content: "The Sharpe Ratio measures return per unit of risk: (Portfolio Return - Risk-Free Rate) / Standard Deviation. A Sharpe above 1.0 is good, above 2.0 is excellent. The S&P 500 historically has a Sharpe of 0.4-0.6. By combining uncorrelated assets, you can achieve higher Sharpe ratios than any single asset alone.", quiz: { q: "A Sharpe Ratio of 2.0 is considered:", opts: ["Below average", "Average", "Good", "Excellent"], correct: 3 }},
      { title: "Maximum Drawdown", content: "Maximum drawdown measures the largest peak-to-trough decline in portfolio value. During 2008, the S&P 500 experienced a ~57% drawdown. During COVID (March 2020), it was ~34%. Understanding your portfolio's potential maximum drawdown helps you determine if you can emotionally handle the worst-case scenario before it happens.", quiz: { q: "Why is understanding maximum drawdown important?", opts: ["It predicts future returns", "It helps determine if you can emotionally handle worst-case losses", "It eliminates the possibility of losses", "It tells you exactly when to sell"], correct: 1 }},
    ]},
    { icon: "🔬", title: "Market Analysis", desc: "Technical and fundamental analysis techniques", level: "Advanced", lessons: [
      { title: "Fundamental Analysis: P/E Ratio", content: "The Price-to-Earnings (P/E) ratio is the most widely used valuation metric. It divides a company's stock price by its earnings per share. The S&P 500's historical average P/E is about 15-17x. Higher P/E suggests investors expect higher future growth. A P/E of 30x means investors pay $30 for every $1 of earnings — typical for growth companies like tech stocks.", quiz: { q: "If a stock has a P/E ratio of 30, what does that suggest?", opts: ["The stock is definitely overvalued", "Investors expect higher future growth", "The company has low debt", "The stock pays a high dividend"], correct: 1 }},
      { title: "EV/EBITDA Valuation", content: "Enterprise Value / EBITDA is a valuation metric preferred by professional investors because it's capital-structure neutral. EV includes market cap + debt - cash. EBITDA (Earnings Before Interest, Taxes, Depreciation, and Amortization) represents operating cash flow. A lower EV/EBITDA suggests cheaper valuation. Typical ranges: Tech 15-25x, Industrial 8-12x, Utilities 8-10x.", quiz: { q: "Why do professional investors prefer EV/EBITDA over P/E?", opts: ["It's simpler to calculate", "It accounts for a company's debt and cash position", "It always gives a lower number", "It only works for tech companies"], correct: 1 }},
      { title: "Moving Averages & Trends", content: "Moving averages smooth out price data to identify trends. The 50-day moving average (50 DMA) tracks short-term trends; the 200-day (200 DMA) tracks long-term trends. A 'Golden Cross' (50 DMA crossing above 200 DMA) is a bullish signal. A 'Death Cross' (50 DMA crossing below 200 DMA) is bearish. While not perfect, these signals provide valuable context for entry and exit timing.", quiz: { q: "What is a 'Golden Cross' in technical analysis?", opts: ["When a stock hits an all-time high", "When the 50-day moving average crosses above the 200-day moving average", "When trading volume doubles", "When the P/E ratio exceeds 50"], correct: 1 }},
      { title: "Economic Indicators", content: "Key indicators that move markets: GDP Growth (2-3% is healthy for the US), Unemployment Rate (below 4% is strong), CPI/Inflation (Fed targets 2%), Federal Funds Rate (the interest rate banks charge each other), and the Yield Curve (inverted yield curve has preceded every recession since 1970). Understanding these helps you position your portfolio for different economic environments.", quiz: { q: "An inverted yield curve has historically preceded what?", opts: ["A bull market", "A recession", "Rising stock prices", "Lower inflation"], correct: 1 }},
    ]},
  ];
  const levelColor = { Beginner: C.green, Intermediate: C.gold, Advanced: C.red };

  // Active course view
  if (activeCourse !== null) {
    const course = courseData[activeCourse];
    const lesson = course.lessons[activeLesson];
    const courseKey = `${activeCourse}-${activeLesson}`;
    const isComplete = completedLessons.has(courseKey);
    const progress = course.lessons.filter((_, i) => completedLessons.has(`${activeCourse}-${i}`)).length;
    return (
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "36px 20px" }}>
        <button onClick={() => { setActiveCourse(null); setActiveLesson(0); setQuizAnswer(null); setQuizSubmitted(false); }} style={{ background: "transparent", border: "none", color: C.accent, fontSize: 13, cursor: "pointer", marginBottom: 16, padding: 0, fontFamily: "inherit" }}>← Back to Courses</button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h1 style={{ color: C.text, fontSize: 22, margin: 0 }}>{course.icon} {course.title}</h1>
          <span style={{ ...badge(levelColor[course.level] || C.dim) }}>{course.level}</span>
        </div>
        <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>{course.lessons.map((_, i) => <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: completedLessons.has(`${activeCourse}-${i}`) ? C.green : i === activeLesson ? C.accent : C.border }} />)}</div>
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>{course.lessons.map((l, i) => <button key={i} onClick={() => { setActiveLesson(i); setQuizAnswer(null); setQuizSubmitted(false); }} style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${i === activeLesson ? C.accentBorder : C.border}`, background: completedLessons.has(`${activeCourse}-${i}`) ? "rgba(34,197,94,.1)" : i === activeLesson ? C.accentBg : "transparent", color: completedLessons.has(`${activeCourse}-${i}`) ? C.green : i === activeLesson ? C.accentLight : C.sub, fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>{completedLessons.has(`${activeCourse}-${i}`) ? "✓ " : ""}{i + 1}</button>)}</div>
        <div style={{ ...cardS(), marginBottom: 20 }}>
          <h2 style={{ color: C.text, fontSize: 18, margin: "0 0 14px" }}>Lesson {activeLesson + 1}: {lesson.title}</h2>
          <p style={{ color: C.sub, fontSize: 14, lineHeight: 1.75, margin: "0 0 20px" }}>{lesson.content}</p>
          {lesson.quiz && <div style={{ background: C.surface, border: `1px solid ${C.accentBorder}`, borderRadius: 8, padding: 18 }}>
            <div style={{ color: C.accent, fontSize: 10, fontFamily: mono, fontWeight: 700, letterSpacing: 0.5, marginBottom: 10 }}>QUIZ — TEST YOUR KNOWLEDGE</div>
            <p style={{ color: C.text, fontSize: 14, fontWeight: 600, margin: "0 0 14px" }}>{lesson.quiz.q}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {lesson.quiz.opts.map((opt, oi) => {
                const isCorrect = oi === lesson.quiz.correct;
                const isSelected = quizAnswer === oi;
                const bg = quizSubmitted ? (isCorrect ? "rgba(34,197,94,.12)" : isSelected ? "rgba(239,68,68,.1)" : "transparent") : isSelected ? C.accentBg : "transparent";
                const bdr = quizSubmitted ? (isCorrect ? "rgba(34,197,94,.4)" : isSelected ? "rgba(239,68,68,.3)" : C.border) : isSelected ? C.accentBorder : C.border;
                return <button key={oi} onClick={() => { if (!quizSubmitted) setQuizAnswer(oi); }} style={{ padding: "10px 14px", borderRadius: 6, border: `1px solid ${bdr}`, background: bg, color: quizSubmitted && isCorrect ? C.green : quizSubmitted && isSelected && !isCorrect ? C.red : C.text, fontSize: 13, cursor: quizSubmitted ? "default" : "pointer", textAlign: "left", fontFamily: "inherit", fontWeight: isSelected ? 600 : 400 }}>{String.fromCharCode(65 + oi)}) {opt} {quizSubmitted && isCorrect ? " ✓" : quizSubmitted && isSelected && !isCorrect ? " ✗" : ""}</button>;
              })}
            </div>
            {!quizSubmitted && quizAnswer !== null && <button onClick={() => { setQuizSubmitted(true); const key2 = `${activeCourse}-${activeLesson}`; setCompletedLessons(prev => new Set([...prev, key2])); const scoreKey = `course-${activeCourse}`; setCourseScores(prev => ({ ...prev, [scoreKey]: (prev[scoreKey] || 0) + (quizAnswer === lesson.quiz.correct ? 1 : 0) })); }} style={{ ...btnP(), marginTop: 12, fontSize: 13, padding: "10px 24px" }}>Submit Answer</button>}
            {quizSubmitted && <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 6, background: quizAnswer === lesson.quiz.correct ? "rgba(34,197,94,.08)" : "rgba(239,68,68,.06)", border: `1px solid ${quizAnswer === lesson.quiz.correct ? "rgba(34,197,94,.2)" : "rgba(239,68,68,.15)"}` }}>
              <span style={{ color: quizAnswer === lesson.quiz.correct ? C.green : C.red, fontWeight: 700, fontSize: 13 }}>{quizAnswer === lesson.quiz.correct ? "✓ Correct!" : "✗ Incorrect."}</span>
              <span style={{ color: C.sub, fontSize: 12, marginLeft: 8 }}>The answer is: {String.fromCharCode(65 + lesson.quiz.correct)}) {lesson.quiz.opts[lesson.quiz.correct]}</span>
            </div>}
          </div>}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <button disabled={activeLesson === 0} onClick={() => { setActiveLesson(prev => prev - 1); setQuizAnswer(null); setQuizSubmitted(false); }} style={{ ...btnP(), fontSize: 12, padding: "8px 20px", opacity: activeLesson === 0 ? 0.3 : 1, background: "transparent", color: C.sub, border: `1px solid ${C.border}` }}>← Previous</button>
          {activeLesson < course.lessons.length - 1 ? <button onClick={() => { setActiveLesson(prev => prev + 1); setQuizAnswer(null); setQuizSubmitted(false); }} style={{ ...btnP(), fontSize: 12, padding: "8px 20px" }}>Next Lesson →</button> : <button onClick={() => { setActiveCourse(null); setActiveLesson(0); setQuizAnswer(null); setQuizSubmitted(false); }} style={{ ...btnP(), fontSize: 12, padding: "8px 20px", background: C.green }}>🏅 Complete Course</button>}
        </div>
        <div style={{ marginTop: 16, color: C.dim, fontSize: 11, textAlign: "center" }}>Progress: {progress} / {course.lessons.length} lessons completed{courseScores[`course-${activeCourse}`] !== undefined ? ` · Score: ${courseScores[`course-${activeCourse}`]}/${progress}` : ""}</div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: 880, margin: "0 auto", padding: "36px 20px" }}>
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <span style={{ ...badge(C.accent), fontSize: 10.5, marginBottom: 10, display: "inline-block" }}>Free Educational Content</span>
        <h1 style={{ color: C.text, fontSize: 32, margin: "0 0 10px", fontWeight: 800 }}>Investment Education</h1>
        <p style={{ color: C.sub, fontSize: 15, maxWidth: 550, margin: "0 auto" }}>Master the fundamentals of ETF investing with interactive courses, quizzes, and real-world strategies.</p>
      </div>

      <div style={{ ...cardS(), marginBottom: 30, borderColor: C.accentBorder }}>
        <span style={{ ...badge(C.accent), fontSize: 10, marginBottom: 12, display: "inline-block" }}>Interactive Courses</span>
        <h2 style={{ color: C.text, fontSize: 24, margin: "0 0 8px", fontWeight: 700 }}>Complete ETF Investing Guide</h2>
        <p style={{ color: C.sub, fontSize: 14, lineHeight: 1.6, marginBottom: 14 }}>4 courses with real lessons, detailed content, and quiz questions to test your understanding. Perfect for beginners through advanced investors.</p>
        <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
          <span style={{ color: C.dim, fontSize: 12.5 }}>📖 {courseData.reduce((s, c) => s + c.lessons.length, 0)} interactive lessons</span>
          <span style={{ color: C.dim, fontSize: 12.5 }}>📝 Quiz after every lesson</span>
          <span style={{ color: C.dim, fontSize: 12.5 }}>🏅 Progress tracking</span>
        </div>
        <div style={{ ...cardS(), background: C.surface, textAlign: "center", padding: "20px" }}>
          <div style={{ color: C.accent, fontSize: 42, fontWeight: 800 }}>100%</div>
          <div style={{ color: C.dim, fontSize: 13 }}>Free Forever</div>
        </div>
      </div>

      <h2 style={{ color: C.text, fontSize: 22, margin: "0 0 16px", fontWeight: 700 }}>Learning Paths</h2>
      <div className="grid3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 36 }}>
        {paths.map((p, i) => (
          <div key={i} style={{ ...cardS(), borderColor: openPath === i ? p.color + "55" : C.border }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{p.icon}</div>
            <h3 style={{ color: p.color, fontSize: 18, margin: "0 0 4px", fontWeight: 700 }}>{p.title}</h3>
            <p style={{ color: C.sub, fontSize: 12.5, margin: "0 0 10px" }}>{p.desc}</p>
            <div style={{ color: C.dim, fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Duration: {p.duration}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 }}>
              {p.topics.map((t, j) => <span key={j} style={{ color: C.sub, fontSize: 12.5 }}>✓ {t}</span>)}
            </div>
            <button onClick={() => setOpenPath(openPath === i ? null : i)} style={{ width: "100%", ...btnP(), fontSize: 12, padding: "8px 14px", background: openPath === i ? C.accent : "transparent", color: openPath === i ? "#fff" : C.sub, border: `1px solid ${C.border}` }}>{openPath === i ? "Enrolled ✓" : "Start Path"}</button>
          </div>
        ))}
      </div>

      <h2 style={{ color: C.text, fontSize: 22, margin: "0 0 16px", fontWeight: 700 }}>All Courses</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 36 }}>
        {courseData.map((c, i) => {
          const completed = c.lessons.filter((_, j) => completedLessons.has(`${i}-${j}`)).length;
          return (
            <div key={i} style={{ ...cardS() }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 22 }}>{c.icon}</span>
                  <div>
                    <h3 style={{ color: C.text, fontSize: 17, margin: "0 0 2px", fontWeight: 700 }}>{c.title}</h3>
                    <p style={{ color: C.sub, fontSize: 12.5, margin: 0 }}>{c.desc}</p>
                  </div>
                </div>
                <span style={{ ...badge(levelColor[c.level] || C.dim), fontSize: 10 }}>{c.level}</span>
              </div>
              <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                <span style={{ color: C.dim, fontSize: 12 }}>{c.lessons.length} lessons</span>
                <span style={{ color: C.dim, fontSize: 12 }}>• Interactive quizzes</span>
                {completed > 0 && <span style={{ color: C.green, fontSize: 12, fontWeight: 600 }}>✓ {completed}/{c.lessons.length} done</span>}
              </div>
              {completed > 0 && <div style={{ display: "flex", gap: 3, marginBottom: 10 }}>{c.lessons.map((_, j) => <div key={j} style={{ flex: 1, height: 3, borderRadius: 2, background: completedLessons.has(`${i}-${j}`) ? C.green : C.border }} />)}</div>}
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: C.sub, fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Lessons:</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {c.lessons.map((l, j) => <span key={j} style={{ color: completedLessons.has(`${i}-${j}`) ? C.green : C.sub, fontSize: 12.5 }}>{completedLessons.has(`${i}-${j}`) ? "✓" : `${j + 1}.`} {l.title}</span>)}
                </div>
              </div>
              <button onClick={() => { setActiveCourse(i); setActiveLesson(completed < c.lessons.length ? completed : 0); setQuizAnswer(null); setQuizSubmitted(false); }} style={{ width: "100%", ...btnP(), fontSize: 13, padding: "10px" }}>{completed === c.lessons.length ? "✓ Review Course" : completed > 0 ? `Continue → Lesson ${completed + 1}` : "Start Course →"}</button>
            </div>
          );
        })}
      </div>

      <h2 style={{ color: C.text, fontSize: 22, margin: "0 0 16px", fontWeight: 700 }}>Quick Reads</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 30 }}>
        {LEARN_ARTICLES.map((a) => (
          <div key={a.id} onClick={() => setOpen(open === a.id ? null : a.id)} style={{ ...cardS(), cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", gap: 7, marginBottom: 5 }}><span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, fontWeight: 600, color: C.accent, background: C.accentBg, border: `1px solid ${C.accentBorder}` }}>{a.cat}</span><span style={{ fontSize: 10, color: C.dim, fontFamily: mono }}>{a.time}</span></div>
                <h3 style={{ color: C.text, fontSize: 15.5, margin: 0 }}>{a.title}</h3>
              </div>
              <span style={{ color: C.dim, fontSize: 13 }}>{open === a.id ? "▲" : "▼"}</span>
            </div>
            {open === a.id && <p style={{ color: C.sub, fontSize: 13.5, lineHeight: 1.65, marginTop: 12, marginBottom: 0 }}>{a.body}</p>}
          </div>
        ))}
      </div>

      <div style={{ ...cardS(), borderColor: C.accentBorder, textAlign: "center" }}>
        <p style={{ color: C.sub, fontSize: 13, lineHeight: 1.6 }}><strong style={{ color: C.text }}>Educational Content:</strong> All courses and materials are for educational purposes only and do not constitute financial advice. Always consult with qualified financial professionals before making investment decisions.</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   PRICING
   ═══════════════════════════════════════════════════════════════════════ */

function Pricing({ openAuth, user }) {
  return (
    <div className="page-container" style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 20px" }}>
      <div style={{ textAlign: "center", marginBottom: 36 }}><h1 style={{ color: C.text, fontSize: 30, margin: "0 0 6px" }}>Plans & Pricing</h1><p style={{ color: C.sub, fontSize: 14.5 }}>Start free. Upgrade when you are ready.</p></div>
      <div className="grid3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18, marginBottom: 44 }}>
        {PRICING_TIERS.map((t) => (
          <div key={t.name} style={{ ...cardS(), border: t.active ? `1px solid ${C.accent}` : `1px solid ${C.border}`, position: "relative", opacity: t.soon ? 0.55 : 1 }}>
            {t.active && <div style={{ position: "absolute", top: -1, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${C.accent},transparent)`, borderRadius: "10px 10px 0 0" }} />}
            {t.soon && <div style={{ position: "absolute", top: 14, right: 14, background: C.tealBg, border: "1px solid rgba(20,184,166,.25)", color: C.teal, fontSize: 9.5, padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>COMING SOON</div>}
            <h3 style={{ color: t.active ? C.accent : C.text, fontSize: 18, margin: "0 0 6px" }}>{t.name}</h3>
            <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginBottom: 20 }}><span style={{ color: C.text, fontSize: 38, fontWeight: 800 }}>{t.price}</span><span style={{ color: C.sub, fontSize: 13 }}>{t.period}</span></div>
            {t.features.map((f, i) => <div key={i} style={{ display: "flex", gap: 7, marginBottom: 8, fontSize: 13.5, color: C.sub }}><span style={{ color: t.active ? C.green : C.dim }}>{"✓"}</span>{f}</div>)}
            {t.active && !user && <button onClick={() => openAuth("signup")} style={{ ...btnP(), width: "100%", marginTop: 16, padding: "11px 0" }}>Get Started Free</button>}
            {t.active && user && <div style={{ marginTop: 16, textAlign: "center", color: C.green, fontSize: 13, fontWeight: 600 }}>{"✓"} Current Plan</div>}
          </div>
        ))}
      </div>

      {/* Revenue model context */}
      <div style={{ ...cardS(), marginBottom: 40, borderColor: C.accentBorder, textAlign: "center" }}>
        <h3 style={{ color: C.text, fontSize: 16, margin: "0 0 8px" }}>100% Free. No Catch.</h3>
        <p style={{ color: C.sub, fontSize: 13.5, lineHeight: 1.6, margin: 0, maxWidth: 600, marginLeft: "auto", marginRight: "auto" }}>
          ETF Simulator is completely free for everyone. We're building the best portfolio simulation platform in the world — and we believe great tools should be accessible to all investors, from beginners to pros. Our long-term vision is brokerage integration so you can go from simulated to real trading with one click.
        </p>
      </div>

      <h2 style={secHd()}>Roadmap</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {FUTURE_PRODUCTS.map((p) => {
          const statusColors = { "in-progress": C.green, planned: C.accent, future: C.dim };
          const statusLabels = { "in-progress": "IN PROGRESS", planned: "PLANNED", future: "FUTURE" };
          return (
          <div key={p.title} style={{ ...cardS(), display: "flex", gap: 14, opacity: p.status === "future" ? 0.7 : 1, position: "relative" }}>
            {p.status === "in-progress" && <div style={{ position: "absolute", top: -1, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${C.green},transparent)`, borderRadius: "10px 10px 0 0" }} />}
            <div style={{ fontSize: 28, lineHeight: 1 }}>{p.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <h4 style={{ color: C.text, fontSize: 14, margin: "0 0 4px" }}>{p.title}</h4>
                <span style={{ ...badge(statusColors[p.status] || C.dim), fontSize: 8.5, whiteSpace: "nowrap", flexShrink: 0 }}>{statusLabels[p.status] || p.status}</span>
              </div>
              <p style={{ color: C.sub, fontSize: 12.5, margin: "0 0 6px", lineHeight: 1.45 }}>{p.desc}</p>
              <span style={{ color: C.dim, fontSize: 11, fontFamily: mono }}>{p.eta}</span>
            </div>
          </div>);
        })}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════
   ROADMAP
   ═══════════════════════════════════════════════════════════════════════ */

function Roadmap({ go }) {
  return (
    <div className="page-container" style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px" }}>
      <h1 style={{ color: C.text, fontSize: 30, fontWeight: 800, marginBottom: 6 }}>Roadmap</h1>
      <p style={{ color: C.sub, fontSize: 14.5, marginBottom: 36 }}>Where we are and where we are headed.</p>

      <h2 style={secHd()}>Live Now</h2>
      <div className="grid4" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 44 }}>
        {[
          { icon: "\ud83e\udde0", t: "AI Portfolio Builder", d: "Describe any thesis. AI builds a 10-holding $1M ETF with institutional analysis." },
          { icon: "\ud83d\udcb9", t: "Live Market Data", d: "Real-time pricing from Finnhub across 10,000+ stocks, 64+ crypto, ETFs, and commodities." },
          { icon: "\ud83c\udfc6", t: "Community Leaderboard", d: "Publish portfolios, compete on returns, and share results to social media." },
          { icon: "\ud83d\udcc8", t: "Brokerage-Grade P&L", d: "Entry prices, share counts, cost basis, DRIP dividends, day change. Real math." },
          { icon: "\ud83d\udd04", t: "Weekly AI Rebalancing", d: "AI reviews your portfolio weekly with detailed rationale for every trade." },
          { icon: "\ud83d\udcac", t: "Community Chat", d: "24-hour ephemeral chat on the leaderboard. Share strategies and hot takes." },
        ].map(f => (
          <div key={f.t} style={cardS()}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{f.icon}</div>
            <h4 style={{ color: C.text, fontSize: 14, margin: "0 0 4px" }}>{f.t}</h4>
            <p style={{ color: C.sub, fontSize: 12.5, margin: 0, lineHeight: 1.45 }}>{f.d}</p>
          </div>
        ))}
      </div>

      <h2 style={secHd()}>Coming Next</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14, marginBottom: 44 }}>
        {FUTURE_PRODUCTS.map((p) => {
          const statusColors = { "in-progress": C.green, planned: C.accent, future: C.dim };
          const statusLabels = { "in-progress": "IN PROGRESS", planned: "PLANNED", future: "FUTURE" };
          return (
          <div key={p.title} style={{ ...cardS(), display: "flex", gap: 14, opacity: p.status === "future" ? 0.7 : 1, position: "relative" }}>
            {p.status === "in-progress" && <div style={{ position: "absolute", top: -1, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${C.green},transparent)`, borderRadius: "14px 14px 0 0" }} />}
            <div style={{ fontSize: 28, lineHeight: 1 }}>{p.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <h4 style={{ color: C.text, fontSize: 14, margin: "0 0 4px" }}>{p.title}</h4>
                <span style={{ ...badge(statusColors[p.status] || C.dim), fontSize: 8.5, whiteSpace: "nowrap", flexShrink: 0 }}>{statusLabels[p.status] || p.status}</span>
              </div>
              <p style={{ color: C.sub, fontSize: 12.5, margin: "0 0 6px", lineHeight: 1.45 }}>{p.desc}</p>
              <span style={{ color: C.dim, fontSize: 11, fontFamily: mono }}>{p.eta}</span>
            </div>
          </div>);
        })}
      </div>

      <div style={{ ...cardS(), textAlign: "center", borderColor: C.accentBorder }}>
        <h3 style={{ color: C.text, fontSize: 18, margin: "0 0 8px" }}>Our Vision</h3>
        <p style={{ color: C.sub, fontSize: 14, lineHeight: 1.6, maxWidth: 600, margin: "0 auto 16px" }}>
          We are building the future of personal investing. Describe what you believe in and AI handles the rest. Today it is a simulation. Tomorrow it is your real portfolio.
        </p>
        <button onClick={() => go("builder")} style={{ ...btnP(), padding: "12px 28px" }}>Build Your First ETF</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   LEGAL PAGES
   ═══════════════════════════════════════════════════════════════════════ */

function TermsOfService({ go }) {
  const s = { color: C.sub, fontSize: 13.5, lineHeight: 1.75, margin: "0 0 16px" };
  const h = { color: C.text, fontSize: 16, fontWeight: 700, margin: "24px 0 10px" };
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "36px 20px" }}>
      <button onClick={() => go("home")} style={{ background: "transparent", border: "none", color: C.accent, fontSize: 13, cursor: "pointer", marginBottom: 16, padding: 0, fontFamily: "inherit" }}>← Back to Home</button>
      <h1 style={{ color: C.text, fontSize: 28, margin: "0 0 6px" }}>Terms of Service</h1>
      <p style={{ color: C.dim, fontSize: 12, fontFamily: mono, marginBottom: 24 }}>Last updated: February 28, 2026</p>
      <p style={s}>Welcome to ETF Simulator ("Platform", "Service", "we", "us", "our"). By accessing or using our website at etfsimulator.com or any associated services, you ("User", "you", "your") agree to be bound by these Terms of Service. If you do not agree, do not use the Platform.</p>
      <h3 style={h}>1. Acceptance of Terms</h3>
      <p style={s}>By creating an account, accessing, or using the Platform, you confirm that you are at least 18 years old and legally capable of entering into binding agreements. You agree to comply with these Terms and all applicable laws and regulations.</p>
      <h3 style={h}>2. Platform Description</h3>
      <p style={s}>ETF Simulator is a simulated, educational platform that allows users to create hypothetical investment portfolios using AI-generated recommendations. No real money is invested, traded, or at risk. All portfolio values, returns, and market data are simulated and hypothetical. The Platform is designed solely for educational and informational purposes.</p>
      <h3 style={h}>3. User Accounts</h3>
      <p style={s}>You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate information during registration. We reserve the right to suspend or terminate accounts that violate these Terms.</p>
      <h3 style={h}>4. User Content & Data</h3>
      <p style={s}>By using the Platform, you grant ETF Simulator a worldwide, non-exclusive, royalty-free, perpetual, irrevocable license to use, reproduce, modify, adapt, publish, distribute, display, and create derivative works from any content you submit, including but not limited to portfolio data, investment theses, account information, and usage data. This license survives termination of your account. We may use aggregated, anonymized user data for analytics, research, marketing, product improvement, and any other lawful business purpose. You acknowledge that your portfolio strategies, investment theses, and platform interactions may be analyzed, published, or shared in aggregated or anonymized form.</p>
      <h3 style={h}>5. Intellectual Property</h3>
      <p style={s}>All content, features, functionality, code, design, algorithms, AI models, course materials, and data on the Platform are owned by ETF Simulator and protected by copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, modify, or create derivative works without our express written consent.</p>
      <h3 style={h}>6. Not Financial Advice</h3>
      <p style={s}>Nothing on this Platform constitutes financial advice, investment advice, trading advice, or any professional advice. AI-generated portfolios are algorithmic outputs for educational illustration only. You should consult a qualified financial advisor before making any investment decisions. We are not a registered investment advisor, broker-dealer, or financial planner.</p>
      <h3 style={h}>7. Limitation of Liability</h3>
      <p style={s}>TO THE MAXIMUM EXTENT PERMITTED BY LAW, ETF SIMULATOR AND ITS OWNERS, OPERATORS, OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING FROM: (a) YOUR USE OF OR INABILITY TO USE THE PLATFORM; (b) ANY DECISIONS MADE BASED ON INFORMATION PROVIDED BY THE PLATFORM; (c) UNAUTHORIZED ACCESS TO YOUR ACCOUNT; (d) ANY ERRORS, INACCURACIES, OR OMISSIONS IN THE PLATFORM'S CONTENT; (e) ANY THIRD-PARTY ACTIONS OR CONTENT. OUR TOTAL LIABILITY SHALL NOT EXCEED $0 (ZERO DOLLARS) AS THIS IS A FREE EDUCATIONAL PLATFORM.</p>
      <h3 style={h}>8. Disclaimer of Warranties</h3>
      <p style={s}>THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS.</p>
      <h3 style={h}>9. Indemnification</h3>
      <p style={s}>You agree to indemnify, defend, and hold harmless ETF Simulator and its affiliates from any claims, damages, losses, or expenses (including legal fees) arising from your use of the Platform, violation of these Terms, or infringement of any rights of a third party.</p>
      <h3 style={h}>10. Usage Limits</h3>
      <p style={s}>Free tier users are limited to 5 AI portfolio generations per day without an account, or 25 per day with a free account, and 5 saved portfolios. We reserve the right to modify usage limits, features, and pricing at any time without notice.</p>
      <h3 style={h}>11. Governing Law</h3>
      <p style={s}>These Terms shall be governed by the laws of the State of Delaware, United States, without regard to conflict of law provisions. Any disputes shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association.</p>
      <h3 style={h}>12. Changes to Terms</h3>
      <p style={s}>We reserve the right to modify these Terms at any time. Continued use of the Platform after changes constitutes acceptance. We will make reasonable efforts to notify users of material changes.</p>
      <h3 style={h}>13. Contact</h3>
      <p style={s}>For questions about these Terms, contact us at support@etfsimulator.com.</p>
    </div>
  );
}

function PrivacyPolicy({ go }) {
  const s = { color: C.sub, fontSize: 13.5, lineHeight: 1.75, margin: "0 0 16px" };
  const h = { color: C.text, fontSize: 16, fontWeight: 700, margin: "24px 0 10px" };
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "36px 20px" }}>
      <button onClick={() => go("home")} style={{ background: "transparent", border: "none", color: C.accent, fontSize: 13, cursor: "pointer", marginBottom: 16, padding: 0, fontFamily: "inherit" }}>← Back to Home</button>
      <h1 style={{ color: C.text, fontSize: 28, margin: "0 0 6px" }}>Privacy Policy</h1>
      <p style={{ color: C.dim, fontSize: 12, fontFamily: mono, marginBottom: 24 }}>Last updated: February 28, 2026</p>
      <h3 style={h}>1. Information We Collect</h3>
      <p style={s}><strong style={{ color: C.text }}>Account Data:</strong> Name, email address, and password hash when you create an account. <strong style={{ color: C.text }}>Portfolio Data:</strong> Investment theses, portfolio configurations, holdings, and all data you input into the Platform. <strong style={{ color: C.text }}>Usage Data:</strong> Pages visited, features used, generation frequency, session duration, device information, IP address, browser type, and interaction patterns. <strong style={{ color: C.text }}>Cookies & Analytics:</strong> We use cookies and similar technologies to track usage and improve the Platform.</p>
      <h3 style={h}>2. How We Use Your Data</h3>
      <p style={s}>We use your information to: provide and maintain the Platform; improve and personalize your experience; analyze usage patterns and platform performance; generate aggregated analytics and research insights; develop new features and services; communicate with you about the Platform; enforce our Terms of Service; comply with legal obligations. We may use aggregated, anonymized data derived from your usage for any business purpose, including but not limited to research, marketing, publications, and product development.</p>
      <h3 style={h}>3. Data Sharing</h3>
      <p style={s}>We may share your data with: service providers who help operate the Platform (e.g., Supabase for database, Vercel for hosting, xAI for AI generation); analytics partners; law enforcement when required by law; in connection with a merger, acquisition, or sale of assets. Public portfolios you publish to the Leaderboard are visible to all users. We may share aggregated, anonymized data with third parties for any purpose.</p>
      <h3 style={h}>4. Data Ownership & License</h3>
      <p style={s}>By using the Platform, you grant us a perpetual, irrevocable, worldwide, royalty-free license to use, store, process, analyze, and derive insights from all data you provide. This includes the right to use your data in aggregated or anonymized form for research, publications, marketing, and business intelligence. You retain ownership of the factual content of your investment theses, but grant us full rights to the portfolio configurations, interaction data, and derived analytics.</p>
      <h3 style={h}>5. Data Retention</h3>
      <p style={s}>We retain your data for as long as your account is active and for a reasonable period thereafter. Aggregated or anonymized data may be retained indefinitely. You may request deletion of your account by contacting support@etfsimulator.com, though we may retain certain data as required by law or for legitimate business purposes.</p>
      <h3 style={h}>6. Security</h3>
      <p style={s}>We implement reasonable security measures to protect your data, including encryption in transit and at rest. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.</p>
      <h3 style={h}>7. Children's Privacy</h3>
      <p style={s}>The Platform is not intended for users under 18. We do not knowingly collect data from minors.</p>
      <h3 style={h}>8. Changes</h3>
      <p style={s}>We may update this Privacy Policy at any time. Continued use constitutes acceptance.</p>
      <h3 style={h}>9. Contact</h3>
      <p style={s}>Privacy questions: support@etfsimulator.com</p>
    </div>
  );
}

function Disclaimer({ go }) {
  const s = { color: C.sub, fontSize: 13.5, lineHeight: 1.75, margin: "0 0 16px" };
  const h = { color: C.text, fontSize: 16, fontWeight: 700, margin: "24px 0 10px" };
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "36px 20px" }}>
      <button onClick={() => go("home")} style={{ background: "transparent", border: "none", color: C.accent, fontSize: 13, cursor: "pointer", marginBottom: 16, padding: 0, fontFamily: "inherit" }}>← Back to Home</button>
      <h1 style={{ color: C.text, fontSize: 28, margin: "0 0 6px" }}>Disclaimer</h1>
      <p style={{ color: C.dim, fontSize: 12, fontFamily: mono, marginBottom: 24 }}>Last updated: February 28, 2026</p>
      <h3 style={h}>Educational Purpose Only</h3>
      <p style={s}>ETF Simulator is a simulated, educational platform designed to help users learn about portfolio construction, diversification, risk management, and investment strategies. No real money is invested, traded, or at risk at any time. All portfolio values, returns, performance metrics, and market data displayed on this platform are simulated and hypothetical.</p>
      <h3 style={h}>Not Financial Advice</h3>
      <p style={s}>Nothing on this platform constitutes financial advice, investment advice, trading advice, or any other form of professional advice. ETF Simulator does not recommend any specific securities, asset classes, or investment strategies. The AI-generated portfolios are algorithmic outputs for educational illustration only and should not be interpreted as personalized investment recommendations. ETF Simulator is not a registered investment advisor, broker-dealer, financial planner, or fiduciary.</p>
      <h3 style={h}>No Guarantee of Accuracy</h3>
      <p style={s}>While we strive for accuracy, simulated market data, asset prices, performance calculations, financial metrics, and AI-generated content may contain errors, inaccuracies, or outdated information. The AI system may generate incorrect financial data, misrepresent company fundamentals, or provide analysis that does not reflect current market conditions. Users should independently verify all information.</p>
      <h3 style={h}>No Liability for Investment Decisions</h3>
      <p style={s}>ETF Simulator accepts no liability whatsoever for any investment decisions made by users, whether or not such decisions were influenced by the Platform's content. If you choose to invest real money based on strategies explored on this Platform, you do so entirely at your own risk. Any losses incurred are solely your responsibility.</p>
      <h3 style={h}>Third-Party Data</h3>
      <p style={s}>Market data is provided by third-party APIs (Finnhub, Grok-3 / xAI) and may be delayed, inaccurate, or incomplete. We do not guarantee the accuracy, timeliness, or completeness of any third-party data.</p>
      <h3 style={h}>Consult a Professional</h3>
      <p style={s}>Before making any actual investment decisions, consult a qualified, licensed financial advisor, tax professional, or legal counsel who can evaluate your individual financial situation, risk tolerance, and investment objectives.</p>
      <h3 style={h}>No Fiduciary Relationship</h3>
      <p style={s}>Use of ETF Simulator does not create a fiduciary, advisory, or professional relationship between you and ETF Simulator or its operators. You are solely responsible for your own investment decisions.</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   FAQ
   ═══════════════════════════════════════════════════════════════════════ */

function FAQ({ go }) {
  const [open, setOpen] = useState(null);
  const faqs = [
    { q: "What is ETF Simulator?", a: "ETF Simulator is a free educational platform that lets you build AI-powered investment portfolios using $1M in simulated capital. Describe any investment thesis — from tech trends to pop culture themes — and our AI constructs a professional 10-holding portfolio with detailed financial analysis. No real money is at risk." },
    { q: "Is real money involved?", a: "No. ETF Simulator is entirely simulated. No real money is invested, traded, or at risk at any time. All portfolio values, returns, and market data are hypothetical. This is an educational tool designed to help you learn about portfolio construction and investing." },
    { q: "How does the AI build my portfolio?", a: "When you submit an investment thesis, our AI (Grok-3 (xAI) powered by Grok-3) analyzes your idea and constructs a diversified 10-holding portfolio across stocks, ETFs, crypto, and commodities. It provides financial metrics (market cap, revenue, EV/EBITDA), a thesis connection explaining why each pick relates to your idea, risk analysis, and macro commentary." },
    { q: "How many portfolios can I create per day?", a: "Guest users (not signed in) can generate up to 5 AI portfolios per day. Signed-in users get 25 generations per day. This limit resets at midnight. You can save up to 5 portfolios to your account. The upcoming Pro tier will offer unlimited generations and saved portfolios." },
    { q: "Can I customize the AI's portfolio?", a: "Yes! After the AI generates your portfolio, you can edit the ETF name and ticker, adjust individual holding weights, remove holdings, replace them with AI-suggested alternatives, sell positions to cash, or even short holdings you think will decline." },
    { q: "What is the Leaderboard?", a: "The Leaderboard ranks published portfolios by simulated return. When you save a portfolio, you can choose to publish it publicly. Your portfolio will then appear on the Leaderboard where other users can see your thesis and performance. It's a fun way to compete and learn from other investors." },
    { q: "Is the market data real?", a: "Yes. The ticker bar shows live index and commodity prices via Finnhub. Portfolio holdings are priced using real-time quotes from Finnhub (stocks/ETFs) and Binance/CoinGecko (crypto), updated every 15-30 seconds during market hours. The prices are real — only the trading is simulated. This is not a live trading platform and no real money is involved." },
    { q: "Are the courses really free?", a: "Yes, all educational content is 100% free. We offer interactive courses on ETF basics, portfolio construction, risk management, and market analysis — each with quiz questions to test your understanding. No credit card required." },
    { q: "Is my data secure?", a: "Your account data is stored securely in Supabase (PostgreSQL) with encryption. We use industry-standard authentication practices. Please review our Privacy Policy for full details on data collection and usage." },
    { q: "How do I contact support?", a: "Email us at support@etfsimulator.com for any questions, feedback, or issues. We typically respond within 24-48 hours." },
  ];
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "36px 20px" }}>
      <button onClick={() => go("home")} style={{ background: "transparent", border: "none", color: C.accent, fontSize: 13, cursor: "pointer", marginBottom: 16, padding: 0, fontFamily: "inherit" }}>← Back to Home</button>
      <h1 style={{ color: C.text, fontSize: 28, margin: "0 0 6px" }}>Frequently Asked Questions</h1>
      <p style={{ color: C.sub, fontSize: 14, margin: "0 0 28px" }}>Everything you need to know about ETF Simulator.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {faqs.map((f, i) => (
          <div key={i} onClick={() => setOpen(open === i ? null : i)} style={{ ...cardS(), cursor: "pointer", borderColor: open === i ? C.accentBorder : C.border }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ color: C.text, fontSize: 15, margin: 0, fontWeight: 600 }}>{f.q}</h3>
              <span style={{ color: C.dim, fontSize: 16, minWidth: 20, textAlign: "right" }}>{open === i ? "−" : "+"}</span>
            </div>
            {open === i && <p style={{ color: C.sub, fontSize: 13.5, lineHeight: 1.7, marginTop: 12, marginBottom: 0 }}>{f.a}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ABOUT US
   ═══════════════════════════════════════════════════════════════════════ */

function About({ go }) {
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "36px 20px" }}>
      <button onClick={() => go("home")} style={{ background: "transparent", border: "none", color: C.accent, fontSize: 13, cursor: "pointer", marginBottom: 16, padding: 0, fontFamily: "inherit" }}>← Back to Home</button>
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <h1 style={{ color: C.text, fontSize: 32, margin: "0 0 10px", fontWeight: 800 }}>About ETF Simulator</h1>
        <p style={{ color: C.sub, fontSize: 15, maxWidth: 550, margin: "0 auto", lineHeight: 1.7 }}>Democratizing investment education through AI-powered portfolio simulation.</p>
      </div>
      <div style={{ ...cardS(), marginBottom: 20 }}>
        <h3 style={{ color: C.accent, fontSize: 18, margin: "0 0 12px", fontWeight: 700 }}>Our Mission</h3>
        <p style={{ color: C.sub, fontSize: 14, lineHeight: 1.75, margin: 0 }}>ETF Simulator was built with a simple belief: everyone deserves access to institutional-quality investment tools, not just the fat cats on Wall Street. We're here to level the playing field. Our AI-powered platform lets anyone — from curious beginners to seasoned investors — build, test, and learn from professional-grade portfolio strategies without risking a single dollar. We believe that by making investment education fun, interactive, and accessible, we can help a new generation of investors make smarter decisions with their real money.</p>
      </div>
      <div style={{ ...cardS(), marginBottom: 20 }}>
        <h3 style={{ color: C.accent, fontSize: 18, margin: "0 0 12px", fontWeight: 700 }}>What We Do</h3>
        <p style={{ color: C.sub, fontSize: 14, lineHeight: 1.75, margin: 0 }}>We combine cutting-edge AI with real financial data to create the most realistic portfolio simulation platform available. Describe any investment thesis — from "AI & semiconductors" to "companies referenced in last week's Simpsons episode" — and our AI constructs a fully realized, 10-holding portfolio with institutional-grade analysis. Every portfolio includes detailed financial metrics, risk modeling, macro analysis, and specific rationale for each holding. It's the Bloomberg Terminal experience, but for everyone.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
        {[
          { icon: "🎯", title: "Education First", desc: "Every feature is designed to teach you something about investing" },
          { icon: "🤖", title: "AI-Powered", desc: "Grok-3 (xAI) builds portfolios with institutional-quality analysis" },
          { icon: "🆓", title: "Free Forever", desc: "Core platform is and always will be free for everyone" },
        ].map((v, i) => (
          <div key={i} style={{ ...cardS(), textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{v.icon}</div>
            <h4 style={{ color: C.text, fontSize: 14, margin: "0 0 6px", fontWeight: 700 }}>{v.title}</h4>
            <p style={{ color: C.sub, fontSize: 12, margin: 0, lineHeight: 1.5 }}>{v.desc}</p>
          </div>
        ))}
      </div>
      <div style={{ ...cardS(), borderColor: C.accentBorder }}>
        <h3 style={{ color: C.accent, fontSize: 18, margin: "0 0 12px", fontWeight: 700 }}>Built for the Future</h3>
        <p style={{ color: C.sub, fontSize: 14, lineHeight: 1.75, margin: 0 }}>ETF Simulator is just getting started. We're building toward a future where anyone can create, manage, and compete with custom ETF strategies — and eventually connect to real brokerages to bring simulated strategies to life. Check out our Roadmap to see what's coming next.</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   CONTACT US
   ═══════════════════════════════════════════════════════════════════════ */

function Contact({ go }) {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState("");
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const sendMessage = async () => {
    if (!form.name || !form.email || !form.message) return;
    setSending(true);
    setSendErr("");
    // 1. Send via serverless API (emails via Resend)
    let apiSuccess = false;
    try {
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await r.json();
      if (data.success) {
        apiSuccess = true;
        console.log("[Contact] ✓ Sent via API:", data.provider);
      } else {
        console.warn("[Contact] API error:", data.error);
      }
    } catch (e) {
      console.warn("[Contact] API unavailable:", e.message);
    }
    // 2. Also save to Supabase contact_messages (backup/audit trail)
    try {
      await supabase.from("contact_messages").insert({ name: form.name, email: form.email, subject: form.subject || "General", message: form.message, created_at: new Date().toISOString() });
      console.log("[Contact] ✓ Saved to Supabase");
    } catch (e) { console.warn("[Contact] DB save failed:", e.message); }
    // 3. Fallback: if API failed, open mailto as backup
    if (!apiSuccess) {
      const subjectLine = `[ETF Simulator] ${form.subject || "Contact Form"} — from ${form.name}`;
      const body = `From: ${form.name} (${form.email})\nSubject: ${form.subject || "General"}\n\n${form.message}\n\n---\nSent via etfsimulator.com contact form`;
      const mailtoUrl = `mailto:support@etfsimulator.com?subject=${encodeURIComponent(subjectLine)}&body=${encodeURIComponent(body)}`;
      window.open(mailtoUrl, "_blank");
    }
    setSending(false);
    setSent(true);
  };
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "36px 20px" }}>
      <button onClick={() => go("home")} style={{ background: "transparent", border: "none", color: C.accent, fontSize: 13, cursor: "pointer", marginBottom: 16, padding: 0, fontFamily: "inherit" }}>← Back to Home</button>
      <h1 style={{ color: C.text, fontSize: 28, margin: "0 0 6px" }}>Contact Us</h1>
      <p style={{ color: C.sub, fontSize: 14, margin: "0 0 28px" }}>Have a question, feedback, or want to report an issue? We'd love to hear from you.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 30 }}>
        <div style={{ ...cardS() }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📧</div>
          <h3 style={{ color: C.text, fontSize: 16, margin: "0 0 6px", fontWeight: 700 }}>Email</h3>
          <p style={{ color: C.accent, fontSize: 14, margin: 0 }}><a href="mailto:support@etfsimulator.com" style={{ color: C.accent, textDecoration: "none" }}>support@etfsimulator.com</a></p>
          <p style={{ color: C.dim, fontSize: 12, marginTop: 6 }}>We respond within 24-48 hours</p>
        </div>
        <div style={{ ...cardS(), cursor: "pointer" }} onClick={() => go("leaderboard")}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
          <h3 style={{ color: C.text, fontSize: 16, margin: "0 0 6px", fontWeight: 700 }}>Community Chat</h3>
          <p style={{ color: C.sub, fontSize: 14, margin: 0 }}>Live 24-hour conversation on the Leaderboard</p>
          <p style={{ color: C.dim, fontSize: 12, marginTop: 6 }}>Share strategies, debate picks, and compete → <span style={{ color: C.accent }}>Go to Leaderboard</span></p>
        </div>
      </div>
      <div style={{ ...cardS() }}>
        <h3 style={{ color: C.text, fontSize: 18, margin: "0 0 16px", fontWeight: 700 }}>Send a Message</h3>
        {sent ? (
          <div style={{ textAlign: "center", padding: "30px 20px" }}>
            <div style={{ fontSize: 42, marginBottom: 10 }}>✉️</div>
            <h3 style={{ color: C.green, fontSize: 18, margin: "0 0 8px" }}>Message Sent!</h3>
            <p style={{ color: C.sub, fontSize: 13.5 }}>Thank you for reaching out. We'll get back to you at <span style={{ color: C.accent }}>{form.email}</span> within 24-48 hours.</p>
            <button onClick={() => { setSent(false); setForm({ name: "", email: "", subject: "", message: "" }); }} style={{ ...btnP(), marginTop: 14, fontSize: 12, padding: "8px 20px", background: "transparent", color: C.sub, border: `1px solid ${C.border}` }}>Send Another</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <input placeholder="Your Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: "10px 12px", borderRadius: 6, fontSize: 13, fontFamily: "inherit", outline: "none" }} />
              <input placeholder="Email Address" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: "10px 12px", borderRadius: 6, fontSize: 13, fontFamily: "inherit", outline: "none" }} />
            </div>
            <select value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} style={{ background: C.bg, border: `1px solid ${C.border}`, color: form.subject ? C.text : C.dim, padding: "10px 12px", borderRadius: 6, fontSize: 13, fontFamily: "inherit", outline: "none", appearance: "auto" }}>
              <option value="">Select a topic...</option>
              <option value="bug">Bug Report</option>
              <option value="feature">Feature Request</option>
              <option value="account">Account Issue</option>
              <option value="feedback">General Feedback</option>
              <option value="partnership">Partnership Inquiry</option>
              <option value="other">Other</option>
            </select>
            <textarea placeholder="Your message..." rows={5} value={form.message} onChange={e => setForm({...form, message: e.target.value})} style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: "10px 12px", borderRadius: 6, fontSize: 13, fontFamily: "inherit", outline: "none", resize: "vertical" }} />
            <button onClick={sendMessage} disabled={!form.name || !form.email || !form.message || sending} style={{ ...btnP(), fontSize: 13, padding: "12px", opacity: !form.name || !form.email || !form.message || sending ? 0.4 : 1 }}>{sending ? "Sending..." : "Send Message →"}</button>
            {sendErr && <p style={{ color: C.red, fontSize: 12, margin: "6px 0 0" }}>{sendErr}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   APP ROOT
   ═══════════════════════════════════════════════════════════════════════ */

export default function AppWithBoundary() {
  return React.createElement(ErrorBoundary, null, React.createElement(AppInner, null));
}

function AppInner() {
  const validPages = ["home","builder","portfolios","leaderboard","learn","roadmap","pricing","terms","privacy","disclaimer","faq","about","contact"];
  const getHashPage = () => { const h = window.location.hash.replace("#",""); if (h.includes("access_token") || h.includes("type=recovery") || h.includes("error_description")) return "home"; if (h.startsWith("portfolio/")) return "leaderboard"; return validPages.includes(h) ? h : "home"; };
  // Extract portfolio ID from hash if deep-linking
  const getHashPortfolioId = () => { const h = window.location.hash.replace("#",""); return h.startsWith("portfolio/") ? h.split("/")[1] : null; };
  const [page, setPageState] = useState(getHashPage); const [deepLinkedPortfolioId, setDeepLinkedPortfolioId] = useState(getHashPortfolioId); const [user, setUser] = useState(null); const [authMode, setAuthMode] = useState(null); const [portfolios, setPortfolios] = useState([]); const [publicPortfolios, setPublicPortfolios] = useState([]);
  const [isDark, setIsDark] = useState(true);
  // Apply theme as a side effect when isDark changes — not inside the state updater
  useEffect(() => { setTheme(isDark); }, [isDark]);
  const toggleTheme = useCallback(() => { setIsDark(d => !d); }, []);
  const setPage = useCallback((p) => { setPageState(p); const currentHash = window.location.hash; if (!currentHash.includes("access_token") && !currentHash.includes("type=recovery")) { window.location.hash = p === "home" ? "" : p; } window.scrollTo(0, 0); }, []);
  // Navigate directly to a specific portfolio (sets hash + triggers auto-open in Leaderboard)
  const openPortfolioLink = useCallback((portfolioId) => { setDeepLinkedPortfolioId(portfolioId); setPageState("leaderboard"); window.location.hash = `portfolio/${portfolioId}`; window.scrollTo(0, 0); }, []);
  useEffect(() => { const onHash = () => setPageState(getHashPage()); window.addEventListener("hashchange", onHash); return () => window.removeEventListener("hashchange", onHash); }, []);

  // ══════ PASSWORD RECOVERY DETECTION ══════
  // Supabase v2 can use implicit flow (tokens in hash) or PKCE flow (code in query).
  // We detect BOTH on mount so the auth handler knows to show the reset form.
  const isRecoveryRef = useRef(false);
  useEffect(() => {
    const hash = window.location.hash || "";
    const search = window.location.search || "";
    const hashHasRecovery = hash.includes("type=recovery");
    const urlHasCode = new URLSearchParams(search).has("code");
    if (hashHasRecovery) {
      // Implicit flow: type=recovery is definitive
      console.log("[Auth] Recovery detected in URL hash");
      isRecoveryRef.current = true;
      const checkSession = async () => {
        await new Promise(r => setTimeout(r, 1500));
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          console.log("[Auth] Recovery session ready — showing reset form");
          setAuthMode("resetPassword");
        } else {
          await new Promise(r => setTimeout(r, 2500));
          const { data: d2 } = await supabase.auth.getSession();
          if (d2.session) setAuthMode("resetPassword");
          else console.error("[Auth] Could not establish recovery session");
        }
        if (window.history.replaceState) window.history.replaceState(null, "", window.location.pathname);
      };
      checkSession();
    } else if (urlHasCode) {
      // PKCE flow: code could be recovery OR email confirmation — rely on PASSWORD_RECOVERY event
      console.log("[Auth] PKCE code detected in URL — waiting for Supabase to identify flow type");
      // Clean URL after Supabase processes it
      setTimeout(() => {
        if (window.history.replaceState) window.history.replaceState(null, "", window.location.pathname);
      }, 3000);
    }
  }, []);

  // Supabase auth listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[Auth] onAuthStateChange event:", event, "session:", session ? "YES" : "NO");
      // ── PASSWORD_RECOVERY event (explicit from Supabase) ──
      if (event === "PASSWORD_RECOVERY") {
        console.log("[Auth] PASSWORD_RECOVERY event — opening reset form");
        isRecoveryRef.current = true;
        setAuthMode("resetPassword");
        // Still set user so updateUser works
        if (session?.user) {
          const u = session.user;
          setUser({ name: u.user_metadata?.name || u.email?.split("@")[0] || "User", username: sanitizeUsername(u.user_metadata?.username || u.email?.split("@")[0]), email: u.email, id: u.id, usernameEdited: !!u.user_metadata?.usernameEdited });
        }
        return;
      }
      // ── During recovery: set user but DON'T load portfolios ──
      if (isRecoveryRef.current && (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED")) {
        console.log("[Auth] Recovery mode — setting user but skipping portfolio load (event:", event + ")");
        if (session?.user) {
          const u = session.user;
          setUser({ name: u.user_metadata?.name || u.email?.split("@")[0] || "User", username: sanitizeUsername(u.user_metadata?.username || u.email?.split("@")[0]), email: u.email, id: u.id, usernameEdited: !!u.user_metadata?.usernameEdited });
        }
        return;
      }
      // ── USER_UPDATED event after password change: recovery complete ──
      if (event === "USER_UPDATED" && isRecoveryRef.current) {
        console.log("[Auth] Password updated — recovery complete, loading portfolios");
        isRecoveryRef.current = false;
      }
      if (session?.user) {
        const u = session.user;
        const userName = u.user_metadata?.name || u.email?.split("@")[0] || "User";
        const uname = u.user_metadata?.username || userName;
        console.log("[Auth] ✓ Authenticated:", u.email, "uid:", u.id, "username:", uname);
        setUser({ name: userName, username: uname, email: u.email, id: u.id, usernameEdited: !!u.user_metadata?.usernameEdited });
        // Load user's portfolios from Supabase with retry
        const loadPortfolios = async (attempt = 1) => {
          try {
            const { data, error } = await supabase.from("portfolios").select("*").eq("user_id", u.id).order("created_at", { ascending: false });
            if (error) throw error;
            console.log("[Auth] Loaded portfolios:", data?.length || 0);
            if (data && data.length > 0) {
              let cleaned = data.map(row => {
                const pd = row.portfolio_data || {};
                // Sanitize holdings: strip any livePrice/liveValue that violates price caps
                // This kills stale ghost prices (e.g. FET=$1.23) persisted in Supabase
                const rawHoldings = Array.isArray(pd.holdings) ? pd.holdings : (Array.isArray(row.holdings) ? row.holdings : []);
                const sanitizedHoldings = rawHoldings.map(h => {
                  // Seed lastGoodPrice from entryPrice on load (always refresh)
                  if (h.entryPrice && h.entryPrice > 0) {
                    lastGoodPrice[h.symbol] = h.entryPrice;
                  }
                  // Crypto: strip DB livePrice AND reset liveValue to originalAllocation
                  if (h.type === "crypto") {
                    const resetAlloc = h.originalAllocation || h.allocation || 0;
                    return { ...h, livePrice: null, liveValue: resetAlloc, dailyChange: 0 };
                  }
                  // Stocks: validate and keep, or fall back to entryPrice
                  if (h.livePrice && !validateQuotePrice(h.symbol, h.livePrice, h.type)) {
                    console.warn(`[Load] Stripping stale livePrice for ${h.symbol}: $${h.livePrice}`);
                    return { ...h, livePrice: h.entryPrice || null, liveValue: h.originalAllocation || h.allocation };
                  }
                  return h;
                });
                return {
                  ...pd,
                  id: row.id, dbId: row.id, isPublic: row.is_public,
                  name: pd.name || row.name || "Unnamed Portfolio",
                  holdings: sanitizedHoldings,
                  value: pd.value || row.value || 1000000,
                  fee: pd.fee || row.fee || 0,
                  thesis: pd.thesis || row.thesis || "",
                  originalPrompt: pd.originalPrompt || pd.thesis || row.thesis || "",
                  strategy: pd.strategy || row.strategy || "",
                  ticker: pd.ticker || row.ticker || "",
                  riskProfile: pd.riskProfile || row.risk_profile || "",
                  transactions: Array.isArray(pd.transactions) ? pd.transactions : [],
                  navHistory: Array.isArray(pd.navHistory) ? pd.navHistory : [],
                  trackingData: Array.isArray(pd.trackingData) ? pd.trackingData : [],
                  cashBalance: pd.cashBalance || pd.cashPosition?.amount || 0,
                  createdAt: pd.createdAt || row.created_at || new Date().toISOString(),
                };
              }).filter(p => p.holdings.length > 0); // Only show portfolios that have holdings
              setPortfolios(cleaned);
              // ══════ LEGACY PORTFOLIO MIGRATION ══════
              // Portfolios created before the real price engine won't have entryPrice/shares.
              // Fetch current prices and set them so P&L tracking works from this point forward.
              const needsMigration = cleaned.some(p => (p.holdings || []).some(h => !h.entryPrice || !h.shares));
              if (needsMigration) {
                console.log("[Migration] Detected legacy portfolios without entry prices. Migrating...");
                const allHoldings = cleaned.flatMap(p => p.holdings || []);
                fetchRealQuotes(allHoldings).then(quotes => {
                  const quoteCount = Object.keys(quotes).length;
                  console.log("[Migration] Fetched", quoteCount, "quotes for migration");
                  if (quoteCount === 0) return; // No quotes available, skip migration
                  const migrated = cleaned.map(p => {
                    const migratedHoldings = (p.holdings || []).map(h => {
                      if (h.entryPrice && h.shares) return h; // Already has brokerage data
                      const q = quotes[h.symbol];
                      if (!q) return h; // No quote for this symbol
                      const entryPrice = q.price;
                      const shares = h.allocation / entryPrice;
                      console.log(`[Migration] ${h.symbol}: entry=${entryPrice}, shares=${shares.toFixed(6)}, alloc=${h.allocation}`);
                      return {
                        ...h,
                        entryPrice: Math.round(entryPrice * 10000) / 10000,
                        shares: Math.round(shares * 100000000) / 100000000,
                        entryDate: p.createdAt || new Date().toISOString(),
                        livePrice: entryPrice,
                        liveValue: h.allocation,
                        originalAllocation: h.allocation, // Lock in cost basis
                      };
                    });
                    // Also build initial transactions if missing
                    const hasTx = Array.isArray(p.transactions) && p.transactions.length > 0;
                    const migratedTx = hasTx ? p.transactions : migratedHoldings.filter(h => h.entryPrice).map((h, i) => ({
                      type: h.action === "SHORT" ? "SHORT" : "BUY",
                      symbol: h.symbol, name: h.name, amount: h.allocation,
                      ts: new Date(p.createdAt || Date.now()).getTime(),
                      orderId: `ORD-MIGRATED-${String(i + 1).padStart(3, "0")}`,
                      executionTime: p.createdAt || new Date().toISOString(),
                      pricePerShare: h.entryPrice, shares: h.shares,
                      commission: 0, orderType: "MARKET", status: "FILLED",
                      weight: h.weight, assetType: h.type,
                      reason: `Initial portfolio construction — ${h.weight}% allocation ($${h.allocation.toLocaleString()}) at ${fmtPrice(h.entryPrice)}/share`,
                    }));
                    const migratedCash = p.cashBalance || p.cashPosition?.amount || 0;
                    const migratedValue = migratedHoldings.reduce((s, h) => s + (h.liveValue || h.allocation), 0) + migratedCash;
                    return { ...p, holdings: migratedHoldings, transactions: migratedTx, value: Math.round(migratedValue) };
                  });
                  setPortfolios(migrated);
                  // Persist migration to Supabase in background
                  migrated.forEach(async (p) => {
                    if (!p.dbId) return;
                    try {
                      const pd = { ...(p.portfolio_data || p), holdings: p.holdings, transactions: p.transactions };
                      await supabase.from("portfolios").update({ portfolio_data: pd, holdings: p.holdings }).eq("id", p.dbId);
                      console.log("[Migration] ✓ Persisted migration for", p.name);
                    } catch (e) { console.warn("[Migration] Could not persist:", e.message); }
                  });
                });
              }

              // ══════ ONE-TIME REPAIR: Restore entry prices from transaction log ══════
              // A prior migration accidentally overwrote original entry prices with current prices.
              // The transaction log still has the correct pricePerShare from initial portfolio construction.
              // This reads transactions and restores the original entry prices, then persists to Supabase.
              const needsRepair = cleaned.some(p => {
                const txs = p.transactions || [];
                const initialBuys = txs.filter(t => t.orderId && t.orderId.includes("ORD-") && (t.type === "BUY" || t.type === "SHORT") && t.pricePerShare > 0);
                if (initialBuys.length === 0) return false;
                // Check if any holding's entry price differs significantly from its original transaction price
                return (p.holdings || []).some(h => {
                  const tx = initialBuys.find(t => t.symbol === h.symbol);
                  if (!tx || !tx.pricePerShare || !h.entryPrice) return false;
                  const diff = Math.abs(h.entryPrice - tx.pricePerShare) / tx.pricePerShare;
                  return diff > 0.02; // >2% divergence means entry was corrupted
                });
              });
              if (needsRepair) {
                console.log("[Repair] Detected corrupted entry prices, restoring from transaction log...");
                const repaired = cleaned.map(p => {
                  const txs = p.transactions || [];
                  const initialBuys = txs.filter(t => t.orderId && t.orderId.includes("ORD-") && (t.type === "BUY" || t.type === "SHORT") && t.pricePerShare > 0);
                  if (initialBuys.length === 0) return p;
                  let changed = false;
                  const fixedHoldings = (p.holdings || []).map(h => {
                    const tx = initialBuys.find(t => t.symbol === h.symbol);
                    if (!tx || !tx.pricePerShare || !h.entryPrice) return h;
                    const diff = Math.abs(h.entryPrice - tx.pricePerShare) / tx.pricePerShare;
                    if (diff <= 0.02) return h; // Entry price is fine
                    // Restore original entry price and recalculate shares from original allocation
                    const origEntry = Math.round(tx.pricePerShare * 10000) / 10000;
                    const origAlloc = h.originalAllocation || tx.amount || h.allocation;
                    const origShares = tx.shares > 0 ? tx.shares : (origAlloc / origEntry);
                    console.log("[Repair] " + p.name + ": " + h.symbol + " entry $" + h.entryPrice + " → $" + origEntry + " (from tx), shares " + h.shares + " → " + origShares.toFixed(4));
                    changed = true;
                    return { ...h, entryPrice: origEntry, shares: Math.round(origShares * 100000000) / 100000000, originalAllocation: origAlloc };
                  });
                  if (!changed) return p;
                  return { ...p, holdings: fixedHoldings, _repaired: true };
                });
                cleaned = repaired;
                setPortfolios(repaired);
                // Persist repairs to Supabase
                repaired.filter(p => p._repaired).forEach(async (p) => {
                  if (!p.dbId) return;
                  try {
                    const pd = { ...(p.portfolio_data || p), holdings: p.holdings };
                    await supabase.from("portfolios").update({ portfolio_data: pd, holdings: p.holdings }).eq("id", p.dbId);
                    console.log("[Repair] ✓ Restored entry prices for", p.name);
                  } catch (e) { console.warn("[Repair] Could not persist:", e.message); }
                });
              }
            } else {
              setPortfolios([]);
            }
          } catch (err) {
            console.error("[Auth] ✗ Portfolio load failed (attempt " + attempt + "):", err.message);
            if (attempt < 3) {
              console.log("[Auth] Retrying in 2s...");
              setTimeout(() => loadPortfolios(attempt + 1), 2000);
            } else {
              setPortfolios([]);
            }
          }
        };
        loadPortfolios();
      } else {
        console.log("[Auth] No session — user logged out or not authenticated");
        setUser(null); setPortfolios([]);
      }
    });
    // Load public portfolios for leaderboard
    supabase.from("portfolios").select("*").eq("is_public", true).order("created_at", { ascending: false }).limit(50)
      .then(({ data, error }) => {
        if (error) console.error("[DB] ✗ Failed to load public portfolios:", error.message);
        else console.log("[DB] ✓ Connected to Supabase. Public portfolios loaded:", data?.length || 0);
        if (data) setPublicPortfolios(data.map(row => { const pd = row.portfolio_data || {}; const cash = pd.cashBalance || pd.cashPosition?.amount || 0; let h = Array.isArray(pd.holdings) ? pd.holdings : (Array.isArray(row.holdings) ? row.holdings : []); 
        // Inline RNDR→LINK swap: replace any RNDR/RENDER holding with LINK
        h = h.map(hh => { if (hh.symbol === "RNDR" || hh.symbol === "RENDER") { const origAlloc = hh.originalAllocation || hh.allocation || 0; return { ...hh, symbol: "LINK", name: "Chainlink", type: "crypto", originalAllocation: origAlloc, description: "Decentralized oracle network.", rationale: "Replaced RNDR with LINK due to ticker pricing issues." }; } return hh; });
        // Inline AJRD→LHX swap: Aerojet Rocketdyne was acquired by L3Harris (2023), delisted
        h = h.map(hh => { if (hh.symbol === "AJRD") { const origAlloc = hh.originalAllocation || hh.allocation || 0; return { ...hh, symbol: "LHX", name: "L3Harris Technologies", type: "stock", originalAllocation: origAlloc, description: "Aerospace & defense systems integrator — and the company that acquired Aerojet Rocketdyne.", rationale: "Replaced AJRD with LHX: Aerojet Rocketdyne was delisted after L3Harris acquisition (2023)." }; } return hh; });
        // On load: always strip livePrice for crypto — fetch fresh from CoinGecko/Binance
        // DB livePrice for crypto is unreliable (bad feeds get persisted). entryPrice+shares = truth.
        // For stocks: keep DB livePrice as initial display value (markets have hours, Finnhub reliable)
        h = h.map(hh => {
          // Seed lastGoodPrice from entryPrice so relative check works on cold start
          if (hh.entryPrice && hh.entryPrice > 0) {
            lastGoodPrice[hh.symbol] = hh.entryPrice; // always seed/refresh from entryPrice
          }
          // Crypto: strip DB livePrice AND reset liveValue to originalAllocation
          // P&L = 0% until fresh price arrives. Bad liveValue from DB causes fake P&L.
          if (hh.type === "crypto") {
            const resetAlloc = hh.originalAllocation || hh.allocation || 0;
            return { ...hh, livePrice: null, liveValue: resetAlloc, dailyChange: 0 };
          }
          // Stocks: validate and keep, or fall back to entryPrice
          if (hh.livePrice && !validateQuotePrice(hh.symbol, hh.livePrice, hh.type)) {
            console.warn(`[LB Load] Stripping stale livePrice for ${hh.symbol}: $${hh.livePrice}`);
            return { ...hh, livePrice: hh.entryPrice || null, liveValue: hh.originalAllocation || hh.allocation };
          }
          return hh;
        });
        // Cost basis = SEED_CAPITAL ($1M) always — every portfolio starts with $1,000,000
        const cb = 1000000;
        // Initial display value: always use liveValue when positive (reflects last saved live price),
        // otherwise fall back to originalAllocation. Simpler and correct — avoids discarding 0%-gain portfolios.
        const holdingsVal = h.reduce((s, hh) => s + (hh.liveValue > 0 ? hh.liveValue : (hh.originalAllocation || hh.allocation || 0)), 0);
        const val = holdingsVal > 0 ? (holdingsVal + cash) : 1000000;
        return { ...pd, id: row.id, isPublic: true, creator: sanitizeUsername(pd.creator) || "Anonymous", value: val, costBasis: cb, gain: cb > 0 ? Math.round(((val - cb) / cb) * 10000) / 100 : 0, fee: pd.fee || row.fee || 0, holdingCount: h.length, holdings: h, thesis: pd.thesis || pd.strategy || row.thesis || "", originalPrompt: pd.originalPrompt || pd.thesis || row.thesis || "", transactions: Array.isArray(pd.transactions) ? pd.transactions : [], cashBalance: cash }; }));
      });
    return () => subscription.unsubscribe();
  }, []);


  // ══════ LIVE PRICING ENGINE — PUBLIC PORTFOLIOS (Leaderboard) ══════
  // Fetches real quotes for ALL holdings across ALL public portfolios.
  // Persists results to Supabase so values survive page refresh.
  const pubRef = useRef([]);
  pubRef.current = publicPortfolios;
  const pubUpdateThrottle = useRef(0);
  const [lbLoading, setLbLoading] = useState(true);
  const lbRuns = useRef(0);
  const [lbLastUpdate, setLbLastUpdate] = useState(null);

  useEffect(() => {
    if (publicPortfolios.length === 0) { setLbLoading(false); return; }
    let dead = false;

    const pricePubs = async () => {
      if (dead) return;
      if (Date.now() - pubUpdateThrottle.current < 60000) return;
      const pubs = pubRef.current;
      if (!pubs.length) return;

      const holdingMap = {};
      pubs.forEach(p => (p.holdings || []).forEach(h => {
        if (h.symbol && !holdingMap[h.symbol]) holdingMap[h.symbol] = h;
      }));
      const symbols = Object.values(holdingMap);
      if (symbols.length === 0) return;
      console.log("[LB-Engine] Pricing", symbols.length, "symbols across", pubs.length, "portfolios");

      // Fetch with retry (3 attempts)
      let quotes;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          quotes = await fetchRealQuotes(symbols);
          if (Object.keys(quotes || {}).length > 0) break;
          console.warn("[LB-Engine] Attempt", attempt, ": 0 quotes, retrying...");
          if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * attempt));
        } catch (e) {
          console.error("[LB-Engine] Attempt", attempt, "failed:", e.message);
          if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * attempt));
        }
      }
      if (dead) return;
      if (!quotes || Object.keys(quotes).length === 0) { console.warn("[LB-Engine] No quotes — market may be closed. Showing last known values."); setLbLoading(false); setLbLastUpdate(Date.now()); return; }
      const qCount = Object.keys(quotes).length;

      const recalculated = pubs.map(p => {
        const holdings = p.holdings || [];
        if (holdings.length === 0) return p;
        let liveTotal = 0, pricedCount = 0;

        const newHoldings = holdings.map(h => {
          let q = quotes[h.symbol]; // let — reassigned to lastGoodPrice fallback when needed
          // No quote — preserve last known liveValue
          if (!q || !q.price || q.price <= 0) { liveTotal += h.liveValue || h.originalAllocation || h.allocation || 0; return h; }
          // Validate quote price — reject stale ghosts (too high) or bad feeds (>90% drop vs last-good)
          const validatedPrice = validateQuotePrice(h.symbol, q.price, h.type);
          if (!validatedPrice) {
            const fallback = lastGoodPrice[h.symbol];
            if (fallback && fallback > 0) {
              console.warn(`[LB-Engine] Using lastGoodPrice $${fallback} for ${h.symbol} (rejected $${q.price})`);
              q = { ...q, price: fallback };
            } else {
              liveTotal += h.liveValue || h.originalAllocation || h.allocation || 0;
              return h;
            }
          }
          // Cross-validate crypto: if Binance price diverges >40% from CoinGecko, use CoinGecko
          // Run async in background — don't block the pricing loop, update next cycle
          if (h.type === "crypto" && q.price > 0) {
            const sym = h.symbol;
            const currentPrice = q.price;
            crossValidateCryptoPrice(sym, currentPrice).then(validated => {
              if (validated !== currentPrice) lastGoodPrice[sym] = validated;
            }).catch(() => {});
          }
          pricedCount++;
          const isShort = h.action === "SHORT";
          let holdingVal, shares, entryP;

          if (h.shares > 0 && h.entryPrice > 0) {
            // ✅ Full brokerage data stored — compute accurately
            shares = h.shares; entryP = h.entryPrice;
            // SHORT: use originalAllocation as anchor to avoid entryPrice*shares floating-point drift
            const shortBase = h.originalAllocation || h.allocation || entryP * shares;
            holdingVal = isShort ? shortBase + (entryP - q.price) * shares : shares * q.price;
          } else {
            // ⚠ No entry data — use originalAllocation as cost baseline, scale by today's price movement
            // We can't compute historical return without entry price, so preserve last liveValue if available
            const lastKnown = h.liveValue || h.originalAllocation || h.allocation || 0;
            if (lastKnown <= 0) { liveTotal += 0; return { ...h, livePrice: q.price }; }
            // Scale last known value by today's price move only
            const baseline = q.prevClose || q.price;
            const todayReturn = baseline > 0 ? q.price / baseline : 1;
            holdingVal = lastKnown * todayReturn;
            entryP = h.entryPrice || q.prevClose || q.price;
            shares = h.shares || (lastKnown / entryP);
          }
          const boughtToday = h.entryDate && new Date(h.entryDate).toDateString() === new Date().toDateString();
          const baseline = boughtToday ? (entryP || q.prevClose) : (q.prevClose || entryP);
          const dayChg = baseline > 0 ? ((q.price - baseline) / baseline) * 100 : 0;
          liveTotal += holdingVal;
          // Live Fund inception lock: if no entryPrice set yet (null in DB), use today's
          // real market price as the cost basis → P&L starts at exactly 0.00%
          const needsInceptionLock = !h.entryPrice; // Fire for ANY portfolio — locks entry at today's real market price, P&L starts at 0%
          const lockedOrigAlloc = needsInceptionLock ? Math.round(holdingVal) : (h.originalAllocation || h.allocation);
          const lockedEntryP = needsInceptionLock ? q.price : entryP;
          const lockedShares = needsInceptionLock ? (q.price > 0 ? Math.round((lockedOrigAlloc / q.price) * 100000000) / 100000000 : shares) : shares;
          return { ...h, shares: lockedShares, entryPrice: lockedEntryP, originalAllocation: lockedOrigAlloc, livePrice: q.price, liveValue: Math.round(holdingVal), dailyChange: isFinite(dayChg) ? dayChg : 0 };
        });
        if (pricedCount === 0) return p;
        // ══════ EXPENSE RATIO DEDUCTION ══════
        // Real ETFs accrue fees daily against NAV. We simulate monthly (every 15 real min).
        const SIM_MONTH_MS = 900000;
        const fee = p.fee || 0;
        let finalHoldings = newHoldings;
        let feeTx = null;
        const lastFeeTs = p._lastFeeTs || p.createdAt ? new Date(p.createdAt).getTime() : 0;
        if (fee > 0 && liveTotal > 0 && (Date.now() - (p._lastFeeTs || 0)) > SIM_MONTH_MS) {
          const monthlyRate = (fee / 100) / 12;
          const deduction = Math.round(liveTotal * monthlyRate);
          if (deduction > 0) {
            // Deduct proportionally across all holdings
            finalHoldings = finalHoldings.map(h => {
              const share = (h.liveValue || 0) / liveTotal;
              return { ...h, liveValue: Math.max(0, Math.round((h.liveValue || 0) - deduction * share)) };
            });
            liveTotal = finalHoldings.reduce((s, h) => s + (h.liveValue || 0), 0);
            feeTx = { type: "FEE", symbol: "EXPENSE", amount: deduction, ts: Date.now(),
              reason: `Monthly fund expense (${fee}% annual ÷ 12 = ${((fee/100)/12*100).toFixed(4)}%/mo). Deducted ${deduction.toLocaleString("en-US", {style:"currency",currency:"USD"})} proportionally across holdings.` };
          }
        }

        // ══════ DIVIDEND DRIP ══════
        // Check each holding for dividend due. Reinvest as additional shares.
        const divTxs = [];
        finalHoldings = finalHoldings.map(h => {
          const divData = DIVIDEND_DATA[h.symbol];
          if (!divData || !h.shares || !h.livePrice) return h;
          const lastDiv = h._lastDivTs || 0;
          const periodsPerYear = divData.freq >= 12 ? 12 : divData.freq >= 4 ? 4 : divData.freq >= 2 ? 2 : 1;
          const simFreqMs = SIM_MONTH_MS * (12 / periodsPerYear);
          if (lastDiv === 0 || (Date.now() - lastDiv) < simFreqMs) return h;
          const annualDivPerShare = h.livePrice * divData.yield;
          const divPerShare = annualDivPerShare / periodsPerYear;
          const totalDiv = divPerShare * h.shares;
          if (totalDiv <= 0) return h;
          const newShares = totalDiv / h.livePrice;
          divTxs.push({ type: "DIVIDEND", symbol: h.symbol, name: h.name, amount: Math.round(totalDiv),
            ts: Date.now(), orderId: `DIV-${h.symbol}-${Date.now().toString(36).toUpperCase()}`,
            orderType: "DRIP", status: "REINVESTED",
            reason: `Dividend DRIP: $${divPerShare.toFixed(4)}/share × ${h.shares.toFixed(4)} shares = $${totalDiv.toFixed(2)} → +${newShares.toFixed(6)} shares at $${h.livePrice.toFixed(2)}` });
          const updatedShares = Math.round((h.shares + newShares) * 1e8) / 1e8;
          const updatedVal = Math.round(updatedShares * h.livePrice);
          return { ...h, shares: updatedShares, liveValue: updatedVal, _lastDivTs: Date.now() };
        });
        liveTotal = finalHoldings.reduce((s, h) => s + (h.liveValue || 0), 0);

        // ══════ SECOND PASS: Update currentWeight based on live values ══════
        // Like Fidelity/Schwab: weight = holdingValue / totalPortfolioValue. Updated every cycle.
        {
          const totalForWeight = liveTotal + (p.cashBalance || 0);
          finalHoldings = finalHoldings.map(h => ({
            ...h,
            currentWeight: totalForWeight > 0
              ? Math.round((h.liveValue || 0) / totalForWeight * 1000) / 10
              : (h.currentWeight || h.weight || 0),
          }));
        }

        // ══════ CASH INTEREST (4.5% APY) ══════
        let cash = p.cashBalance || 0;
        if (cash > 0 && (Date.now() - (p._lastInterestTs || 0)) > 30000) {
          cash = cash * (1 + DAILY_MM_RATE);
        }

        // ══════ NAV HISTORY SNAPSHOT ══════
        const navHistory = [...(p.navHistory || [])];
        const lastSnap = navHistory[navHistory.length - 1];
        const snapNAV = Math.round(liveTotal + cash);
        if (!lastSnap || (Date.now() - lastSnap.ts) > 15000) {
          navHistory.push({ ts: Date.now(), nav: snapNAV, cash: Math.round(cash) });
          if (navHistory.length > 500) navHistory.splice(0, navHistory.length - 500);
        }

        // ══════ TRANSACTION LOG ══════
        const newTxs = [...(feeTx ? [feeTx] : []), ...divTxs];
        const transactions = newTxs.length > 0
          ? [...(p.transactions || []), ...newTxs].slice(-100)
          : (p.transactions || []);

        // Cost basis: actual funded amount = original allocations + initial cash
        const SEED = 1000000;
        const holdingsCb = finalHoldings.reduce((s, h) => s + (h.originalAllocation || h.allocation || 0), 0);
        const initialCash = p.initialCashBalance || p.cashBalance || 0;
        const trueCb = holdingsCb + initialCash;
        const cb = trueCb > SEED * 0.5 && trueCb < SEED * 1.2 ? SEED : (p.costBasis || SEED);
        const totalVal2 = Math.round(liveTotal + cash);
        const gain = Math.round(((totalVal2 - cb) / cb) * 10000) / 100;
        return { ...p, holdings: finalHoldings, value: totalVal2, gain, costBasis: cb,
                 cashBalance: Math.round(cash), navHistory, transactions,
                 _lastFeeTs: feeTx ? Date.now() : (p._lastFeeTs || 0),
                 _lastInterestTs: Date.now() };
      });

      if (!dead) {
        const changed = recalculated.filter((r, i) => r.value !== pubs[i]?.value).length;
        lbRuns.current++;
        console.log("[LB-Engine] ✓ Run #" + lbRuns.current + ":", qCount, "quotes,", changed, "changed");
        pubUpdateThrottle.current = Date.now();
        setPublicPortfolios(recalculated);
        setLbLoading(false);
        setLbLastUpdate(Date.now());

        // ══════ PERSIST TO SUPABASE ══════
        // Save live values to DB so they survive page refresh.
        // Requires SUPABASE_SERVICE_ROLE_KEY in Vercel env vars.
        if (lbRuns.current <= 2 || lbRuns.current % 4 === 0) {
          // Persist on first 2 runs, then every 4th run (~every 2 min)
          const toUpdate = recalculated.filter(r => r.id && r.holdings?.length > 0).map(p => ({
            id: p.id, value: p.value, gain: p.gain, costBasis: p.costBasis,
            holdings: (p.holdings || []).map(h => {
              // Never persist a livePrice that is >95% below entryPrice — always a feed error
              const safeLivePrice = (h.livePrice && h.entryPrice && h.livePrice < h.entryPrice * 0.05)
                ? h.entryPrice  // reset to entryPrice rather than persist garbage
                : h.livePrice;
              if (safeLivePrice !== h.livePrice && h.livePrice) {
                console.warn(`[LB-Persist] ⚠ Blocking bad livePrice for ${h.symbol}: $${h.livePrice} vs entry $${h.entryPrice} — saving entryPrice instead`);
              }
              return ({
              symbol: h.symbol, name: h.name, type: h.type, weight: h.weight,
              allocation: h.allocation, action: h.action, conviction: h.conviction,
              role: h.role, sector: h.sector, description: h.description || "",
              rationale: h.rationale, thesisConnection: h.thesisConnection || "",
              exitTrigger: h.exitTrigger || "", financialMetrics: h.financialMetrics || {},
              priceTarget: h.priceTarget || "", stopLoss: h.stopLoss || "",
              entryPrice: h.entryPrice, shares: h.shares, entryDate: h.entryDate,
              livePrice: h.type === "crypto" ? null : safeLivePrice, // never persist crypto livePrice — always fetch fresh
              liveValue: h.liveValue,
              originalAllocation: h.originalAllocation || h.allocation,
              targetWeight: h.targetWeight || h.weight, currentWeight: h.currentWeight || h.weight,
              dailyChange: h.dailyChange, lastDividendTs: h.lastDividendTs,
            }); }),
          }));
          if (toUpdate.length > 0) {
            fetch("/api/update-leaderboard", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ updates: toUpdate }),
            }).then(r => r.json()).then(d => {
              if (d.error === "no_service_key") {
                if (lbRuns.current <= 1) console.warn("[LB-Engine] ⚠ Add SUPABASE_SERVICE_ROLE_KEY to Vercel env vars to persist live values across page refreshes");
              } else if (d.updated > 0) {
                console.log("[LB-Engine] ✓ Persisted", d.updated, "portfolios to DB");
              }
            }).catch(() => { /* non-critical */ });
          }
        }
      }
    };

    // Rate-limit-safe schedule: initial run after 1s, then every 60s.
    // 26 portfolios × ~196 symbols on Finnhub free tier (55 req/min) — 15s intervals caused cascading rate-limit failures.
    const t1 = setTimeout(() => { if (!dead) pricePubs(); }, 1000);
    const iv = setInterval(() => { if (!dead) pricePubs(); }, 60000);
    return () => { dead = true; clearTimeout(t1); clearInterval(iv); };
  }, [publicPortfolios.length]);

  const openAuth = (m) => setAuthMode(m);
  const doAuth = (u) => {
    console.log("[Auth] doAuth called for:", u.email);
    setUser(u);
    setAuthMode(null);
  };
  const signOut = async () => { await supabase.auth.signOut(); setUser(null); setPortfolios([]); setPage("home"); };
  // Update display username — persists to Supabase auth metadata
  const updateUsername = async (newName) => {
    if (!user || !newName || newName.length < 2) return false;
    const clean = newName.replace(/[^a-zA-Z0-9!@#$%&*_\-+=]/g, "").slice(0, 20);
    // Check if user already used their one-time edit
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const meta = sessionData?.session?.user?.user_metadata || {};
      if (meta.usernameEdited) { alert("Username can only be changed once. Your edit has already been used."); return false; }
    } catch (e) { /* proceed if check fails */ }
    // Check uniqueness against profiles table
    try {
      const { data: profilesRes } = await supabase.from("profiles").select("name").neq("id", user.id);
      const taken = new Set((profilesRes || []).map(r => (r.name || "").toLowerCase()));
      if (taken.has(clean.toLowerCase())) { alert("That username is already taken. Please choose another."); return false; }
    } catch (e) { /* profiles table may not exist — allow it */ }
    try {
      await supabase.auth.updateUser({ data: { username: clean, name: clean, usernameEdited: true } });
      try { await supabase.from("profiles").upsert({ id: user.id, name: clean }, { onConflict: "id" }); } catch (e) { /* profiles table may not exist */ }
      setUser(prev => ({ ...prev, username: clean, name: clean, usernameEdited: true }));
      console.log("[Username] ✓ Updated to:", clean, "(one-time edit used)");
      return true;
    } catch (e) { console.error("[Username] Failed:", e.message); return false; }
  };
  const savePortfolio = async (p, isPublic) => {
    console.log("[Save] === START === Portfolio:", p?.name, "Public:", isPublic);
    if (portfolios.length >= 5) return "Free tier: max 5 saved portfolios. Delete one or upgrade to Pro for unlimited.";
    if (!user?.id) return "Please sign in to save your portfolio.";

    // Wrap entire save in a 15-second timeout so it never hangs forever
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), 15000));

    try {
      const saveWork = async () => {
        // Step 1: Quick session check (local only, no network call)
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;
        if (!session) {
          console.error("[Save] ✗ No session found");
          return "No active login session. Please sign out, sign back in, and try again.";
        }
        const uid = session.user.id;
        console.log("[Save] ✓ Session OK, uid:", uid);

        // Step 2: Prepare data
        const holdingsClean = (p.holdings || []).map(h => ({
          symbol: h.symbol, name: h.name, description: h.description || "", type: h.type,
          weight: h.weight, allocation: h.allocation, role: h.role, sector: h.sector,
          action: h.action, conviction: h.conviction, rationale: h.rationale,
          thesisConnection: h.thesisConnection || "", exitTrigger: h.exitTrigger || "",
          financialMetrics: h.financialMetrics || {},
          priceTarget: h.priceTarget || "", stopLoss: h.stopLoss || "",
          // BROKERAGE FIELDS — critical for P&L calculation on reload
          entryPrice: h.entryPrice ?? null,
          shares: h.shares ?? null,
          entryDate: h.entryDate ?? null,
          livePrice: h.livePrice ?? h.entryPrice ?? null,
          liveValue: h.liveValue ?? h.allocation,
          originalAllocation: h.originalAllocation ?? h.allocation, // COST BASIS — never changes
          targetWeight: h.targetWeight || h.weight,
          currentWeight: h.currentWeight || h.weight,
          lastDividendTs: h.lastDividendTs || null, // Tracks when last dividend was paid — prevents double-payment on reload
        }));
        const portfolioData = {
          name: p.name, ticker: p.ticker, strategy: p.strategy, riskProfile: p.riskProfile || p.userRiskProfile,
          targetReturn: p.targetReturn, benchmark: p.benchmark, fee: p.fee, value: p.value || 1000000,
          thesis: p.thesis, originalPrompt: p.originalPrompt || p.thesis, holdings: holdingsClean, isPublic,
          creator: user.username || user.name || "Anonymous",
          fundSummary: p.fundSummary, macroAnalysis: p.macroAnalysis,
          assetAllocation: p.assetAllocation, factorExposure: p.factorExposure,
          riskAnalysis: p.riskAnalysis, incomeProjection: p.incomeProjection,
          esgConsiderations: p.esgConsiderations, rebalanceRules: p.rebalanceRules,
          weeklyOutlook: p.weeklyOutlook, cashPosition: p.cashPosition,
          autoSellPct: p.autoSellPct || 0, createdTs: p.createdTs,
          createdAt: p.createdAt || new Date().toISOString(),
          costBasis: p.costBasis || 1000000,
          initialCashBalance: p.initialCashBalance || p.cashBalance || 0,
          transactions: (p.transactions || []).slice(-50),
          navHistory: (p.navHistory || []).slice(-200),
          cashBalance: p.cashBalance || p.cashPosition?.amount || 0,
          userRiskProfile: p.userRiskProfile, userTimeHorizon: p.userTimeHorizon, userRebalFreq: p.userRebalFreq,
        };
        const row = {
          user_id: uid, name: p.name || "AI Portfolio", ticker: p.ticker || "",
          thesis: p.thesis || "", strategy: p.strategy || "",
          holdings: holdingsClean, value: p.value || 1000000, fee: p.fee || 0,
          risk_profile: p.userRiskProfile || p.riskProfile || "",
          time_horizon: p.userTimeHorizon || "", rebal_freq: p.userRebalFreq || p.rebalanceFrequency || "",
          is_public: isPublic, portfolio_data: portfolioData,
        };

        // Step 3: Insert — use .select() to get the ID back
        console.log("[Save] Inserting...", row.name);
        const { data, error } = await supabase.from("portfolios").insert(row).select("id");

        if (error) {
          console.error("[Save] ✗ Error:", error.code, error.message);
          if (error.code === "42501" || error.message?.includes("row-level security")) {
            return "Permission denied. Sign out and sign back in to refresh your session.";
          }
          return "Save error: " + (error.message || "Unknown");
        }

        if (data && data[0]) {
          console.log("[Save] ✓ Saved! ID:", data[0].id);
          setPortfolios(prev => [...prev, { ...portfolioData, id: data[0].id, isPublic, dbId: data[0].id }]);
          if (isPublic) setPublicPortfolios(prev => [...prev, { ...portfolioData, id: data[0].id, isPublic: true, gain: 0, holdingCount: holdingsClean.length, fee: portfolioData.fee || 0 }]);
          return true;
        }

        // Insert returned empty — RLS might have blocked the SELECT part
        // Try a raw insert without .select() as fallback
        console.warn("[Save] ⚠ .select() returned empty, trying raw insert...");
        const { error: err2 } = await supabase.from("portfolios").insert(row);
        if (err2) {
          console.error("[Save] ✗ Raw insert also failed:", err2.message);
          return "Save failed: " + err2.message;
        }
        // Raw insert succeeded — we don't have the ID but data is saved
        console.log("[Save] ✓ Raw insert succeeded (no ID returned)");
        const tempId = Date.now();
        setPortfolios(prev => [...prev, { ...portfolioData, id: tempId, isPublic, dbId: tempId }]);
        return true;
      };

      // Race between save work and timeout
      return await Promise.race([saveWork(), timeoutPromise]);

    } catch (err) {
      console.error("[Save] ✗ Exception:", err.message);
      if (err.message === "TIMEOUT") {
        return "Save timed out after 15 seconds. Check your internet connection and try again.";
      }
      return "Save failed: " + (err.message || "Unknown error");
    }
  };
  // Derive public leaderboard entries from live portfolio values
  // MUST include full data so leaderboard expanded view shows holdings, transactions, charts, etc.
  const livePublicPortfolios = useMemo(() => {
    if (!user) return [];
    return portfolios.filter(p => p.isPublic).map(p => ({
      ...p, // Pass ALL portfolio data (holdings, transactions, strategy, riskProfile, etc.)
      creator: user.username || user.name,
      gain: (() => { const cb = p.costBasis || (p.holdings || []).reduce((s, h) => s + (h.originalAllocation || h.allocation || 0), 0) + (p.initialCashBalance || 0) || 1000000; return cb > 0 ? Math.round(((p.value - cb) / cb) * 10000) / 100 : 0; })(),
      holdingCount: (p.holdings || []).length,
    }));
  }, [portfolios, user]);
  // Merge own published + others' published
  const allPublicPortfolios = useMemo(() => {
    const ownIds = new Set(livePublicPortfolios.map(p => p.id));
    return [...livePublicPortfolios, ...publicPortfolios.filter(p => !ownIds.has(p.id))];
  }, [livePublicPortfolios, publicPortfolios]);
  const updatePortfolio = useCallback((idx, updated) => { setPortfolios((prev) => prev.map((p, i) => (i === idx ? updated : p))); }, []);

  const renderPage = () => {
    switch(page) {
      case "home":        return <Home go={setPage} openAuth={openAuth} user={user} publicPortfolios={allPublicPortfolios} />;
      case "builder":     return <Builder user={user} openAuth={openAuth} savePortfolio={savePortfolio} publishPortfolio={(p) => savePortfolio(p, true)} signOut={signOut} />;
      case "portfolios":  return <Portfolios user={user} openAuth={openAuth} portfolios={portfolios} go={setPage} updatePortfolio={updatePortfolio} publicPortfolios={allPublicPortfolios} />;
      case "leaderboard": return <Leaderboard publicPortfolios={allPublicPortfolios} user={user} lbLoading={lbLoading} lbLastUpdate={lbLastUpdate} deepLinkedPortfolioId={deepLinkedPortfolioId} onDeepLinkConsumed={() => setDeepLinkedPortfolioId(null)} />;
      case "learn":       return <Learn />;
      case "roadmap":     return <Roadmap go={setPage} />;
      case "pricing":     return <Pricing openAuth={openAuth} user={user} />;
      case "terms":       return <TermsOfService go={setPage} />;
      case "privacy":     return <PrivacyPolicy go={setPage} />;
      case "disclaimer":  return <Disclaimer go={setPage} />;
      case "faq":         return <FAQ go={setPage} />;
      case "about":       return <About go={setPage} />;
      case "contact":     return <Contact go={setPage} />;
      default:            return <Home go={setPage} openAuth={openAuth} user={user} publicPortfolios={allPublicPortfolios} />;
    }
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'Outfit', -apple-system, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}body{background:${C.bg};font-family:'Plus Jakarta Sans','Outfit',-apple-system,BlinkMacSystemFont,sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
        ::selection{background:${C.accent}44}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}::-webkit-scrollbar-thumb:hover{background:${C.dim}}
        input::placeholder,textarea::placeholder{color:${C.dim}}
        button{transition:transform .15s,filter .12s,opacity .12s,box-shadow .2s}button:hover{filter:brightness(1.06);transform:translateY(-1px)}button:active{transform:translateY(0)}
        input:focus,textarea:focus,select:focus{border-color:${C.accent}!important;box-shadow:0 0 0 3px ${C.accentBg}!important}
        @keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes shimmer{0%{background-position:-200px 0}100%{background-position:200px 0}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .page-container,.builder-container{animation:fadeIn .3s ease-out}

        /* ═══ TABLET ═══ */
        @media(max-width:768px){
          .grid4{grid-template-columns:repeat(2,1fr)!important}
          .grid3{grid-template-columns:1fr!important}
          .grid2col{grid-template-columns:1fr!important}
          .controls-grid{grid-template-columns:1fr!important}
          .hero-title{font-size:28px!important}
          .nav-links{display:none!important}
          .hamburger-btn{display:block!important}
          .hide-mobile{display:none!important}
          .footer-grid{grid-template-columns:1fr 1fr!important}
          .mob-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}
          .mob-scroll::-webkit-scrollbar{display:none}
          .tab-bar{flex-wrap:nowrap!important;overflow-x:auto!important;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding-bottom:4px!important}
          .tab-bar::-webkit-scrollbar{display:none}
          .tab-bar button{white-space:nowrap!important;flex-shrink:0!important;min-height:36px!important}
          .tab-bar>div:last-child{display:flex!important;gap:4px!important;flex-shrink:0!important}
          .kpi-grid{grid-template-columns:repeat(2,1fr)!important}
          .metrics-grid{grid-template-columns:repeat(2,1fr)!important}
          .comparison-grid{grid-template-columns:1fr!important}
          .builder-actions{flex-direction:column!important}
          .builder-actions button{width:100%!important;min-height:44px!important}
          .port-card-header{flex-direction:column!important;gap:10px!important;align-items:flex-start!important}
          .port-card-right{text-align:left!important;min-width:0!important;width:100%!important;display:flex!important;align-items:center!important;gap:12px!important;flex-wrap:wrap!important}
          .port-card-right>div:first-child{font-size:18px!important}
          .share-row{flex-direction:column!important;gap:10px!important}
          .share-row button{width:100%!important;min-height:44px!important}
          .builder-header{flex-direction:column!important}
          .builder-nav-right{text-align:left!important;width:100%!important;display:flex!important;align-items:center!important;gap:10px!important;flex-wrap:wrap!important;padding-top:8px!important;border-top:1px solid rgba(255,255,255,.06)!important}
          .builder-nav-right>div:first-child{font-size:18px!important}
          .cash-inner{flex-direction:column!important;align-items:flex-start!important;gap:10px!important}
          .cash-inner>div:last-child{text-align:left!important}
          .lb-expanded{padding:14px 12px 14px 12px!important}
          .holding-chips{gap:6px!important}
          .holding-chips>div{min-width:70px!important;flex:1 1 calc(50% - 6px)!important}
          .tx-item{flex-direction:column!important;gap:4px!important;align-items:flex-start!important}
          .tx-item>div:last-child{text-align:left!important;display:flex!important;gap:8px!important;align-items:center!important}
          /* Leaderboard grid — stack on mobile */
          [style*="gridTemplateColumns: \"46px"]{grid-template-columns:40px 1fr 80px 70px!important}
          /* Better touch targets */
          button{min-height:36px}
          input,select,textarea{min-height:40px!important;font-size:16px!important}
        }

        /* ═══ PHONE ═══ */
        @media(max-width:480px){
          .grid4{grid-template-columns:1fr!important}
          .footer-grid{grid-template-columns:1fr!important}
          .kpi-grid{grid-template-columns:1fr 1fr!important}
          .metrics-grid{grid-template-columns:1fr 1fr!important}
          .hero-title{font-size:22px!important}
          .hero-sub{font-size:13px!important;padding:0 4px!important}
          .page-container{padding:20px 12px!important}
          .builder-container{padding:20px 12px!important}
          .sort-controls{flex-wrap:wrap!important}
          .sort-controls button{flex:1!important;min-width:60px!important}
          .lb-expanded{padding:12px 8px!important}
          .lb-expanded .holding-chips{gap:4px!important}
          .holding-chips>div{min-width:0!important;flex:1 1 calc(50% - 4px)!important}
          .build-mode-toggle{flex-direction:column!important;gap:6px!important}
          .build-mode-toggle h1{font-size:20px!important}
          .tab-bar{padding:8px 10px!important;gap:4px!important}
          .tab-bar button{font-size:10px!important;padding:6px 8px!important;min-height:32px!important}
          .port-card-header{padding:14px 12px!important}
          .port-card-header h3{font-size:15px!important}
          .port-card-right>div:first-child{font-size:16px!important}
          .builder-nav-right>div:first-child{font-size:16px!important}
          .cash-position{padding:12px!important}
          .tab-content{padding:14px 10px!important}
          .perf-tab{padding:14px 10px!important}
          .share-row>div:first-child .share-title{font-size:11px!important}
          /* Portfolio balance display */
          [style*="fontSize: 22"]{font-size:18px!important}
          /* Ticker chips wrap nicely */
          [style*="display: \"flex\", gap: 6, flexWrap"]{gap:4px!important}
          /* Contact form grid */
          [style*="gridTemplateColumns: \"1fr 1fr\""]{grid-template-columns:1fr!important}
          /* Leaderboard holdings grid — simplified for phone */
          [style*="minWidth: 560"]{min-width:0!important}
          [style*="minWidth: 520"]{min-width:0!important}
          [style*="minWidth: 420"]{min-width:0!important}
          [style*="minWidth: 400"]{min-width:0!important}
          /* Homepage stats grid */
          [style*="repeat(4, 1fr)"]{grid-template-columns:repeat(2,1fr)!important}
          /* Feature grid */
          [style*="repeat(3, 1fr)"]{grid-template-columns:1fr!important}
        }

        /* ═══ SMALL PHONE ═══ */
        @media(max-width:360px){
          .kpi-grid{grid-template-columns:1fr!important}
          .metrics-grid{grid-template-columns:1fr!important}
          .hero-title{font-size:20px!important}
          .tab-bar button{font-size:9px!important;padding:5px 6px!important}
          .holding-chips>div{flex:1 1 100%!important}
          h1{font-size:20px!important}
          [style*="fontSize: 26"]{font-size:20px!important}
          [style*="fontSize: 28"]{font-size:22px!important}
        }
      `}</style>
      <Ticker />
      <Nav page={page} go={setPage} user={user} openAuth={openAuth} signOut={signOut} isDark={isDark} toggleTheme={toggleTheme} updateUsername={updateUsername} />
      {renderPage()}
      <footer style={{ borderTop: `1px solid ${C.border}`, padding: "32px 20px 22px", marginTop: 40 }}>
        <div className="footer-grid" style={{ maxWidth: 1060, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 24, marginBottom: 24 }}>
          <div>
            <div style={{ marginBottom: 10 }}><Logo size={20} showText /></div>
            <p style={{ color: C.dim, fontSize: 12, lineHeight: 1.5 }}>AI-powered ETF simulation for education and portfolio research. Build, track, and manage investment strategies risk-free.</p>
          </div>
          <div>
            <h4 style={{ color: C.sub, fontSize: 11, fontFamily: mono, letterSpacing: 0.5, marginBottom: 10 }}>PLATFORM</h4>
            {[["ETF Builder", "builder"], ["Leaderboard", "leaderboard"], ["My Portfolios", "portfolios"]].map(([l, k]) => <div key={k}><span onClick={() => setPage(k)} style={{ color: C.dim, fontSize: 12, cursor: "pointer", display: "block", marginBottom: 5 }}>{l}</span></div>)}
          </div>
          <div>
            <h4 style={{ color: C.sub, fontSize: 11, fontFamily: mono, letterSpacing: 0.5, marginBottom: 10 }}>RESOURCES</h4>
            {[["Learn", "learn"], ["FAQ", "faq"], ["About Us", "about"], ["Contact", "contact"], ["Roadmap", "roadmap"], ["Pricing", "pricing"]].map(([l, k]) => <div key={k}><span onClick={() => setPage(k)} style={{ color: C.dim, fontSize: 12, cursor: "pointer", display: "block", marginBottom: 5 }}>{l}</span></div>)}
            <span style={{ color: C.dim, fontSize: 12, display: "block", marginBottom: 5 }}>API Docs (coming soon)</span>
            <a href="mailto:support@etfsimulator.com" style={{ color: C.dim, fontSize: 12, display: "block", marginBottom: 5, textDecoration: "none" }}>Support: support@etfsimulator.com</a>
          </div>
          <div>
            <h4 style={{ color: C.sub, fontSize: 11, fontFamily: mono, letterSpacing: 0.5, marginBottom: 10 }}>LEGAL</h4>
            {[["Terms of Service", "terms"], ["Privacy Policy", "privacy"], ["Disclaimer", "disclaimer"]].map(([l, k]) => <div key={k}><span onClick={() => setPage(k)} style={{ color: C.dim, fontSize: 12, cursor: "pointer", display: "block", marginBottom: 5 }}>{l}</span></div>)}
          </div>
        </div>
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <span style={{ color: C.dim, fontSize: 11 }}>© 2026 ETF Simulator. All rights reserved.</span>
          <span style={{ color: C.dim, fontSize: 10.5, maxWidth: 600, lineHeight: 1.4 }}>Educational platform only. Not financial advice. All portfolio values, returns, and market data are simulated. Past performance does not guarantee future results. Consult a licensed financial advisor before making investment decisions.</span>
        </div>
      </footer>
      {authMode && <AuthModal onClose={() => setAuthMode(null)} onAuth={doAuth} initMode={authMode} />}
    </div>
  );
}
