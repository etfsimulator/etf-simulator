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
  { name: "Free", price: "$0", period: "forever", active: true, features: ["AI-generated ETF portfolios (10 holdings)", "$1M simulated starting capital", "Real-time portfolio tracking", "Auto-rebalancing engine", "Backtesting (up to 60 months)", "Market research with charts", "Community leaderboard", "Save up to 3 portfolios", "8 educational articles"] },
  { name: "Pro", price: "—", period: "pricing TBD", soon: true, features: ["Everything in Free", "Unlimited saved portfolios", "Live market data feeds", "Advanced AI strategies", "Custom rebalancing rules", "Export portfolio reports", "Priority AI generation", "Advanced backtesting (20+ years)"] },
  { name: "Institutional", price: "—", period: "pricing TBD", soon: true, features: ["Everything in Pro", "API access", "Team collaboration", "White-label reports", "Custom benchmarks", "Dedicated support", "Compliance tooling", "Bulk portfolio generation"] },
];

const FUTURE_PRODUCTS = [
  { icon: "⏱", title: "Advanced Backtesting", desc: "Test against 20+ years of historical data with custom date ranges and benchmark comparisons", eta: "Q2 2026" },
  { icon: "🌐", title: "Global Markets", desc: "Expand to international equities, ADRs, forex pairs, and emerging market securities", eta: "Q3 2026" },
  { icon: "📱", title: "Mobile-Optimized Access", desc: "Fully responsive mobile web experience with push notifications for portfolio alerts", eta: "Q4 2026" },
];

/* Top 50 crypto by market cap — these don't come from Finnhub stock symbols */
/* All assets are now in RESEARCH_ASSETS */

const RESEARCH_ASSETS = [
  // ═══ STOCKS — MEGA CAP TECH ═══
  { symbol: "AAPL", name: "Apple Inc.", type: "stock", price: 227.48, sector: "Technology", mktCap: "$3.48T", pe: 29.4, divYield: 0.44, desc: "Consumer electronics, software, and services. iPhone, Mac, iPad, Apple Watch, and Services ecosystem.", website: "apple.com" },
  { symbol: "NVDA", name: "NVIDIA Corp.", type: "stock", price: 875.28, sector: "Semiconductors", mktCap: "$2.15T", pe: 62.8, divYield: 0.02, desc: "Designs GPUs for gaming, data centers, AI/ML training. Dominant in AI infrastructure with CUDA and H100/B200 chips.", website: "nvidia.com" },
  { symbol: "MSFT", name: "Microsoft Corp.", type: "stock", price: 415.60, sector: "Technology", mktCap: "$3.09T", pe: 34.1, divYield: 0.72, desc: "Enterprise software, Azure cloud, Office 365, gaming (Xbox), and AI via OpenAI partnership and Copilot.", website: "microsoft.com" },
  { symbol: "GOOGL", name: "Alphabet Inc.", type: "stock", price: 175.98, sector: "Communication", mktCap: "$2.18T", pe: 23.5, divYield: 0.46, desc: "Parent of Google. Search, digital advertising, YouTube, Android, Google Cloud, and AI through DeepMind/Gemini.", website: "abc.xyz" },
  { symbol: "AMZN", name: "Amazon.com Inc.", type: "stock", price: 186.42, sector: "Consumer Disc.", mktCap: "$1.95T", pe: 42.3, divYield: 0, desc: "E-commerce, cloud computing (AWS), digital streaming, AI services, advertising, and logistics.", website: "amazon.com" },
  { symbol: "META", name: "Meta Platforms", type: "stock", price: 582.77, sector: "Communication", mktCap: "$1.47T", pe: 26.8, divYield: 0.35, desc: "Facebook, Instagram, WhatsApp, Threads, VR/AR (Meta Quest), and AI. 3.9B monthly active users.", website: "meta.com" },
  // ═══ STOCKS — TECH / AI / SEMIS ═══
  { symbol: "TSLA", name: "Tesla Inc.", type: "stock", price: 248.91, sector: "Auto / Energy", mktCap: "$793B", pe: 55.2, divYield: 0, desc: "Electric vehicles, energy storage, solar, and autonomous driving.", website: "tesla.com" },
  { symbol: "AVGO", name: "Broadcom Inc.", type: "stock", price: 192.45, sector: "Semiconductors", mktCap: "$895B", pe: 38.2, divYield: 1.22, desc: "Semiconductor and infrastructure software. Custom AI chips, networking, VMware.", website: "broadcom.com" },
  { symbol: "AMD", name: "Advanced Micro Devices", type: "stock", price: 118.33, sector: "Semiconductors", mktCap: "$191B", pe: 43.5, divYield: 0, desc: "CPUs, GPUs, and AI accelerators (MI300X). Competing with NVIDIA in data center AI.", website: "amd.com" },
  { symbol: "CRM", name: "Salesforce Inc.", type: "stock", price: 272.45, sector: "Cloud Software", mktCap: "$262B", pe: 45.1, divYield: 0.58, desc: "Enterprise CRM platform, AI-powered Einstein, Slack, Tableau.", website: "salesforce.com" },
  { symbol: "PLTR", name: "Palantir Technologies", type: "stock", price: 78.55, sector: "AI / Defense", mktCap: "$178B", pe: 185.0, divYield: 0, desc: "AI-powered data analytics for government and enterprise.", website: "palantir.com" },
  { symbol: "ORCL", name: "Oracle Corp.", type: "stock", price: 178.92, sector: "Cloud / Database", mktCap: "$493B", pe: 37.4, divYield: 0.89, desc: "Enterprise database, cloud infrastructure (OCI), ERP, and AI.", website: "oracle.com" },
  { symbol: "INTC", name: "Intel Corp.", type: "stock", price: 22.15, sector: "Semiconductors", mktCap: "$95B", pe: null, divYield: 1.62, desc: "CPU manufacturer pivoting to foundry services. Struggling in AI race.", website: "intel.com" },
  { symbol: "QCOM", name: "Qualcomm Inc.", type: "stock", price: 168.22, sector: "Semiconductors", mktCap: "$188B", pe: 18.4, divYield: 1.82, desc: "Mobile chip leader. Snapdragon processors for smartphones, automotive, IoT.", website: "qualcomm.com" },
  { symbol: "ADBE", name: "Adobe Inc.", type: "stock", price: 438.12, sector: "Software", mktCap: "$195B", pe: 28.5, divYield: 0, desc: "Creative Cloud, Document Cloud, Experience Cloud. AI-powered Firefly.", website: "adobe.com" },
  { symbol: "NOW", name: "ServiceNow Inc.", type: "stock", price: 892.44, sector: "Cloud Software", mktCap: "$184B", pe: 65.2, divYield: 0, desc: "Enterprise workflow automation. IT service management leader.", website: "servicenow.com" },
  { symbol: "SHOP", name: "Shopify Inc.", type: "stock", price: 108.33, sector: "E-Commerce", mktCap: "$136B", pe: 72.1, divYield: 0, desc: "E-commerce platform for merchants. Payments, shipping, and AI tools.", website: "shopify.com" },
  { symbol: "SNOW", name: "Snowflake Inc.", type: "stock", price: 168.55, sector: "Cloud Data", mktCap: "$55B", pe: null, divYield: 0, desc: "Cloud data platform. Data warehousing, sharing, and AI/ML workloads.", website: "snowflake.com" },
  { symbol: "MU", name: "Micron Technology", type: "stock", price: 98.44, sector: "Semiconductors", mktCap: "$108B", pe: 22.8, divYield: 0.48, desc: "Memory and storage: DRAM and NAND flash for AI, data centers, mobile.", website: "micron.com" },
  { symbol: "PANW", name: "Palo Alto Networks", type: "stock", price: 178.22, sector: "Cybersecurity", mktCap: "$118B", pe: 48.5, divYield: 0, desc: "Cybersecurity leader. Firewalls, cloud security, AI-driven threat detection.", website: "paloaltonetworks.com" },
  { symbol: "UBER", name: "Uber Technologies", type: "stock", price: 72.88, sector: "Transportation", mktCap: "$152B", pe: 28.4, divYield: 0, desc: "Ride-sharing, food delivery (Uber Eats), freight, and autonomous driving.", website: "uber.com" },
  { symbol: "NFLX", name: "Netflix Inc.", type: "stock", price: 918.55, sector: "Entertainment", mktCap: "$398B", pe: 42.8, divYield: 0, desc: "Streaming entertainment. 280M+ subscribers globally. Ad-supported tier growing.", website: "netflix.com" },
  { symbol: "DIS", name: "Walt Disney Co.", type: "stock", price: 108.22, sector: "Entertainment", mktCap: "$196B", pe: 35.2, divYield: 0.85, desc: "Entertainment conglomerate: theme parks, Disney+, ESPN, Marvel, Star Wars.", website: "thewaltdisneycompany.com" },
  // ═══ STOCKS — FINANCIALS ═══
  { symbol: "JPM", name: "JPMorgan Chase", type: "stock", price: 232.15, sector: "Financials", mktCap: "$672B", pe: 11.9, divYield: 2.18, desc: "Largest U.S. bank. Investment banking, commercial banking, asset management.", website: "jpmorganchase.com" },
  { symbol: "V", name: "Visa Inc.", type: "stock", price: 312.88, sector: "Financials", mktCap: "$645B", pe: 31.7, divYield: 0.74, desc: "Global payments technology. 200B+ transactions annually.", website: "visa.com" },
  { symbol: "GS", name: "Goldman Sachs", type: "stock", price: 582.44, sector: "Financials", mktCap: "$196B", pe: 14.8, divYield: 1.95, desc: "Investment banking, securities, asset management.", website: "goldmansachs.com" },
  { symbol: "BRK.B", name: "Berkshire Hathaway B", type: "stock", price: 485.12, sector: "Conglomerate", mktCap: "$1.06T", pe: 11.2, divYield: 0, desc: "Warren Buffett's conglomerate. Insurance, railroads, energy, equity portfolio.", website: "berkshirehathaway.com" },
  { symbol: "MA", name: "Mastercard Inc.", type: "stock", price: 522.33, sector: "Financials", mktCap: "$389B", pe: 37.2, divYield: 0.55, desc: "Global payments network. Processing technology for credit, debit, prepaid.", website: "mastercard.com" },
  { symbol: "BAC", name: "Bank of America", type: "stock", price: 42.55, sector: "Financials", mktCap: "$336B", pe: 13.5, divYield: 2.42, desc: "Major U.S. bank: consumer banking, wealth management, investment banking.", website: "bankofamerica.com" },
  { symbol: "WFC", name: "Wells Fargo", type: "stock", price: 68.22, sector: "Financials", mktCap: "$228B", pe: 12.8, divYield: 2.35, desc: "Diversified financial services. Consumer banking, commercial, wealth.", website: "wellsfargo.com" },
  { symbol: "MS", name: "Morgan Stanley", type: "stock", price: 115.44, sector: "Financials", mktCap: "$186B", pe: 17.2, divYield: 3.12, desc: "Investment banking, wealth management, institutional securities.", website: "morganstanley.com" },
  { symbol: "SCHW", name: "Charles Schwab", type: "stock", price: 78.33, sector: "Financials", mktCap: "$142B", pe: 25.8, divYield: 1.28, desc: "Brokerage and wealth management. 34M+ accounts, $8.5T+ in assets.", website: "schwab.com" },
  { symbol: "BLK", name: "BlackRock Inc.", type: "stock", price: 918.22, sector: "Asset Mgmt", mktCap: "$138B", pe: 22.5, divYield: 2.15, desc: "World's largest asset manager. $10T+ AUM. iShares ETF platform.", website: "blackrock.com" },
  { symbol: "AXP", name: "American Express", type: "stock", price: 278.55, sector: "Financials", mktCap: "$196B", pe: 19.8, divYield: 1.05, desc: "Premium credit cards, charge cards, and travel services.", website: "americanexpress.com" },
  { symbol: "PYPL", name: "PayPal Holdings", type: "stock", price: 72.44, sector: "Fintech", mktCap: "$72B", pe: 17.5, divYield: 0, desc: "Digital payments: PayPal, Venmo, Braintree. 430M+ accounts.", website: "paypal.com" },
  { symbol: "SQ", name: "Block Inc.", type: "stock", price: 68.33, sector: "Fintech", mktCap: "$42B", pe: 52.1, divYield: 0, desc: "Square payments, Cash App, Bitcoin, and Afterpay BNPL.", website: "block.xyz" },
  // ═══ STOCKS — HEALTHCARE / PHARMA ═══
  { symbol: "JNJ", name: "Johnson & Johnson", type: "stock", price: 158.42, sector: "Healthcare", mktCap: "$381B", pe: 15.2, divYield: 3.12, desc: "Pharmaceuticals, medical devices. 62 consecutive years of dividend increases.", website: "jnj.com" },
  { symbol: "UNH", name: "UnitedHealth Group", type: "stock", price: 512.34, sector: "Healthcare", mktCap: "$473B", pe: 19.8, divYield: 1.52, desc: "Largest U.S. health insurer. UnitedHealthcare and Optum.", website: "unitedhealthgroup.com" },
  { symbol: "LLY", name: "Eli Lilly & Co.", type: "stock", price: 812.55, sector: "Pharma", mktCap: "$772B", pe: 68.5, divYield: 0.62, desc: "Mounjaro/Zepbound (GLP-1). Massive growth from weight-loss drugs.", website: "lilly.com" },
  { symbol: "PFE", name: "Pfizer Inc.", type: "stock", price: 26.18, sector: "Pharma", mktCap: "$148B", pe: 18.4, divYield: 6.12, desc: "Global pharma: vaccines, oncology, rare diseases. High dividend.", website: "pfizer.com" },
  { symbol: "ABBV", name: "AbbVie Inc.", type: "stock", price: 178.92, sector: "Pharma", mktCap: "$315B", pe: 16.8, divYield: 3.45, desc: "Pharma: Humira successor Skyrizi/Rinvoq, oncology, aesthetics.", website: "abbvie.com" },
  { symbol: "MRK", name: "Merck & Co.", type: "stock", price: 108.44, sector: "Pharma", mktCap: "$274B", pe: 14.5, divYield: 2.82, desc: "Keytruda (cancer immunotherapy), vaccines (Gardasil), animal health.", website: "merck.com" },
  { symbol: "TMO", name: "Thermo Fisher Scientific", type: "stock", price: 558.22, sector: "Life Sciences", mktCap: "$212B", pe: 28.5, divYield: 0.22, desc: "Scientific instruments, reagents, lab equipment. Life science tools leader.", website: "thermofisher.com" },
  { symbol: "DHR", name: "Danaher Corp.", type: "stock", price: 248.33, sector: "Life Sciences", mktCap: "$182B", pe: 32.5, divYield: 0.42, desc: "Life sciences, diagnostics, environmental solutions. Serial acquirer.", website: "danaher.com" },
  { symbol: "NVO", name: "Novo Nordisk", type: "stock", price: 128.55, sector: "Pharma", mktCap: "$572B", pe: 42.8, divYield: 1.15, desc: "GLP-1 leader: Ozempic, Wegovy. Dominant in diabetes and obesity.", website: "novonordisk.com" },
  { symbol: "ISRG", name: "Intuitive Surgical", type: "stock", price: 518.22, sector: "Med Devices", mktCap: "$182B", pe: 68.5, divYield: 0, desc: "da Vinci surgical robots. Dominant in robotic-assisted surgery.", website: "intuitive.com" },
  // ═══ STOCKS — ENERGY ═══
  { symbol: "XOM", name: "Exxon Mobil Corp.", type: "stock", price: 108.75, sector: "Energy", mktCap: "$460B", pe: 13.4, divYield: 3.35, desc: "Integrated oil and gas. Exploration, production, refining, chemicals.", website: "exxonmobil.com" },
  { symbol: "CVX", name: "Chevron Corp.", type: "stock", price: 148.33, sector: "Energy", mktCap: "$272B", pe: 12.8, divYield: 4.12, desc: "Integrated energy: oil, gas, renewables. Strong dividend history.", website: "chevron.com" },
  { symbol: "NEE", name: "NextEra Energy", type: "stock", price: 72.88, sector: "Utilities / Clean", mktCap: "$149B", pe: 20.1, divYield: 2.82, desc: "World's largest generator of wind and solar energy.", website: "nexteraenergy.com" },
  { symbol: "COP", name: "ConocoPhillips", type: "stock", price: 108.55, sector: "Energy", mktCap: "$132B", pe: 11.5, divYield: 2.85, desc: "Independent E&P. Low-cost oil and gas production, strong shareholder returns.", website: "conocophillips.com" },
  { symbol: "SLB", name: "Schlumberger Ltd.", type: "stock", price: 42.88, sector: "Energy Services", mktCap: "$61B", pe: 14.2, divYield: 2.35, desc: "Oilfield services and technology. Global operations in 100+ countries.", website: "slb.com" },
  { symbol: "ENPH", name: "Enphase Energy", type: "stock", price: 68.22, sector: "Solar", mktCap: "$9.2B", pe: 22.5, divYield: 0, desc: "Solar microinverters and battery storage. Residential solar leader.", website: "enphase.com" },
  // ═══ STOCKS — CONSUMER / RETAIL ═══
  { symbol: "WMT", name: "Walmart Inc.", type: "stock", price: 92.45, sector: "Retail", mktCap: "$742B", pe: 38.2, divYield: 0.91, desc: "World's largest retailer. 10,500+ stores, growing e-commerce.", website: "walmart.com" },
  { symbol: "COST", name: "Costco Wholesale", type: "stock", price: 1018.33, sector: "Retail", mktCap: "$451B", pe: 56.8, divYield: 0.48, desc: "Membership-based warehouse clubs. 891 locations worldwide.", website: "costco.com" },
  { symbol: "PG", name: "Procter & Gamble", type: "stock", price: 162.55, sector: "Consumer Staples", mktCap: "$382B", pe: 25.8, divYield: 2.42, desc: "Consumer goods: Tide, Pampers, Gillette, Crest. Dividend aristocrat.", website: "pg.com" },
  { symbol: "KO", name: "Coca-Cola Co.", type: "stock", price: 62.33, sector: "Beverages", mktCap: "$268B", pe: 24.5, divYield: 2.85, desc: "Global beverage leader. 200+ brands including Coke, Sprite, Fanta.", website: "coca-colacompany.com" },
  { symbol: "PEP", name: "PepsiCo Inc.", type: "stock", price: 148.22, sector: "Beverages / Snacks", mktCap: "$204B", pe: 22.8, divYield: 3.28, desc: "Beverages (Pepsi, Gatorade) and snacks (Frito-Lay, Doritos, Quaker).", website: "pepsico.com" },
  { symbol: "MCD", name: "McDonald's Corp.", type: "stock", price: 292.44, sector: "Restaurants", mktCap: "$210B", pe: 25.5, divYield: 2.28, desc: "Global fast food chain. 40,000+ restaurants in 100+ countries.", website: "mcdonalds.com" },
  { symbol: "NKE", name: "Nike Inc.", type: "stock", price: 72.55, sector: "Apparel", mktCap: "$110B", pe: 22.8, divYield: 1.82, desc: "Athletic footwear and apparel. Largest sports brand globally.", website: "nike.com" },
  { symbol: "SBUX", name: "Starbucks Corp.", type: "stock", price: 98.22, sector: "Restaurants", mktCap: "$112B", pe: 28.5, divYield: 2.35, desc: "Global coffeehouse chain. 38,000+ stores. China expansion focus.", website: "starbucks.com" },
  { symbol: "TGT", name: "Target Corp.", type: "stock", price: 128.33, sector: "Retail", mktCap: "$58B", pe: 14.8, divYield: 3.42, desc: "Discount retailer. Same-day services, private labels, digital growth.", website: "target.com" },
  { symbol: "HD", name: "Home Depot", type: "stock", price: 388.22, sector: "Home Improvement", mktCap: "$382B", pe: 25.5, divYield: 2.28, desc: "Largest home improvement retailer. 2,300+ stores in N. America.", website: "homedepot.com" },
  { symbol: "LOW", name: "Lowe's Companies", type: "stock", price: 248.55, sector: "Home Improvement", mktCap: "$140B", pe: 18.8, divYield: 1.82, desc: "Home improvement retailer. 1,700+ stores. Pro customer focus.", website: "lowes.com" },
  // ═══ STOCKS — INDUSTRIALS / DEFENSE ═══
  { symbol: "LMT", name: "Lockheed Martin", type: "stock", price: 472.88, sector: "Aerospace/Defense", mktCap: "$112B", pe: 16.8, divYield: 2.72, desc: "World's largest defense contractor. F-35, missile defense, space systems.", website: "lockheedmartin.com" },
  { symbol: "CAT", name: "Caterpillar Inc.", type: "stock", price: 348.22, sector: "Industrials", mktCap: "$168B", pe: 15.5, divYield: 1.58, desc: "Heavy construction and mining equipment. Infrastructure bellwether.", website: "caterpillar.com" },
  { symbol: "GE", name: "GE Aerospace", type: "stock", price: 188.55, sector: "Aerospace", mktCap: "$205B", pe: 35.2, divYield: 0.62, desc: "Aviation engines and services. Dominant in commercial jet engines.", website: "ge.com" },
  { symbol: "RTX", name: "RTX Corp.", type: "stock", price: 118.33, sector: "Defense", mktCap: "$155B", pe: 18.5, divYield: 2.15, desc: "Defense and aerospace: Pratt & Whitney engines, Raytheon missiles.", website: "rtx.com" },
  { symbol: "BA", name: "Boeing Co.", type: "stock", price: 172.22, sector: "Aerospace", mktCap: "$112B", pe: null, divYield: 0, desc: "Commercial aircraft, defense, and space. 737 MAX recovery ongoing.", website: "boeing.com" },
  { symbol: "HON", name: "Honeywell Intl.", type: "stock", price: 208.44, sector: "Industrials", mktCap: "$138B", pe: 22.5, divYield: 2.05, desc: "Diversified industrial: aerospace, building tech, materials, energy.", website: "honeywell.com" },
  { symbol: "UPS", name: "United Parcel Service", type: "stock", price: 128.55, sector: "Logistics", mktCap: "$108B", pe: 15.8, divYield: 5.05, desc: "Global package delivery and supply chain management.", website: "ups.com" },
  { symbol: "DE", name: "Deere & Company", type: "stock", price: 428.22, sector: "Agriculture", mktCap: "$118B", pe: 15.2, divYield: 1.42, desc: "Agricultural and construction equipment. Precision agriculture and autonomy.", website: "deere.com" },
  // ═══ STOCKS — FINTECH / EDTECH ═══
  { symbol: "HOOD", name: "Robinhood Markets", type: "stock", price: 42.15, sector: "Fintech", mktCap: "$37B", pe: 45.6, divYield: 0, desc: "Commission-free trading for stocks, ETFs, options, crypto.", website: "robinhood.com" },
  { symbol: "COIN", name: "Coinbase Global", type: "stock", price: 265.33, sector: "Fintech / Crypto", mktCap: "$66B", pe: 38.2, divYield: 0, desc: "Largest U.S. crypto exchange. Trading, staking, custody.", website: "coinbase.com" },
  { symbol: "COUR", name: "Coursera Inc.", type: "stock", price: 8.42, sector: "EdTech", mktCap: "$1.3B", pe: null, divYield: 0, desc: "Online education: courses, certificates from top universities.", website: "coursera.org" },
  { symbol: "DUOL", name: "Duolingo Inc.", type: "stock", price: 342.55, sector: "EdTech", mktCap: "$15.2B", pe: 155.0, divYield: 0, desc: "Language learning platform with 100M+ monthly active users.", website: "duolingo.com" },
  { symbol: "MSTR", name: "MicroStrategy", type: "stock", price: 318.44, sector: "BTC / Software", mktCap: "$62B", pe: null, divYield: 0, desc: "Business intelligence software. Largest corporate Bitcoin holder (190K+ BTC).", website: "microstrategy.com" },
  // ═══ STOCKS — TELECOM / REAL ESTATE / UTILITIES ═══
  { symbol: "T", name: "AT&T Inc.", type: "stock", price: 22.88, sector: "Telecom", mktCap: "$164B", pe: 11.2, divYield: 5.82, desc: "Wireless carrier, fiber broadband, HBO Max content.", website: "att.com" },
  { symbol: "VZ", name: "Verizon Communications", type: "stock", price: 42.55, sector: "Telecom", mktCap: "$179B", pe: 9.8, divYield: 6.28, desc: "Largest U.S. wireless carrier. 5G network, Fios broadband.", website: "verizon.com" },
  { symbol: "AMT", name: "American Tower", type: "stock", price: 198.22, sector: "REIT / Telecom", mktCap: "$92B", pe: 42.5, divYield: 3.35, desc: "Cell tower REIT. 224,000+ towers globally. 5G infrastructure beneficiary.", website: "americantower.com" },
  { symbol: "PLD", name: "Prologis Inc.", type: "stock", price: 118.33, sector: "REIT / Logistics", mktCap: "$110B", pe: 35.8, divYield: 3.12, desc: "Industrial REIT: warehouses and logistics facilities. E-commerce beneficiary.", website: "prologis.com" },
  { symbol: "O", name: "Realty Income Corp.", type: "stock", price: 55.44, sector: "REIT", mktCap: "$48B", pe: 18.5, divYield: 5.55, desc: "Monthly dividend REIT. Net lease retail and commercial properties.", website: "realtyincome.com" },
  { symbol: "SO", name: "Southern Company", type: "stock", price: 88.22, sector: "Utilities", mktCap: "$96B", pe: 21.5, divYield: 3.28, desc: "Electric utility serving 9M customers in Southeast U.S.", website: "southerncompany.com" },
  { symbol: "DUK", name: "Duke Energy", type: "stock", price: 108.33, sector: "Utilities", mktCap: "$83B", pe: 18.8, divYield: 3.72, desc: "Electric utility serving 7.9M customers. Clean energy transition.", website: "duke-energy.com" },
  // ═══ STOCKS — MATERIALS / INDUSTRIALS ═══
  { symbol: "LIN", name: "Linde PLC", type: "stock", price: 458.22, sector: "Ind. Gases", mktCap: "$218B", pe: 32.5, divYield: 1.18, desc: "World's largest industrial gas company. Hydrogen, clean energy.", website: "linde.com" },
  { symbol: "APD", name: "Air Products", type: "stock", price: 298.33, sector: "Ind. Gases", mktCap: "$66B", pe: 25.8, divYield: 2.42, desc: "Industrial gases and clean hydrogen. Green energy transition play.", website: "airproducts.com" },
  { symbol: "FCX", name: "Freeport-McMoRan", type: "stock", price: 42.55, sector: "Mining / Copper", mktCap: "$61B", pe: 28.5, divYield: 1.42, desc: "World's largest publicly traded copper producer. EV/AI demand driver.", website: "fcx.com" },
  { symbol: "NEM", name: "Newmont Corp.", type: "stock", price: 48.22, sector: "Gold Mining", mktCap: "$56B", pe: 18.2, divYield: 2.08, desc: "World's largest gold mining company. Inflation hedge.", website: "newmont.com" },
  // ═══ ETFs — BROAD MARKET ═══
  { symbol: "VOO", name: "Vanguard S&P 500 ETF", type: "etf", price: 547.89, sector: "US Large Cap", mktCap: "$1.1T AUM", pe: 23.1, divYield: 1.28, desc: "Tracks S&P 500. 500 largest U.S. companies. 0.03% expense ratio.", website: "vanguard.com" },
  { symbol: "QQQ", name: "Invesco QQQ Trust", type: "etf", price: 518.72, sector: "US Tech/Growth", mktCap: "$312B AUM", pe: 31.5, divYield: 0.55, desc: "Tracks Nasdaq-100. Heavy tech allocation.", website: "invesco.com" },
  { symbol: "VTI", name: "Vanguard Total Stock Mkt", type: "etf", price: 275.33, sector: "US Total Market", mktCap: "$427B AUM", pe: 21.8, divYield: 1.32, desc: "Entire U.S. equity market. 3,600+ holdings.", website: "vanguard.com" },
  { symbol: "SPY", name: "SPDR S&P 500 ETF", type: "etf", price: 549.22, sector: "US Large Cap", mktCap: "$560B AUM", pe: 23.2, divYield: 1.25, desc: "First and most traded ETF. Tracks S&P 500.", website: "ssga.com" },
  { symbol: "IWM", name: "iShares Russell 2000", type: "etf", price: 224.18, sector: "US Small Cap", mktCap: "$73B AUM", pe: 15.2, divYield: 1.25, desc: "Small-cap U.S. stocks. 2,000 holdings.", website: "ishares.com" },
  { symbol: "DIA", name: "SPDR Dow Jones ETF", type: "etf", price: 432.55, sector: "US Blue Chip", mktCap: "$36B AUM", pe: 19.8, divYield: 1.65, desc: "Tracks Dow Jones Industrial Average. 30 blue-chips.", website: "ssga.com" },
  // ═══ ETFs — SECTOR ═══
  { symbol: "XLK", name: "Technology Select SPDR", type: "etf", price: 228.44, sector: "US Technology", mktCap: "$71B AUM", pe: 32.4, divYield: 0.65, desc: "S&P 500 technology sector.", website: "ssga.com" },
  { symbol: "XLF", name: "Financial Select SPDR", type: "etf", price: 48.92, sector: "US Financials", mktCap: "$41B AUM", pe: 16.2, divYield: 1.48, desc: "S&P 500 financial sector.", website: "ssga.com" },
  { symbol: "XLE", name: "Energy Select SPDR", type: "etf", price: 88.15, sector: "US Energy", mktCap: "$35B AUM", pe: 12.8, divYield: 3.22, desc: "S&P 500 energy sector.", website: "ssga.com" },
  { symbol: "XLV", name: "Health Care Select SPDR", type: "etf", price: 148.33, sector: "US Healthcare", mktCap: "$40B AUM", pe: 18.5, divYield: 1.35, desc: "S&P 500 healthcare sector.", website: "ssga.com" },
  { symbol: "XLI", name: "Industrial Select SPDR", type: "etf", price: 128.22, sector: "US Industrials", mktCap: "$18B AUM", pe: 22.5, divYield: 1.42, desc: "S&P 500 industrial sector.", website: "ssga.com" },
  { symbol: "XLC", name: "Communication Select SPDR", type: "etf", price: 92.55, sector: "US Communication", mktCap: "$18B AUM", pe: 18.8, divYield: 0.72, desc: "S&P 500 communication services: Meta, Google, Netflix.", website: "ssga.com" },
  { symbol: "XLP", name: "Consumer Staples Select", type: "etf", price: 78.33, sector: "US Staples", mktCap: "$16B AUM", pe: 22.8, divYield: 2.55, desc: "S&P 500 consumer staples: PG, KO, PEP, WMT.", website: "ssga.com" },
  { symbol: "XLY", name: "Consumer Disc. Select", type: "etf", price: 198.22, sector: "US Cons. Disc.", mktCap: "$21B AUM", pe: 28.5, divYield: 0.82, desc: "S&P 500 consumer discretionary: AMZN, TSLA.", website: "ssga.com" },
  { symbol: "XLRE", name: "Real Estate Select SPDR", type: "etf", price: 42.55, sector: "US Real Estate", mktCap: "$6B AUM", pe: 32.5, divYield: 3.22, desc: "S&P 500 real estate sector.", website: "ssga.com" },
  { symbol: "XLU", name: "Utilities Select SPDR", type: "etf", price: 72.33, sector: "US Utilities", mktCap: "$15B AUM", pe: 18.5, divYield: 2.85, desc: "S&P 500 utilities sector.", website: "ssga.com" },
  { symbol: "XLB", name: "Materials Select SPDR", type: "etf", price: 88.22, sector: "US Materials", mktCap: "$7B AUM", pe: 18.8, divYield: 1.72, desc: "S&P 500 materials sector.", website: "ssga.com" },
  { symbol: "ARKK", name: "ARK Innovation ETF", type: "etf", price: 55.12, sector: "Disruptive Tech", mktCap: "$6.8B AUM", pe: null, divYield: 0, desc: "Actively managed: AI, robotics, genomics, fintech. Cathie Wood.", website: "ark-invest.com" },
  { symbol: "SMH", name: "VanEck Semiconductor ETF", type: "etf", price: 248.33, sector: "Semiconductors", mktCap: "$22B AUM", pe: 28.5, divYield: 0.55, desc: "Top 25 semiconductor stocks. NVDA, AVGO, ASML, TSM, AMD.", website: "vaneck.com" },
  // ═══ ETFs — DIVIDEND / INCOME ═══
  { symbol: "SCHD", name: "Schwab US Dividend Equity", type: "etf", price: 28.55, sector: "US Dividend", mktCap: "$58B AUM", pe: 16.8, divYield: 3.42, desc: "High-quality dividend stocks. 100 holdings. Low 0.06% expense.", website: "schwab.com" },
  { symbol: "VIG", name: "Vanguard Dividend Appreciation", type: "etf", price: 188.22, sector: "Dividend Growth", mktCap: "$82B AUM", pe: 22.5, divYield: 1.72, desc: "Companies with 10+ consecutive years of dividend growth.", website: "vanguard.com" },
  { symbol: "JEPI", name: "JPMorgan Equity Premium", type: "etf", price: 58.33, sector: "Income", mktCap: "$34B AUM", pe: null, divYield: 7.55, desc: "Covered call strategy on S&P 500 for high income. Monthly payouts.", website: "am.jpmorgan.com" },
  // ═══ ETFs — BONDS / FIXED INCOME ═══
  { symbol: "BND", name: "Vanguard Total Bond Mkt", type: "etf", price: 72.48, sector: "US Bonds", mktCap: "$320B AUM", pe: null, divYield: 4.42, desc: "Broad U.S. investment-grade bonds.", website: "vanguard.com" },
  { symbol: "SHY", name: "iShares 1-3 Yr Treasury", type: "etf", price: 82.15, sector: "Short-term Bonds", mktCap: "$26B AUM", pe: null, divYield: 4.18, desc: "Short-term U.S. Treasury bonds.", website: "ishares.com" },
  { symbol: "TLT", name: "iShares 20+ Year Treasury", type: "etf", price: 92.44, sector: "Long-term Bonds", mktCap: "$52B AUM", pe: null, divYield: 4.55, desc: "Long-duration U.S. Treasuries.", website: "ishares.com" },
  { symbol: "AGG", name: "iShares Core US Agg Bond", type: "etf", price: 98.22, sector: "US Agg Bonds", mktCap: "$115B AUM", pe: null, divYield: 4.28, desc: "Bloomberg U.S. Aggregate Bond Index.", website: "ishares.com" },
  { symbol: "HYG", name: "iShares High Yield Corp", type: "etf", price: 78.55, sector: "High Yield Bonds", mktCap: "$18B AUM", pe: null, divYield: 5.72, desc: "High-yield corporate bonds. Higher risk, higher income.", website: "ishares.com" },
  { symbol: "TIPS", name: "iShares TIPS Bond ETF", type: "etf", price: 108.22, sector: "Inflation Protected", mktCap: "$22B AUM", pe: null, divYield: 3.82, desc: "Treasury Inflation-Protected Securities. Real return hedge.", website: "ishares.com" },
  // ═══ ETFs — INTERNATIONAL ═══
  { symbol: "VWO", name: "Vanguard Emerging Mkts", type: "etf", price: 43.22, sector: "Emerging Mkts", mktCap: "$82B AUM", pe: 12.8, divYield: 3.15, desc: "Emerging markets: China, India, Brazil, Taiwan.", website: "vanguard.com" },
  { symbol: "VXUS", name: "Vanguard Total Intl Stock", type: "etf", price: 60.15, sector: "International", mktCap: "$440B AUM", pe: 14.5, divYield: 2.88, desc: "All non-U.S. stocks. 8,500+ holdings.", website: "vanguard.com" },
  { symbol: "EFA", name: "iShares MSCI EAFE", type: "etf", price: 82.33, sector: "Developed Intl", mktCap: "$55B AUM", pe: 15.2, divYield: 2.72, desc: "Developed markets ex-U.S./Canada.", website: "ishares.com" },
  { symbol: "FXI", name: "iShares China Large-Cap", type: "etf", price: 28.55, sector: "China", mktCap: "$6B AUM", pe: 10.2, divYield: 2.35, desc: "Largest Chinese companies. Alibaba, Tencent, Meituan.", website: "ishares.com" },
  // ═══ ETFs — THEMATIC ═══
  { symbol: "IBIT", name: "iShares Bitcoin Trust", type: "etf", price: 52.88, sector: "Bitcoin", mktCap: "$55B AUM", pe: null, divYield: 0, desc: "Spot Bitcoin ETF by BlackRock.", website: "ishares.com" },
  { symbol: "ICLN", name: "iShares Global Clean Energy", type: "etf", price: 12.45, sector: "Clean Energy", mktCap: "$2.4B AUM", pe: 22.1, divYield: 0.88, desc: "Global clean energy companies.", website: "ishares.com" },
  { symbol: "BOTZ", name: "Global X Robotics & AI", type: "etf", price: 32.55, sector: "Robotics / AI", mktCap: "$2.5B AUM", pe: 28.5, divYield: 0.22, desc: "Companies in robotics, AI, automation. Global coverage.", website: "globalxetfs.com" },
  { symbol: "HACK", name: "ETFMG Prime Cyber Security", type: "etf", price: 62.22, sector: "Cybersecurity", mktCap: "$1.8B AUM", pe: 32.5, divYield: 0.12, desc: "Cybersecurity companies: CrowdStrike, Palo Alto, Fortinet.", website: "etfmg.com" },
  { symbol: "TAN", name: "Invesco Solar ETF", type: "etf", price: 38.55, sector: "Solar", mktCap: "$1.5B AUM", pe: 18.5, divYield: 0.45, desc: "Solar energy companies globally.", website: "invesco.com" },
  // ═══ CRYPTO ═══
  { symbol: "BTC", name: "Bitcoin", type: "crypto", price: 97245.0, sector: "Digital Gold", mktCap: "$1.91T", pe: null, divYield: 0, desc: "First and largest cryptocurrency. Limited 21M supply.", website: "bitcoin.org" },
  { symbol: "ETH", name: "Ethereum", type: "crypto", price: 3412.5, sector: "Smart Contracts", mktCap: "$410B", pe: null, divYield: 0, desc: "Programmable blockchain for DeFi, NFTs, dApps.", website: "ethereum.org" },
  { symbol: "SOL", name: "Solana", type: "crypto", price: 198.74, sector: "Layer 1", mktCap: "$92B", pe: null, divYield: 0, desc: "High-performance L1. Fast transactions, low fees.", website: "solana.com" },
  { symbol: "ADA", name: "Cardano", type: "crypto", price: 0.82, sector: "Layer 1", mktCap: "$29B", pe: null, divYield: 0, desc: "Peer-reviewed blockchain. Scalability and sustainability.", website: "cardano.org" },
  { symbol: "AVAX", name: "Avalanche", type: "crypto", price: 38.55, sector: "Layer 1", mktCap: "$15.8B", pe: null, divYield: 0, desc: "High-throughput smart contract platform with subnets.", website: "avax.network" },
  { symbol: "LINK", name: "Chainlink", type: "crypto", price: 18.45, sector: "Oracle Network", mktCap: "$11.5B", pe: null, divYield: 0, desc: "Decentralized oracle network. Critical DeFi infrastructure.", website: "chain.link" },
  { symbol: "DOT", name: "Polkadot", type: "crypto", price: 7.22, sector: "Interoperability", mktCap: "$10.2B", pe: null, divYield: 0, desc: "Multi-chain protocol for cross-blockchain transfers.", website: "polkadot.network" },
  { symbol: "MATIC", name: "Polygon", type: "crypto", price: 0.48, sector: "Layer 2", mktCap: "$4.8B", pe: null, divYield: 0, desc: "Ethereum scaling solution. Fast, cheap transactions.", website: "polygon.technology" },
  { symbol: "XRP", name: "Ripple XRP", type: "crypto", price: 2.42, sector: "Payments", mktCap: "$137B", pe: null, divYield: 0, desc: "Digital payment protocol for cross-border transactions.", website: "ripple.com" },
  { symbol: "DOGE", name: "Dogecoin", type: "crypto", price: 0.33, sector: "Meme / Payments", mktCap: "$48B", pe: null, divYield: 0, desc: "Meme coin. Tipping and micropayments.", website: "dogecoin.com" },
  // ═══ COMMODITIES ═══
  { symbol: "GLD", name: "SPDR Gold Shares", type: "commodity", price: 274.82, sector: "Precious Metals", mktCap: "$72B AUM", pe: null, divYield: 0, desc: "Physically backed gold ETF. Premier inflation hedge.", website: "spdrgoldshares.com" },
  { symbol: "SLV", name: "iShares Silver Trust", type: "commodity", price: 32.14, sector: "Precious Metals", mktCap: "$14B AUM", pe: null, divYield: 0, desc: "Physically backed silver ETF.", website: "ishares.com" },
  { symbol: "USO", name: "United States Oil Fund", type: "commodity", price: 71.82, sector: "Crude Oil", mktCap: "$2.8B AUM", pe: null, divYield: 0, desc: "Tracks WTI crude oil via futures.", website: "uscfinvestments.com" },
  { symbol: "UNG", name: "United States Natural Gas", type: "commodity", price: 14.55, sector: "Natural Gas", mktCap: "$830M AUM", pe: null, divYield: 0, desc: "Natural gas futures. Volatile.", website: "uscfinvestments.com" },
  { symbol: "DBC", name: "Invesco DB Commodity Idx", type: "commodity", price: 22.46, sector: "Broad Commodity", mktCap: "$3.1B AUM", pe: null, divYield: 0, desc: "Diversified: energy, metals, agriculture.", website: "invesco.com" },
  { symbol: "WEAT", name: "Teucrium Wheat Fund", type: "commodity", price: 5.38, sector: "Agriculture", mktCap: "$180M AUM", pe: null, divYield: 0, desc: "Wheat futures. Weather and geopolitics sensitive.", website: "teucrium.com" },
  { symbol: "PPLT", name: "Aberdeen Platinum ETF", type: "commodity", price: 88.22, sector: "Precious Metals", mktCap: "$1.1B AUM", pe: null, divYield: 0, desc: "Physically backed platinum.", website: "abrdn.com" },
  { symbol: "PDBC", name: "Invesco Optimum Yield", type: "commodity", price: 14.88, sector: "Broad Commodity", mktCap: "$5.2B AUM", pe: null, divYield: 0, desc: "Actively managed broad commodities. K-1 free.", website: "invesco.com" },
  { symbol: "CORN", name: "Teucrium Corn Fund", type: "commodity", price: 19.22, sector: "Agriculture", mktCap: "$95M AUM", pe: null, divYield: 0, desc: "Corn futures. Food, ethanol, animal feed.", website: "teucrium.com" },
  { symbol: "CPER", name: "United States Copper Idx", type: "commodity", price: 28.15, sector: "Industrial Metal", mktCap: "$210M AUM", pe: null, divYield: 0, desc: "Copper futures. Critical EV/infrastructure metal.", website: "uscfinvestments.com" },
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
function assetChange(a) { const s = a.symbol.charCodeAt(0) + a.symbol.charCodeAt(a.symbol.length - 1); return Math.round(((sr(s * 13.37) * 7) - 2) * 100) / 100; }

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

const AI_SYSTEM_PROMPT = `You are the Chief Investment Officer at a leading quantitative investment firm with $50B+ AUM. You have 25+ years of experience constructing institutional-grade thematic ETFs, and you are designing a fully realized, investable ETF as if filing with the SEC. Every decision must be defensible to an investment committee, backed by quantitative analysis and real financial data.

You have deep expertise in: modern portfolio theory, factor investing, macroeconomic analysis, sector rotation, quantitative risk modeling, behavioral finance, ESG integration, derivatives overlays, and tax-efficient fund structuring.

RESPONSE FORMAT: Return ONLY valid JSON. No markdown, no backticks, no preamble.

{
  "name": "ETF Name (professional fund naming convention, 3-8 words)",
  "ticker": "4-letter ticker suggestion (creative, memorable, relevant to thesis)",
  "strategy": "3-4 sentence fund objective statement: investment strategy, target investor profile, expected risk/return, and why this ETF fills a market gap.",
  "riskProfile": "conservative | moderate | aggressive",
  "targetReturn": "X-Y% annualized",
  "targetVolatility": "X%",
  "sharpeTarget": "X.X",
  "sortinoTarget": "X.X",
  "maxDrawdown": "X%",
  "rebalanceFrequency": "monthly | quarterly | semi-annually",
  "benchmark": "Primary benchmark index for comparison (e.g., S&P 500, NASDAQ-100, Bloomberg Aggregate Bond)",
  "fee": 0.15,
  "fundSummary": {
    "investmentThesis": "2-3 sentences: the core market insight, structural trend, or mispricing this fund captures.",
    "targetInvestor": "Who this fund is for: risk tolerance, time horizon, portfolio role, investment experience level.",
    "competitiveEdge": "What makes this ETF different from existing funds. Name 2-3 competing ETFs and explain differentiation.",
    "scalingPlan": "$1M seed → projected AUM milestones at 6mo, 1yr, and 3yr with distribution strategy.",
    "taxEfficiency": "Tax structure: qualified dividends %, LTCG treatment, K-1 avoidance, wash sale considerations, tax-loss harvesting opportunities."
  },
  "macroAnalysis": {
    "regime": "Current macro regime: expansion, late-cycle, recession, recovery. How does this affect the thesis?",
    "interestRates": "Impact of current rate environment on portfolio holdings and sector allocation.",
    "inflation": "How the portfolio is positioned for current and expected inflation trends.",
    "geopolitical": "Key geopolitical risks and how the portfolio hedges against them.",
    "sectorRotation": "Which sectors are being overweighted/underweighted based on economic cycle positioning."
  },
  "assetAllocation": {
    "equities": "X%",
    "fixedIncome": "X%",
    "crypto": "X%",
    "commodities": "X%",
    "alternatives": "X%"
  },
  "factorExposure": {
    "momentum": "low | medium | high — explain why",
    "value": "low | medium | high — explain why",
    "growth": "low | medium | high — explain why",
    "quality": "low | medium | high — explain why",
    "lowVolatility": "low | medium | high — explain why",
    "size": "large-cap biased | mid-cap biased | small-cap biased | balanced"
  },
  "holdings": [
    {
      "symbol": "TICKER",
      "name": "Full Security Name",
      "type": "stock | etf | crypto | commodity",
      "allocation": 150000,
      "weight": 15.0,
      "role": "Core | Satellite | Hedge | Growth Kicker | Income | Diversifier | Tactical",
      "sector": "Technology | Healthcare | Financials | Energy | Consumer | Industrials | Materials | Utilities | Real Estate | Crypto | Fixed Income | Commodities",
      "marketCap": "Mega ($200B+) | Large ($10-200B) | Mid ($2-10B) | Small (<$2B) | N/A",
      "rationale": "5-6 sentences: (1) Specific competitive advantage with financial metrics (P/E, EV/EBITDA, PEG ratio, revenue growth, margins, FCF yield, dividend yield, market cap, debt/equity). (2) How it directly fits the thesis and what near-term catalysts exist (earnings, product launches, regulatory events, M&A). (3) Role in portfolio construction: correlation benefit, risk offset, return driver, factor tilt. (4) Why THIS security over 2-3 named alternatives in the same space. (5) Key risk factor and how it's mitigated by other holdings. (6) Technical setup: current price relative to 50/200-day moving averages, support/resistance levels.",
      "exitTrigger": "Specific condition that would trigger position reduction or exit (e.g., P/E exceeds 40x, revenue growth falls below 10%, breaks below 200-day MA)"
    }
  ],
  "riskAnalysis": {
    "correlationNote": "How the holdings are diversified across correlation clusters. Identify 2-3 correlation pairs and their estimated coefficients.",
    "worstCase": "Estimated max portfolio drawdown scenario with specific trigger (e.g., 2022-style rate shock, pandemic, sector blow-up). Include estimated loss.",
    "hedgingStrategy": "How defensive positions protect the portfolio in downturns. Quantify the hedge ratio.",
    "tailRisk": "Specific black swan scenario and estimated portfolio impact. What would cause >20% drawdown?",
    "liquidityRisk": "Assessment of portfolio liquidity: what % could be liquidated in 1 day vs 5 days?"
  },
  "incomeProjection": {
    "estimatedYield": "X.X% blended portfolio yield from dividends and interest",
    "annualIncome": "$X estimated annual income on $1M",
    "growthVsIncome": "X% growth / Y% income split in expected total return"
  },
  "esgConsiderations": "Brief ESG profile: any notable inclusions/exclusions, carbon exposure, controversy flags.",
  "rebalanceRules": "Specific rules: calendar-based (e.g., quarterly) + drift-based (e.g., >5% from target). How to handle tax lots during rebalance."
}

PORTFOLIO CONSTRUCTION RULES:
1. EXACTLY 10 holdings. Allocations MUST sum to exactly 1,000,000 ($1M seed capital).
2. "weight" = allocation / 10000 (percentage).
3. "type" must be: "stock", "etf", "crypto", or "commodity".

ASSET ALLOCATION FRAMEWORK:
- CONSERVATIVE: 35-45% equities, 30-40% bonds/fixed income (BND, SHY, TLT, AGG, GOVT, VCSH, VCIT), 10-20% commodities (GLD, SLV), 0-5% crypto. Target Sharpe > 0.8, Sortino > 1.0, vol < 10%, max drawdown < 12%.
- MODERATE: 50-65% equities, 15-25% bonds, 5-15% alternatives (commodities, REIT, infrastructure), 5-15% crypto. Target Sharpe > 1.0, Sortino > 1.3, vol < 15%, max drawdown < 18%.
- AGGRESSIVE: 55-75% equities, 5-15% bonds, 10-25% crypto, 5-15% commodities/alternatives. Target Sharpe > 0.7, Sortino > 0.9, accept vol up to 25%, max drawdown < 30%.

SECURITY SELECTION — USE ONLY REAL, CURRENTLY TRADEABLE TICKERS:
- Stocks: ANY US-listed equity from NYSE, NASDAQ, AMEX. Mega-caps to small-caps. Include sector leaders AND emerging disruptors.
- ETFs: ANY US-listed ETF — broad market (VOO, QQQ, VTI, SPY, IWM, DIA), sector (XLK, XLF, XLE, XLV, XLI, XLC, XLRE, XLU, XLB, XLP, XLY), thematic (ARKK, IBIT, ICLN, TAN, LIT, HACK, BOTZ, AIQ), fixed income (BND, SHY, TLT, AGG, HYG, LQD, TIPS, VCSH), international (VWO, VXUS, EFA, EEM, FXI), dividend (SCHD, VIG, VYM, JEPI, HDV), etc.
- Crypto: Top 50 by market cap — BTC, ETH, SOL, XRP, ADA, AVAX, LINK, DOT, MATIC, DOGE, UNI, AAVE, etc.
- Commodities: GLD, SLV, IAU, USO, UNG, DBC, PDBC, GSG, WEAT, CORN, CPER, GDX, GDXJ, SIL, URA, LIT, COPX, PPLT, PALL, etc.

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
    { k: "home", l: "Home" }, { k: "builder", l: "ETF Builder" }, { k: "research", l: "Research" },
    { k: "portfolios", l: "My Portfolios" }, { k: "leaderboard", l: "Leaderboard" },
    { k: "learn", l: "Learn" }, { k: "pricing", l: "Pricing" },
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
          { n: "10,000+", l: "Stocks, ETFs, Crypto & Commodities" }, { n: "10", l: "Holdings Per ETF" }, { n: "$1M", l: "Simulated Capital" }, { n: "60mo", l: "Backtest Range" },
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
          { n: "01", t: "Describe Your Thesis", d: "Sectors, themes, risk tolerance, time horizon — anything goes." },
          { n: "02", t: "AI Builds Your ETF", d: "10 holdings across asset classes with $1M allocation and rationale." },
          { n: "03", t: "Track in Real Time", d: "Live value updates, performance charts, and a community leaderboard." },
          { n: "04", t: "Rebalance & Backtest", d: "Auto-rebalance to targets. Backtest up to 60 months of simulated history." },
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
      <div className="grid3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
        {FUTURE_PRODUCTS.map((p) => (
          <div key={p.title} style={{ ...cardS(), display: "flex", gap: 14 }}>
            <div style={{ fontSize: 26 }}>{p.icon}</div>
            <div><h4 style={{ color: C.text, fontSize: 14, margin: "0 0 4px" }}>{p.title}</h4><p style={{ color: C.sub, fontSize: 12.5, margin: "0 0 5px", lineHeight: 1.4 }}>{p.desc}</p><span style={{ color: C.dim, fontSize: 11, fontFamily: mono }}>{p.eta}</span></div>
          </div>
        ))}
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

  // Auto-open save modal when user signs in after clicking Save
  useEffect(() => { if (user && pendingSave && portfolio && !saved) { setShowSaveModal(true); setPendingSave(false); } }, [user, pendingSave, portfolio, saved]);

  const generate = async () => {
    if (!thesis.trim()) return setErr("Describe your investment thesis first.");
    setLoading(true); setErr(""); setPortfolio(null); setSaved(false);
    try {
      const apiKey = typeof import.meta !== "undefined" && (import.meta.env?.VITE_XAI_API_KEY || import.meta.env?.VITE_GROK_API_KEY);
      const proxyUrl = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_PROXY_URL) || null;
      // If proxy configured, call proxy (no key needed client-side). Otherwise direct call requires key.
      const apiUrl = proxyUrl || "https://api.x.ai/v1/chat/completions";
      if (!proxyUrl && !apiKey) throw new Error("API_KEY_MISSING");
      const headers = { "Content-Type": "application/json" };
      if (apiKey && !proxyUrl) headers["Authorization"] = `Bearer ${apiKey}`;
      const reqBody = {
        model: "grok-3-latest",
        max_tokens: 8192,
        temperature: 0.7,
        messages: [
          { role: "system", content: AI_SYSTEM_PROMPT },
          { role: "user", content: `Design a professional ETF portfolio for the following investment thesis:\n\n"${thesis}"\n\nAs CIO, construct a fully realized 10-holding portfolio with $1,000,000 in seed capital. Return the complete JSON with ALL fields from the schema populated. Every field matters.` }
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
      p.holdings = p.holdings.map(h => ({ ...h, targetWeight: h.weight, currentWeight: h.weight }));
      setPortfolio({ ...p, id: Date.now(), thesis, value: 1000000, createdAt: new Date().toISOString(), trackingData: [{ ts: Date.now(), value: 1000000 }], rebalanceThreshold: 5 });
    } catch (e) {
      if (e.message === "API_KEY_MISSING") setErr("API key required. Add VITE_XAI_API_KEY to .env.local (get a key at console.x.ai), or set VITE_API_PROXY_URL to use a server-side proxy.");
      else if (e.message === "API_KEY_INVALID") setErr("Invalid API key. Check VITE_XAI_API_KEY in .env.local, or configure VITE_API_PROXY_URL for server-side proxy.");
      else setErr("Generation failed: " + (e.message || "Unknown error. Please try again."));
    }
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
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          <span style={{ color: C.dim, fontSize: 11, alignSelf: "center", marginRight: 4 }}>Try:</span>
          {[
            { l: "AI & Semiconductors", t: "Build an aggressive growth ETF focused on artificial intelligence infrastructure, GPU makers, and cloud AI platforms. Heavy equity allocation with 15% crypto exposure. 5-year horizon targeting 15%+ returns." },
            { l: "Dividend Income", t: "Design a conservative income-focused ETF for a retiree. Prioritize high-quality dividend stocks, investment-grade bonds, and gold. Target 4%+ yield with minimal volatility. Capital preservation is the priority." },
            { l: "Clean Energy", t: "Create a moderate-risk ETF capturing the global clean energy transition. Include solar, wind, battery/EV, uranium, and lithium companies. Add some commodity hedges. 7-year horizon targeting 10-12% returns." },
            { l: "Crypto-Forward", t: "Build an aggressive ETF with maximum crypto exposure balanced by traditional assets. Include BTC, ETH, SOL, and crypto-adjacent equities like COIN and MSTR. Hedge with gold and short-term bonds. High risk tolerance." },
            { l: "All-Weather", t: "Design a balanced all-weather portfolio inspired by Ray Dalio's approach. Equal risk allocation across stocks, long-term bonds, gold, commodities, and TIPS. Target low volatility with consistent returns across all economic regimes." },
          ].map(ex => <button key={ex.l} onClick={() => setThesis(ex.t)} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.sub, padding: "4px 10px", borderRadius: 5, fontSize: 11, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{ex.l}</button>)}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
          <span style={{ color: C.dim, fontSize: 11.5 }}>Include: sectors, risk profile (conservative/moderate/aggressive), time horizon, target return, asset preferences</span>
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
              <div><h2 style={{ color: C.text, fontSize: 20, margin: "0 0 3px" }}>{portfolio.name}{portfolio.ticker ? <span style={{ color: C.dim, fontFamily: mono, fontSize: 13, fontWeight: 400, marginLeft: 8 }}>({portfolio.ticker})</span> : null}</h2><p style={{ color: C.sub, fontSize: 13, margin: 0 }}>{portfolio.strategy}</p>{(portfolio.riskProfile || portfolio.targetReturn) && <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>{portfolio.riskProfile && <span style={{ ...badge(portfolio.riskProfile === "aggressive" ? C.red : portfolio.riskProfile === "conservative" ? C.teal : C.gold) }}>{portfolio.riskProfile}</span>}{portfolio.targetReturn && <span style={{ color: C.dim, fontSize: 11, fontFamily: mono }}>Return: {portfolio.targetReturn}</span>}{portfolio.targetVolatility && <span style={{ color: C.dim, fontSize: 11, fontFamily: mono }}>Vol: {portfolio.targetVolatility}</span>}{portfolio.sharpeTarget && <span style={{ color: C.dim, fontSize: 11, fontFamily: mono }}>Sharpe: {portfolio.sharpeTarget}</span>}{portfolio.sortinoTarget && <span style={{ color: C.dim, fontSize: 11, fontFamily: mono }}>Sortino: {portfolio.sortinoTarget}</span>}{portfolio.maxDrawdown && <span style={{ color: C.dim, fontSize: 11, fontFamily: mono }}>Max DD: {portfolio.maxDrawdown}</span>}{portfolio.rebalanceFrequency && <span style={{ color: C.dim, fontSize: 11, fontFamily: mono }}>Rebal: {portfolio.rebalanceFrequency}</span>}{portfolio.benchmark && <span style={{ color: C.dim, fontSize: 11, fontFamily: mono }}>Bench: {portfolio.benchmark}</span>}</div>}</div>
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
            <div style={{ display: "grid", gridTemplateColumns: "38px 68px 1fr 72px 110px 80px", padding: "10px 18px", borderBottom: `1px solid ${C.border}`, fontSize: 10, color: C.dim, fontFamily: mono, textTransform: "uppercase", letterSpacing: 0.5 }}><span>#</span><span>Type</span><span>Holding</span><span>Weight</span><span>Allocation</span><span></span></div>
            {portfolio.holdings.map((h, i) => (
              <div key={i}>
                <div onClick={() => setOpenIdx(openIdx === i ? null : i)} style={{ display: "grid", gridTemplateColumns: "38px 68px 1fr 72px 110px 80px", padding: "12px 18px", borderBottom: `1px solid ${C.border}`, alignItems: "center", cursor: "pointer", background: openIdx === i ? C.surface : "transparent", transition: "background .12s" }}>
                  <span style={{ color: C.dim, fontSize: 12, fontFamily: mono }}>{String(i + 1).padStart(2, "0")}</span>
                  <span style={badge(TC[h.type])}>{h.type}</span>
                  <div><div style={{ color: C.text, fontSize: 13.5, fontWeight: 600 }}>{h.symbol}</div><div style={{ color: C.sub, fontSize: 11.5 }}>{h.name}</div></div>
                  <span style={{ color: C.text, fontFamily: mono, fontSize: 12.5 }}>{fmt(h.weight, 1)}%</span>
                  <span style={{ color: C.text, fontFamily: mono, fontSize: 12.5 }}>{fmtUSD(h.allocation)}</span>
                  <span style={{ color: C.dim, fontSize: 11.5, textAlign: "right" }}>{openIdx === i ? "▲ Hide" : "▼ Why?"}</span>
                </div>
                {openIdx === i && <div style={{ padding: "12px 18px 12px 124px", background: C.surface, borderBottom: `1px solid ${C.border}`, fontSize: 13, color: C.sub, lineHeight: 1.6 }}><div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>{h.role && <span style={{ ...badge(h.role === "Hedge" ? C.teal : h.role === "Core" ? C.accent : h.role === "Growth Kicker" ? C.gold : h.role === "Income" ? C.green : C.sub) }}>{h.role}</span>}{h.sector && <span style={{ ...badge(C.dim) }}>{h.sector}</span>}{h.marketCap && h.marketCap !== "N/A" && <span style={{ ...badge(C.dim) }}>{h.marketCap}</span>}</div><span style={{ color: C.accent, fontWeight: 700, fontSize: 10.5, fontFamily: mono, letterSpacing: 0.3 }}>AI RATIONALE: </span>{h.rationale}{h.exitTrigger && <div style={{ marginTop: 8, padding: "6px 10px", background: "rgba(239,68,68,.06)", border: `1px solid rgba(239,68,68,.15)`, borderRadius: 6 }}><span style={{ color: C.red, fontWeight: 700, fontSize: 10.5, fontFamily: mono, letterSpacing: 0.3 }}>EXIT TRIGGER: </span><span style={{ color: C.sub, fontSize: 12 }}>{h.exitTrigger}</span></div>}</div>}
              </div>
            ))}
          </div>

          <div style={{ ...cardS(), marginBottom: 14 }}>
            <div style={{ fontSize: 10.5, color: C.dim, marginBottom: 7, fontFamily: mono, letterSpacing: 0.3 }}>ALLOCATION BREAKDOWN</div>
            <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", height: 22 }}>
              {portfolio.holdings.map((h, i) => <div key={i} title={`${h.symbol}: ${fmt(h.weight, 1)}%`} style={{ width: `${h.weight}%`, background: TC[h.type] || C.accent, opacity: 0.55 + (i % 3) * 0.15, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8.5, color: "#fff", fontWeight: 700, borderRight: "1px solid rgba(0,0,0,.3)" }}>{h.weight >= 8 ? h.symbol : ""}</div>)}
            </div>
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

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button onClick={() => { setPortfolio(null); setThesis(""); setSaved(false); }} style={btnO()}>Start Over</button>
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
                  <button onClick={() => { savePortfolio(portfolio, false); setSaved(true); setShowSaveModal(false); }} style={{ ...cardS(), cursor: "pointer", border: `1px solid ${C.border}`, textAlign: "left", background: C.surface }}>
                    <div style={{ color: C.text, fontSize: 14, fontWeight: 600, marginBottom: 3 }}>🔒 Keep Private</div>
                    <div style={{ color: C.sub, fontSize: 12 }}>Only you can see this portfolio in "My Portfolios."</div>
                  </button>
                  <button onClick={() => { savePortfolio(portfolio, true); setSaved(true); setShowSaveModal(false); }} style={{ ...cardS(), cursor: "pointer", border: `1px solid ${C.accentBorder}`, textAlign: "left", background: C.accentBg }}>
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
   RESEARCH PAGE
   ═══════════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════════
   NEWS PANEL — Finnhub free API (news for selected asset)
   Replace DEMO_KEY with your free key from https://finnhub.io/register
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

function NewsPanel({ symbol, name }) {
  const [news, setNews] = useState([]); const [loading, setLoading] = useState(false); const [err, setErr] = useState("");
  useEffect(() => {
    setNews([]); setErr(""); setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    finnhubFetch(`https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${weekAgo}&to=${today}&token=${FINNHUB_KEY}`)
      .then((r) => { if (!r.ok) throw new Error("API error"); return r.json(); })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) { setNews(data.slice(0, 5)); }
        else { setErr("no_data"); }
      })
      .catch(() => { setErr("fetch_fail"); })
      .finally(() => setLoading(false));
  }, [symbol]);

  return (
    <div style={{ ...cardS(), marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 10.5, color: C.dim, fontFamily: mono, letterSpacing: 0.3 }}>LATEST NEWS</div>
        <a href="https://finnhub.io" target="_blank" rel="noopener noreferrer" style={{ color: C.dim, fontSize: 9.5, textDecoration: "none" }}>Powered by Finnhub ↗</a>
      </div>
      {loading && <p style={{ color: C.sub, fontSize: 12 }}>Loading news…</p>}
      {err === "no_data" && (
        <div style={{ color: C.sub, fontSize: 12, lineHeight: 1.5 }}>
          No recent news found for {symbol}. News is available for most U.S.-listed stocks.
          <span style={{ display: "block", marginTop: 6, color: C.dim, fontSize: 11 }}>Tip: Get a free API key at <a href="https://finnhub.io/register" target="_blank" rel="noopener noreferrer" style={{ color: C.accent, textDecoration: "none" }}>finnhub.io/register</a> for full access to real-time market news.</span>
        </div>
      )}
      {err === "fetch_fail" && (
        <div style={{ color: C.sub, fontSize: 12, lineHeight: 1.5 }}>
          Unable to fetch news. To enable live news, add a free Finnhub API key.
          <span style={{ display: "block", marginTop: 6, color: C.dim, fontSize: 11 }}>Register at <a href="https://finnhub.io/register" target="_blank" rel="noopener noreferrer" style={{ color: C.accent, textDecoration: "none" }}>finnhub.io/register</a> — free tier supports 60 requests/minute with company news, quotes, and financials.</span>
        </div>
      )}
      {news.length > 0 && news.map((n, i) => (
        <a key={i} href={n.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", padding: "8px 0", borderBottom: i < news.length - 1 ? `1px solid ${C.border}` : "none", textDecoration: "none" }}>
          <div style={{ color: C.text, fontSize: 12.5, fontWeight: 500, marginBottom: 2, lineHeight: 1.35 }}>{n.headline}</div>
          <div style={{ color: C.dim, fontSize: 11 }}>{n.source} · {new Date(n.datetime * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
        </a>
      ))}
      <p style={{ color: C.dim, fontSize: 10, marginTop: 8, lineHeight: 1.4, margin: "8px 0 0" }}>News is provided for educational purposes only and does not constitute financial advice. Always verify information from multiple sources before making investment decisions.</p>
    </div>
  );
}

function ResearchItem({ a, sel, setSel }) {
  const ch = a.price ? assetChange(a) : 0;
  const spark = useMemo(() => a.price ? genChart(30, a.price, a.symbol.charCodeAt(0)) : null, [a.symbol, a.price]);
  return (
    <div onClick={() => setSel(a)} className="research-grid" style={{ display: "grid", gridTemplateColumns: "62px 1fr 90px 90px 68px 80px", padding: "10px 14px", borderBottom: `1px solid ${C.border}`, cursor: "pointer", alignItems: "center", background: sel?.symbol === a.symbol ? C.surface : "transparent", transition: "background .12s" }}>
      <span style={badge(TC[a.type])}>{a.type}</span>
      <div><div style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{a.symbol}</div><div style={{ color: C.sub, fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 }}>{a.name}</div></div>
      <span className="hide-mobile" style={{ color: C.dim, fontSize: 10.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.sector || "—"}</span>
      <span style={{ color: C.text, fontFamily: mono, fontSize: 12 }}>{a.price ? "$" + fmt(a.price, a.price > 999 ? 0 : 2) : "—"}</span>
      <span style={{ color: ch >= 0 ? C.green : C.red, fontFamily: mono, fontSize: 12 }}>{a.price ? (ch >= 0 ? "+" : "") + fmt(ch) + "%" : "—"}</span>
      <span className="hide-mobile">{spark ? <SparkLine data={spark} w={72} h={24} /> : <span style={{ color: C.dim, fontSize: 10 }}>click</span>}</span>
    </div>
  );
}

function Research() {
  const [sel, setSel] = useState(null); const [filter, setFilter] = useState("all"); const [q, setQ] = useState(""); const [range, setRange] = useState("3M");
  const [allSymbols, setAllSymbols] = useState(null); const [loadingMarket, setLoadingMarket] = useState(false); const [marketError, setMarketError] = useState("");
  const [liveQuote, setLiveQuote] = useState(null); const [liveProfile, setLiveProfile] = useState(null); const [profileLoading, setProfileLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(50);
  const rangeDays = { "1D": 1, "1W": 7, "1M": 30, "3M": 90, "6M": 180, "1Y": 365 };
  const rangeRes = { "1D": "5", "1W": "15", "1M": "60", "3M": "D", "6M": "D", "1Y": "D" };
  const [chartData, setChartData] = useState(null); const [chartLoading, setChartLoading] = useState(false);

  // Fetch real candle data from Finnhub when asset or range changes
  useEffect(() => {
    if (!sel) { setChartData(null); return; }
    setChartLoading(true);
    const days = rangeDays[range] || 90;
    const to = Math.floor(Date.now() / 1000);
    const from = to - days * 86400;
    const res = rangeRes[range] || "D";
    finnhubFetch(`https://finnhub.io/api/v1/stock/candle?symbol=${sel.symbol}&resolution=${res}&from=${from}&to=${to}&token=${FINNHUB_KEY}`)
      .then(r => r.json())
      .then(data => {
        if (data.s === "ok" && data.c && data.c.length > 0) {
          setChartData(data.c.map((c, i) => ({ price: c, ts: data.t[i] * 1000 })));
        } else {
          // Fallback to simulated chart if no candle data available
          setChartData(genChart(days, sel.price || 100, sel.symbol.charCodeAt(0)));
        }
      })
      .catch(() => { setChartData(genChart(days, sel.price || 100, sel.symbol.charCodeAt(0))); })
      .finally(() => setChartLoading(false));
  }, [sel?.symbol, range]);

  // On mount: use curated RESEARCH_ASSETS as the primary dataset (Bloomberg-level coverage)
  // Optionally try Finnhub to augment with additional stocks/ETFs if API key works
  useEffect(() => {
    setLoadingMarket(true); setMarketError("");
    // Start with our curated 180+ asset universe
    const baseAssets = RESEARCH_ASSETS.map(a => ({ ...a, displaySymbol: a.symbol, source: "curated" }));
    // Try Finnhub to add even more stocks/ETFs
    finnhubFetch(`https://finnhub.io/api/v1/stock/symbol?exchange=US&token=${FINNHUB_KEY}`)
      .then(r => { if (!r.ok) throw new Error("API " + r.status); return r.json(); })
      .then(data => {
        if (!Array.isArray(data) || data.length === 0) throw new Error("No data");
        const curatedSyms = new Set(baseAssets.map(a => a.symbol));
        const extras = [];
        data.forEach(s => {
          if (!s.symbol || s.symbol.includes(".") || s.symbol.length > 5 || curatedSyms.has(s.symbol)) return;
          const item = { symbol: s.symbol, name: s.description || s.symbol, displaySymbol: s.displaySymbol || s.symbol, source: "finnhub" };
          if (s.type === "ETP" || s.type === "ETF") { item.type = "etf"; extras.push(item); }
          else if (s.type === "Common Stock" || s.type === "ADR" || !s.type) { item.type = "stock"; extras.push(item); }
        });
        setAllSymbols([...baseAssets, ...extras]);
        setLoadingMarket(false);
      })
      .catch(() => {
        // Finnhub unavailable — still have 180+ curated assets, which is plenty
        setAllSymbols(baseAssets);
        setLoadingMarket(false);
      });
  }, []);

  // Fetch live quote + company profile when asset selected
  useEffect(() => {
    if (!sel) { setLiveQuote(null); setLiveProfile(null); return; }
    setProfileLoading(true); setLiveQuote(null); setLiveProfile(null);
    const sym = sel.symbol;
    Promise.all([
      finnhubFetch(`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${FINNHUB_KEY}`).then(r => r.json()).catch(() => null),
      finnhubFetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${sym}&token=${FINNHUB_KEY}`).then(r => r.json()).catch(() => null)
    ]).then(([quote, profile]) => {
      if (quote && quote.c > 0) setLiveQuote(quote);
      if (profile && profile.name) setLiveProfile(profile);
      setProfileLoading(false);
    });
  }, [sel?.symbol]);

  // Filter + search across ALL loaded symbols
  const displayList = useMemo(() => {
    if (!allSymbols) return RESEARCH_ASSETS;
    let filtered = allSymbols;
    if (filter !== "all") filtered = filtered.filter(a => a.type === filter);
    if (q.trim()) {
      const qLow = q.toLowerCase().trim();
      filtered = filtered.filter(a => a.symbol.toLowerCase().includes(qLow) || (a.name && a.name.toLowerCase().includes(qLow)));
    }
    return filtered;
  }, [allSymbols, filter, q]);

  const paginatedList = useMemo(() => displayList.slice(0, visibleCount), [displayList, visibleCount]);

  // Reset pagination when filters change
  useEffect(() => { setVisibleCount(50); }, [filter, q]);

  // Count stats
  const counts = useMemo(() => {
    if (!allSymbols) return { total: RESEARCH_ASSETS.length, stock: 0, etf: 0, crypto: 0, commodity: 0 };
    return { total: allSymbols.length, stock: allSymbols.filter(a => a.type === "stock").length, etf: allSymbols.filter(a => a.type === "etf").length, crypto: allSymbols.filter(a => a.type === "crypto").length, commodity: allSymbols.filter(a => a.type === "commodity").length };
  }, [allSymbols]);

  const activePrice = liveQuote?.c || sel?.price || 0;
  const activeChange = liveQuote ? ((liveQuote.c - liveQuote.pc) / liveQuote.pc * 100) : sel ? assetChange(sel) : 0;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 20px" }}>
      <h1 style={{ color: C.text, fontSize: 26, margin: "0 0 6px" }}>Market Research</h1>
      <p style={{ color: C.sub, fontSize: 13.5, margin: "0 0 4px" }}>180+ curated US equities, global ETFs, cryptocurrencies, and commodities with sector data, P/E, dividends, and market cap. Live quotes via Finnhub when available.</p>
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ color: C.dim, fontSize: 11.5, fontFamily: mono }}>{loadingMarket ? "Loading market data…" : `${fmt(counts.total, 0)} total`}</span>
        <span style={{ color: TC.stock, fontSize: 11.5, fontFamily: mono }}>{fmt(counts.stock, 0)} stocks</span>
        <span style={{ color: TC.etf, fontSize: 11.5, fontFamily: mono }}>{fmt(counts.etf, 0)} ETFs</span>
        <span style={{ color: TC.crypto, fontSize: 11.5, fontFamily: mono }}>{counts.crypto} crypto</span>
        <span style={{ color: TC.commodity, fontSize: 11.5, fontFamily: mono }}>{counts.commodity} commodities</span>
        {marketError && <span style={{ color: C.gold, fontSize: 11.5 }}>Finnhub API unavailable — using curated dataset</span>}
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 180, position: "relative" }}>
          <input placeholder="Search any ticker or company name…" value={q} onChange={(e) => setQ(e.target.value)} style={{ ...inputS(), marginBottom: 0, paddingRight: 36 }} />
          {loadingMarket && <div style={{ position: "absolute", right: 12, top: 12, width: 14, height: 14, border: `2px solid ${C.border}`, borderTopColor: C.accent, borderRadius: "50%", animation: "spin .6s linear infinite" }} />}
        </div>
        {["all", "stock", "etf", "crypto", "commodity"].map((f) => <button key={f} onClick={() => setFilter(f)} style={{ background: filter === f ? C.accentBg : "transparent", border: filter === f ? `1px solid ${C.accentBorder}` : `1px solid ${C.border}`, color: filter === f ? C.accentLight : C.sub, padding: "8px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer", textTransform: "capitalize", fontWeight: 500, fontFamily: "inherit" }}>{f === "all" ? `All (${fmt(displayList.length, 0)})` : `${f} (${fmt(displayList.filter(a => a.type === f).length, 0)})`}</button>)}
      </div>
      <div className="grid2col" style={{ display: "grid", gridTemplateColumns: sel ? "1fr 1fr" : "1fr", gap: 18 }}>
        <div style={{ ...cardS(), padding: 0, maxHeight: sel ? 560 : 620, overflowY: "auto" }}>
          <div className="research-grid" style={{ display: "grid", gridTemplateColumns: "62px 1fr 90px 90px 68px 80px", padding: "9px 14px", borderBottom: `1px solid ${C.border}`, fontSize: 10, color: C.dim, fontFamily: mono, textTransform: "uppercase", letterSpacing: 0.4, position: "sticky", top: 0, background: C.card, zIndex: 1 }}><span>Type</span><span>Name</span><span className="hide-mobile">Sector</span><span>Price</span><span>Chg %</span><span className="hide-mobile">30d</span></div>
          {paginatedList.map((a) => <ResearchItem key={a.symbol} a={a} sel={sel} setSel={setSel} />)}
          {paginatedList.length === 0 && !loadingMarket && <div style={{ padding: 24, color: C.dim, textAlign: "center", fontSize: 13 }}>{q ? `No results for "${q}". Try a different search.` : "No assets match your filter."}</div>}
          {loadingMarket && <div style={{ padding: 24, color: C.sub, textAlign: "center", fontSize: 13 }}>Loading all US market symbols…</div>}
          {visibleCount < displayList.length && (
            <div style={{ padding: 14, textAlign: "center", borderTop: `1px solid ${C.border}` }}>
              <button onClick={() => setVisibleCount(v => v + 100)} style={{ ...btnO(), fontSize: 12, padding: "8px 24px" }}>Load More ({fmt(displayList.length - visibleCount, 0)} remaining)</button>
            </div>
          )}
        </div>
        {sel && (
          <div>
            <div style={cardS()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div>
                  <span style={{ ...badge(TC[sel.type]), marginBottom: 6 }}>{sel.type}</span>
                  <h2 style={{ color: C.text, fontSize: 21, margin: "4px 0 2px" }}>{sel.symbol}</h2>
                  <p style={{ color: C.sub, fontSize: 13, margin: 0 }}>{liveProfile?.name || sel.name}</p>
                  {liveQuote && <span style={{ ...badge(C.green), marginTop: 4 }}>LIVE</span>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: C.text, fontSize: 26, fontWeight: 800, fontFamily: mono }}>${activePrice > 0 ? fmt(activePrice, activePrice > 999 ? 0 : 2) : "—"}</div>
                  <div style={{ color: activeChange >= 0 ? C.green : C.red, fontSize: 13.5, fontFamily: mono }}>{activeChange >= 0 ? "+" : ""}{fmt(activeChange)}%{liveQuote ? " today" : ""}</div>
                </div>
              </div>
              {chartLoading && <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: 24, height: 24, border: `2px solid ${C.border}`, borderTopColor: C.accent, borderRadius: "50%", animation: "spin .6s linear infinite" }} /></div>}
              {!chartLoading && chartData && <BigChart data={chartData} />}
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                {Object.keys(rangeDays).map((r) => <button key={r} onClick={() => setRange(r)} style={{ background: range === r ? C.accentBg : "transparent", border: range === r ? `1px solid ${C.accentBorder}` : `1px solid ${C.border}`, color: range === r ? C.accentLight : C.sub, padding: "3px 10px", borderRadius: 4, fontSize: 11, cursor: "pointer", fontFamily: mono }}>{r}</button>)}
              </div>
            </div>
            <div style={{ ...cardS(), marginTop: 12 }}>
              <div style={{ fontSize: 10.5, color: C.dim, marginBottom: 8, fontFamily: mono, letterSpacing: 0.3 }}>KEY STATISTICS {liveQuote ? "(LIVE)" : ""}</div>
              {profileLoading ? <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>{[1,2,3,4,5,6].map(i => <div key={i} style={{ height: 18, background: `linear-gradient(90deg,${C.surface},${C.border},${C.surface})`, backgroundSize: "400px", animation: "shimmer 1.5s infinite linear", borderRadius: 3 }} />)}</div> : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {[
                  { l: "Open", v: liveQuote ? "$" + fmt(liveQuote.o, 2) : sel.price ? "$" + fmt(sel.price * 0.998, 2) : "—" },
                  { l: "Day High", v: liveQuote ? "$" + fmt(liveQuote.h, 2) : sel.price ? "$" + fmt(sel.price * 1.015, 2) : "—" },
                  { l: "Day Low", v: liveQuote ? "$" + fmt(liveQuote.l, 2) : sel.price ? "$" + fmt(sel.price * 0.985, 2) : "—" },
                  { l: "Prev Close", v: liveQuote ? "$" + fmt(liveQuote.pc, 2) : "—" },
                  { l: "52W High", v: sel.price ? "$" + fmt(sel.price * 1.38, 2) : "—" }, { l: "52W Low", v: sel.price ? "$" + fmt(sel.price * 0.62, 2) : "—" },
                  { l: "Sector", v: liveProfile?.finnhubIndustry || sel.sector || "—" },
                  { l: "Mkt Cap", v: liveProfile?.marketCapitalization ? "$" + fmt(liveProfile.marketCapitalization / 1000, 1) + "B" : sel.mktCap || "—" },
                  { l: "P/E Ratio", v: sel.pe ? fmt(sel.pe, 1) : "—" },
                  { l: "Div. Yield", v: sel.divYield ? fmt(sel.divYield, 2) + "%" : "—" },
                  { l: "Exchange", v: liveProfile?.exchange || "—" },
                  { l: "IPO Date", v: liveProfile?.ipo || "—" },
                ].map((s) => <div key={s.l} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}><span style={{ color: C.sub, fontSize: 12 }}>{s.l}</span><span style={{ color: C.text, fontSize: 12, fontFamily: mono }}>{s.v}</span></div>)}
              </div>
              )}
            </div>
            {(sel.desc || liveProfile?.name) && (
              <div style={{ ...cardS(), marginTop: 12 }}>
                <div style={{ fontSize: 10.5, color: C.dim, marginBottom: 8, fontFamily: mono, letterSpacing: 0.3 }}>ABOUT</div>
                <p style={{ color: C.sub, fontSize: 13, lineHeight: 1.6, margin: 0 }}>{sel.desc || (liveProfile ? `${liveProfile.name} operates in the ${liveProfile.finnhubIndustry || "—"} industry. Country: ${liveProfile.country || "—"}. ${liveProfile.shareOutstanding ? Math.round(liveProfile.shareOutstanding) + "M shares outstanding." : ""}` : "")}</p>
                {(sel.website || liveProfile?.weburl) && <a href={liveProfile?.weburl || ("https://" + sel.website)} target="_blank" rel="noopener noreferrer" style={{ color: C.accent, fontSize: 12, marginTop: 8, display: "inline-block", textDecoration: "none" }}>{liveProfile?.weburl?.replace("https://","").replace("http://","") || sel.website} ↗</a>}
              </div>
            )}
            <NewsPanel symbol={sel.symbol} name={sel.name} />
          </div>
        )}
      </div>
      <div style={{ marginTop: 20, padding: "12px 16px", background: C.surface, borderRadius: 8, border: `1px solid ${C.border}` }}>
        <p style={{ color: C.dim, fontSize: 11, margin: 0, lineHeight: 1.5 }}>Disclaimer: Market data, company profiles, and news provided by Finnhub. Live quotes require a Finnhub API key (free at finnhub.io/register — 60 calls/min). Without a key, featured asset prices are simulated. Nothing on this page constitutes investment advice. Always conduct your own research and consult a licensed financial advisor before making investment decisions.</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MY PORTFOLIOS — real-time tracking, backtesting, AUTO-REBALANCE
   ═══════════════════════════════════════════════════════════════════════ */

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
  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "36px 20px" }}>
      <h1 style={{ color: C.text, fontSize: 26, margin: "0 0 6px" }}>Learn</h1>
      <p style={{ color: C.sub, fontSize: 13.5, margin: "0 0 22px" }}>Build your investing knowledge with {LEARN_ARTICLES.length} educational articles.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
      <div className="grid3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
        {FUTURE_PRODUCTS.map((p) => (
          <div key={p.title} style={{ ...cardS(), display: "flex", gap: 14 }}>
            <div style={{ fontSize: 26 }}>{p.icon}</div>
            <div><h4 style={{ color: C.text, fontSize: 14, margin: "0 0 3px" }}>{p.title}</h4><p style={{ color: C.sub, fontSize: 12.5, margin: "0 0 4px", lineHeight: 1.4 }}>{p.desc}</p><span style={{ color: C.dim, fontSize: 11, fontFamily: mono }}>{p.eta}</span></div>
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
  const validPages = ["home","builder","research","portfolios","leaderboard","learn","pricing"];
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
    research: <Research />,
    portfolios: <Portfolios user={user} openAuth={openAuth} portfolios={portfolios} go={setPage} updatePortfolio={updatePortfolio} />,
    leaderboard: <Leaderboard publicPortfolios={allPublicPortfolios} />,
    learn: <Learn />,
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
          .hero-title{font-size:32px!important}
          .nav-links{display:none!important}
          .hamburger-btn{display:block!important}
          .hide-mobile{display:none!important}
          .footer-grid{grid-template-columns:1fr 1fr!important}
          .research-grid{grid-template-columns:52px 1fr 72px 60px!important}
          .research-grid .hide-mobile{display:none!important}
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
            {[["ETF Builder", "builder"], ["Research", "research"], ["Leaderboard", "leaderboard"], ["My Portfolios", "portfolios"]].map(([l, k]) => <div key={k}><span onClick={() => setPage(k)} style={{ color: C.dim, fontSize: 12, cursor: "pointer", display: "block", marginBottom: 5 }}>{l}</span></div>)}
          </div>
          <div>
            <h4 style={{ color: C.sub, fontSize: 11, fontFamily: mono, letterSpacing: 0.5, marginBottom: 10 }}>RESOURCES</h4>
            {[["Learn", "learn"], ["Pricing", "pricing"]].map(([l, k]) => <div key={k}><span onClick={() => setPage(k)} style={{ color: C.dim, fontSize: 12, cursor: "pointer", display: "block", marginBottom: 5 }}>{l}</span></div>)}
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
