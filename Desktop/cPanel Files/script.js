document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.addEventListener('change', () => {
        document.body.classList.toggle('dark', themeToggle.checked);
    });

    // WebSocket for real-time ticker
    const ws = new WebSocket(`ws://${window.location.hostname}:${window.location.port}`);
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        updateTicker(data);
        updateMarketGrid(data);
    };

    function updateTicker(data) {
        const ticker = document.getElementById('ticker');
        ticker.innerHTML = data.map(asset => `
            <div class="ticker-item">
                <strong>${asset.symbol}</strong>: $${asset.price.toFixed(2)}
                <span class="${asset.change >= 0 ? 'change-positive' : 'change-negative'}">
                    ${asset.change.toFixed(2)}% (${asset.changeAbs.toFixed(2)})
                </span>
            </div>
        `).join('');
    }

    function updateMarketGrid(data) {
        const grid = document.getElementById('market-grid');
        grid.innerHTML = data.map(asset => `
            <div class="market-card">
                <h5>${asset.name} (${asset.symbol})</h5>
                <p>$${asset.price.toFixed(2)}</p>
                <p class="${asset.change >= 0 ? 'change-positive' : 'change-negative'}">
                    ${asset.change.toFixed(2)}% $${asset.changeAbs.toFixed(2)}
                </p>
            </div>
        `).join('');
    }

    // Search functionality (mock: logs to console)
    const searchButton = document.querySelector('.search-bar button');
    searchButton.addEventListener('click', () => {
        const query = document.getElementById('search-input').value;
        console.log('Searching for:', query); // Placeholder for real search
    });

    // Portfolio form submission
    const form = document.getElementById('portfolio-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const strategy = document.getElementById('strategy').value;
        const response = await fetch('/api/generate-portfolio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ strategy })
        });
        const result = await response.json();
        displayPortfolio(result);
    });

    function displayPortfolio(result) {
        const resultDiv = document.getElementById('portfolio-result');
        resultDiv.innerHTML = `
            <h4>Generated Portfolio</h4>
            <ul>
                ${result.portfolio.map(a => `<li>${a.symbol}: ${a.allocation}%</li>`).join('')}
            </ul>
            <p>Sharpe Ratio: ${result.metrics.sharpe}</p>
            <p>Volatility: ${result.metrics.volatility}%</p>
        `;
    }

    // Smooth scroll function
    window.scrollToSection = (id) => {
        document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
    };
});