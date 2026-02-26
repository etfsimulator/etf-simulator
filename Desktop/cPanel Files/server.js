const express = require('express');
const WebSocket = require('ws');
const app = express();
const port = process.env.PORT || 3000; // Use env port for hosting compatibility

// Serve static files (HTML, CSS, JS)
app.use(express.static(__dirname));

// Mock real-time market data (updates every 30s)
const mockMarketData = [
  { symbol: 'SPY', name: 'S&P 500', price: 682.39, change: -0.31, changeAbs: -2.09 },
  { symbol: 'QQQ', name: 'Nasdaq 100', price: 601.41, change: -0.34, changeAbs: -2.06 },
  { symbol: 'DIA', name: 'Dow Jones', price: 488.01, change: -1.29, changeAbs: -6.41 },
  { symbol: 'IWM', name: 'Russell 2000', price: 260.49, change: -1.55, changeAbs: -4.10 },
  { symbol: 'BTC/USD', name: 'Bitcoin', price: 63220.32, change: -2.16, changeAbs: -1396.42 },
  { symbol: 'ETH/USD', name: 'Ethereum', price: 1826.90, change: -1.54, changeAbs: -28.61 },
  { symbol: 'GLD', name: 'Gold ETF', price: 481.28, change: 4.73, changeAbs: 21.72 }
];

// API for portfolio simulation (mock AI: generates random allocations based on input strategy)
app.post('/api/generate-portfolio', express.json(), (req, res) => {
  const { strategy } = req.body;
  // Mock AI logic: allocate to assets based on strategy keyword (e.g., 'growth' favors tech)
  const allocations = mockMarketData.map(asset => ({
    symbol: asset.symbol,
    allocation: Math.random() * (strategy.includes('growth') ? 20 : 10) + 5 // Random 5-30%
  }));
  const total = allocations.reduce((sum, a) => sum + a.allocation, 0);
  allocations.forEach(a => a.allocation = (a.allocation / total * 100).toFixed(2)); // Normalize to 100%
  
  res.json({
    portfolio: allocations,
    metrics: { sharpe: (Math.random() * 2).toFixed(2), volatility: (Math.random() * 20).toFixed(2) }
  });
});

// Start server
const server = app.listen(port, () => console.log(`Server running on http://localhost:${port}`));

// WebSocket for real-time ticker
const wss = new WebSocket.Server({ server });
wss.on('connection', (ws) => {
  const sendUpdate = () => {
    // Mock slight changes
    const updatedData = mockMarketData.map(asset => ({
      ...asset,
      price: asset.price * (1 + (Math.random() - 0.5) * 0.005), // +/- 0.5%
      change: (Math.random() - 0.5) * 2, // Random change
      changeAbs: (Math.random() - 0.5) * 10
    }));
    ws.send(JSON.stringify(updatedData));
  };
  sendUpdate(); // Initial send
  const interval = setInterval(sendUpdate, 30000); // Every 30s
  ws.on('close', () => clearInterval(interval));
});