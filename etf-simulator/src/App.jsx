import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

/* ═══════════════════════════════════════════════════════════════════════
   CONSTANTS & DATA
   ═══════════════════════════════════════════════════════════════════════ */

const TICKER_SYMBOLS = [
  // Indexes — ETF proxy with multiplier to show real index value
  { symbol: "SPY", label: "S&P 500", mult: 10 },
  { symbol: "DIA", label: "DJIA", mult: 100 },
  { symbol: "QQQ", label: "NASDAQ", mult: 36.8 },
  { symbol: "IWM", label: "Russell 2000", mult: 10.2 },
  // Commodities — ETF proxy with multiplier to show real commodity price
  { symbol: "GLD", label: "Gold", mult: 10.89 },
  { symbol: "USO", label: "Crude Oil", mult: 0.96 },
  { symbol: "SLV", label: "Silver", mult: 1.08 },
  // FX — ETF proxy, % change is accurate, value converted to pair rate
  { symbol: "FXE", label: "EUR/USD", fx: 1.0842 },
  { symbol: "FXY", label: "USD/JPY", fx: 149.72 },
  { symbol: "FXB", label: "GBP/USD", fx: 1.2635 },
  { symbol: "UUP", label: "DXY Index", mult: 3.85 },
];
const DEFAULT_INDICES = [
  { symbol: "S&P 500", value: 6012.45, change: 0.43 },
  { symbol: "DJIA", value: 44298.71, change: -0.25 },
  { symbol: "NASDAQ", value: 19432.18, change: 0.75 },
  { symbol: "Russell 2000", value: 2287.93, change: 0.55 },
  { symbol: "Gold", value: 2948.30, change: 0.64 },
  { symbol: "Crude Oil", value: 71.82, change: -1.29 },
  { symbol: "Silver", value: 32.45, change: 1.12 },
  { symbol: "EUR/USD", value: 1.0842, change: 0.11 },
  { symbol: "USD/JPY", value: 149.72, change: -0.25 },
  { symbol: "GBP/USD", value: 1.2635, change: 0.18 },
  { symbol: "DXY Index", value: 103.85, change: -0.14 },
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
  { name: "Free", price: "$0", period: "forever", active: true, features: ["AI-generated ETF portfolios (10 holdings)", "25 AI generations per day", "$1M simulated starting capital", "Risk profile & time horizon controls", "Flexible rebalancing (daily to annually)", "Keep/remove individual AI picks", "Auto-rebalancing engine", "Live simulated trading with real-time pricing", "Community leaderboard", "Save up to 3 portfolios", "Interactive educational courses"] },
  { name: "Pro", price: "—", period: "pricing TBD", soon: true, features: ["Everything in Free", "Unlimited AI generations", "Unlimited saved portfolios", "Live market data feeds", "Advanced AI strategies (20+ holdings)", "Custom rebalancing rules", "Export portfolio reports (PDF/CSV)", "Priority AI generation", "Advanced portfolio analytics", "Portfolio comparison tools"] },
  { name: "Institutional", price: "—", period: "pricing TBD", soon: true, features: ["Everything in Pro", "API access & webhooks", "Team collaboration workspaces", "White-label reports", "Custom benchmarks & indexes", "Dedicated support", "Compliance & audit tooling", "Bulk portfolio generation", "Brokerage integration (coming)"] },
];

const FUTURE_PRODUCTS = [
  { icon: "🔄", title: "Smart Rebalancing Alerts", desc: "AI-driven drift detection with automated rebalance recommendations at your chosen frequency — daily to annually", eta: "Q2 2026", status: "in-progress" },
  { icon: "⏱", title: "Historical Performance Engine", desc: "Compare your portfolio against major benchmarks with custom date ranges, drawdown analysis, and performance overlays", eta: "Q2 2026", status: "in-progress" },
  { icon: "📊", title: "Live Portfolio Analytics", desc: "Real-time P&L tracking, Sharpe/Sortino calculations, sector heatmaps, and correlation matrices updated with market data", eta: "Q3 2026", status: "planned" },
  { icon: "🌐", title: "Global Markets Expansion", desc: "International equities on LSE, TSE, HKEX, Euronext — plus forex pairs, emerging market bonds, and frontier market access", eta: "Q3 2026", status: "planned" },
  { icon: "🤖", title: "AI Portfolio Advisor", desc: "Conversational AI that answers questions about your holdings, suggests swaps, explains macro impact, and provides daily market briefs", eta: "Q3 2026", status: "planned" },
  { icon: "📱", title: "Mobile App (iOS & Android)", desc: "Native mobile experience with push alerts for rebalance triggers, earnings events, and portfolio milestone notifications", eta: "Q4 2026", status: "planned" },
  { icon: "🏆", title: "Tournament Mode", desc: "Compete in weekly/monthly portfolio challenges with themed constraints — best risk-adjusted return wins. Seasonal leaderboards", eta: "Q4 2026", status: "planned" },
  { icon: "👥", title: "Social & Copy Trading", desc: "Follow top performers, clone their portfolios with one click, and build a public track record. Commentary and discussion threads", eta: "Q1 2027", status: "planned" },
  { icon: "📈", title: "Options & Derivatives Sim", desc: "Covered calls, protective puts, and collar strategies on your ETF holdings. Visualize payoff diagrams and Greeks", eta: "Q1 2027", status: "future" },
  { icon: "🔌", title: "Brokerage Integration", desc: "Connect Schwab, Fidelity, Interactive Brokers — import real holdings, mirror simulated portfolios to live accounts (one-click)", eta: "Q2 2027", status: "future" },
  { icon: "🏛", title: "Institutional Tier", desc: "White-label reports, team workspaces, compliance tooling, API access, and bulk portfolio generation for RIAs and family offices", eta: "Q2 2027", status: "future" },
  { icon: "🎓", title: "ETF Academy", desc: "Interactive courses: Portfolio Theory 101, Factor Investing, Macro Trading, Crypto Allocation — with simulated labs and certifications", eta: "Q3 2027", status: "future" },
];

/* ═══════════════════════════════════════════════════════════════════════ */

const fmt = (v, d = 2) => new Intl.NumberFormat("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
const fmtUSD = (v) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
function sr(seed) { let x = Math.sin(seed) * 10000; return x - Math.floor(x); }
function genChart(days, base, seed) {
  const pts = []; let p = base;
  for (let i = 0; i <= days; i++) { p = Math.max(p + (sr(i * 7 + seed * 13 + 1) - 0.47) * base * 0.022, base * 0.4); pts.push({ day: i, price: Math.round(p * 100) / 100 }); }
  return pts;
}
function genBacktest(months, seed, holdings) {
  // Asset-type-aware simulation: annualized return + vol profiles
  const profiles = {
    stock: { ret: 0.10, vol: 0.16 }, etf: { ret: 0.09, vol: 0.14 },
    crypto: { ret: 0.20, vol: 0.60 }, commodity: { ret: 0.05, vol: 0.20 }
  };
  const pts = []; let val = 1000000;
  for (let i = 0; i <= months; i++) {
    if (i > 0) {
      let monthlyReturn = 0;
      if (holdings && holdings.length > 0) {
        // Weight-average return based on holding types
        holdings.forEach(h => {
          const p = profiles[h.type] || profiles.stock;
          const monthRet = p.ret / 12;
          const monthVol = p.vol / Math.sqrt(12);
          const noise = (sr(i * 17 + seed * 7 + (h.symbol?.charCodeAt(0) || 0) + 3) - 0.5) * 2;
          monthlyReturn += (h.weight / 100) * (monthRet + monthVol * noise);
        });
      } else {
        // Fallback: moderate portfolio
        const noise = (sr(i * 11 + seed * 7 + 3) - 0.5) * 2;
        monthlyReturn = 0.08 / 12 + (0.12 / Math.sqrt(12)) * noise;
      }
      val *= (1 + monthlyReturn);
    }
    const d = new Date(); d.setMonth(d.getMonth() - (months - i));
    pts.push({ month: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }), value: Math.round(val) });
  }
  return pts;
}

/* ═══ SUPABASE CLIENT ═══ */
const SUPABASE_URL = "https://jhdlzoafhltjyzebougz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoZGx6b2FmaGx0anl6ZWJvdWd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMzM4MTQsImV4cCI6MjA4NzgwOTgxNH0.KPwlyW5Fw5nohJgZbeHt61x3o47Np81YHOe-AHI-CmE";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
  return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}><polyline fill="none" stroke={c} strokeWidth="1.5" points={pts} /></svg>;
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
  if (!data || data.length < 2) return null;
  const vals = data.map((d) => d.value);
  const mn = Math.min(...vals) * 0.97, mx = Math.max(...vals) * 1.03, rng = mx - mn || 1;
  const pad = { t: 16, r: 64, b: 36, l: 8 }, cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
  const clr = vals[vals.length - 1] >= 1000000 ? C.green : C.red;
  const pts = vals.map((v, i) => `${pad.l + (i / (vals.length - 1)) * cw},${pad.t + ch - ((v - mn) / rng) * ch}`);
  const yTicks = Array.from({ length: 5 }, (_, i) => ({ v: mn + (rng * i) / 4, y: pad.t + ch - (i / 4) * ch }));
  const baseY = pad.t + ch - ((1000000 - mn) / rng) * ch;
  const step = Math.max(1, Math.floor(data.length / 6));
  const lp = pts[pts.length - 1].split(",").map(Number);
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      <defs><linearGradient id="bg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={clr} stopOpacity=".1" /><stop offset="100%" stopColor={clr} stopOpacity="0" /></linearGradient></defs>
      {yTicks.map((t, i) => <g key={i}><line x1={pad.l} y1={t.y} x2={w - pad.r} y2={t.y} stroke={C.border} /><text x={w - pad.r + 5} y={t.y + 3} fill={C.dim} fontSize="9" fontFamily="monospace">${fmt(t.v, 0)}</text></g>)}
      <line x1={pad.l} y1={baseY} x2={w - pad.r} y2={baseY} stroke={C.sub} strokeDasharray="4,3" />
      <text x={w - pad.r + 5} y={baseY + 3} fill={C.sub} fontSize="9" fontFamily="monospace">$1M</text>
      {data.filter((_, i) => i % step === 0 || i === data.length - 1).map((d, i) => { const xi = data.indexOf(d); return <text key={i} x={pad.l + (xi / (data.length - 1)) * cw} y={h - 6} fill={C.dim} fontSize="9" fontFamily="monospace" textAnchor="middle">{d.month}</text>; })}
      <polygon fill="url(#bg2)" points={`${pad.l},${pad.t + ch} ${pts.join(" ")} ${lp[0]},${pad.t + ch}`} />
      <polyline fill="none" stroke={clr} strokeWidth="2" points={pts.join(" ")} /><circle cx={lp[0]} cy={lp[1]} r="3.5" fill={clr} />
    </svg>
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
- CONSERVATIVE: 35-45% equities (blue-chip dividend aristocrats, defensive sectors), 30-40% bonds/fixed income (BND, SHY, TLT, AGG, GOVT, VCSH, VCIT, TIPS), 10-20% commodities (GLD, SLV), 0-3% crypto. Target Sharpe > 0.8, Sortino > 1.0, vol < 8%, max drawdown < 10%.
- MODERATE: 55-70% equities (mix of growth + value), 10-20% bonds, 5-15% alternatives (commodities, REIT, infrastructure), 5-10% crypto. Target Sharpe > 1.0, Sortino > 1.3, vol < 16%, max drawdown < 20%.
- AGGRESSIVE: 60-80% equities (growth, momentum, small-cap, emerging), 0-10% bonds, 15-25% crypto, 5-15% commodities/alternatives. Target Sharpe > 0.7, Sortino > 0.9, accept vol up to 30%, max drawdown < 40%.

CREATIVITY & ORIGINALITY — CRITICAL:
You are NOT a generic robo-advisor. You are an elite fund manager with a Bloomberg terminal and deep market knowledge. Your picks should surprise and impress:
- DO NOT default to the "usual suspects" (AAPL, NVDA, MSFT, GOOGL, AMZN, META, TSLA) in every portfolio. Use them ONLY when directly relevant to the thesis.
- SEEK OUT hidden gems: mid-caps ($2-50B) that are best-in-class in their niche, emerging disruptors, overlooked sector leaders, international ADRs, specialty ETFs.
- For each thesis, find the 2-3 most SPECIFIC plays that directly capture the theme. A "food trends" ETF should hold companies like HIMS, ELF, CELH, BYND, TTCF, not just KO and PEP.
- Include at least 2-3 holdings that a retail investor would NOT find on their own — deep research picks that demonstrate institutional-level insight.
- Use the FULL universe: niche ETFs (KWEB, ARKG, BETZ, BLOK, DFEN, XBI, IBB, PAVE, IFRA), small/mid-cap stocks, international ADRs (BABA, TSM, ASML, SAP, SHOP, SE, MELI, NU, GRAB), sector-specific crypto (AAVE, UNI, RNDR, FET, NEAR, INJ), and specialty commodity plays (URA, COPX, REMX, LIT, WOOD).
- Think like a fund manager pitching to allocators: What is your EDGE? Why would someone pay 50bps for THIS fund vs buying VOO?

SECURITY SELECTION — USE ONLY REAL, CURRENTLY TRADEABLE TICKERS:
- Stocks: ANY US-listed equity from NYSE, NASDAQ, AMEX. Mega-caps to micro-caps. Prioritize companies with direct thesis alignment over generic large-caps.
- ETFs: ANY US-listed ETF — broad, sector, thematic, leveraged, inverse, international, fixed income, commodity. There are 3,000+ ETFs — use the specific one, not just SPY/QQQ.
- Crypto: Top 100 by market cap — BTC, ETH, SOL, XRP, ADA, AVAX, LINK, DOT, MATIC, DOGE, UNI, AAVE, RNDR, FET, INJ, NEAR, SUI, APT, SEI, TIA, etc.
- Commodities: GLD, SLV, IAU, USO, UNG, DBC, PDBC, GSG, WEAT, CORN, CPER, GDX, GDXJ, SIL, URA, LIT, COPX, PPLT, PALL, WOOD, REMX, etc.

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
  bg: "#0f1118", surface: "#171a24", card: "#1c1f2e", border: "#2a2d3e",
  text: "#eceef4", sub: "#8b8fa3", dim: "#555870",
  green: "#22c55e", red: "#ef4444",
  accent: "#6366f1", accentLight: "#818cf8", accentBg: "rgba(99,102,241,.08)", accentBorder: "rgba(99,102,241,.25)",
  gold: "#eab308", goldBg: "rgba(234,179,8,.08)", teal: "#14b8a6", tealBg: "rgba(20,184,166,.08)", cyan: "#22d3ee",
};
const LIGHT = {
  bg: "#f5f5f7", surface: "#ffffff", card: "#ffffff", border: "#e2e4e9",
  text: "#1a1a2e", sub: "#5a5d72", dim: "#8b8fa3",
  green: "#16a34a", red: "#dc2626",
  accent: "#4f46e5", accentLight: "#6366f1", accentBg: "rgba(79,70,229,.06)", accentBorder: "rgba(79,70,229,.2)",
  gold: "#ca8a04", goldBg: "rgba(202,138,4,.06)", teal: "#0d9488", tealBg: "rgba(13,148,136,.06)", cyan: "#0891b2",
};
let C = { ...DARK };
function setTheme(dark) { Object.assign(C, dark ? DARK : LIGHT); }
const TC = { stock: "#6366f1", etf: "#14b8a6", crypto: "#eab308", commodity: "#a78bfa" };
const cardS = () => ({ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20 });
const inputS = () => ({ background: C.surface, border: `1px solid ${C.border}`, color: C.text, padding: "10px 14px", borderRadius: 8, fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box", marginBottom: 12, fontFamily: "inherit" });
const btnP = () => ({ background: C.accent, color: "#fff", border: "none", padding: "10px 22px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" });
const btnO = () => ({ background: "transparent", color: C.sub, border: `1px solid ${C.border}`, padding: "10px 22px", borderRadius: 8, fontSize: 14, cursor: "pointer", fontFamily: "inherit" });
const secHd = () => ({ color: C.text, fontSize: 20, fontWeight: 700, marginBottom: 18, letterSpacing: -0.3 });
const mono = "'IBM Plex Mono', monospace";
const badge = (clr) => ({ fontSize: 9.5, padding: "2px 7px", borderRadius: 4, fontWeight: 700, color: clr, background: `${clr}12`, border: `1px solid ${clr}28`, textTransform: "uppercase", width: "fit-content", display: "inline-block" });

/* ═══════════════════════════════════════════════════════════════════════
   TICKER
   ═══════════════════════════════════════════════════════════════════════ */

function Ticker() {
  const [indices, setIndices] = useState(DEFAULT_INDICES);
  const indicesRef = useRef(DEFAULT_INDICES);
  useEffect(() => {
    let cancelled = false;
    const fetchTicker = () => {
      Promise.all(TICKER_SYMBOLS.map(t =>
        finnhubFetch(`https://finnhub.io/api/v1/quote?symbol=${t.symbol}&token=${FINNHUB_KEY}`)
          .then(r => r.json())
          .then(q => {
            if (!q || q.c <= 0) return null;
            const pctChange = Math.round(((q.c - q.pc) / q.pc) * 10000) / 100;
            // FX pairs: use % change from ETF but show the actual FX rate
            if (t.fx) {
              const baseRate = t.fx;
              const liveRate = +(baseRate * (1 + pctChange / 100)).toFixed(4);
              return { symbol: t.label, value: liveRate, change: pctChange };
            }
            // Indexes & Commodities: multiply ETF price to approximate real value
            const realValue = t.mult ? +(q.c * t.mult).toFixed(2) : q.c;
            return { symbol: t.label, value: realValue, change: pctChange };
          })
          .catch(() => null)
      )).then(results => {
        if (cancelled) return;
        const live = results.filter(Boolean);
        if (live.length > 0) {
          const liveLabels = new Set(live.map(l => l.symbol));
          const merged = [...live, ...indicesRef.current.filter(d => !liveLabels.has(d.symbol))];
          indicesRef.current = merged;
          setIndices(merged);
        } else {
          // Simulate subtle price movement when no API key
          const sim = indicesRef.current.map(d => ({
            ...d,
            value: +(d.value + (Math.random() - 0.5) * d.value * 0.001).toFixed(d.value > 100 ? 2 : 4),
            change: +(d.change + (Math.random() - 0.5) * 0.08).toFixed(2),
          }));
          indicesRef.current = sim;
          setIndices(sim);
        }
      });
    };
    fetchTicker();
    const iv = setInterval(fetchTicker, 30000);
    return () => { cancelled = true; clearInterval(iv); };
  }, []);
  const items = [...indices, ...indices];
  return (
    <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, overflow: "hidden", height: 34, display: "flex", alignItems: "center" }}>
      <div style={{ display: "inline-flex", animation: "ticker 50s linear infinite", whiteSpace: "nowrap" }}>
        {items.map((m, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "0 18px", fontSize: 11.5, fontFamily: mono, borderRight: `1px solid ${C.border}`, height: 34 }}>
            <span style={{ color: C.sub, fontWeight: 600 }}>{m.symbol}</span>
            <span style={{ color: C.text }}>{fmt(m.value, m.value > 100 ? 2 : 4)}</span>
            <span style={{ color: m.change >= 0 ? C.green : C.red }}>{m.change >= 0 ? "▲" : "▼"} {fmt(Math.abs(m.change))}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   AUTH MODAL
   ═══════════════════════════════════════════════════════════════════════ */

function AuthModal({ onClose, onAuth, initMode }) {
  const [mode, setMode] = useState(initMode || "signin"); // signin | signup | forgot | resetSent
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [pw2, setPw2] = useState(""); const [name, setName] = useState(""); const [err, setErr] = useState(""); const [loading, setLoading] = useState(false);
  const switchMode = (m) => { setMode(m); setErr(""); setPw(""); setPw2(""); };
  const submit = async () => {
    setErr("");
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
    if (mode === "signup" && !name) return setErr("Please enter your full name.");
    if (!email.includes("@") || !email.includes(".")) return setErr("Please enter a valid email address.");
    if (pw.length < 6) return setErr("Password must be at least 6 characters.");
    if (mode === "signup" && pw !== pw2) return setErr("Passwords do not match.");
    setLoading(true);
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password: pw, options: { data: { name } } });
      setLoading(false);
      if (error) return setErr(error.message);
      if (data.user) onAuth({ name, email, id: data.user.id });
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pw });
      setLoading(false);
      if (error) return setErr(error.message);
      const userName = data.user?.user_metadata?.name || email.split("@")[0];
      onAuth({ name: userName, email, id: data.user.id });
    }
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "32px 28px", width: 400, maxWidth: "92vw" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}><Logo size={40} /></div>

        {mode === "resetSent" ? (
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
            {mode === "signup" && <input placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} style={inputS()} />}
            <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputS()} />
            <input placeholder="Password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} style={inputS()} onKeyDown={(e) => e.key === "Enter" && (mode === "signup" ? null : submit())} />
            {mode === "signup" && <input placeholder="Confirm Password" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} style={inputS()} onKeyDown={(e) => e.key === "Enter" && submit()} />}
            {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 10 }}>{err}</div>}
            <button onClick={submit} disabled={loading} style={{ ...btnP(), width: "100%", padding: "12px 0", marginBottom: 14, opacity: loading ? 0.6 : 1 }}>{loading ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}</button>
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

function Nav({ page, go, user, openAuth, signOut, isDark, toggleTheme }) {
  const [mobileOpen, setMobileOpen] = useState(false);
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
            <><span className="hide-mobile" style={{ color: C.sub, fontSize: 12.5 }}><span style={{ color: C.green }}>{"●"}</span> {user.name}</span><button onClick={signOut} style={{ ...btnO(), fontSize: 12, padding: "5px 12px" }}>Sign Out</button></>
          ) : (
            <><button onClick={() => openAuth("signin")} style={{ ...btnO(), fontSize: 12, padding: "5px 12px" }}>Sign In</button><button onClick={() => openAuth("signup")} style={{ ...btnP(), fontSize: 12, padding: "5px 12px" }}>Get Started</button></>
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

function Home({ go, openAuth, user }) {
  return (
    <div style={{ maxWidth: 1060, margin: "0 auto", padding: "48px 20px" }}>
      <div style={{ textAlign: "center", marginBottom: 56 }}>
        <div style={{ marginBottom: 18 }}><Logo size={64} /></div>
        <div style={{ display: "inline-block", background: C.accentBg, border: `1px solid ${C.accentBorder}`, borderRadius: 20, padding: "4px 16px", marginBottom: 18, fontSize: 11.5, color: C.accentLight, fontFamily: mono, fontWeight: 600, letterSpacing: 0.5 }}>FREE TIER — NOW IN OPEN BETA</div>
        <h1 className="hero-title" style={{ color: C.text, fontSize: 48, fontWeight: 800, lineHeight: 1.08, margin: "0 0 18px", letterSpacing: -1.5 }}>Build AI-Powered<br /><span style={{ color: C.accent }}>Custom ETF Portfolios</span></h1>
        <p style={{ color: C.sub, fontSize: 17, maxWidth: 600, margin: "0 auto 28px", lineHeight: 1.6 }}>
          Describe your investment thesis. Our AI fund manager constructs a diversified 10-holding, $1M portfolio across every US-listed stock, ETF, top 50 crypto, and commodities — with institutional-grade allocation, macro analysis, risk modeling, and detailed rationale for every pick. Track with live market data, auto-rebalance, and compare against the market.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={() => go("builder")} style={{ ...btnP(), padding: "14px 34px", fontSize: 15 }}>Start Building →</button>
          <button onClick={() => go("learn")} style={{ ...btnO(), padding: "14px 34px", fontSize: 15 }}>Learn More</button>
        </div>
      </div>

      {/* Platform Highlights */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 52, textAlign: "center" }}>
        {[
          { n: "10,000+", l: "Tradeable Securities" }, { n: "50+", l: "Crypto Assets" }, { n: "$1M", l: "Simulated Capital" }, { n: "Real-Time", l: "Market Data" },
        ].map((s) => (
          <div key={s.l} style={{ ...cardS(), padding: "18px 14px" }}>
            <div style={{ color: C.accent, fontSize: 26, fontWeight: 800, fontFamily: mono, marginBottom: 4 }}>{s.n}</div>
            <div style={{ color: C.sub, fontSize: 12 }}>{s.l}</div>
          </div>
        ))}
      </div>

      <h2 style={secHd()}>How It Works</h2>
      <div className="grid4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 52 }}>
        {[
          { n: "01", t: "Describe Your Thesis", d: "Sectors, themes, risk tolerance, time horizon — anything goes. Pick your risk profile and rebalance cadence." },
          { n: "02", t: "AI Builds Your ETF", d: "Grok-3 constructs 10 holdings across stocks, ETFs, crypto, and commodities with detailed rationale." },
          { n: "03", t: "Curate & Customize", d: "Keep or remove individual AI picks. Weights auto-recalculate. Your fund, your rules." },
          { n: "04", t: "Track & Compete", d: "Live pricing, auto-rebalance, compare performance, and rank on the community leaderboard." },
        ].map((s) => (
          <div key={s.n} style={cardS()}>
            <div style={{ color: C.accent, fontFamily: mono, fontSize: 12.5, marginBottom: 8, fontWeight: 700 }}>{s.n}</div>
            <h3 style={{ color: C.text, fontSize: 15, margin: "0 0 6px" }}>{s.t}</h3>
            <p style={{ color: C.sub, fontSize: 13, margin: 0, lineHeight: 1.5 }}>{s.d}</p>
          </div>
        ))}
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

      {/* ═══ EDUCATIONAL DISCLAIMER ═══ */}
      <div style={{ marginTop: 52, padding: "24px 20px", background: C.surface, borderRadius: 10, border: `1px solid ${C.border}` }}>
        <h3 style={{ color: C.text, fontSize: 14, margin: "0 0 12px", fontFamily: mono, letterSpacing: 0.3 }}>IMPORTANT LEGAL DISCLAIMERS</h3>
        <div style={{ display: "grid", gap: 10, fontSize: 12, color: C.sub, lineHeight: 1.6 }}>
          <p style={{ margin: 0 }}><strong style={{ color: C.text }}>Educational Purpose Only.</strong> ETF Simulator is a simulated, educational platform designed to help users learn about portfolio construction, diversification, risk management, and investment strategies. No real money is invested, traded, or at risk at any time. All portfolio values, returns, performance metrics, and market data displayed on this platform are simulated and hypothetical.</p>
          <p style={{ margin: 0 }}><strong style={{ color: C.text }}>Not Financial Advice.</strong> Nothing on this platform constitutes financial advice, investment advice, trading advice, or any other form of professional advice. ETF Simulator does not recommend any specific securities, asset classes, or investment strategies. The AI-generated portfolios are algorithmic outputs for educational illustration only and should not be interpreted as personalized investment recommendations.</p>
          <p style={{ margin: 0 }}><strong style={{ color: C.text }}>No Guarantee of Accuracy.</strong> While we strive for accuracy, simulated market data, asset prices, performance calculations, and AI-generated content may contain errors or inaccuracies. Simulated results are hypothetical, do not account for real-world trading costs, slippage, taxes, or market impact, and past performance — whether real or simulated — is not indicative of future results.</p>
          <p style={{ margin: 0 }}><strong style={{ color: C.text }}>Consult a Professional.</strong> Before making any actual investment decisions, consult a qualified, licensed financial advisor, tax professional, or legal counsel who can evaluate your individual financial situation, risk tolerance, and investment objectives. Investment in real securities involves risk, including the potential loss of principal.</p>
          <p style={{ margin: 0 }}><strong style={{ color: C.text }}>No Fiduciary Relationship.</strong> Use of ETF Simulator does not create a fiduciary, advisory, or professional relationship between you and ETF Simulator or its operators. You are solely responsible for your own investment decisions.</p>
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

function Builder({ user, openAuth, savePortfolio, publishPortfolio }) {
  const [thesis, setThesis] = useState(""); const [loading, setLoading] = useState(false); const [portfolio, setPortfolio] = useState(null); const [err, setErr] = useState(""); const [openIdx, setOpenIdx] = useState(null); const [saved, setSaved] = useState(false); const [showSaveModal, setShowSaveModal] = useState(false); const [pendingSave, setPendingSave] = useState(false);
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
  // Build mode: "ai" or "manual"
  const [buildMode, setBuildMode] = useState("ai");
  const [manualHoldings, setManualHoldings] = useState([{ symbol: "", name: "", type: "stock", weight: 10 }]);
  const [manualName, setManualName] = useState("My Custom ETF");
  const [manualTicker, setManualTicker] = useState("CUST");
  const [manualCashPct, setManualCashPct] = useState(5);
  const [manualStrategy, setManualStrategy] = useState("");
  // Auto-rebalance timer
  const [rebalDeadline, setRebalDeadline] = useState(null);
  const [rebalCountdown, setRebalCountdown] = useState("");
  const [autoRebalEnabled, setAutoRebalEnabled] = useState(true);
  const [dailyUses, setDailyUses] = useState(() => { try { const stored = JSON.parse(localStorage.getItem("etf_daily_uses") || "{}"); const today = new Date().toISOString().slice(0, 10); return stored.date === today ? stored.count : 0; } catch { return 0; } });
  const DAILY_LIMIT = 25;
  const trackUsage = () => { const today = new Date().toISOString().slice(0, 10); const newCount = dailyUses + 1; setDailyUses(newCount); try { localStorage.setItem("etf_daily_uses", JSON.stringify({ date: today, count: newCount })); } catch {} return newCount; };

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
    // Initialize live allocations from portfolio holdings
    const init = {};
    portfolio.holdings.forEach((h, i) => { if (!init[i]) init[i] = h.allocation; });
    setLiveAllocations(init);
  }, [portfolio?.id, portfolio?.holdings?.length]);

  // Simulate price movement every 30 seconds (with 10-minute grace period on launch)
  useEffect(() => {
    if (!portfolio) return;
    const createdTs = portfolio.createdTs || Date.now();
    const timer = setInterval(() => {
      // Grace period: no price drift for first 10 minutes after launch — NAV stays at $1M
      if (Date.now() - createdTs < 600000) return;
      setLiveAllocations(prev => {
        const next = { ...prev };
        portfolio.holdings.forEach((h, i) => {
          if (excludedIdx.has(i)) return;
          const current = next[i] || h.allocation;
          // Conservative volatility: ~0.01-0.03% per tick — realistic intraday movement
          const vol = h.type === "crypto" ? 0.00025 : h.type === "commodity" ? 0.00012 : h.type === "etf" ? 0.00008 : 0.0001;
          const isShort = h.action === "SHORT";
          const drift = (Math.random() - 0.50) * vol; // perfectly balanced
          const change = isShort ? -drift : drift;
          next[i] = Math.max(current * (1 + change), current * 0.5);
        });
        return next;
      });
    }, 30000); // every 30 seconds
    return () => clearInterval(timer);
  }, [portfolio?.id, excludedIdx.size]);

  // Compute live NAV
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
  }, [portfolio?.id, editFee]);

  // Auto-sell: if position drifts beyond user threshold, sell to cash
  const excludedRef = useRef(excludedIdx); excludedRef.current = excludedIdx;
  useEffect(() => {
    if (!portfolio || autoSellPct <= 0) return;
    const timer = setInterval(() => {
      const allocs = liveAllocRef.current;
      const excluded = excludedRef.current;
      portfolio.holdings.forEach((h, i) => {
        if (excluded.has(i)) return;
        const liveVal = allocs[i] || h.allocation;
        const targetVal = h.allocation;
        if (targetVal <= 0) return;
        const driftPct = Math.abs((liveVal - targetVal) / targetVal) * 100;
        if (driftPct >= autoSellPct) {
          const amt = Math.round(liveVal);
          setCashBalance(prev => prev + amt);
          setLiveAllocations(prev => ({ ...prev, [i]: 0 }));
          setExcludedIdx(prev => new Set([...prev, i]));
          setTransactions(prev => [...prev, { type: "AUTO-SELL", symbol: h.symbol, amount: amt, ts: Date.now(), reason: `Auto-sold: ${h.symbol} drifted ${fmt(driftPct, 1)}% from target (threshold: ±${autoSellPct}%). $${amt.toLocaleString()} moved to cash.` }]);
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
  useEffect(() => { if (user && pendingSave && portfolio && !saved) { setShowSaveModal(true); setPendingSave(false); } }, [user, pendingSave, portfolio, saved]);

  const generate = async () => {
    if (!thesis.trim()) return setErr("Describe your investment thesis first.");
    if (dailyUses >= DAILY_LIMIT) return setErr(`Daily limit reached (${DAILY_LIMIT} AI generations per day). Your limit resets at midnight. Upgrade to Pro for unlimited generations.`);
    setLoading(true); setErr(""); setPortfolio(null); setSaved(false); setExcludedIdx(new Set());
    trackUsage();
    try {
      const apiKey = typeof import.meta !== "undefined" && (import.meta.env?.VITE_XAI_API_KEY || import.meta.env?.VITE_GROK_API_KEY);
      const proxyUrl = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_PROXY_URL) || null;
      // If proxy configured, call proxy (no key needed client-side). Otherwise direct call requires key.
      const apiUrl = proxyUrl || "https://api.x.ai/v1/chat/completions";
      if (!proxyUrl && !apiKey) throw new Error("API_KEY_MISSING");
      const headers = { "Content-Type": "application/json" };
      if (apiKey && !proxyUrl) headers["Authorization"] = `Bearer ${apiKey}`;
      const userPrompt = `Design a professional ETF portfolio for the following investment thesis:\n\n"${thesis}"\n\nPORTFOLIO PARAMETERS (user-selected):\n- Risk Profile: ${riskProfile.toUpperCase()}\n- Time Horizon: ${timeHorizon}\n- Rebalance/Recommendation Frequency: ${rebalFreq}\n\nAs CIO, construct a fully realized 10-holding portfolio with $1,000,000 in seed capital. Use the "${riskProfile}" risk framework and "${rebalFreq}" rebalance schedule. The portfolio should be designed for a ${timeHorizon} investment horizon.\n\nReturn the complete JSON with ALL fields from the schema populated. Every field matters.`;
      const reqBody = {
        model: "grok-3-latest",
        max_tokens: 8192,
        temperature: 0.7,
        messages: [
          { role: "system", content: AI_SYSTEM_PROMPT },
          { role: "user", content: userPrompt }
        ]
      };
      const res = await fetch(apiUrl, { method: "POST", headers, body: JSON.stringify(reqBody) });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        let errMsg = `API error ${res.status}`;
        try { const errJson = JSON.parse(errText); errMsg = errJson.error?.message || errJson.error || errJson.detail || errMsg; } catch {}
        if (res.status === 401) throw new Error("API_KEY_INVALID");
        throw new Error(errMsg);
      }
      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content || "";
      const p = JSON.parse(raw.replace(/```json|```/g, "").trim());
      if (!p.holdings || p.holdings.length !== 10) throw new Error("Expected exactly 10 holdings.");
      const total = p.holdings.reduce((s, h) => s + h.allocation, 0);
      if (Math.abs(total - 1000000) > 0 && Math.abs(total - 1000000) <= 5000) { p.holdings[0].allocation += 1000000 - total; p.holdings[0].weight = p.holdings[0].allocation / 10000; }
      p.holdings = p.holdings.map(h => ({ ...h, targetWeight: h.weight, currentWeight: h.weight, action: h.action || "BUY", conviction: h.conviction || "medium" }));
      const initCash = p.cashPosition?.amount || 0;
      setCashBalance(initCash);
      setNavHistory([{ ts: Date.now(), nav: 1000000, cash: initCash }]);
      const initTxs = p.holdings.map(h => ({ type: h.action === "SHORT" ? "SHORT" : "BUY", symbol: h.symbol, amount: h.allocation, ts: Date.now(), reason: "Initial portfolio construction" }));
      if (initCash > 0) initTxs.push({ type: "CASH", symbol: "MONEY MKT", amount: initCash, ts: Date.now(), reason: "Cash at 4.5% APY" });
      setTransactions(initTxs);
      setPortfolio({ ...p, id: Date.now(), createdTs: Date.now(), thesis, value: 1000000, createdAt: new Date().toISOString(), trackingData: [{ ts: Date.now(), value: 1000000 }], rebalanceThreshold: 5, userRiskProfile: riskProfile, userTimeHorizon: timeHorizon, userRebalFreq: rebalFreq });
      setEditName(p.name || ""); setEditTicker(p.ticker || ""); setEditingWeights({}); setEditFee(p.fee || 0.5); setAutoSellPct(0); setLastExpenseTs(Date.now()); resetRebalDeadline(rebalFreq);
      setExcludedIdx(new Set()); setOpenIdx(null);
    } catch (e) {
      if (e.message === "API_KEY_MISSING") setErr("API key required. Add VITE_XAI_API_KEY to .env.local (get a key at console.x.ai), or set VITE_API_PROXY_URL to use a server-side proxy.");
      else if (e.message === "API_KEY_INVALID") setErr("Invalid API key. Check VITE_XAI_API_KEY in .env.local, or configure VITE_API_PROXY_URL for server-side proxy.");
      else setErr("Generation failed: " + (e.message || "Unknown error. Please try again."));
    }
    setLoading(false);
  };

  const refreshHolding = async (idx) => {
    if (!portfolio || refreshingIdx !== null) return;
    if (dailyUses >= DAILY_LIMIT) { setErr(`Daily limit reached (${DAILY_LIMIT}/day). Resets at midnight.`); return; }
    setRefreshingIdx(idx); trackUsage();
    try {
      const h = portfolio.holdings[idx];
      const apiKey = typeof import.meta !== "undefined" && (import.meta.env?.VITE_XAI_API_KEY || import.meta.env?.VITE_GROK_API_KEY);
      const proxyUrl = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_PROXY_URL) || null;
      const apiUrl = proxyUrl || "https://api.x.ai/v1/chat/completions";
      if (!proxyUrl && !apiKey) throw new Error("API key required");
      const headers = { "Content-Type": "application/json" };
      if (apiKey && !proxyUrl) headers["Authorization"] = `Bearer ${apiKey}`;
      const otherSymbols = portfolio.holdings.filter((_, i) => i !== idx && !excludedIdx.has(i)).map(x => x.symbol).join(", ");
      const refreshPrompt = `You are replacing ONE holding in an existing ETF portfolio.\n\nCurrent portfolio thesis: "${portfolio.thesis || thesis}"\nRisk Profile: ${portfolio.userRiskProfile || riskProfile}\nTime Horizon: ${portfolio.userTimeHorizon || timeHorizon}\n\nHolding being replaced: ${h.symbol} (${h.name}) — Weight: ${h.weight}%, Allocation: $${h.allocation}, Role: ${h.role}\n\nOther holdings already in portfolio (DO NOT duplicate): ${otherSymbols}\n\nFind a REPLACEMENT holding that:\n1. Fills the same role (${h.role}) and approximate weight (${h.weight}%)\n2. Is NOT already in the portfolio\n3. Follows the CREATIVITY rules — avoid obvious mega-caps, find hidden gems\n4. Has similar risk characteristics but potentially better upside\n\nReturn ONLY a JSON object with these fields (no markdown, no explanation):\n{"symbol":"TICK","name":"Full Name","description":"One line description","type":"stock|etf|crypto|commodity","weight":${h.weight},"allocation":${h.allocation},"role":"${h.role}","sector":"...","marketCap":"...","conviction":"high|medium|low","thesisConnection":"How this connects to the thesis","rationale":"3-4 sentence financial rationale","financialMetrics":{"marketCapValue":"$XB","ltmRevenue":"$XB","ebitda":"$XM","evRevenue":"X.Xx","evEbitda":"X.Xx","peRatio":"X.Xx","revenueGrowth":"X%","dividendYield":"X%"},"exitTrigger":"When to sell..."}`;
      const res = await fetch(apiUrl, { method: "POST", headers, body: JSON.stringify({ model: "grok-3-latest", max_tokens: 2048, temperature: 0.85, messages: [{ role: "system", content: "You are an expert portfolio manager. Return ONLY valid JSON, no markdown fences." }, { role: "user", content: refreshPrompt }] }) });
      if (!res.ok) throw new Error("API error " + res.status);
      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content || "";
      const newH = JSON.parse(raw.replace(/```json|```/g, "").trim());
      newH.targetWeight = newH.weight;
      newH.currentWeight = newH.weight;
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
    if (dailyUses >= DAILY_LIMIT) { setErr(`Daily limit reached (${DAILY_LIMIT} AI generations per day). Resets at midnight.`); return; }
    setLoading(true); setErr(""); trackUsage();
    try {
      const apiKey = typeof import.meta !== "undefined" && (import.meta.env?.VITE_XAI_API_KEY || import.meta.env?.VITE_GROK_API_KEY);
      const proxyUrl = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_PROXY_URL) || null;
      const apiUrl = proxyUrl || "https://api.x.ai/v1/chat/completions";
      if (!proxyUrl && !apiKey) throw new Error("API_KEY_MISSING");
      const headers = { "Content-Type": "application/json" };
      if (apiKey && !proxyUrl) headers["Authorization"] = `Bearer ${apiKey}`;
      const currentHoldings = portfolio.holdings.filter((_, i) => !excludedIdx.has(i)).map((h, idx) => { const liveVal = liveAllocations[portfolio.holdings.indexOf(h)] || h.allocation; const pnl = ((liveVal / h.allocation) - 1) * 100; return `${h.symbol} (${h.name}) — Original: $${h.allocation} — Live: $${Math.round(liveVal)} (${pnl >= 0 ? '+' : ''}${pnl.toFixed(1)}%) — ${h.role} — ${h.action || 'HOLD'}`; }).join("\n");
      const soldSyms = portfolio.holdings.filter((_, i) => excludedIdx.has(i)).map(h => h.symbol).join(", ");
      const updatePrompt = `SCHEDULED PORTFOLIO REVIEW — ACTIVE TRADING\n\nThesis: "${portfolio.thesis || thesis}"\nRisk: ${portfolio.userRiskProfile || riskProfile} | Horizon: ${portfolio.userTimeHorizon || timeHorizon} | Frequency: ${portfolio.userRebalFreq || rebalFreq}\nCurrent Total NAV: $${Math.round(currentNAV)} (started at $1M seed capital)\nCash Balance: $${Math.round(cashBalance)} (earning 4.5% APY money market)\nInvested in Holdings: $${Math.round(currentNAV - cashBalance)}\n${soldSyms ? "Recently sold to cash: " + soldSyms : ""}\n\nCurrent holdings:\n${currentHoldings}\n\nAs CIO perform a ${portfolio.userRebalFreq || "weekly"} review:\n1. For EACH holding: BUY MORE / HOLD / TRIM / SELL with reasoning\n2. Move proceeds to cash if selling — cash earns 4.5% APY\n3. SHORT overvalued securities if you see downside\n4. Find 1-3 NEW opportunities\n5. Portfolio: up to 10 holdings + cash = $${Math.round(currentNAV)} (current NAV — this may be above or below the original $1M seed)\n6. Include conviction, priceTarget, stopLoss for every holding\n7. Include weeklyOutlook\n\nGoldman Sachs-level active management. Show your edge.\n\nReturn complete JSON.`;
      const res = await fetch(apiUrl, { method: "POST", headers, body: JSON.stringify({ model: "grok-3-latest", max_tokens: 8192, temperature: 0.7, messages: [{ role: "system", content: AI_SYSTEM_PROMPT }, { role: "user", content: updatePrompt }] }) });
      if (!res.ok) throw new Error("API error " + res.status);
      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content || "";
      const p = JSON.parse(raw.replace(/```json|```/g, "").trim());
      if (!p.holdings || p.holdings.length !== 10) throw new Error("Expected exactly 10 holdings.");
      const total = p.holdings.reduce((s, h) => s + h.allocation, 0);
      const targetNAV = currentNAV; // Use current NAV, not seed capital
      if (Math.abs(total - targetNAV) > 0 && Math.abs(total - targetNAV) <= 50000) { p.holdings[0].allocation += Math.round(targetNAV - total - (p.cashPosition?.amount || 0)); p.holdings[0].weight = Math.round(p.holdings[0].allocation / (targetNAV / 100) * 10) / 10; }
      p.holdings = p.holdings.map(h => ({ ...h, targetWeight: h.weight, currentWeight: h.weight }));
      const nc = p.cashPosition?.amount || 0;
      setCashBalance(nc);
      const newAllocTotal = p.holdings.reduce((s, h) => s + h.allocation, 0) + nc;
      setNavHistory(prev => [...prev, { ts: Date.now(), nav: Math.round(newAllocTotal), cash: nc }]);
      const rebalTxs = p.holdings.filter(h => h.action !== "HOLD").map(h => ({ type: h.action === "SHORT" ? "SHORT" : h.action === "SELL" ? "SELL" : "BUY", symbol: h.symbol, amount: h.allocation, ts: Date.now(), reason: "Rebalance: " + (h.action || "HOLD") }));
      if (nc > 0) rebalTxs.push({ type: "CASH", symbol: "MONEY MKT", amount: nc, ts: Date.now(), reason: "Cash at 4.5% APY" });
      setTransactions(prev => [...prev, ...rebalTxs]);
      setPortfolio({ ...p, id: portfolio.id || Date.now(), createdTs: portfolio.createdTs, thesis: portfolio.thesis || thesis, value: Math.round(newAllocTotal), createdAt: portfolio.createdAt || new Date().toISOString(), trackingData: [...(portfolio.trackingData || []), { ts: Date.now(), value: Math.round(newAllocTotal) }], rebalanceThreshold: 5, userRiskProfile: portfolio.userRiskProfile || riskProfile, userTimeHorizon: portfolio.userTimeHorizon || timeHorizon, userRebalFreq: portfolio.userRebalFreq || rebalFreq, lastUpdated: new Date().toISOString() });
      // Reset liveAllocations to match new holdings (deps won't change since id/length stay same)
      const freshAllocs = {}; p.holdings.forEach((h2, j) => { freshAllocs[j] = h2.allocation; }); setLiveAllocations(freshAllocs);
      setExcludedIdx(new Set()); setOpenIdx(null); setEditingWeights({});
      resetRebalDeadline(p.userRebalFreq || portfolio.userRebalFreq || rebalFreq);
    } catch (e) { setErr("Weekly update failed: " + (e.message || "Try again")); }
    setLoading(false);
  };
  weeklyUpdateRef.current = weeklyUpdate;

  // Manual ETF creation
  const launchManualETF = () => {
    const totalW = manualHoldings.reduce((s, h) => s + (h.weight || 0), 0) + manualCashPct;
    if (Math.abs(totalW - 100) > 0.5) { setErr(`Weights must total 100%. Currently: ${fmt(totalW, 1)}%`); return; }
    const invalid = manualHoldings.find(h => !h.symbol.trim());
    if (invalid) { setErr("Every holding must have a ticker symbol."); return; }
    if (manualHoldings.length < 1) { setErr("Add at least one holding."); return; }
    const cashAmt = Math.round(SEED_CAPITAL * manualCashPct / 100);
    const holdings = manualHoldings.map((h, i) => ({
      symbol: h.symbol.toUpperCase().trim(),
      name: h.name || h.symbol.toUpperCase().trim(),
      type: h.type || "stock",
      weight: h.weight,
      allocation: Math.round(SEED_CAPITAL * h.weight / 100),
      action: "BUY",
      conviction: "medium",
      role: i === 0 ? "Core" : "Satellite",
      sector: "",
      description: h.name || "",
      thesisConnection: manualStrategy || "Manual selection by portfolio manager.",
    }));
    const initTxs = holdings.map(h => ({ type: "BUY", symbol: h.symbol, amount: h.allocation, ts: Date.now(), reason: `Initial allocation: ${h.weight}% = ${fmtUSD(h.allocation)}` }));
    if (cashAmt > 0) initTxs.push({ type: "CASH", symbol: "MONEY MKT", amount: cashAmt, ts: Date.now(), reason: "Cash at 4.5% APY" });
    setCashBalance(cashAmt);
    setTransactions(initTxs);
    setNavHistory([{ ts: Date.now(), nav: SEED_CAPITAL, cash: cashAmt }]);
    const p = {
      name: manualName, ticker: manualTicker.toUpperCase(), strategy: manualStrategy || "Manually constructed portfolio.",
      riskProfile, holdings, value: SEED_CAPITAL, fee: 0.5,
      assetAllocation: { equities: holdings.filter(h => h.type === "stock").reduce((s, h) => s + h.weight, 0), crypto: holdings.filter(h => h.type === "crypto").reduce((s, h) => s + h.weight, 0), cash: manualCashPct },
    };
    setPortfolio({ ...p, id: Date.now(), createdTs: Date.now(), thesis: manualStrategy, value: SEED_CAPITAL, createdAt: new Date().toISOString(), trackingData: [{ ts: Date.now(), value: SEED_CAPITAL }], rebalanceThreshold: 5, userRiskProfile: riskProfile, userTimeHorizon: timeHorizon, userRebalFreq: rebalFreq });
    setEditName(p.name); setEditTicker(p.ticker); setEditingWeights({}); setEditFee(0.5); setAutoSellPct(0); resetRebalDeadline(rebalFreq);
    const allocs = {}; holdings.forEach((h, i) => { allocs[i] = h.allocation; }); setLiveAllocations(allocs);
    setSaved(false); setExcludedIdx(new Set()); setErr("");
  };

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "36px 20px" }}>
      {/* ═══ BUILD MODE TOGGLE ═══ */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
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
        <textarea value={thesis} onChange={(e) => setThesis(e.target.value)} placeholder={"e.g., Design an ETF focused on AI and semiconductor companies with moderate risk. Include some crypto exposure for growth upside and gold as an inflation hedge. 5-year investment horizon, targeting 10-12% annual returns with volatility under 15%. Allocate across equities, thematic ETFs, and alternatives."} rows={5} style={{ ...inputS(), resize: "vertical", minHeight: 110, lineHeight: 1.5 }} />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          <span style={{ color: C.dim, fontSize: 11, alignSelf: "center", marginRight: 4 }}>Try:</span>
          {[
            { l: "AI & Semiconductors", t: "Build an aggressive growth ETF focused on artificial intelligence infrastructure, GPU makers, and cloud AI platforms. Heavy equity allocation with 15% crypto exposure. 5-year horizon targeting 15%+ returns." },
            { l: "Dividend Income", t: "Design a conservative income-focused ETF for a retiree. Prioritize high-quality dividend stocks, investment-grade bonds, and gold. Target 4%+ yield with minimal volatility. Capital preservation is the priority." },
            { l: "Clean Energy", t: "Create a moderate-risk ETF capturing the global clean energy transition. Include solar, wind, battery/EV, uranium, and lithium companies. Add some commodity hedges. 7-year horizon targeting 10-12% returns." },
            { l: "Crypto-Forward", t: "Build an aggressive ETF with maximum crypto exposure balanced by traditional assets. Include BTC, ETH, SOL, and crypto-adjacent equities like COIN and MSTR. Hedge with gold and short-term bonds. High risk tolerance." },
            { l: "All-Weather", t: "Design a balanced all-weather portfolio inspired by Ray Dalio's approach. Equal risk allocation across stocks, long-term bonds, gold, commodities, and TIPS. Target low volatility with consistent returns across all economic regimes." },
          ].map(ex => <button key={ex.l} onClick={() => setThesis(ex.t)} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.sub, padding: "4px 10px", borderRadius: 5, fontSize: 11, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{ex.l}</button>)}
        </div>

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

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
          <span style={{ color: C.dim, fontSize: 11.5 }}>Describe your thesis above — the controls will shape AI allocation</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={generate} disabled={loading || !thesis.trim() || dailyUses >= DAILY_LIMIT} style={{ ...btnP(), opacity: loading || !thesis.trim() || dailyUses >= DAILY_LIMIT ? 0.45 : 1 }}>{loading ? "Generating…" : dailyUses >= DAILY_LIMIT ? "Daily Limit Reached" : "Generate ETF ◆"}</button>
            <span style={{ color: dailyUses >= DAILY_LIMIT * 0.8 ? C.red : C.dim, fontSize: 10, fontFamily: mono }}>{DAILY_LIMIT - dailyUses}/{DAILY_LIMIT} remaining today</span>
          </div>
        </div>
      </div>
      )}

      {/* ═══ MANUAL ETF BUILDER ═══ */}
      {buildMode === "manual" && !portfolio && (
        <div style={{ ...cardS(), marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 80px 60px 40px", gap: 6, padding: "6px 0", borderBottom: `1px solid ${C.border}`, fontSize: 9, color: C.dim, fontFamily: mono }}>
              <span>TICKER</span><span>NAME</span><span>TYPE</span><span>WEIGHT</span><span></span>
            </div>
            {manualHoldings.map((h, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "60px 1fr 80px 60px 40px", gap: 6, padding: "6px 0", borderBottom: `1px solid ${C.border}`, alignItems: "center" }}>
                <input value={h.symbol} onChange={e => { const v = [...manualHoldings]; v[i] = { ...v[i], symbol: e.target.value.toUpperCase().replace(/[^A-Z0-9.-]/g, "").slice(0, 6) }; setManualHoldings(v); }} placeholder="AAPL" style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, padding: "4px 6px", borderRadius: 4, fontSize: 12, fontFamily: mono, fontWeight: 600, textAlign: "center", outline: "none" }} />
                <input value={h.name} onChange={e => { const v = [...manualHoldings]; v[i] = { ...v[i], name: e.target.value }; setManualHoldings(v); }} placeholder="Apple Inc." style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.sub, padding: "4px 6px", borderRadius: 4, fontSize: 11, outline: "none" }} />
                <select value={h.type} onChange={e => { const v = [...manualHoldings]; v[i] = { ...v[i], type: e.target.value }; setManualHoldings(v); }} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, padding: "4px", borderRadius: 4, fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>
                  {["stock","etf","crypto","commodity","bond"].map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                </select>
                <input type="number" value={h.weight} onChange={e => { const v = [...manualHoldings]; v[i] = { ...v[i], weight: Math.max(0, Math.min(50, parseFloat(e.target.value) || 0)) }; setManualHoldings(v); }} min="0" max="50" step="0.5" style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.accent, padding: "4px", borderRadius: 4, fontSize: 12, fontFamily: mono, textAlign: "center", outline: "none", width: "100%" }} />
                <button onClick={() => { if (manualHoldings.length > 1) setManualHoldings(manualHoldings.filter((_, j) => j !== i)); }} style={{ background: "transparent", border: "none", color: C.red, cursor: "pointer", fontSize: 14, padding: 0 }}>✕</button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
              <button onClick={() => { if (manualHoldings.length < 15) setManualHoldings([...manualHoldings, { symbol: "", name: "", type: "stock", weight: 5 }]); }} disabled={manualHoldings.length >= 15} style={{ background: C.accentBg, border: `1px solid ${C.accentBorder}`, color: C.accentLight, padding: "5px 14px", borderRadius: 5, fontSize: 11, cursor: manualHoldings.length >= 15 ? "not-allowed" : "pointer", fontWeight: 600, fontFamily: "inherit" }}>+ Add Holding</button>
              <span style={{ color: C.dim, fontSize: 10 }}>({15 - manualHoldings.length} remaining, max 15)</span>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div><div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 3 }}><input value={editName} onChange={e => { setEditName(e.target.value); setPortfolio(prev => ({ ...prev, name: e.target.value })); }} style={{ background: "transparent", border: "none", borderBottom: `1px solid ${C.border}`, color: C.text, fontSize: 20, fontWeight: 800, fontFamily: "inherit", outline: "none", flex: 1, padding: "2px 0" }} /><input value={editTicker} onChange={e => { const v = e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5); setEditTicker(v); setPortfolio(prev => ({ ...prev, ticker: v })); }} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.accentLight, fontSize: 13, fontFamily: mono, fontWeight: 600, outline: "none", width: 70, textAlign: "center", padding: "4px 6px", borderRadius: 6 }} maxLength={5} /></div><p style={{ color: C.sub, fontSize: 13, margin: 0 }}>{portfolio.strategy}</p>{<div style={{ display: "flex", gap: 12, marginTop: 8, alignItems: "center" }}><span style={{ color: C.dim, fontSize: 12, fontFamily: mono }}>NAV: <strong style={{ color: currentNAV >= SEED_CAPITAL ? C.green : C.red, fontSize: 15 }}>{fmtUSD(currentNAV)}</strong></span><span style={{ color: currentNAV >= SEED_CAPITAL ? C.green : currentNAV < SEED_CAPITAL ? C.red : C.text, fontSize: 13, fontWeight: 700, fontFamily: mono }}>{currentNAV >= SEED_CAPITAL ? "+" : ""}{fmt((currentNAV / SEED_CAPITAL - 1) * 100, 2)}%</span><span style={{ color: currentNAV >= SEED_CAPITAL ? C.green : currentNAV < SEED_CAPITAL ? C.red : C.text, fontSize: 12, fontFamily: mono }}>({currentNAV >= SEED_CAPITAL ? "+" : ""}{fmtUSD(currentNAV - SEED_CAPITAL)})</span></div>}{portfolio.weeklyOutlook && <p style={{ color: C.teal, fontSize: 12, margin: "6px 0 0", fontStyle: "italic" }}>📅 {portfolio.weeklyOutlook}</p>}{(portfolio.riskProfile || portfolio.targetReturn) && <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>{portfolio.riskProfile && <span style={{ ...badge(portfolio.riskProfile === "aggressive" ? C.red : portfolio.riskProfile === "conservative" ? C.teal : C.gold) }}>{portfolio.riskProfile}</span>}{portfolio.targetReturn && <span style={{ color: C.dim, fontSize: 11, fontFamily: mono }}>Return: {portfolio.targetReturn}</span>}{portfolio.targetVolatility && <span style={{ color: C.dim, fontSize: 11, fontFamily: mono }}>Vol: {portfolio.targetVolatility}</span>}{portfolio.sharpeTarget && <span style={{ color: C.dim, fontSize: 11, fontFamily: mono }}>Sharpe: {portfolio.sharpeTarget}</span>}{portfolio.sortinoTarget && <span style={{ color: C.dim, fontSize: 11, fontFamily: mono }}>Sortino: {portfolio.sortinoTarget}</span>}{portfolio.maxDrawdown && <span style={{ color: C.dim, fontSize: 11, fontFamily: mono }}>Max DD: {portfolio.maxDrawdown}</span>}{portfolio.rebalanceFrequency && <span style={{ color: C.dim, fontSize: 11, fontFamily: mono }}>Rebal: {portfolio.rebalanceFrequency}</span>}{portfolio.userRebalFreq && !portfolio.rebalanceFrequency && <span style={{ color: C.dim, fontSize: 11, fontFamily: mono }}>Rebal: {portfolio.userRebalFreq}</span>}{portfolio.benchmark && <span style={{ color: C.dim, fontSize: 11, fontFamily: mono }}>Bench: {portfolio.benchmark}</span>}{portfolio.userTimeHorizon && <span style={{ color: C.dim, fontSize: 11, fontFamily: mono }}>Horizon: {portfolio.userTimeHorizon}</span>}</div>}</div>
              <div style={{ textAlign: "right" }}><div style={{ color: currentNAV >= SEED_CAPITAL ? C.green : C.red, fontSize: 22, fontWeight: 800, fontFamily: mono }}>{fmtUSD(currentNAV)}</div><div style={{ color: C.sub, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>Expense Ratio: <input type="number" value={editFee} onChange={e => { const v = Math.max(0, Math.min(5, parseFloat(e.target.value) || 0)); setEditFee(v); setPortfolio(prev => prev ? { ...prev, fee: v } : prev); }} step="0.05" min="0" max="5" style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.accent, width: 52, fontSize: 12, fontFamily: mono, padding: "2px 4px", borderRadius: 4, textAlign: "center", outline: "none" }} />%/yr</div><div style={{ color: C.dim, fontSize: 10.5 }}>({fmt(editFee / 12, 3)}%/mo · ${fmtUSD(Math.round(currentNAV * editFee / 100 / 12))}/mo)</div></div>
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

          <div style={{ ...cardS(), padding: 0, overflow: "hidden", marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 18px", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 10, color: C.dim, fontFamily: mono, textTransform: "uppercase", letterSpacing: 0.5 }}>HOLDINGS</span>
                <span style={{ ...badge(C.green), fontSize: 10 }}>{portfolio.holdings.length - excludedIdx.size} active</span>
                {excludedIdx.size > 0 && <span style={{ ...badge(C.red), fontSize: 10 }}>{excludedIdx.size} removed</span>}
              </div>
              {excludedIdx.size > 0 && <button onClick={() => { let cashDeduct = 0; excludedIdx.forEach(i => { cashDeduct += liveAllocations[i] || portfolio.holdings[i]?.allocation || 0; }); setCashBalance(prev => Math.max(0, prev - cashDeduct)); setTransactions(prev => [...prev, { type: "RESTORE", symbol: "ALL", amount: Math.round(cashDeduct), ts: Date.now(), reason: `Restored ${excludedIdx.size} holdings. $${Math.round(cashDeduct).toLocaleString()} moved from cash back to positions.` }]); setExcludedIdx(new Set()); }} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.sub, fontSize: 10.5, padding: "3px 10px", borderRadius: 4, cursor: "pointer", fontFamily: "inherit" }}>Restore All</button>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "38px 56px 1fr 72px 110px 120px", padding: "8px 18px", borderBottom: `1px solid ${C.border}`, fontSize: 10, color: C.dim, fontFamily: mono, textTransform: "uppercase", letterSpacing: 0.5 }}><span>#</span><span>Type</span><span>Holding</span><span>Weight</span><span>Allocation</span><span style={{ textAlign: "center" }}>Actions</span></div>
            {portfolio.holdings.map((h, i) => {
              const isExcluded = excludedIdx.has(i);
              const liveVal = liveAllocations[i] || h.allocation;
              const liveActiveTotal = portfolio.holdings.reduce((s, hh, j) => s + (excludedIdx.has(j) ? 0 : (liveAllocations[j] || hh.allocation)), 0);
              const adjWeight = isExcluded ? 0 : (liveVal / liveActiveTotal * 100);
              const adjAlloc = isExcluded ? 0 : Math.round(liveVal);
              return (
              <div key={i} style={{ opacity: isExcluded ? 0.4 : 1, transition: "opacity .2s" }}>
                <div style={{ display: "grid", gridTemplateColumns: "38px 56px 1fr 72px 110px 120px", padding: "12px 18px", borderBottom: `1px solid ${C.border}`, alignItems: "center", background: openIdx === i ? C.surface : "transparent", transition: "background .12s" }}>
                  <span style={{ color: C.dim, fontSize: 12, fontFamily: mono }}>{String(i + 1).padStart(2, "0")}</span>
                  <span style={badge(TC[h.type])}>{h.type}</span>{h.action === "SHORT" && <span style={{ ...badge("#f59e0b"), fontSize: 8, marginLeft: 2 }}>SHORT</span>}
                  <div onClick={() => setOpenIdx(openIdx === i ? null : i)} style={{ cursor: "pointer" }}><div style={{ color: C.text, fontSize: 13.5, fontWeight: 600, textDecoration: isExcluded ? "line-through" : "none" }}>{h.symbol}</div><div style={{ color: C.sub, fontSize: 11.5 }}>{h.name}</div>{h.description && <div style={{ color: C.dim, fontSize: 10, marginTop: 1, maxWidth: 350, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.description}</div>}</div>
                  <span style={{ color: C.text, fontFamily: mono, fontSize: 12.5 }}>{isExcluded ? "—" : fmt(adjWeight, 1) + "%"}</span>
                  <span style={{ color: C.text, fontFamily: mono, fontSize: 12.5 }}>{isExcluded ? "—" : fmtUSD(Math.round(liveAllocations[i] || h.allocation))}</span>
                  <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                    <button onClick={(e) => { e.stopPropagation(); const n = new Set(excludedIdx); if (isExcluded) { n.delete(i); const restoreVal = liveAllocations[i] || 0; if (restoreVal > 0) setCashBalance(prev => Math.max(0, prev - restoreVal)); } else { n.add(i); const liqVal = liveAllocations[i] || h.allocation; setCashBalance(prev => prev + liqVal); setTransactions(prev => [...prev, { type: "LIQUIDATE", symbol: h.symbol, amount: Math.round(liqVal), ts: Date.now(), reason: `Removed ${h.symbol}. $${Math.round(liqVal).toLocaleString()} to cash.` }]); } setExcludedIdx(n); }} style={{ background: isExcluded ? "rgba(239,68,68,.1)" : "rgba(34,197,94,.1)", border: `1px solid ${isExcluded ? "rgba(239,68,68,.3)" : "rgba(34,197,94,.3)"}`, color: isExcluded ? C.red : C.green, fontSize: 10.5, padding: "4px 10px", borderRadius: 4, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>{isExcluded ? "✗ Removed" : "✓ Keep"}</button>
                    <button onClick={(e) => { e.stopPropagation(); refreshHolding(i); }} disabled={refreshingIdx !== null} title="AI generates a replacement" style={{ background: refreshingIdx === i ? "rgba(45,212,191,.15)" : "rgba(99,102,241,.08)", border: `1px solid ${refreshingIdx === i ? "rgba(45,212,191,.4)" : "rgba(99,102,241,.2)"}`, color: refreshingIdx === i ? C.teal : "#818cf8", fontSize: 10.5, padding: "4px 8px", borderRadius: 4, cursor: refreshingIdx !== null ? "not-allowed" : "pointer", fontWeight: 600, fontFamily: "inherit" }}>{refreshingIdx === i ? "⏳" : "🔄"}</button>
                  </div>
                </div>
                {openIdx === i && <div style={{ padding: "14px 18px 14px 18px", background: C.surface, borderBottom: `1px solid ${C.border}`, fontSize: 13, color: C.sub, lineHeight: 1.7 }}>
                  {h.description && <p style={{ color: C.text, fontSize: 12.5, margin: "0 0 8px", fontStyle: "italic", borderLeft: `2px solid ${C.accent}`, paddingLeft: 10 }}>{h.description}</p>}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>{h.role && <span style={{ ...badge(h.role === "Hedge" ? C.teal : h.role === "Core" ? C.accent : h.role === "Growth Kicker" ? C.gold : h.role === "Income" ? C.green : C.sub) }}>{h.role}</span>}{h.sector && <span style={{ ...badge(C.dim) }}>{h.sector}</span>}{h.marketCap && h.marketCap !== "N/A" && <span style={{ ...badge(C.dim) }}>{h.marketCap}</span>}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>{h.action && <span style={{ ...badge(h.action === "BUY" ? C.green : h.action === "SHORT" ? "#f59e0b" : h.action === "SELL" ? C.red : C.teal), fontSize: 10 }}>{h.action}</span>}{h.conviction && <span style={{ ...badge(h.conviction === "high" ? C.green : h.conviction === "medium" ? C.gold : C.dim), fontSize: 10 }}>{h.conviction} conviction</span>}{(() => { const lv = liveAllocations[i] || h.allocation; const pnl = ((lv / h.allocation) - 1) * 100; return <span style={{ color: pnl >= 0 ? C.green : C.red, fontSize: 11, fontWeight: 700, fontFamily: mono }}>P&L: {pnl >= 0 ? "+" : ""}{fmt(pnl, 1)}% ({fmtUSD(Math.round(lv - h.allocation))})</span>; })()}{h.priceTarget && <span style={{ color: C.green, fontSize: 11, fontFamily: mono }}>Target: {h.priceTarget}</span>}{h.stopLoss && <span style={{ color: C.red, fontSize: 11, fontFamily: mono }}>Stop: {h.stopLoss}</span>}</div>
                  {h.thesisConnection && <div style={{ marginBottom: 10, padding: "8px 12px", background: C.accentBg, border: `1px solid ${C.accentBorder}`, borderRadius: 6 }}><span style={{ color: C.accentLight, fontWeight: 700, fontSize: 10, fontFamily: mono, letterSpacing: 0.3 }}>THESIS CONNECTION: </span><span style={{ color: C.text, fontSize: 12 }}>{h.thesisConnection}</span></div>}
                  {h.financialMetrics && <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 10 }}>
                    {[["Mkt Cap", h.financialMetrics.marketCapValue], ["LTM Rev", h.financialMetrics.ltmRevenue], ["EBITDA", h.financialMetrics.ebitda], ["EV/Rev", h.financialMetrics.evRevenue], ["EV/EBITDA", h.financialMetrics.evEbitda], ["P/E", h.financialMetrics.peRatio], ["Rev Growth", h.financialMetrics.revenueGrowth], ["Div Yield", h.financialMetrics.dividendYield]].filter(([,v]) => v && v !== "N/A").map(([k, v]) => (
                      <div key={k} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 5, padding: "5px 8px", textAlign: "center" }}>
                        <div style={{ color: C.dim, fontSize: 8, fontFamily: mono, fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase" }}>{k}</div>
                        <div style={{ color: C.text, fontSize: 11, fontWeight: 600, fontFamily: mono }}>{v}</div>
                      </div>
                    ))}
                  </div>}
                  <div style={{ marginBottom: 10 }}><span style={{ color: C.accent, fontWeight: 700, fontSize: 10.5, fontFamily: mono, letterSpacing: 0.3 }}>AI RATIONALE: </span>{h.rationale}</div>
                  {h.exitTrigger && <div style={{ marginBottom: 10, padding: "8px 12px", background: "rgba(239,68,68,.06)", border: `1px solid rgba(239,68,68,.15)`, borderRadius: 6 }}><span style={{ color: C.red, fontWeight: 700, fontSize: 10.5, fontFamily: mono, letterSpacing: 0.3 }}>EXIT TRIGGER: </span><span style={{ color: C.sub, fontSize: 12 }}>{h.exitTrigger}</span></div>}
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, padding: "8px 12px", background: C.card, borderRadius: 6, border: `1px solid ${C.border}` }}>
                    <span style={{ color: C.dim, fontSize: 10, fontFamily: mono, fontWeight: 600 }}>ADJUST WEIGHT:</span>
                    <input type="number" min="0" max="40" step="0.5" value={editingWeights[i] !== undefined ? editingWeights[i] : adjWeight} onChange={e => { const w = Math.max(0, Math.min(40, parseFloat(e.target.value) || 0)); setEditingWeights(prev => ({ ...prev, [i]: w })); const holdingsTotal = portfolio.holdings.reduce((s2, hh, j) => s2 + (excludedIdx.has(j) ? 0 : (liveAllocations[j] || hh.allocation)), 0); const navForCalc = holdingsTotal + cashBalance; const newAlloc = Math.round((w / 100) * navForCalc); const oldAlloc = Math.round(liveAllocations[i] || h.allocation); const delta = newAlloc - oldAlloc; setCashBalance(prev => Math.max(0, prev - delta)); setLiveAllocations(prev => ({ ...prev, [i]: newAlloc })); if (Math.abs(delta) > 10) setTransactions(prev => [...prev, { type: delta > 0 ? "BUY" : "TRIM", symbol: h.symbol, amount: Math.abs(Math.round(delta)), ts: Date.now(), reason: `Weight adjusted to ${fmt(w,1)}%. ${delta > 0 ? "Bought" : "Trimmed"} ${fmtUSD(Math.abs(Math.round(delta)))} ${delta > 0 ? "from cash" : "to cash"}.` }]); }} style={{ width: 60, background: C.surface, border: `1px solid ${C.border}`, color: C.text, padding: "4px 6px", borderRadius: 4, fontSize: 12, fontFamily: mono, textAlign: "center", outline: "none" }} />
                    <span style={{ color: C.sub, fontSize: 11 }}>% = {fmtUSD(Math.round(liveAllocations[i] || h.allocation))}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <button onClick={() => { const n = new Set(excludedIdx); if (isExcluded) { n.delete(i); const restoreVal = liveAllocations[i] || 0; if (restoreVal > 0) setCashBalance(prev => Math.max(0, prev - restoreVal)); } else { n.add(i); const liqVal = liveAllocations[i] || h.allocation; setCashBalance(prev => prev + liqVal); setTransactions(prev => [...prev, { type: "LIQUIDATE", symbol: h.symbol, amount: Math.round(liqVal), ts: Date.now(), reason: `Removed ${h.symbol} from portfolio. $${Math.round(liqVal).toLocaleString()} proceeds moved to cash.` }]); } setExcludedIdx(n); }} style={{ background: isExcluded ? "rgba(34,197,94,.1)" : "rgba(239,68,68,.08)", border: `1px solid ${isExcluded ? "rgba(34,197,94,.3)" : "rgba(239,68,68,.2)"}`, color: isExcluded ? C.green : C.red, fontSize: 11, padding: "6px 16px", borderRadius: 5, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>{isExcluded ? "✓ Add Back to Portfolio" : "✗ Remove from Portfolio"}</button>
                    {!isExcluded && <button onClick={() => sellToCash(i)} style={{ background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.15)", color: C.red, fontSize: 11, padding: "6px 16px", borderRadius: 5, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>💵 Sell to Cash</button>}
                    {!isExcluded && h.action !== "SHORT" && <button onClick={() => shortHolding(i)} style={{ background: "rgba(245,158,11,.06)", border: "1px solid rgba(245,158,11,.2)", color: "#f59e0b", fontSize: 11, padding: "6px 16px", borderRadius: 5, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>📉 Short</button>}
                    <button onClick={() => refreshHolding(i)} disabled={refreshingIdx !== null} style={{ background: "rgba(99,102,241,.08)", border: "1px solid rgba(99,102,241,.2)", color: "#818cf8", fontSize: 11, padding: "6px 16px", borderRadius: 5, cursor: refreshingIdx !== null ? "not-allowed" : "pointer", fontWeight: 600, fontFamily: "inherit" }}>{refreshingIdx === i ? "⏳ Refreshing..." : "🔄 Replace"}</button>
                    <span onClick={() => setOpenIdx(null)} style={{ color: C.dim, fontSize: 11.5, cursor: "pointer", padding: "6px 12px" }}>▲ Collapse</span>
                  </div>
                </div>}
              </div>
            );})}
          </div>

          <div style={{ ...cardS(), marginBottom: 14 }}>
            <div style={{ fontSize: 10.5, color: C.dim, marginBottom: 7, fontFamily: mono, letterSpacing: 0.3 }}>ALLOCATION BREAKDOWN {excludedIdx.size > 0 ? `(${portfolio.holdings.length - excludedIdx.size} of ${portfolio.holdings.length} active)` : ""}</div>
            <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", height: 22 }}>
              {portfolio.holdings.map((h, i) => { if (excludedIdx.has(i)) return null; const liveVal = liveAllocations[i] || h.allocation; const liveActiveTotal = portfolio.holdings.reduce((s, hh, j) => s + (excludedIdx.has(j) ? 0 : (liveAllocations[j] || hh.allocation)), 0); const adjW = liveVal / liveActiveTotal * 100; return <div key={i} title={`${h.symbol}: ${fmt(adjW, 1)}% (${fmtUSD(Math.round(liveVal))})`} style={{ width: `${adjW}%`, background: TC[h.type] || C.accent, opacity: 0.55 + (i % 3) * 0.15, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8.5, color: "#fff", fontWeight: 700, borderRight: "1px solid rgba(0,0,0,.3)" }}>{adjW >= 8 ? h.symbol : ""}</div>; })}
            </div>
          </div>

          {/* Cash Position */}
          {(cashBalance > 0 || portfolio.cashPosition?.amount > 0) && (
            <div style={{ ...cardS(), marginBottom: 14, borderColor: "rgba(45,212,191,.25)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 10.5, color: C.dim, marginBottom: 4, fontFamily: mono, letterSpacing: 0.3 }}>CASH — MONEY MARKET (4.5% APY)</div>
                  <div style={{ color: C.teal, fontSize: 24, fontWeight: 800, fontFamily: mono }}>{fmtUSD(Math.round(cashBalance))}</div>
                  <div style={{ color: C.dim, fontSize: 11.5, marginTop: 2 }}>Accruing {fmt(DAILY_MM_RATE * 100, 4)}% daily &bull; Est. {fmtUSD(Math.round(cashBalance * MONEY_MARKET_RATE))}/yr</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: C.green, fontSize: 13, fontWeight: 700, fontFamily: mono }}>{fmt(cashBalance / currentNAV * 100, 1)}% of NAV</div>
                  {portfolio.cashPosition?.rationale && <div style={{ color: C.sub, fontSize: 11.5, maxWidth: 280, marginTop: 4 }}>{portfolio.cashPosition.rationale}</div>}
                </div>
              </div>
            </div>
          )}

          {/* NAV Tracking Chart */}
          {navHistory.length > 1 && (
            <div style={{ ...cardS(), marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 10.5, color: C.dim, fontFamily: mono, letterSpacing: 0.3 }}>ETF NAV TRACKING — {portfolio.ticker || "SIM"}</div>
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
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}`, fontSize: 12, alignItems: "center" }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ ...badge(tx.type === "BUY" ? C.green : tx.type === "SELL" || tx.type === "AUTO-SELL" ? C.red : tx.type === "SHORT" ? "#f59e0b" : tx.type === "FEE" ? "#a855f7" : C.teal), fontSize: 9, minWidth: 44, textAlign: "center" }}>{tx.type}</span>
                      <span style={{ color: C.text, fontWeight: 600, fontFamily: mono, fontSize: 12 }}>{tx.symbol}</span>
                      <span style={{ color: C.dim, fontSize: 10.5 }}>{tx.reason}</span>
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
            {portfolio.factorExposure && (
              <div style={cardS()}>
                <div style={{ fontSize: 10.5, color: C.dim, marginBottom: 10, fontFamily: mono, letterSpacing: 0.3 }}>FACTOR EXPOSURE</div>
                <div style={{ display: "grid", gap: 5 }}>
                  {Object.entries(portfolio.factorExposure).map(([k, v]) => {
                    const level = typeof v === "string" ? v.split("—")[0].trim().toLowerCase() : "";
                    const color = level === "high" ? C.green : level === "medium" ? C.gold : C.dim;
                    return <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}><span style={{ color: C.sub, fontSize: 12, textTransform: "capitalize" }}>{k}</span><span style={{ color, fontSize: 11.5, fontFamily: mono, fontWeight: 600, maxWidth: "65%", textAlign: "right" }}>{typeof v === "string" ? v.split("—")[0].trim() : v}</span></div>;
                  })}
                </div>
              </div>
            )}
            {portfolio.incomeProjection && (
              <div style={cardS()}>
                <div style={{ fontSize: 10.5, color: C.dim, marginBottom: 10, fontFamily: mono, letterSpacing: 0.3 }}>INCOME PROJECTION</div>
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
                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                    <div style={{ fontSize: 10.5, color: C.dim, marginBottom: 8, fontFamily: mono, letterSpacing: 0.3 }}>USER-DEFINED AUTO-SELL THRESHOLD</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ color: C.sub, fontSize: 12.5 }}>Auto-sell when any position drifts ±</span>
                      <input type="number" value={autoSellPct} onChange={e => setAutoSellPct(Math.max(0, Math.min(50, parseFloat(e.target.value) || 0)))} step="1" min="0" max="50" style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.accent, width: 52, fontSize: 13, fontFamily: mono, padding: "4px 6px", borderRadius: 4, textAlign: "center", outline: "none" }} />
                      <span style={{ color: C.sub, fontSize: 12.5 }}>% from target weight</span>
                      {autoSellPct > 0 && <span style={{ ...badge(C.green), fontSize: 10 }}>ACTIVE</span>}
                      {autoSellPct === 0 && <span style={{ color: C.dim, fontSize: 11, fontStyle: "italic" }}>(set to 0 = disabled)</span>}
                    </div>
                    {autoSellPct > 0 && <p style={{ color: C.dim, fontSize: 11, marginTop: 6, marginBottom: 0 }}>If any holding moves ±{autoSellPct}% from its original allocation, it will be automatically sold to cash. This protects against large drawdowns and locks in gains.</p>}
                  </div>
                </div>
              )}
              {!portfolio.rebalanceRules && (
                <div style={cardS()}>
                  <div style={{ fontSize: 10.5, color: C.dim, marginBottom: 8, fontFamily: mono, letterSpacing: 0.3 }}>AUTO-SELL THRESHOLD</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ color: C.sub, fontSize: 12.5 }}>Auto-sell when any position drifts ±</span>
                    <input type="number" value={autoSellPct} onChange={e => setAutoSellPct(Math.max(0, Math.min(50, parseFloat(e.target.value) || 0)))} step="1" min="0" max="50" style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.accent, width: 52, fontSize: 13, fontFamily: mono, padding: "4px 6px", borderRadius: 4, textAlign: "center", outline: "none" }} />
                    <span style={{ color: C.sub, fontSize: 12.5 }}>% from target weight</span>
                    {autoSellPct > 0 && <span style={{ ...badge(C.green), fontSize: 10 }}>ACTIVE</span>}
                    {autoSellPct === 0 && <span style={{ color: C.dim, fontSize: 11, fontStyle: "italic" }}>(set to 0 = disabled)</span>}
                  </div>
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

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => { weeklyUpdate(); }} disabled={loading || refreshingIdx !== null} style={{ ...btnP(), fontSize: 12.5, padding: "8px 16px", background: loading ? C.surface : "rgba(45,212,191,.1)", color: loading ? C.dim : C.teal, border: `1px solid ${loading ? C.border : "rgba(45,212,191,.3)"}` }}>{loading ? "⏳ Updating..." : `🔄 ${(portfolio.userRebalFreq || rebalFreq || "weekly").charAt(0).toUpperCase() + (portfolio.userRebalFreq || rebalFreq || "weekly").slice(1)} Review`}</button>
            <button onClick={() => { setPortfolio(null); setThesis(""); setSaved(false); setExcludedIdx(new Set()); setCashBalance(0); setTransactions([]); setNavHistory([]); setLiveAllocations({}); setRebalDeadline(null); setRebalCountdown(""); setEditingWeights({}); }} style={btnO()}>Start Over</button>
            <button onClick={() => {
              const h = portfolio.holdings.slice(0, 5).map(h => `${h.symbol} (${h.weight}%)`).join(", ");
              const txt = `${portfolio.name}${portfolio.ticker ? " (" + portfolio.ticker + ")" : ""}\n${portfolio.strategy}\n\nTop holdings: ${h}\nRisk: ${portfolio.riskProfile || "moderate"} | Target: ${portfolio.targetReturn || "—"} | Fee: ${portfolio.fee}%\n\nBuilt with ETF Simulator`;
              navigator.clipboard.writeText(txt).then(() => { const btn = document.activeElement; if (btn) { btn.textContent = "✓ Copied!"; setTimeout(() => { btn.textContent = "📋 Share"; }, 1500); } });
            }} style={btnO()}>📋 Share</button>
            {saved ? <span style={{ ...btnP(), opacity: 0.5, cursor: "default" }}>✓ Saved</span> : <button onClick={() => { if (!user) { setPendingSave(true); openAuth("signin"); return; } setShowSaveModal(true); }} style={btnP()}>Save Portfolio ◆</button>}
          </div>

          {/* Save Modal — public/private choice */}
          {showSaveModal && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 998 }} onClick={() => setShowSaveModal(false)}>
              <div onClick={(e) => e.stopPropagation()} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "28px 24px", width: 420, maxWidth: "92vw" }}>
                <h3 style={{ color: C.text, fontSize: 17, margin: "0 0 6px" }}>Save Portfolio</h3>
                <p style={{ color: C.sub, fontSize: 13, margin: "0 0 20px", lineHeight: 1.5 }}>Choose how to save <strong style={{ color: C.text }}>{portfolio.name}</strong>:</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <button onClick={() => { const active = portfolio.holdings.filter((_, i) => !excludedIdx.has(i)); const totalW = active.reduce((s, h) => s + h.weight, 0); const cashAdj = Math.round(cashBalance); const liveTotal = active.reduce((s, h) => { const origIdx = portfolio.holdings.indexOf(h); return s + (liveAllocations[origIdx] || h.allocation); }, 0); const adjusted = { ...portfolio, holdings: active.map(h => { const origIdx = portfolio.holdings.indexOf(h); const liveVal = liveAllocations[origIdx] || h.allocation; return { ...h, weight: Math.round(liveVal / (liveTotal + cashAdj) * 1000) / 10, allocation: Math.round(liveVal), targetWeight: h.weight, currentWeight: Math.round(liveVal / (liveTotal + cashAdj) * 1000) / 10 }; }), value: Math.round(liveTotal + cashAdj), cashBalance: cashAdj, autoSellPct, transactions, navHistory }; savePortfolio(adjusted, false).then(ok => { if (ok) { setSaved(true); setShowSaveModal(false); } }); }} style={{ ...cardS(), cursor: "pointer", border: `1px solid ${C.border}`, textAlign: "left", background: C.surface }}>
                    <div style={{ color: C.text, fontSize: 14, fontWeight: 600, marginBottom: 3 }}>🔒 Keep Private</div>
                    <div style={{ color: C.sub, fontSize: 12 }}>Only you can see this portfolio in "My Portfolios."{excludedIdx.size > 0 ? ` (${portfolio.holdings.length - excludedIdx.size} holdings, ${excludedIdx.size} removed)` : ""}</div>
                  </button>
                  <button onClick={() => { const active = portfolio.holdings.filter((_, i) => !excludedIdx.has(i)); const totalW = active.reduce((s, h) => s + h.weight, 0); const cashAdj2 = Math.round(cashBalance); const liveTotal2 = active.reduce((s, h) => { const origIdx = portfolio.holdings.indexOf(h); return s + (liveAllocations[origIdx] || h.allocation); }, 0); const adjusted = { ...portfolio, holdings: active.map(h => { const origIdx = portfolio.holdings.indexOf(h); const liveVal = liveAllocations[origIdx] || h.allocation; return { ...h, weight: Math.round(liveVal / (liveTotal2 + cashAdj2) * 1000) / 10, allocation: Math.round(liveVal), targetWeight: h.weight, currentWeight: Math.round(liveVal / (liveTotal2 + cashAdj2) * 1000) / 10 }; }), value: Math.round(liveTotal2 + cashAdj2), cashBalance: cashAdj2, autoSellPct, transactions, navHistory }; savePortfolio(adjusted, true).then(ok => { if (ok) { setSaved(true); setShowSaveModal(false); } }); }} style={{ ...cardS(), cursor: "pointer", border: `1px solid ${C.accentBorder}`, textAlign: "left", background: C.accentBg }}>
                    <div style={{ color: C.accentLight, fontSize: 14, fontWeight: 600, marginBottom: 3 }}>📊 Publish to Leaderboard</div>
                    <div style={{ color: C.sub, fontSize: 12 }}>Share with the community. If your portfolio ranks in the top 10 by return, it will appear on the leaderboard.</div>
                  </button>
                </div>
                <button onClick={() => setShowSaveModal(false)} style={{ ...btnO(), width: "100%", marginTop: 14, fontSize: 12.5 }}>Cancel</button>
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

const FINNHUB_KEY = (typeof import.meta !== "undefined" && import.meta.env?.VITE_FINNHUB_API_KEY) || "demo"; // Get free key at finnhub.io/register

// Rate limiter: max 55 requests per minute for Finnhub free tier
const rateLimiter = { queue: [], lastMinute: [], maxPerMin: 55 };
function finnhubFetch(url) {
  const now = Date.now();
  rateLimiter.lastMinute = rateLimiter.lastMinute.filter(t => now - t < 60000);
  if (rateLimiter.lastMinute.length >= rateLimiter.maxPerMin) {
    return Promise.resolve(new Response(JSON.stringify({ s: "rate_limited" }), { status: 429 }));
  }
  rateLimiter.lastMinute.push(now);
  return fetch(url);
}

function Portfolios({ user, openAuth, portfolios, go, updatePortfolio }) {
  const [btIdx, setBtIdx] = useState(null); const [btMonths, setBtMonths] = useState(12); const [btData, setBtData] = useState(null);
  const [rebalIdx, setRebalIdx] = useState(null);
  const portfoliosRef = useRef(portfolios); portfoliosRef.current = portfolios;

  // Real-time tracking — fetch live quotes for holding symbols
  useEffect(() => {
    if (!user || portfolios.length === 0) return;
    let cancelled = false;
    const fetchLiveValues = async () => {
      // Get unique symbols across all portfolios
      const allSyms = [...new Set(portfoliosRef.current.flatMap(p => p.holdings.map(h => h.symbol)))];
      // Batch fetch quotes (respect rate limits: max 10 at a time)
      const quotes = {};
      try {
        const batch = allSyms.slice(0, 10); // Limit to avoid rate cap
        await Promise.all(batch.map(sym =>
          finnhubFetch(`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${FINNHUB_KEY}`)
            .then(r => r.json())
            .then(q => { if (q && q.c > 0) quotes[sym] = q; })
            .catch(() => {})
        ));
      } catch (e) { /* proceed with whatever we got */ }
      if (cancelled) return;

      portfoliosRef.current.forEach((p, idx) => {
        let newVal;
        const hasLiveData = p.holdings.some(h => quotes[h.symbol]);
        if (hasLiveData) {
          // Compute portfolio value from live prices
          const initialPrice = p.holdings.reduce((s, h) => s + h.allocation, 0) || 1000000;
          let liveTotal = 0;
          const newHoldings = p.holdings.map(h => {
            const q = quotes[h.symbol];
            if (q) {
              // Estimate shares from original allocation at a reference price
              const refPrice = q.pc || q.c; // previous close as reference
              const shares = h.allocation / refPrice;
              const holdingVal = shares * q.c;
              const pctChange = ((q.c - q.pc) / q.pc) * 100;
              liveTotal += holdingVal;
              return { ...h, currentWeight: h.weight + pctChange * 0.3, livePrice: q.c, dailyChange: pctChange };
            }
            liveTotal += h.allocation;
            return { ...h, currentWeight: h.currentWeight || h.weight };
          });
          // Normalize weights
          const totalW = newHoldings.reduce((s, h) => s + Math.max(0.1, h.currentWeight), 0);
          const normalized = newHoldings.map(h => ({ ...h, currentWeight: Math.round((Math.max(0.1, h.currentWeight) / totalW) * 1000) / 10 }));
          newVal = Math.round(liveTotal);
          const newTracking = [...(p.trackingData || []), { ts: Date.now(), value: newVal }].slice(-200);
          updatePortfolio(idx, { ...p, value: newVal, trackingData: newTracking, holdings: normalized, liveData: true });
        } else {
          // Fallback: conservative simulated drift if no live data
          const drift = (sr(Date.now() / 1000 + idx * 100) - 0.48) * p.value * 0.0002;
          newVal = Math.round(p.value + drift);
          const newTracking = [...(p.trackingData || []), { ts: Date.now(), value: newVal }].slice(-200);
          const newHoldings = p.holdings.map(h => {
            const d = (sr(Date.now() / 1000 + h.symbol.charCodeAt(0)) - 0.5) * 1.2;
            return { ...h, currentWeight: Math.max(1, (h.currentWeight || h.weight) + d) };
          });
          const totalW = newHoldings.reduce((s, h) => s + h.currentWeight, 0);
          const normalized = newHoldings.map(h => ({ ...h, currentWeight: Math.round((h.currentWeight / totalW) * 1000) / 10 }));
          updatePortfolio(idx, { ...p, value: newVal, trackingData: newTracking, holdings: normalized });
        }
      });
    };
    fetchLiveValues(); // Initial fetch
    const iv = setInterval(fetchLiveValues, 30000); // Every 30s
    return () => { cancelled = true; clearInterval(iv); };
  }, [user, portfolios.length]);

  const runBacktest = (idx, months) => { setBtIdx(idx); setBtMonths(months); setBtData(genBacktest(months, portfolios[idx].id || idx, portfolios[idx].holdings)); setRebalIdx(null); };

  const doRebalance = (idx) => {
    const p = portfolios[idx];
    const totalVal = p.value || 1000000;
    const rebalanced = p.holdings.map(h => ({ ...h, currentWeight: h.targetWeight, allocation: Math.round((h.targetWeight / 100) * totalVal) }));
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

  return (
    <div style={{ maxWidth: 940, margin: "0 auto", padding: "36px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div><h1 style={{ color: C.text, fontSize: 26, margin: "0 0 3px" }}>My Portfolios</h1><p style={{ color: C.sub, fontSize: 13, margin: 0 }}>{portfolios.length}/3 used (Free tier) · Values update in real time</p></div>
        <button onClick={() => go("builder")} style={btnP()}>+ New ETF</button>
      </div>

      {portfolios.length === 0 ? (
        <div style={{ ...cardS(), textAlign: "center", padding: 44 }}><div style={{ marginBottom: 12 }}><Logo size={40} /></div><h3 style={{ color: C.text, fontSize: 17, margin: "0 0 6px" }}>No portfolios yet</h3><p style={{ color: C.sub, fontSize: 13.5, marginBottom: 18 }}>Build your first AI-generated ETF in seconds.</p><button onClick={() => go("builder")} style={btnP()}>Build Your First ETF →</button></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {portfolios.map((p, idx) => {
            const gain = ((p.value - 1000000) / 1000000) * 100;
            const isBtOpen = btIdx === idx; const isRbOpen = rebalIdx === idx;
            const trackPts = (p.trackingData || []).length > 1 ? p.trackingData.map((t) => ({ price: t.value })) : null;
            // Calculate max drift from target
            const maxDrift = p.holdings ? Math.max(...p.holdings.map(h => Math.abs((h.currentWeight || h.weight) - (h.targetWeight || h.weight)))) : 0;
            const needsRebalance = maxDrift > (p.rebalanceThreshold || 5);

            return (
              <div key={idx} style={cardS()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ color: C.text, fontSize: 16, margin: "0 0 3px" }}>{p.name}</h3>
                    <p style={{ color: C.sub, fontSize: 12, margin: "0 0 8px" }}>{p.strategy}</p>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {p.holdings.map((h) => <span key={h.symbol} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 3, background: C.surface, color: C.sub, border: `1px solid ${C.border}` }}>{h.symbol}</span>)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", minWidth: 150 }}>
                    <div style={{ color: C.text, fontSize: 19, fontWeight: 800, fontFamily: mono }}>{fmtUSD(p.value)}</div>
                    <div style={{ color: gain >= 0 ? C.green : C.red, fontSize: 13, fontFamily: mono }}>{gain >= 0 ? "+" : ""}{fmt(gain)}%</div>
                    <div style={{ color: C.dim, fontSize: 11, marginTop: 2 }}>Fee: {p.fee}% · <span style={{ color: C.green, fontSize: 10 }}>{"●"} LIVE</span></div>
                    {trackPts && <div style={{ marginTop: 6 }}><SparkLine data={trackPts} w={110} h={28} /></div>}
                  </div>
                </div>

                {/* Action buttons row */}
                <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}>
                  {/* Auto-Rebalance */}
                  <button onClick={() => { setRebalIdx(isRbOpen ? null : idx); setBtIdx(null); setBtData(null); }}
                    style={{ ...btnO(), fontSize: 11, padding: "4px 12px", borderColor: needsRebalance ? C.gold : C.border, color: needsRebalance ? C.gold : C.sub }}>
                    {needsRebalance ? "⚠ Rebalance Needed" : "⚖ Rebalance"}
                  </button>
                  <span style={{ color: C.dim, fontSize: 10, fontFamily: mono }}>|</span>
                  <span style={{ color: C.dim, fontSize: 11, fontFamily: mono }}>BACKTEST:</span>
                  {[6, 12, 24, 36, 60].map((m) => <button key={m} onClick={() => { runBacktest(idx, m); setRebalIdx(null); }} style={{ background: isBtOpen && btMonths === m ? C.accentBg : "transparent", border: isBtOpen && btMonths === m ? `1px solid ${C.accentBorder}` : `1px solid ${C.border}`, color: isBtOpen && btMonths === m ? C.accentLight : C.sub, padding: "3px 10px", borderRadius: 4, fontSize: 11, cursor: "pointer", fontFamily: mono }}>{m}mo</button>)}
                  {(isBtOpen || isRbOpen) && <button onClick={() => { setBtIdx(null); setBtData(null); setRebalIdx(null); }} style={{ ...btnO(), fontSize: 11, padding: "4px 12px" }}>Close</button>}
                  <span style={{ color: C.dim, fontSize: 10, fontFamily: mono }}>|</span>
                  <button onClick={() => {
                    const report = { name: p.name, ticker: p.ticker, strategy: p.strategy, riskProfile: p.riskProfile, benchmark: p.benchmark, fee: p.fee, value: p.value, createdAt: p.createdAt, thesis: p.thesis, fundSummary: p.fundSummary, macroAnalysis: p.macroAnalysis, assetAllocation: p.assetAllocation, factorExposure: p.factorExposure, holdings: p.holdings.map(h => ({ symbol: h.symbol, name: h.name, type: h.type, weight: h.weight, allocation: h.allocation, role: h.role, sector: h.sector, rationale: h.rationale, exitTrigger: h.exitTrigger })), riskAnalysis: p.riskAnalysis, incomeProjection: p.incomeProjection, esgConsiderations: p.esgConsiderations, rebalanceRules: p.rebalanceRules };
                    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a"); a.href = url; a.download = `${(p.ticker || p.name || "portfolio").replace(/\s+/g, "-")}-report.json`; a.click(); URL.revokeObjectURL(url);
                  }} style={{ ...btnO(), fontSize: 11, padding: "4px 12px" }}>📄 Export Report</button>
                </div>

                {/* Rebalance Panel */}
                {isRbOpen && (
                  <div style={{ marginTop: 14, background: C.surface, borderRadius: 8, padding: 16, border: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <span style={{ color: C.dim, fontSize: 10.5, fontFamily: mono, letterSpacing: 0.3 }}>AUTO-REBALANCE — Drift threshold: {p.rebalanceThreshold || 5}%</span>
                      <button onClick={() => doRebalance(idx)} style={{ ...btnP(), fontSize: 11, padding: "5px 14px" }}>Rebalance Now</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 70px 70px 70px", padding: "6px 0", borderBottom: `1px solid ${C.border}`, fontSize: 10, color: C.dim, fontFamily: mono, textTransform: "uppercase" }}><span>Symbol</span><span>Name</span><span>Target</span><span>Current</span><span>Drift</span></div>
                    {p.holdings.map((h, i) => {
                      const drift = (h.currentWeight || h.weight) - (h.targetWeight || h.weight);
                      return (
                        <div key={i} style={{ display: "grid", gridTemplateColumns: "80px 1fr 70px 70px 70px", padding: "6px 0", borderBottom: `1px solid ${C.border}`, fontSize: 12, alignItems: "center" }}>
                          <span style={{ color: C.text, fontFamily: mono, fontWeight: 600 }}>{h.symbol}</span>
                          <span style={{ color: C.sub, fontSize: 11 }}>{h.name}</span>
                          <span style={{ color: C.sub, fontFamily: mono }}>{fmt(h.targetWeight || h.weight, 1)}%</span>
                          <span style={{ color: C.text, fontFamily: mono }}>{fmt(h.currentWeight || h.weight, 1)}%</span>
                          <span style={{ color: Math.abs(drift) > (p.rebalanceThreshold || 5) ? C.red : Math.abs(drift) > 2 ? C.gold : C.green, fontFamily: mono, fontWeight: 600 }}>{drift >= 0 ? "+" : ""}{fmt(drift, 1)}%</span>
                        </div>
                      );
                    })}
                    <p style={{ color: C.dim, fontSize: 11, marginTop: 10, lineHeight: 1.4 }}>
                      Clicking "Rebalance Now" resets all holdings to their target weights. In a real portfolio, this would trigger buy/sell orders to restore the original allocation.
                    </p>
                  </div>
                )}

                {/* Performance Simulation Panel */}
                {isBtOpen && btData && (
                  <div style={{ marginTop: 14, background: C.surface, borderRadius: 8, padding: 16, border: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ color: C.dim, fontSize: 10.5, fontFamily: mono, letterSpacing: 0.3 }}>SIMULATED BACKTEST — {btMonths} MONTHS</span>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ color: C.text, fontFamily: mono, fontSize: 14, fontWeight: 700 }}>{fmtUSD(btData[btData.length - 1].value)}</span>
                        {(() => { const ret = ((btData[btData.length - 1].value - 1000000) / 1000000) * 100; return <span style={{ color: ret >= 0 ? C.green : C.red, fontSize: 12, fontFamily: mono, marginLeft: 8 }}>{ret >= 0 ? "+" : ""}{fmt(ret)}%</span>; })()}
                      </div>
                    </div>
                    <BacktestChart data={btData} />
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginTop: 12 }}>
                      {[
                        { l: "Start", v: fmtUSD(1000000) },
                        { l: "End", v: fmtUSD(btData[btData.length - 1].value) },
                        { l: "Peak", v: fmtUSD(Math.max(...btData.map((d) => d.value))) },
                        { l: "Max Drawdown", v: fmt(Math.min(...btData.map((d) => ((d.value - 1000000) / 1000000) * 100)), 1) + "%" },
                      ].map((s) => <div key={s.l} style={{ textAlign: "center" }}><div style={{ color: C.dim, fontSize: 10, marginBottom: 2, fontFamily: mono }}>{s.l}</div><div style={{ color: C.text, fontSize: 12.5, fontWeight: 600, fontFamily: mono }}>{s.v}</div></div>)}
                    </div>
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

function Leaderboard({ publicPortfolios }) {
  const [expanded, setExpanded] = useState(null);
  const sorted = [...publicPortfolios].sort((a, b) => b.gain - a.gain).slice(0, 10);
  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "36px 20px" }}>
      <h1 style={{ color: C.text, fontSize: 26, margin: "0 0 6px" }}>Leaderboard</h1>
      <p style={{ color: C.sub, fontSize: 13.5, margin: "0 0 22px" }}>Top 10 community portfolios ranked by total return. Publish your ETF from the Builder to compete.</p>

      {sorted.length === 0 ? (
        <div style={{ ...cardS(), textAlign: "center", padding: "52px 20px" }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>🏆</div>
          <h3 style={{ color: C.text, fontSize: 18, margin: "0 0 8px" }}>No published portfolios yet</h3>
          <p style={{ color: C.sub, fontSize: 13.5, maxWidth: 400, margin: "0 auto 18px", lineHeight: 1.5 }}>Be the first to publish! Build an AI-powered ETF and choose "Publish to Leaderboard" when saving.</p>
          <p style={{ color: C.dim, fontSize: 11.5, lineHeight: 1.5, maxWidth: 440, margin: "0 auto" }}>Disclaimer: All portfolio values and returns are simulated for educational purposes only. Rankings do not represent real investment performance. This is not financial advice.</p>
        </div>
      ) : (
        <div style={{ ...cardS(), padding: 0, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "46px 1fr 110px 100px 76px 68px", padding: "9px 18px", borderBottom: `1px solid ${C.border}`, fontSize: 10, color: C.dim, fontFamily: mono, textTransform: "uppercase", letterSpacing: 0.4 }}><span>Rank</span><span>Portfolio</span><span>Creator</span><span>Value</span><span>Return</span><span>Fee</span></div>
          {sorted.map((p, i) => (
            <div key={p.id}>
              <div onClick={() => setExpanded(expanded === p.id ? null : p.id)} style={{ display: "grid", gridTemplateColumns: "46px 1fr 110px 100px 76px 68px", padding: "12px 18px", borderBottom: `1px solid ${C.border}`, alignItems: "center", cursor: "pointer", background: expanded === p.id ? C.surface : "transparent" }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: i === 0 ? C.gold : i === 1 ? C.sub : i === 2 ? "#d97706" : C.dim }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}</span>
                <span style={{ color: C.text, fontSize: 13.5, fontWeight: 500 }}>{p.name}</span>
                <span style={{ color: C.sub, fontSize: 12 }}>{p.creator}</span>
                <span style={{ color: C.text, fontFamily: mono, fontSize: 12 }}>{fmtUSD(p.value)}</span>
                <span style={{ color: p.gain >= 0 ? C.green : C.red, fontFamily: mono, fontSize: 12, fontWeight: 600 }}>{p.gain >= 0 ? "+" : ""}{fmt(p.gain)}%</span>
                <span style={{ color: C.sub, fontFamily: mono, fontSize: 12 }}>{p.fee}%</span>
              </div>
              {expanded === p.id && (
                <div style={{ padding: "12px 18px 12px 64px", background: C.surface, borderBottom: `1px solid ${C.border}`, fontSize: 13, color: C.sub, lineHeight: 1.5 }}>
                  <span style={{ color: C.accent, fontWeight: 700, fontSize: 10.5, fontFamily: mono }}>THESIS: </span>{p.thesis}
                  <span style={{ display: "block", marginTop: 6, color: C.dim, fontSize: 11 }}>{p.holdingCount || 10} holdings · Published by {p.creator}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: 20, padding: "12px 16px", background: C.surface, borderRadius: 8, border: `1px solid ${C.border}` }}>
        <p style={{ color: C.dim, fontSize: 11, margin: 0, lineHeight: 1.5 }}>Disclaimer: Leaderboard rankings are based on simulated portfolio performance and are for educational and entertainment purposes only. They do not represent actual investment returns, and no real money is at risk. ETF Simulator does not provide investment advice. Past simulated performance is not indicative of future results.</p>
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
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "36px 20px" }}>
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
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 20px" }}>
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

      {/* Backend integration info */}
      <div style={{ ...cardS(), marginBottom: 40, borderColor: C.accent }}>
        <h3 style={{ color: C.text, fontSize: 16, margin: "0 0 10px" }}>User Data & Analytics</h3>
        <p style={{ color: C.sub, fontSize: 13.5, lineHeight: 1.6, margin: "0 0 10px" }}>
          User accounts, portfolios, and settings are stored in Supabase (PostgreSQL). View all user signups, portfolios, and activity in your <strong style={{ color: C.accentLight }}>Supabase Dashboard → Table Editor</strong>. Authentication is handled by Supabase Auth with email/password, password reset emails, and session management.
        </p>
        <div className="grid3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          {[
            { n: "Firebase Auth", d: "Google's free auth service. Email/password, Google, Apple sign-in. Firestore for data.", c: "Free up to 50K MAU" },
            { n: "Supabase", d: "Open-source Firebase alternative. PostgreSQL database with built-in auth and row-level security.", c: "Free up to 50K MAU" },
            { n: "Auth0 / Clerk", d: "Premium auth providers with pre-built UI components, SSO, and compliance features.", c: "Free tier available" },
          ].map((s) => (
            <div key={s.n} style={{ background: C.surface, borderRadius: 8, padding: 14, border: `1px solid ${C.border}` }}>
              <h4 style={{ color: C.text, fontSize: 13, margin: "0 0 4px" }}>{s.n}</h4>
              <p style={{ color: C.sub, fontSize: 12, margin: "0 0 6px", lineHeight: 1.4 }}>{s.d}</p>
              <span style={{ color: C.green, fontSize: 11, fontWeight: 600 }}>{s.c}</span>
            </div>
          ))}
        </div>
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
  const liveFeatures = [
    { icon: "🧠", title: "AI Portfolio Generator" },
    { icon: "📊", title: "Performance Analytics" },
    { icon: "📈", title: "Real-time Leaderboard" },
    { icon: "🔒", title: "Secure Authentication" },
  ];
  const phases = [
    { num: 1, label: "Phase 1", timing: "Weeks 1-2", title: "Fix Critical Issues", desc: "Establish credibility and fix foundational gaps", color: C.accent, items: [
      { icon: "⚡", title: "Real-time Market Data API", desc: "Integrate live market data from professional sources" },
      { icon: "📚", title: "Educational Content", desc: "Add 10-15 core lessons with video tutorials" },
      { icon: "👥", title: "Community Features", desc: "User profiles and portfolio sharing" },
      { icon: "🔗", title: "Portfolio Sharing", desc: "Share and clone portfolios with community" },
      { icon: "📱", title: "Social Integration", desc: "Share achievements on social media" },
    ]},
    { num: 2, label: "Phase 2", timing: "Months 1-2", title: "Build Competitive Moat", desc: "Advanced features that competitors can't easily replicate", color: C.gold, items: [
      { icon: "📊", title: "Advanced Analytics", desc: "Correlation matrices, sector exposure, risk decomposition" },
      { icon: "✨", title: "AI Recommendations", desc: "Personalized portfolio suggestions based on goals" },
      { icon: "💸", title: "Paper Trading", desc: "Virtual money trading with real market prices" },
      { icon: "💬", title: "Community Forums", desc: "Discussions, Q&A, and peer learning" },
      { icon: "🔔", title: "Smart Alerts", desc: "Email notifications for portfolio events" },
    ]},
    { num: 3, label: "Phase 3", timing: "Month 3+", title: "Scale & Monetize", desc: "Expand reach and build sustainable revenue streams", color: C.green, items: [
      { icon: "👑", title: "Premium Features", desc: "Advanced analytics, API access, priority support" },
      { icon: "📱", title: "Mobile Apps", desc: "Native iOS and Android applications" },
      { icon: "🌐", title: "Brokerage Partnerships", desc: "One-click portfolio execution with partners" },
      { icon: "🤝", title: "Affiliate Program", desc: "Earn commissions by referring users" },
      { icon: "🏢", title: "White-Label Solutions", desc: "Enterprise platform for institutions" },
    ]},
  ];
  const advantages = [
    { icon: "🧠", title: "AI That Actually Helps", desc: "Not just portfolio generation — real-time insights, personalized learning paths, and predictive analytics powered by advanced AI." },
    { icon: "🎓", title: "Best-in-Class Education", desc: "Video lessons from experts, interactive simulations, certifications, and gamified learning that makes investing fun." },
    { icon: "🌍", title: "Vibrant Community", desc: "User-generated content, portfolio cloning, mentorship programs, and competitions that drive engagement." },
    { icon: "📡", title: "Data No One Else Has", desc: "Aggregated user behavior insights, crowd-sourced performance data, and sentiment analysis from our community." },
  ];
  const goals = [
    { icon: "👥", value: "100K+", label: "Active Users" },
    { icon: "🎯", value: "1M+", label: "Portfolios Created" },
    { icon: "📖", value: "500K+", label: "Lessons Completed" },
    { icon: "💬", value: "50K+", label: "Community Members" },
  ];
  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "36px 20px" }}>
      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <span style={{ ...badge(C.accent), fontSize: 10.5, marginBottom: 10, display: "inline-block" }}>🚀 Our Vision</span>
        <h1 className="hero-title" style={{ color: C.text, fontSize: 38, margin: "0 0 4px", fontWeight: 800 }}>Disrupting the</h1>
        <h1 className="hero-title" style={{ color: C.accent, fontSize: 38, margin: "0 0 14px", fontWeight: 800 }}>ETF Investment Space</h1>
        <p style={{ color: C.sub, fontSize: 15, maxWidth: 600, margin: "0 auto", lineHeight: 1.6 }}>We're building the world's most advanced AI-powered investment education platform. Here's our roadmap to revolutionize how people learn, simulate, and invest in ETFs.</p>
      </div>

      {/* Where We Are Today */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <h2 style={{ color: C.text, fontSize: 24, margin: "0 0 6px", fontWeight: 700 }}>Where We Are Today</h2>
        <p style={{ color: C.sub, fontSize: 13.5 }}>We've built a solid foundation with core features that work. Now we're ready to scale.</p>
      </div>
      <div className="grid4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 40 }}>
        {liveFeatures.map((f, i) => (
          <div key={i} style={{ ...cardS(), display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><span style={{ fontSize: 20, marginRight: 8 }}>{f.icon}</span><span style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{f.title}</span></div>
            <span style={{ ...badge(C.green), fontSize: 9 }}>✓ Live</span>
          </div>
        ))}
      </div>

      {/* The Roadmap */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <h2 style={{ color: C.text, fontSize: 24, margin: "0 0 6px", fontWeight: 700 }}>The Roadmap</h2>
        <p style={{ color: C.sub, fontSize: 13.5 }}>Our three-phase plan to become the #1 investment education platform</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24, marginBottom: 40 }}>
        {phases.map((phase) => (
          <div key={phase.num} style={{ ...cardS(), borderColor: phase.color + "33" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
              <span style={{ ...badge(phase.color), fontSize: 10 }}>{phase.label}</span>
              <span style={{ color: phase.color, fontSize: 12, fontWeight: 600 }}>{phase.timing}</span>
            </div>
            <h3 style={{ color: C.text, fontSize: 20, margin: "0 0 4px", fontWeight: 700 }}>{phase.title}</h3>
            <p style={{ color: C.sub, fontSize: 13, marginBottom: 14 }}>{phase.desc}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {phase.items.map((item, j) => (
                <div key={j} style={{ background: C.surface, borderRadius: 8, padding: "12px 16px", border: `1px solid ${C.border}` }}>
                  <span style={{ marginRight: 8 }}>{item.icon}</span>
                  <strong style={{ color: C.text, fontSize: 13.5 }}>{item.title}</strong>
                  <p style={{ color: C.sub, fontSize: 12.5, margin: "3px 0 0", paddingLeft: 28 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Our Unfair Advantage */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <h2 style={{ color: C.text, fontSize: 24, margin: "0 0 6px", fontWeight: 700 }}>Our Unfair Advantage</h2>
        <p style={{ color: C.sub, fontSize: 13.5 }}>What makes us different from every other investment platform</p>
      </div>
      <div className="grid4" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14, marginBottom: 40 }}>
        {advantages.map((a, i) => (
          <div key={i} style={{ ...cardS() }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{a.icon}</div>
            <h3 style={{ color: C.text, fontSize: 16, margin: "0 0 6px", fontWeight: 700 }}>{a.title}</h3>
            <p style={{ color: C.sub, fontSize: 13, lineHeight: 1.6 }}>{a.desc}</p>
          </div>
        ))}
      </div>

      {/* Our Goals */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <h2 style={{ color: C.text, fontSize: 24, margin: "0 0 6px", fontWeight: 700 }}>Our Goals</h2>
        <p style={{ color: C.sub, fontSize: 13.5 }}>Ambitious targets for the next 12 months</p>
      </div>
      <div className="grid4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        {goals.map((g, i) => (
          <div key={i} style={{ ...cardS(), textAlign: "center", padding: "24px 16px" }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{g.icon}</div>
            <div style={{ color: C.accent, fontSize: 30, fontWeight: 800, lineHeight: 1.2 }}>{g.value}</div>
            <div style={{ color: C.dim, fontSize: 12, marginTop: 4 }}>{g.label}</div>
          </div>
        ))}
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
      <p style={s}>Free tier users are limited to 25 AI portfolio generations per day and 3 saved portfolios. We reserve the right to modify usage limits, features, and pricing at any time without notice.</p>
      <h3 style={h}>11. Governing Law</h3>
      <p style={s}>These Terms shall be governed by the laws of the State of Delaware, United States, without regard to conflict of law provisions. Any disputes shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association.</p>
      <h3 style={h}>12. Changes to Terms</h3>
      <p style={s}>We reserve the right to modify these Terms at any time. Continued use of the Platform after changes constitutes acceptance. We will make reasonable efforts to notify users of material changes.</p>
      <h3 style={h}>13. Contact</h3>
      <p style={s}>For questions about these Terms, contact us at support@etfsimulator.io.</p>
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
      <p style={s}>We retain your data for as long as your account is active and for a reasonable period thereafter. Aggregated or anonymized data may be retained indefinitely. You may request deletion of your account by contacting support@etfsimulator.io, though we may retain certain data as required by law or for legitimate business purposes.</p>
      <h3 style={h}>6. Security</h3>
      <p style={s}>We implement reasonable security measures to protect your data, including encryption in transit and at rest. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.</p>
      <h3 style={h}>7. Children's Privacy</h3>
      <p style={s}>The Platform is not intended for users under 18. We do not knowingly collect data from minors.</p>
      <h3 style={h}>8. Changes</h3>
      <p style={s}>We may update this Privacy Policy at any time. Continued use constitutes acceptance.</p>
      <h3 style={h}>9. Contact</h3>
      <p style={s}>Privacy questions: support@etfsimulator.io</p>
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
      <p style={s}>Market data is provided by third-party APIs (Finnhub, xAI/Grok) and may be delayed, inaccurate, or incomplete. We do not guarantee the accuracy, timeliness, or completeness of any third-party data.</p>
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
    { q: "How does the AI build my portfolio?", a: "When you submit an investment thesis, our AI (powered by Grok-3) analyzes your idea and constructs a diversified 10-holding portfolio across stocks, ETFs, crypto, and commodities. It provides financial metrics (market cap, revenue, EV/EBITDA), a thesis connection explaining why each pick relates to your idea, risk analysis, and macro commentary." },
    { q: "How many portfolios can I create per day?", a: "Free tier users can generate up to 25 AI portfolios per day. This limit resets at midnight. You can save up to 3 portfolios to your account. The upcoming Pro tier will offer unlimited generations and saved portfolios." },
    { q: "Can I customize the AI's portfolio?", a: "Yes! After the AI generates your portfolio, you can edit the ETF name and ticker, adjust individual holding weights, remove holdings, replace them with AI-suggested alternatives, sell positions to cash, or even short holdings you think will decline." },
    { q: "What is the Leaderboard?", a: "The Leaderboard ranks published portfolios by simulated return. When you save a portfolio, you can choose to publish it publicly. Your portfolio will then appear on the Leaderboard where other users can see your thesis and performance. It's a fun way to compete and learn from other investors." },
    { q: "Is the market data real?", a: "The ticker bar at the top displays approximate real-time data derived from ETF prices via the Finnhub API, updated every 30 seconds. Portfolio holdings simulate price movements for educational purposes. This is not a live trading platform." },
    { q: "Are the courses really free?", a: "Yes, all educational content is 100% free. We offer interactive courses on ETF basics, portfolio construction, risk management, and market analysis — each with quiz questions to test your understanding. No credit card required." },
    { q: "Is my data secure?", a: "Your account data is stored securely in Supabase (PostgreSQL) with encryption. We use industry-standard authentication practices. Please review our Privacy Policy for full details on data collection and usage." },
    { q: "How do I contact support?", a: "Email us at support@etfsimulator.io for any questions, feedback, or issues. We typically respond within 24-48 hours." },
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
          { icon: "🤖", title: "AI-Powered", desc: "Grok-3 AI builds portfolios with institutional-quality analysis" },
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
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "36px 20px" }}>
      <button onClick={() => go("home")} style={{ background: "transparent", border: "none", color: C.accent, fontSize: 13, cursor: "pointer", marginBottom: 16, padding: 0, fontFamily: "inherit" }}>← Back to Home</button>
      <h1 style={{ color: C.text, fontSize: 28, margin: "0 0 6px" }}>Contact Us</h1>
      <p style={{ color: C.sub, fontSize: 14, margin: "0 0 28px" }}>Have a question, feedback, or want to report an issue? We'd love to hear from you.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 30 }}>
        <div style={{ ...cardS() }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📧</div>
          <h3 style={{ color: C.text, fontSize: 16, margin: "0 0 6px", fontWeight: 700 }}>Email</h3>
          <p style={{ color: C.accent, fontSize: 14, margin: 0 }}>support@etfsimulator.io</p>
          <p style={{ color: C.dim, fontSize: 12, marginTop: 6 }}>We respond within 24-48 hours</p>
        </div>
        <div style={{ ...cardS() }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
          <h3 style={{ color: C.text, fontSize: 16, margin: "0 0 6px", fontWeight: 700 }}>Community</h3>
          <p style={{ color: C.sub, fontSize: 14, margin: 0 }}>Join the conversation on the Leaderboard</p>
          <p style={{ color: C.dim, fontSize: 12, marginTop: 6 }}>Share strategies and compete with others</p>
        </div>
      </div>
      <div style={{ ...cardS() }}>
        <h3 style={{ color: C.text, fontSize: 18, margin: "0 0 16px", fontWeight: 700 }}>Send a Message</h3>
        {sent ? (
          <div style={{ textAlign: "center", padding: "30px 20px" }}>
            <div style={{ fontSize: 42, marginBottom: 10 }}>✉️</div>
            <h3 style={{ color: C.green, fontSize: 18, margin: "0 0 8px" }}>Message Sent!</h3>
            <p style={{ color: C.sub, fontSize: 13.5 }}>Thank you for reaching out. We'll get back to you at {form.email} within 24-48 hours.</p>
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
            <button onClick={() => { if (form.name && form.email && form.message) setSent(true); }} disabled={!form.name || !form.email || !form.message} style={{ ...btnP(), fontSize: 13, padding: "12px", opacity: !form.name || !form.email || !form.message ? 0.4 : 1 }}>Send Message →</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   APP ROOT
   ═══════════════════════════════════════════════════════════════════════ */

export default function App() {
  const validPages = ["home","builder","portfolios","leaderboard","learn","roadmap","pricing","terms","privacy","disclaimer","faq","about","contact"];
  const getHashPage = () => { const h = window.location.hash.replace("#",""); return validPages.includes(h) ? h : "home"; };
  const [page, setPageState] = useState(getHashPage); const [user, setUser] = useState(null); const [authMode, setAuthMode] = useState(null); const [portfolios, setPortfolios] = useState([]); const [publicPortfolios, setPublicPortfolios] = useState([]);
  const [isDark, setIsDark] = useState(true);
  const toggleTheme = useCallback(() => { setIsDark(d => { const next = !d; setTheme(next); return next; }); }, []);
  const setPage = useCallback((p) => { setPageState(p); window.location.hash = p === "home" ? "" : p; window.scrollTo(0, 0); }, []);
  useEffect(() => { const onHash = () => setPageState(getHashPage()); window.addEventListener("hashchange", onHash); return () => window.removeEventListener("hashchange", onHash); }, []);
  // Supabase auth listener — auto-restore session on load and track auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const u = session.user;
        const userName = u.user_metadata?.name || u.email?.split("@")[0] || "User";
        setUser({ name: userName, email: u.email, id: u.id });
        // Load user's portfolios from Supabase
        const { data } = await supabase.from("portfolios").select("*").eq("user_id", u.id).order("created_at", { ascending: false });
        if (data) setPortfolios(data.map(row => ({ ...row.portfolio_data, id: row.id, isPublic: row.is_public, dbId: row.id })));
      } else {
        setUser(null); setPortfolios([]);
      }
    });
    // Load public portfolios for leaderboard
    supabase.from("portfolios").select("*").eq("is_public", true).order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => { if (data) setPublicPortfolios(data.map(row => { const pd = row.portfolio_data || {}; const val = pd.value || row.value || 1000000; return { ...pd, id: row.id, isPublic: true, creator: pd.creator || "Anonymous", value: val, gain: Math.round(((val - 1000000) / 1000000) * 10000) / 100, fee: pd.fee || row.fee || 0, holdingCount: pd.holdings?.length || row.holdings?.length || 10, thesis: pd.thesis || pd.strategy || row.thesis || "" }; })); });
    return () => subscription.unsubscribe();
  }, []);
  const openAuth = (m) => setAuthMode(m);
  const doAuth = (u) => { setUser(u); setAuthMode(null); };
  const signOut = async () => { await supabase.auth.signOut(); setUser(null); setPortfolios([]); setPage("home"); };
  const savePortfolio = async (p, isPublic) => {
    if (portfolios.length >= 3) { alert("Free tier: max 3 portfolios. Upgrade to Pro for unlimited."); return false; }
    if (!user?.id) { alert("Please sign in to save your portfolio."); return false; }
    try {
      const holdingsClean = (p.holdings || []).map(h => ({
        symbol: h.symbol, name: h.name, description: h.description || "", type: h.type,
        weight: h.weight, allocation: h.allocation, role: h.role, sector: h.sector,
        action: h.action, conviction: h.conviction, rationale: h.rationale,
        thesisConnection: h.thesisConnection || "", exitTrigger: h.exitTrigger || "",
        financialMetrics: h.financialMetrics || {},
        priceTarget: h.priceTarget || "", stopLoss: h.stopLoss || "",
      }));
      const portfolioData = {
        name: p.name, ticker: p.ticker, strategy: p.strategy, riskProfile: p.riskProfile || p.userRiskProfile,
        targetReturn: p.targetReturn, benchmark: p.benchmark, fee: p.fee, value: p.value || 1000000,
        thesis: p.thesis, holdings: holdingsClean, isPublic,
        creator: user.name || user.email?.split("@")[0] || "Anonymous",
        fundSummary: p.fundSummary, macroAnalysis: p.macroAnalysis,
        assetAllocation: p.assetAllocation, factorExposure: p.factorExposure,
        riskAnalysis: p.riskAnalysis, incomeProjection: p.incomeProjection,
        esgConsiderations: p.esgConsiderations, rebalanceRules: p.rebalanceRules,
        weeklyOutlook: p.weeklyOutlook, cashPosition: p.cashPosition,
        autoSellPct: p.autoSellPct || 0, createdTs: p.createdTs,
        createdAt: p.createdAt || new Date().toISOString(),
      };
      const row = {
        user_id: user.id, name: p.name || "AI Portfolio", ticker: p.ticker || "",
        thesis: p.thesis || "", strategy: p.strategy || "",
        holdings: holdingsClean, value: p.value || 1000000, fee: p.fee || 0,
        risk_profile: p.userRiskProfile || p.riskProfile || "",
        time_horizon: p.userTimeHorizon || "", rebal_freq: p.userRebalFreq || p.rebalanceFrequency || "",
        is_public: isPublic, portfolio_data: portfolioData,
      };
      const { data, error } = await supabase.from("portfolios").insert(row).select();
      if (error) { console.error("Save error:", error); alert("Save failed: " + error.message); return false; }
      if (data && data[0]) {
        const saved = { ...portfolioData, id: data[0].id, isPublic, dbId: data[0].id };
        setPortfolios((prev) => [...prev, saved]);
        if (isPublic) {
          setPublicPortfolios((prev) => [...prev, { ...portfolioData, id: data[0].id, isPublic: true, gain: Math.round(((portfolioData.value - 1000000) / 1000000) * 10000) / 100, holdingCount: portfolioData.holdings?.length || 10, fee: portfolioData.fee || 0 }]);
        }
        alert(isPublic ? "Portfolio published to leaderboard!" : "Portfolio saved!");
        return true;
      }
      return false;
    } catch (err) {
      console.error("Save exception:", err);
      alert("Save failed: " + (err.message || "Unknown error"));
      return false;
    }
  };
  // Derive public leaderboard entries from live portfolio values
  const livePublicPortfolios = useMemo(() => {
    if (!user) return [];
    return portfolios.filter(p => p.isPublic).map(p => ({
      id: p.id, name: p.name, creator: user.name, value: p.value,
      gain: Math.round(((p.value - 1000000) / 1000000) * 10000) / 100,
      fee: p.fee, holdingCount: p.holdings?.length || 10, thesis: p.thesis || p.strategy
    }));
  }, [portfolios, user]);
  // Merge own published + others' published
  const allPublicPortfolios = useMemo(() => {
    const ownIds = new Set(livePublicPortfolios.map(p => p.id));
    return [...livePublicPortfolios, ...publicPortfolios.filter(p => !ownIds.has(p.id))];
  }, [livePublicPortfolios, publicPortfolios]);
  const updatePortfolio = useCallback((idx, updated) => { setPortfolios((prev) => prev.map((p, i) => (i === idx ? updated : p))); }, []);

  const pages = {
    home: <Home go={setPage} openAuth={openAuth} user={user} />,
    builder: <Builder user={user} openAuth={openAuth} savePortfolio={savePortfolio} publishPortfolio={(p) => savePortfolio(p, true)} />,
    portfolios: <Portfolios user={user} openAuth={openAuth} portfolios={portfolios} go={setPage} updatePortfolio={updatePortfolio} />,
    leaderboard: <Leaderboard publicPortfolios={allPublicPortfolios} />,
    learn: <Learn />,
    roadmap: <Roadmap go={setPage} />,
    pricing: <Pricing openAuth={openAuth} user={user} />,
    terms: <TermsOfService go={setPage} />,
    privacy: <PrivacyPolicy go={setPage} />,
    disclaimer: <Disclaimer go={setPage} />,
    faq: <FAQ go={setPage} />,
    about: <About go={setPage} />,
    contact: <Contact go={setPage} />,
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'Outfit', -apple-system, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=Outfit:wght@300;400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}body{background:${C.bg}}
        ::selection{background:${C.accent}44}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:${C.bg}}::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}
        input::placeholder,textarea::placeholder{color:${C.dim}}button:hover{filter:brightness(1.08)}button{transition:filter .12s,opacity .12s}
        @keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes shimmer{0%{background-position:-200px 0}100%{background-position:200px 0}}
        @media(max-width:768px){
          .grid4{grid-template-columns:repeat(2,1fr)!important}
          .grid3{grid-template-columns:1fr!important}
          .grid2col{grid-template-columns:1fr!important}
          .controls-grid{grid-template-columns:1fr!important}
          .hero-title{font-size:32px!important}
          .nav-links{display:none!important}
          .hamburger-btn{display:block!important}
          .hide-mobile{display:none!important}
          .footer-grid{grid-template-columns:1fr 1fr!important}
          .holdings-grid{grid-template-columns:32px 52px 1fr 60px 80px!important}
          .holdings-grid .hide-mobile{display:none!important}
          .leaderboard-grid{grid-template-columns:36px 1fr 80px 64px!important}
          .leaderboard-grid .hide-mobile{display:none!important}
        }
        @media(max-width:480px){
          .grid4{grid-template-columns:1fr!important}
          .footer-grid{grid-template-columns:1fr!important}
        }
      `}</style>
      <Ticker />
      <Nav page={page} go={setPage} user={user} openAuth={openAuth} signOut={signOut} isDark={isDark} toggleTheme={toggleTheme} />
      {pages[page] || pages.home}
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
            <span style={{ color: C.dim, fontSize: 12, display: "block", marginBottom: 5 }}>Support: support@etfsimulator.io</span>
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
