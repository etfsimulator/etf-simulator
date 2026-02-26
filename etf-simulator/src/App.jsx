import { useState, useEffect, useCallback, useRef, useMemo } from "react";

/* ═══════════════════════════════════════════════════════════════════════
   CONSTANTS & DATA
   ═══════════════════════════════════════════════════════════════════════ */

const TICKER_SYMBOLS = [
  { symbol: "SPY", label: "S&P 500" }, { symbol: "DIA", label: "DJIA" },
  { symbol: "QQQ", label: "NASDAQ" }, { symbol: "IWM", label: "Russell 2000" },
  { symbol: "GLD", label: "Gold" }, { symbol: "USO", label: "Crude Oil" },
];
const DEFAULT_INDICES = [
  { symbol: "S&P 500", value: 6012.45, change: 0.43 },
  { symbol: "DJIA", value: 44298.71, change: -0.25 },
  { symbol: "NASDAQ", value: 19432.18, change: 0.75 },
  { symbol: "Russell 2000", value: 2287.93, change: 0.55 },
  { symbol: "BTC/USD", value: 97245.0, change: 1.92 },
  { symbol: "ETH/USD", value: 3412.5, change: -1.31 },
  { symbol: "Gold", value: 2948.3, change: 0.64 },
  { symbol: "Crude Oil", value: 71.82, change: -1.29 },
  { symbol: "10Y Treasury", value: 4.28, change: -0.7 },
  { symbol: "VIX", value: 14.82, change: 3.13 },
  { symbol: "EUR/USD", value: 1.0842, change: 0.11 },
  { symbol: "USD/JPY", value: 149.72, change: -0.25 },
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
  { name: "Free", price: "$0", period: "forever", active: true, features: ["AI-generated ETF portfolios (10 holdings)", "$1M simulated starting capital", "Risk profile & time horizon controls", "7 rebalance frequencies (daily → annually)", "Keep/remove individual AI picks", "Auto-rebalancing engine", "Backtesting (up to 60 months)", "Community leaderboard", "Save up to 3 portfolios", "8 educational articles"] },
  { name: "Pro", price: "—", period: "pricing TBD", soon: true, features: ["Everything in Free", "Unlimited saved portfolios", "Live market data feeds", "Advanced AI strategies (20+ holdings)", "Custom rebalancing rules", "Export portfolio reports (PDF/CSV)", "Priority AI generation", "Advanced backtesting (20+ years)", "Portfolio comparison tools"] },
  { name: "Institutional", price: "—", period: "pricing TBD", soon: true, features: ["Everything in Pro", "API access & webhooks", "Team collaboration workspaces", "White-label reports", "Custom benchmarks & indexes", "Dedicated support", "Compliance & audit tooling", "Bulk portfolio generation", "Brokerage integration (coming)"] },
];

const FUTURE_PRODUCTS = [
  { icon: "🔄", title: "Smart Rebalancing Alerts", desc: "AI-driven drift detection with automated rebalance recommendations at your chosen frequency — daily to annually", eta: "Q2 2026", status: "in-progress" },
  { icon: "⏱", title: "Advanced Backtesting Engine", desc: "Test against 20+ years of real historical data with custom date ranges, drawdown analysis, and benchmark overlays", eta: "Q2 2026", status: "in-progress" },
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

const memStore = { users: {}, session: null };

/* ═══════════════════════════════════════════════════════════════════════
   LOGO SVG — matching uploaded 3D purple/cyan geometric cube
   ═══════════════════════════════════════════════════════════════════════ */

function Logo({ size = 32, showText = false }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
      <img
        src={"data:image/jpeg;base64,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"}
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
    "scalingPlan": "$1M seed projected milestones.",
    "taxEfficiency": "Tax structure notes."
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
      "type": "stock | etf | crypto | commodity",
      "action": "BUY | HOLD | SHORT",
      "allocation": 150000,
      "weight": 15.0,
      "role": "Core | Satellite | Hedge | Growth Kicker | Income | Diversifier | Tactical | Short",
      "sector": "Sector",
      "marketCap": "Mega | Large | Mid | Small | N/A",
      "conviction": "high | medium | low",
      "rationale": "5-6 sentences with metrics, catalysts, portfolio role, alternatives comparison, risk, technical setup.",
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
  "incomeProjection": { "estimatedYield": "X.X%", "annualIncome": "$X", "growthVsIncome": "split" },
  "weeklyOutlook": "2-3 sentences on what to watch: key events, earnings, macro data, catalysts.",
  "esgConsiderations": "Brief ESG profile.",
  "rebalanceRules": "Calendar + drift-based rules."
}

PORTFOLIO CONSTRUCTION RULES:
1. Up to 10 holdings PLUS an optional cash position. On INITIAL build, allocations + cash MUST sum to exactly $1,000,000 (seed capital). On REBALANCE, allocations + cash should sum to the CURRENT NAV (which may be above or below $1M based on performance).
2. "weight" = allocation / 10000 (percentage). Cash weight = cash amount / 10000.
3. "type" must be: "stock", "etf", "crypto", or "commodity".
4. "action" on initial build is always "BUY". On rebalance, use "BUY" (new), "HOLD" (keep), "SHORT" (bet against).
5. SHORT positions: allocation represents margin requirement. Profit when price drops.
6. CASH: When market conditions are dangerous, allocate to cash. Cash earns 4.5% APY. It is SMART to hold cash sometimes.
7. Include "conviction" level (high/medium/low) and "priceTarget" and "stopLoss" for each holding.

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
- MUST cite specific financial metrics: P/E, forward P/E, EV/EBITDA, PEG ratio, revenue growth %, operating margins, FCF yield, dividend yield, payout ratio, market cap, debt/equity, ROE.
- Reference current market conditions, sector dynamics, macro environment, and recent catalysts.
- Explain correlation benefit: how this holding's return profile complements the others.
- Name a specific risk and quantify how the portfolio mitigates it.
- Compare against 2-3 named alternatives and explain why this pick wins.
- Include technical context: price relative to moving averages, recent momentum.

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
  useEffect(() => {
    // Fetch live quotes for ticker symbols from Finnhub
    Promise.all(TICKER_SYMBOLS.map(t =>
      finnhubFetch(`https://finnhub.io/api/v1/quote?symbol=${t.symbol}&token=${FINNHUB_KEY}`)
        .then(r => r.json())
        .then(q => q && q.c > 0 ? { symbol: t.label, value: q.c, change: Math.round(((q.c - q.pc) / q.pc) * 10000) / 100 } : null)
        .catch(() => null)
    )).then(results => {
      const live = results.filter(Boolean);
      if (live.length > 0) {
        // Merge live data with defaults for symbols we couldn't fetch
        const liveLabels = new Set(live.map(l => l.symbol));
        setIndices([...live, ...DEFAULT_INDICES.filter(d => !liveLabels.has(d.symbol))]);
      }
    });
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
  const [mode, setMode] = useState(initMode || "signin");
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [name, setName] = useState(""); const [err, setErr] = useState(""); const [loading, setLoading] = useState(false);
  const submit = () => {
    setErr("");
    if (!email || !pw) return setErr("Please fill in all fields.");
    if (mode === "signup" && !name) return setErr("Please enter your full name.");
    if (!email.includes("@") || !email.includes(".")) return setErr("Please enter a valid email address.");
    if (pw.length < 6) return setErr("Password must be at least 6 characters.");
    setLoading(true);
    setTimeout(() => {
      if (mode === "signup") {
        if (memStore.users[email]) { setLoading(false); return setErr("An account with this email already exists."); }
        memStore.users[email] = { name, email, password: pw, createdAt: Date.now() };
        onAuth({ name, email });
      } else {
        const u = memStore.users[email];
        if (!u || u.password !== pw) { setLoading(false); return setErr("Invalid email or password. Please try again."); }
        onAuth({ name: u.name, email: u.email });
      }
      setLoading(false);
    }, 600);
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "32px 28px", width: 400, maxWidth: "92vw" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}><Logo size={40} /></div>
        <h2 style={{ color: C.text, fontSize: 19, margin: "0 0 18px", textAlign: "center" }}>{mode === "signin" ? "Sign In to ETF Simulator" : "Create Your Account"}</h2>
        {mode === "signup" && <input placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} style={inputS()} />}
        <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputS()} />
        <input placeholder="Password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} style={inputS()} onKeyDown={(e) => e.key === "Enter" && submit()} />
        {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 10 }}>{err}</div>}
        <button onClick={submit} disabled={loading} style={{ ...btnP(), width: "100%", padding: "12px 0", marginBottom: 14, opacity: loading ? 0.6 : 1 }}>{loading ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}</button>
        <p style={{ color: C.sub, fontSize: 13, textAlign: "center", margin: 0 }}>
          {mode === "signin" ? "No account? " : "Have an account? "}
          <span onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setErr(""); }} style={{ color: C.accent, cursor: "pointer" }}>{mode === "signin" ? "Sign up free" : "Sign in"}</span>
        </p>
        <div style={{ marginTop: 16, padding: "10px 12px", background: C.surface, borderRadius: 6, border: `1px solid ${C.border}` }}>
          <p style={{ color: C.dim, fontSize: 11, margin: 0, lineHeight: 1.5 }}>
            <strong style={{ color: C.sub }}>Note:</strong> This is a frontend demo. Accounts are stored in browser memory and reset on page refresh.
            For production, you would connect a backend (Firebase Auth, Supabase, Auth0) to persist user data and collect signups.
          </p>
        </div>
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
          Describe your investment thesis. Our AI fund manager constructs a diversified 10-holding, $1M portfolio across every US-listed stock, ETF, top 50 crypto, and commodities — with institutional-grade allocation, macro analysis, risk modeling, and detailed rationale for every pick. Track with live market data, auto-rebalance, and backtest your strategy.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={() => go("builder")} style={{ ...btnP(), padding: "14px 34px", fontSize: 15 }}>Start Building →</button>
          <button onClick={() => go("learn")} style={{ ...btnO(), padding: "14px 34px", fontSize: 15 }}>Learn More</button>
        </div>
      </div>

      {/* Platform Highlights */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 52, textAlign: "center" }}>
        {[
          { n: "10,000+", l: "Tradeable Securities" }, { n: "7", l: "Rebalance Frequencies" }, { n: "$1M", l: "Simulated Capital" }, { n: "60mo", l: "Backtest Range" },
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
          { n: "04", t: "Track & Compete", d: "Live pricing, auto-rebalance, backtest up to 60 months, and rank on the community leaderboard." },
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
          <p style={{ margin: 0 }}><strong style={{ color: C.text }}>No Guarantee of Accuracy.</strong> While we strive for accuracy, simulated market data, asset prices, performance calculations, and AI-generated content may contain errors or inaccuracies. Historical backtesting results are hypothetical, do not account for real-world trading costs, slippage, taxes, or market impact, and past performance — whether real or simulated — is not indicative of future results.</p>
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

  // Money market accrual on cash (simulated daily every 60s)
  useEffect(() => {
    if (!portfolio || cashBalance <= 0) return;
    const timer = setInterval(() => { setCashBalance(prev => prev + prev * DAILY_MM_RATE); }, 60000);
    return () => clearInterval(timer);
  }, [portfolio, cashBalance > 0]);

  // Price simulation engine — holdings drift based on volatility
  const [liveAllocations, setLiveAllocations] = useState({});
  
  useEffect(() => {
    if (!portfolio) return;
    // Initialize live allocations from portfolio holdings
    const init = {};
    portfolio.holdings.forEach((h, i) => { if (!init[i]) init[i] = h.allocation; });
    setLiveAllocations(init);
  }, [portfolio?.id, portfolio?.holdings?.length]);

  // Simulate price movement every 10 seconds
  useEffect(() => {
    if (!portfolio) return;
    const timer = setInterval(() => {
      setLiveAllocations(prev => {
        const next = { ...prev };
        portfolio.holdings.forEach((h, i) => {
          if (excludedIdx.has(i)) return;
          const current = next[i] || h.allocation;
          // Volatility based on type: crypto highest, stocks medium, bonds low
          const vol = h.type === "crypto" ? 0.008 : h.type === "commodity" ? 0.004 : h.type === "etf" ? 0.002 : 0.005;
          // Short positions gain when price drops
          const isShort = h.action === "SHORT";
          const drift = (Math.random() - 0.48) * vol; // slight positive bias
          const change = isShort ? -drift : drift;
          next[i] = Math.max(current * (1 + change), current * 0.5); // floor at 50% of current
        });
        return next;
      });
    }, 10000);
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

  // NAV history tracking
  useEffect(() => {
    if (!portfolio) return;
    const snap = () => {
      setNavHistory(prev => [...prev.slice(-500), { ts: Date.now(), nav: currentNAV, cash: Math.round(cashBalance) }]);
    };
    snap();
    const timer = setInterval(snap, 15000);
    return () => clearInterval(timer);
  }, [portfolio?.id, currentNAV]);

  const sellToCash = (idx) => {
    if (!portfolio) return;
    const h = portfolio.holdings[idx];
    const liveVal = liveAllocations[idx] || h.allocation;
    setCashBalance(prev => prev + liveVal);
    const n = new Set(excludedIdx); n.add(idx); setExcludedIdx(n);
    setTransactions(prev => [...prev, { type: "SELL", symbol: h.symbol, amount: Math.round(liveVal), ts: Date.now(), reason: `Sold to cash at $${fmtUSD(Math.round(liveVal))} (money market 4.5% APY)` }]);
  };

  const shortHolding = (idx) => {
    if (!portfolio) return;
    const h = portfolio.holdings[idx];
    const updated = { ...portfolio, holdings: portfolio.holdings.map((old, i) => i === idx ? { ...old, action: "SHORT", role: "Short" } : old) };
    setPortfolio(updated);
    setTransactions(prev => [...prev, { type: "SHORT", symbol: h.symbol, amount: h.allocation, ts: Date.now(), reason: "Reversed to short position" }]);
  };

  // Auto-open save modal when user signs in after clicking Save
  useEffect(() => { if (user && pendingSave && portfolio && !saved) { setShowSaveModal(true); setPendingSave(false); } }, [user, pendingSave, portfolio, saved]);

  const generate = async () => {
    if (!thesis.trim()) return setErr("Describe your investment thesis first.");
    setLoading(true); setErr(""); setPortfolio(null); setSaved(false); setExcludedIdx(new Set());
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
      setPortfolio({ ...p, id: Date.now(), thesis, value: 1000000, createdAt: new Date().toISOString(), trackingData: [{ ts: Date.now(), value: 1000000 }], rebalanceThreshold: 5, userRiskProfile: riskProfile, userTimeHorizon: timeHorizon, userRebalFreq: rebalFreq });
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
    setRefreshingIdx(idx);
    try {
      const h = portfolio.holdings[idx];
      const apiKey = typeof import.meta !== "undefined" && (import.meta.env?.VITE_XAI_API_KEY || import.meta.env?.VITE_GROK_API_KEY);
      const proxyUrl = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_PROXY_URL) || null;
      const apiUrl = proxyUrl || "https://api.x.ai/v1/chat/completions";
      if (!proxyUrl && !apiKey) throw new Error("API key required");
      const headers = { "Content-Type": "application/json" };
      if (apiKey && !proxyUrl) headers["Authorization"] = `Bearer ${apiKey}`;
      const otherSymbols = portfolio.holdings.filter((_, i) => i !== idx && !excludedIdx.has(i)).map(x => x.symbol).join(", ");
      const refreshPrompt = `You are replacing ONE holding in an existing ETF portfolio.\n\nCurrent portfolio thesis: "${portfolio.thesis || thesis}"\nRisk Profile: ${portfolio.userRiskProfile || riskProfile}\nTime Horizon: ${portfolio.userTimeHorizon || timeHorizon}\n\nHolding being replaced: ${h.symbol} (${h.name}) — Weight: ${h.weight}%, Allocation: $${h.allocation}, Role: ${h.role}\n\nOther holdings already in portfolio (DO NOT duplicate): ${otherSymbols}\n\nFind a REPLACEMENT holding that:\n1. Fills the same role (${h.role}) and approximate weight (${h.weight}%)\n2. Is NOT already in the portfolio\n3. Follows the CREATIVITY rules — avoid obvious mega-caps, find hidden gems\n4. Has similar risk characteristics but potentially better upside\n\nReturn ONLY a JSON object with these fields (no markdown, no explanation):\n{"symbol":"TICK","name":"Full Name","type":"stock|etf|crypto|commodity","weight":${h.weight},"allocation":${h.allocation},"role":"${h.role}","sector":"...","marketCap":"...","rationale":"5-6 sentence detailed rationale...","exitTrigger":"When to sell..."}`;
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

  const weeklyUpdate = async () => {
    if (!portfolio || loading) return;
    setLoading(true); setErr("");
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
      setPortfolio({ ...p, id: portfolio.id || Date.now(), thesis: portfolio.thesis || thesis, value: Math.round(newAllocTotal), createdAt: portfolio.createdAt || new Date().toISOString(), trackingData: [...(portfolio.trackingData || []), { ts: Date.now(), value: Math.round(newAllocTotal) }], rebalanceThreshold: 5, userRiskProfile: portfolio.userRiskProfile || riskProfile, userTimeHorizon: portfolio.userTimeHorizon || timeHorizon, userRebalFreq: portfolio.userRebalFreq || rebalFreq, lastUpdated: new Date().toISOString() });
      setExcludedIdx(new Set()); setOpenIdx(null);
    } catch (e) { setErr("Weekly update failed: " + (e.message || "Try again")); }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "36px 20px" }}>
      <h1 style={{ color: C.text, fontSize: 26, margin: "0 0 6px" }}>AI ETF Builder</h1>
      <p style={{ color: C.sub, fontSize: 13.5, margin: "0 0 24px" }}>Describe your investment thesis below. Our AI portfolio manager will construct a 10-holding, $1M ETF with institutional-grade asset allocation, risk management, and detailed rationale for every pick.</p>
      {!user && <div style={{ ...cardS(), borderColor: C.accentBorder, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ color: C.sub, fontSize: 13 }}>Generate portfolios freely. <span style={{ color: C.accentLight }}>Sign in to save, track, and publish to the leaderboard.</span></span><button onClick={() => openAuth("signup")} style={{ ...btnP(), fontSize: 12.5, padding: "6px 16px" }}>Sign Up Free</button></div>}

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
          <button onClick={generate} disabled={loading || !thesis.trim()} style={{ ...btnP(), opacity: loading || !thesis.trim() ? 0.45 : 1 }}>{loading ? "Generating…" : "Generate ETF ◆"}</button>
        </div>
      </div>

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
              <div><h2 style={{ color: C.text, fontSize: 20, margin: "0 0 3px" }}>{portfolio.name}{portfolio.ticker ? <span style={{ color: C.dim, fontFamily: mono, fontSize: 13, fontWeight: 400, marginLeft: 8 }}>({portfolio.ticker})</span> : null}</h2><p style={{ color: C.sub, fontSize: 13, margin: 0 }}>{portfolio.strategy}</p>{<div style={{ display: "flex", gap: 12, marginTop: 8, alignItems: "center" }}><span style={{ color: C.dim, fontSize: 12, fontFamily: mono }}>NAV: <strong style={{ color: currentNAV >= SEED_CAPITAL ? C.green : C.red, fontSize: 15 }}>{fmtUSD(currentNAV)}</strong></span><span style={{ color: currentNAV >= SEED_CAPITAL ? C.green : C.red, fontSize: 13, fontWeight: 700, fontFamily: mono }}>{currentNAV >= SEED_CAPITAL ? "+" : ""}{fmt((currentNAV / SEED_CAPITAL - 1) * 100, 2)}%</span><span style={{ color: currentNAV >= SEED_CAPITAL ? C.green : C.red, fontSize: 12, fontFamily: mono }}>({currentNAV >= SEED_CAPITAL ? "+" : ""}{fmtUSD(currentNAV - SEED_CAPITAL)})</span></div>}{portfolio.weeklyOutlook && <p style={{ color: C.teal, fontSize: 12, margin: "6px 0 0", fontStyle: "italic" }}>📅 {portfolio.weeklyOutlook}</p>}{(portfolio.riskProfile || portfolio.targetReturn) && <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>{portfolio.riskProfile && <span style={{ ...badge(portfolio.riskProfile === "aggressive" ? C.red : portfolio.riskProfile === "conservative" ? C.teal : C.gold) }}>{portfolio.riskProfile}</span>}{portfolio.targetReturn && <span style={{ color: C.dim, fontSize: 11, fontFamily: mono }}>Return: {portfolio.targetReturn}</span>}{portfolio.targetVolatility && <span style={{ color: C.dim, fontSize: 11, fontFamily: mono }}>Vol: {portfolio.targetVolatility}</span>}{portfolio.sharpeTarget && <span style={{ color: C.dim, fontSize: 11, fontFamily: mono }}>Sharpe: {portfolio.sharpeTarget}</span>}{portfolio.sortinoTarget && <span style={{ color: C.dim, fontSize: 11, fontFamily: mono }}>Sortino: {portfolio.sortinoTarget}</span>}{portfolio.maxDrawdown && <span style={{ color: C.dim, fontSize: 11, fontFamily: mono }}>Max DD: {portfolio.maxDrawdown}</span>}{portfolio.rebalanceFrequency && <span style={{ color: C.dim, fontSize: 11, fontFamily: mono }}>Rebal: {portfolio.rebalanceFrequency}</span>}{portfolio.userRebalFreq && !portfolio.rebalanceFrequency && <span style={{ color: C.dim, fontSize: 11, fontFamily: mono }}>Rebal: {portfolio.userRebalFreq}</span>}{portfolio.benchmark && <span style={{ color: C.dim, fontSize: 11, fontFamily: mono }}>Bench: {portfolio.benchmark}</span>}{portfolio.userTimeHorizon && <span style={{ color: C.dim, fontSize: 11, fontFamily: mono }}>Horizon: {portfolio.userTimeHorizon}</span>}</div>}</div>
              <div style={{ textAlign: "right" }}><div style={{ color: C.text, fontSize: 22, fontWeight: 800, fontFamily: mono }}>{fmtUSD(portfolio.value)}</div><div style={{ color: C.sub, fontSize: 12 }}>Expense Ratio: <span style={{ color: C.accent }}>{portfolio.fee}%</span></div></div>
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
                {portfolio.fundSummary.taxEfficiency && <div><span style={{ color: C.accent, fontSize: 10.5, fontFamily: mono, fontWeight: 600 }}>TAX NOTES: </span><span style={{ color: C.sub, fontSize: 12.5 }}>{portfolio.fundSummary.taxEfficiency}</span></div>}
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
              {excludedIdx.size > 0 && <button onClick={() => setExcludedIdx(new Set())} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.sub, fontSize: 10.5, padding: "3px 10px", borderRadius: 4, cursor: "pointer", fontFamily: "inherit" }}>Restore All</button>}
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
                  <div onClick={() => setOpenIdx(openIdx === i ? null : i)} style={{ cursor: "pointer" }}><div style={{ color: C.text, fontSize: 13.5, fontWeight: 600, textDecoration: isExcluded ? "line-through" : "none" }}>{h.symbol}</div><div style={{ color: C.sub, fontSize: 11.5 }}>{h.name}</div></div>
                  <span style={{ color: C.text, fontFamily: mono, fontSize: 12.5 }}>{isExcluded ? "—" : fmt(adjWeight, 1) + "%"}</span>
                  <span style={{ color: C.text, fontFamily: mono, fontSize: 12.5 }}>{isExcluded ? "—" : fmtUSD(Math.round(liveAllocations[i] || h.allocation))}</span>
                  <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                    <button onClick={(e) => { e.stopPropagation(); const n = new Set(excludedIdx); if (isExcluded) n.delete(i); else n.add(i); setExcludedIdx(n); }} style={{ background: isExcluded ? "rgba(239,68,68,.1)" : "rgba(34,197,94,.1)", border: `1px solid ${isExcluded ? "rgba(239,68,68,.3)" : "rgba(34,197,94,.3)"}`, color: isExcluded ? C.red : C.green, fontSize: 10.5, padding: "4px 10px", borderRadius: 4, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>{isExcluded ? "✗ Removed" : "✓ Keep"}</button>
                    <button onClick={(e) => { e.stopPropagation(); refreshHolding(i); }} disabled={refreshingIdx !== null} title="AI generates a replacement" style={{ background: refreshingIdx === i ? "rgba(45,212,191,.15)" : "rgba(99,102,241,.08)", border: `1px solid ${refreshingIdx === i ? "rgba(45,212,191,.4)" : "rgba(99,102,241,.2)"}`, color: refreshingIdx === i ? C.teal : "#818cf8", fontSize: 10.5, padding: "4px 8px", borderRadius: 4, cursor: refreshingIdx !== null ? "not-allowed" : "pointer", fontWeight: 600, fontFamily: "inherit" }}>{refreshingIdx === i ? "⏳" : "🔄"}</button>
                  </div>
                </div>
                {openIdx === i && <div style={{ padding: "14px 18px 14px 100px", background: C.surface, borderBottom: `1px solid ${C.border}`, fontSize: 13, color: C.sub, lineHeight: 1.7 }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>{h.role && <span style={{ ...badge(h.role === "Hedge" ? C.teal : h.role === "Core" ? C.accent : h.role === "Growth Kicker" ? C.gold : h.role === "Income" ? C.green : C.sub) }}>{h.role}</span>}{h.sector && <span style={{ ...badge(C.dim) }}>{h.sector}</span>}{h.marketCap && h.marketCap !== "N/A" && <span style={{ ...badge(C.dim) }}>{h.marketCap}</span>}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>{h.action && <span style={{ ...badge(h.action === "BUY" ? C.green : h.action === "SHORT" ? "#f59e0b" : h.action === "SELL" ? C.red : C.teal), fontSize: 10 }}>{h.action}</span>}{h.conviction && <span style={{ ...badge(h.conviction === "high" ? C.green : h.conviction === "medium" ? C.gold : C.dim), fontSize: 10 }}>{h.conviction} conviction</span>}{(() => { const lv = liveAllocations[i] || h.allocation; const pnl = ((lv / h.allocation) - 1) * 100; return <span style={{ color: pnl >= 0 ? C.green : C.red, fontSize: 11, fontWeight: 700, fontFamily: mono }}>P&L: {pnl >= 0 ? "+" : ""}{fmt(pnl, 1)}% ({fmtUSD(Math.round(lv - h.allocation))})</span>; })()}{h.priceTarget && <span style={{ color: C.green, fontSize: 11, fontFamily: mono }}>Target: {h.priceTarget}</span>}{h.stopLoss && <span style={{ color: C.red, fontSize: 11, fontFamily: mono }}>Stop: {h.stopLoss}</span>}</div>
                  <div style={{ marginBottom: 10 }}><span style={{ color: C.accent, fontWeight: 700, fontSize: 10.5, fontFamily: mono, letterSpacing: 0.3 }}>AI RATIONALE: </span>{h.rationale}</div>
                  {h.exitTrigger && <div style={{ marginBottom: 10, padding: "8px 12px", background: "rgba(239,68,68,.06)", border: `1px solid rgba(239,68,68,.15)`, borderRadius: 6 }}><span style={{ color: C.red, fontWeight: 700, fontSize: 10.5, fontFamily: mono, letterSpacing: 0.3 }}>EXIT TRIGGER: </span><span style={{ color: C.sub, fontSize: 12 }}>{h.exitTrigger}</span></div>}
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <button onClick={() => { const n = new Set(excludedIdx); if (isExcluded) n.delete(i); else n.add(i); setExcludedIdx(n); }} style={{ background: isExcluded ? "rgba(34,197,94,.1)" : "rgba(239,68,68,.08)", border: `1px solid ${isExcluded ? "rgba(34,197,94,.3)" : "rgba(239,68,68,.2)"}`, color: isExcluded ? C.green : C.red, fontSize: 11, padding: "6px 16px", borderRadius: 5, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>{isExcluded ? "✓ Add Back to Portfolio" : "✗ Remove from Portfolio"}</button>
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
              {portfolio.holdings.map((h, i) => { if (excludedIdx.has(i)) return null; const liveVal = liveAllocations[i] || h.allocation; const liveActiveTotal = portfolio.holdings.reduce((s, hh, j) => s + (excludedIdx.has(j) ? 0 : (liveAllocations[j] || hh.allocation)), 0); const adjW = liveVal / liveActiveTotal * 100; return <div key={i} title={`${h.symbol}: ${fmt(adjW, 1)}% ($${fmtUSD(Math.round(liveVal))})`} style={{ width: `${adjW}%`, background: TC[h.type] || C.accent, opacity: 0.55 + (i % 3) * 0.15, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8.5, color: "#fff", fontWeight: 700, borderRight: "1px solid rgba(0,0,0,.3)" }}>{adjW >= 8 ? h.symbol : ""}</div>; })}
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
                      <span style={{ ...badge(tx.type === "BUY" ? C.green : tx.type === "SELL" ? C.red : tx.type === "SHORT" ? "#f59e0b" : C.teal), fontSize: 9, minWidth: 44, textAlign: "center" }}>{tx.type}</span>
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
                  <p style={{ color: C.sub, fontSize: 12.5, lineHeight: 1.5, margin: 0 }}>{portfolio.rebalanceRules}</p>
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
            <button onClick={weeklyUpdate} disabled={loading || refreshingIdx !== null} style={{ ...btnP(), fontSize: 12.5, padding: "8px 16px", background: loading ? C.surface : "rgba(45,212,191,.1)", color: loading ? C.dim : C.teal, border: `1px solid ${loading ? C.border : "rgba(45,212,191,.3)"}` }}>{loading ? "⏳ Updating..." : `🔄 ${(portfolio.userRebalFreq || rebalFreq || "weekly").charAt(0).toUpperCase() + (portfolio.userRebalFreq || rebalFreq || "weekly").slice(1)} Review`}</button>
            <button onClick={() => { setPortfolio(null); setThesis(""); setSaved(false); setExcludedIdx(new Set()); setCashBalance(0); setTransactions([]); setNavHistory([]); setLiveAllocations({}); }} style={btnO()}>Start Over</button>
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
                  <button onClick={() => { const active = portfolio.holdings.filter((_, i) => !excludedIdx.has(i)); const totalW = active.reduce((s, h) => s + h.weight, 0); const cashAdj = Math.round(cashBalance); const liveTotal = active.reduce((s, h) => { const origIdx = portfolio.holdings.indexOf(h); return s + (liveAllocations[origIdx] || h.allocation); }, 0); const adjusted = { ...portfolio, holdings: active.map(h => { const origIdx = portfolio.holdings.indexOf(h); const liveVal = liveAllocations[origIdx] || h.allocation; return { ...h, weight: Math.round(liveVal / (liveTotal + cashAdj) * 1000) / 10, allocation: Math.round(liveVal), targetWeight: h.weight, currentWeight: Math.round(liveVal / (liveTotal + cashAdj) * 1000) / 10 }; }), value: Math.round(liveTotal + cashAdj), cashBalance: cashAdj, transactions, navHistory }; savePortfolio(adjusted, false); setSaved(true); setShowSaveModal(false); }} style={{ ...cardS(), cursor: "pointer", border: `1px solid ${C.border}`, textAlign: "left", background: C.surface }}>
                    <div style={{ color: C.text, fontSize: 14, fontWeight: 600, marginBottom: 3 }}>🔒 Keep Private</div>
                    <div style={{ color: C.sub, fontSize: 12 }}>Only you can see this portfolio in "My Portfolios."{excludedIdx.size > 0 ? ` (${portfolio.holdings.length - excludedIdx.size} holdings, ${excludedIdx.size} removed)` : ""}</div>
                  </button>
                  <button onClick={() => { const active = portfolio.holdings.filter((_, i) => !excludedIdx.has(i)); const totalW = active.reduce((s, h) => s + h.weight, 0); const cashAdj2 = Math.round(cashBalance); const liveTotal2 = active.reduce((s, h) => { const origIdx = portfolio.holdings.indexOf(h); return s + (liveAllocations[origIdx] || h.allocation); }, 0); const adjusted = { ...portfolio, holdings: active.map(h => { const origIdx = portfolio.holdings.indexOf(h); const liveVal = liveAllocations[origIdx] || h.allocation; return { ...h, weight: Math.round(liveVal / (liveTotal2 + cashAdj2) * 1000) / 10, allocation: Math.round(liveVal), targetWeight: h.weight, currentWeight: Math.round(liveVal / (liveTotal2 + cashAdj2) * 1000) / 10 }; }), value: Math.round(liveTotal2 + cashAdj2), cashBalance: cashAdj2, transactions, navHistory }; savePortfolio(adjusted, true); setSaved(true); setShowSaveModal(false); }} style={{ ...cardS(), cursor: "pointer", border: `1px solid ${C.accentBorder}`, textAlign: "left", background: C.accentBg }}>
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

const SEED_CAPITAL = 1000000;
const MONEY_MARKET_RATE = 0.045; // 4.5% APY
const DAILY_MM_RATE = MONEY_MARKET_RATE / 365;

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
          // Fallback: simulated drift if no live data
          const drift = (sr(Date.now() / 1000 + idx * 100) - 0.48) * p.value * 0.002;
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
    const rebalanced = p.holdings.map(h => ({ ...h, currentWeight: h.targetWeight, allocation: h.targetWeight * 10000 }));
    updatePortfolio(idx, { ...p, holdings: rebalanced, lastRebalance: Date.now() });
    setRebalIdx(null);
  };

  if (!user) return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 44, marginBottom: 14 }}>{"🔒"}</div>
      <h2 style={{ color: C.text, fontSize: 21, margin: "0 0 10px" }}>Sign in to view your portfolios</h2>
      <p style={{ color: C.sub, fontSize: 14, marginBottom: 22 }}>Build, save, track, rebalance, and backtest AI-generated ETFs.</p>
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

                {/* Backtest Panel */}
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
  const paths = [
    { icon: "⚙️", title: "Beginner Investor", desc: "Start your investment journey from scratch", duration: "6-8 weeks", topics: ["ETF Basics", "Portfolio Construction Intro", "Risk Fundamentals"], color: C.teal },
    { icon: "📈", title: "Active Trader", desc: "Learn to analyze markets and make informed decisions", duration: "10-12 weeks", topics: ["Market Analysis", "Technical Indicators", "Risk Management"], color: C.accent },
    { icon: "💰", title: "Long-Term Investor", desc: "Build wealth through strategic asset allocation", duration: "8-10 weeks", topics: ["Portfolio Construction", "Rebalancing Strategies", "Tax Optimization"], color: C.green },
  ];
  const courses = [
    { icon: "📖", title: "ETF Basics", desc: "Understanding Exchange-Traded Funds and how they work", level: "Beginner", lessons: 8, hours: 2, topics: ["What are ETFs and how do they differ from mutual funds?", "Types of ETFs: Equity, Bond, Commodity, and Sector ETFs", "How ETF pricing and trading works", "Understanding expense ratios and fees"] },
    { icon: "🔧", title: "Portfolio Construction", desc: "Learn asset allocation and diversification strategies", level: "Intermediate", lessons: 12, hours: 3, topics: ["Asset allocation strategies by age and risk tolerance", "The power of diversification", "Portfolio rebalancing strategies and timing"] },
    { icon: "🛡️", title: "Risk Management", desc: "Understanding and managing investment risk", level: "Intermediate", lessons: 10, hours: 2.5, topics: ["Understanding risk metrics: Standard deviation, beta, Sharpe ratio", "Managing portfolio volatility", "Hedging strategies and downside protection"] },
    { icon: "🔬", title: "Market Analysis", desc: "Technical and fundamental analysis techniques", level: "Advanced", lessons: 15, hours: 4, topics: ["Reading price charts and candlestick patterns", "Moving averages and trend identification", "Support and resistance levels", "Volume analysis and market sentiment", "RSI and momentum indicators", "MACD and other oscillators", "Fundamental analysis: P/E ratios and valuations", "Economic indicators and market cycles", "Interest rates and their impact on ETFs", "Sector rotation strategies", "Global macro analysis", "Sentiment indicators and contrarian investing", "Backtesting strategies", "Market timing vs time in market", "Building a watchlist and screening ETFs"] },
  ];
  const levelColor = { Beginner: C.green, Intermediate: C.gold, Advanced: C.red };
  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "36px 20px" }}>
      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <span style={{ ...badge(C.accent), fontSize: 10.5, marginBottom: 10, display: "inline-block" }}>Free Educational Content</span>
        <h1 style={{ color: C.text, fontSize: 32, margin: "0 0 10px", fontWeight: 800 }}>Investment Education</h1>
        <p style={{ color: C.sub, fontSize: 15, maxWidth: 550, margin: "0 auto" }}>Master the fundamentals of ETF investing with our comprehensive courses covering 45+ lessons and real-world strategies.</p>
      </div>

      {/* Featured Course */}
      <div style={{ ...cardS(), marginBottom: 30, borderColor: C.accentBorder }}>
        <span style={{ ...badge(C.accent), fontSize: 10, marginBottom: 12, display: "inline-block" }}>Featured Course</span>
        <h2 style={{ color: C.text, fontSize: 24, margin: "0 0 8px", fontWeight: 700 }}>Complete ETF Investing Guide</h2>
        <p style={{ color: C.sub, fontSize: 14, lineHeight: 1.6, marginBottom: 14 }}>A comprehensive course covering everything from ETF basics to advanced portfolio strategies. Perfect for beginners and intermediate investors looking to build a solid foundation.</p>
        <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
          <span style={{ color: C.dim, fontSize: 12.5 }}>📖 45 lessons</span>
          <span style={{ color: C.dim, fontSize: 12.5 }}>🎬 11.5 hours</span>
          <span style={{ color: C.dim, fontSize: 12.5 }}>🏅 Certificate</span>
        </div>
        <div style={{ ...cardS(), background: C.surface, textAlign: "center", padding: "20px" }}>
          <div style={{ color: C.accent, fontSize: 42, fontWeight: 800 }}>100%</div>
          <div style={{ color: C.dim, fontSize: 13 }}>Free Forever</div>
        </div>
      </div>

      {/* Learning Paths */}
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

      {/* All Courses */}
      <h2 style={{ color: C.text, fontSize: 22, margin: "0 0 16px", fontWeight: 700 }}>All Courses</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 36 }}>
        {courses.map((c, i) => (
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
              <span style={{ color: C.dim, fontSize: 12 }}>{c.lessons} lessons</span>
              <span style={{ color: C.dim, fontSize: 12 }}>• {c.hours} hours</span>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: C.sub, fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>What You\u2019ll Learn:</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {c.topics.map((t, j) => <span key={j} style={{ color: C.sub, fontSize: 12.5 }}>✓ {t}</span>)}
              </div>
            </div>
            <button onClick={() => setOpen(open === i ? null : i)} style={{ width: "100%", ...btnP(), fontSize: 13, padding: "10px" }}>{open === i ? "Enrolled ✓" : "Start Course →"}</button>
          </div>
        ))}
      </div>

      {/* Educational Articles (existing) */}
      <h2 style={{ color: C.text, fontSize: 22, margin: "0 0 16px", fontWeight: 700 }}>Quick Reads</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 30 }}>
        {LEARN_ARTICLES.map((a) => (
          <div key={a.id} onClick={() => setOpen(open === a.id + 100 ? null : a.id + 100)} style={{ ...cardS(), cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", gap: 7, marginBottom: 5 }}><span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, fontWeight: 600, color: C.accent, background: C.accentBg, border: `1px solid ${C.accentBorder}` }}>{a.cat}</span><span style={{ fontSize: 10, color: C.dim, fontFamily: mono }}>{a.time}</span></div>
                <h3 style={{ color: C.text, fontSize: 15.5, margin: 0 }}>{a.title}</h3>
              </div>
              <span style={{ color: C.dim, fontSize: 13 }}>{open === a.id + 100 ? "▲" : "▼"}</span>
            </div>
            {open === a.id + 100 && <p style={{ color: C.sub, fontSize: 13.5, lineHeight: 1.65, marginTop: 12, marginBottom: 0 }}>{a.body}</p>}
          </div>
        ))}
      </div>

      {/* Disclaimer */}
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
        <h3 style={{ color: C.text, fontSize: 16, margin: "0 0 10px" }}>For Developers: Collecting User Data</h3>
        <p style={{ color: C.sub, fontSize: 13.5, lineHeight: 1.6, margin: "0 0 10px" }}>
          The current sign-in system is a frontend demo. To collect and persist user signups in production, integrate one of these backend services:
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
    { icon: "📊", title: "Backtesting Engine" },
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
      { icon: "👑", title: "Premium Features", desc: "Advanced backtesting, API access, priority support" },
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
   APP ROOT
   ═══════════════════════════════════════════════════════════════════════ */

export default function App() {
  const validPages = ["home","builder","portfolios","leaderboard","learn","roadmap","pricing"];
  const getHashPage = () => { const h = window.location.hash.replace("#",""); return validPages.includes(h) ? h : "home"; };
  const [page, setPageState] = useState(getHashPage); const [user, setUser] = useState(null); const [authMode, setAuthMode] = useState(null); const [portfolios, setPortfolios] = useState([]); const [publicPortfolios, setPublicPortfolios] = useState([]);
  const [isDark, setIsDark] = useState(true);
  const toggleTheme = useCallback(() => { setIsDark(d => { const next = !d; setTheme(next); return next; }); }, []);
  const setPage = useCallback((p) => { setPageState(p); window.location.hash = p === "home" ? "" : p; window.scrollTo(0, 0); }, []);
  useEffect(() => { const onHash = () => setPageState(getHashPage()); window.addEventListener("hashchange", onHash); return () => window.removeEventListener("hashchange", onHash); }, []);
  useEffect(() => { if (memStore.session) { setUser(memStore.session.user); setPortfolios(memStore.session.portfolios || []); } if (memStore.publicPortfolios) setPublicPortfolios(memStore.publicPortfolios); }, []);
  useEffect(() => { if (user) memStore.session = { user, portfolios }; }, [user, portfolios]);
  useEffect(() => { memStore.publicPortfolios = publicPortfolios; }, [publicPortfolios]);
  const openAuth = (m) => setAuthMode(m);
  const doAuth = (u) => { setUser(u); setAuthMode(null); };
  const signOut = () => { setUser(null); setPortfolios([]); memStore.session = null; setPage("home"); };
  const savePortfolio = (p, isPublic) => {
    if (portfolios.length >= 3) { alert("Free tier: max 3 portfolios. Upgrade to Pro for unlimited."); return; }
    setPortfolios((prev) => [...prev, { ...p, isPublic }]);
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
            <p style={{ color: C.dim, fontSize: 12, lineHeight: 1.5 }}>AI-powered ETF simulation for education and portfolio research. Build, track, and backtest investment strategies risk-free.</p>
          </div>
          <div>
            <h4 style={{ color: C.sub, fontSize: 11, fontFamily: mono, letterSpacing: 0.5, marginBottom: 10 }}>PLATFORM</h4>
            {[["ETF Builder", "builder"], ["Leaderboard", "leaderboard"], ["My Portfolios", "portfolios"]].map(([l, k]) => <div key={k}><span onClick={() => setPage(k)} style={{ color: C.dim, fontSize: 12, cursor: "pointer", display: "block", marginBottom: 5 }}>{l}</span></div>)}
          </div>
          <div>
            <h4 style={{ color: C.sub, fontSize: 11, fontFamily: mono, letterSpacing: 0.5, marginBottom: 10 }}>RESOURCES</h4>
            {[["Learn", "learn"], ["Roadmap", "roadmap"], ["Pricing", "pricing"]].map(([l, k]) => <div key={k}><span onClick={() => setPage(k)} style={{ color: C.dim, fontSize: 12, cursor: "pointer", display: "block", marginBottom: 5 }}>{l}</span></div>)}
            <span style={{ color: C.dim, fontSize: 12, display: "block", marginBottom: 5 }}>API Docs (coming soon)</span>
            <span style={{ color: C.dim, fontSize: 12, display: "block", marginBottom: 5 }}>Support: support@etfsimulator.io</span>
          </div>
          <div>
            <h4 style={{ color: C.sub, fontSize: 11, fontFamily: mono, letterSpacing: 0.5, marginBottom: 10 }}>LEGAL</h4>
            <span style={{ color: C.dim, fontSize: 12, display: "block", marginBottom: 5 }}>Terms of Service</span>
            <span style={{ color: C.dim, fontSize: 12, display: "block", marginBottom: 5 }}>Privacy Policy</span>
            <span style={{ color: C.dim, fontSize: 12, display: "block", marginBottom: 5 }}>Disclaimer</span>
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
