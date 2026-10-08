const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');
const MarketSnapshot = require('../models/MarketSnapshot');

// Demo market data — clearly labeled as fallback
const DEMO_MARKET_DATA = [
  // Tomato
  ...generateDemoSeries('Tomato', 'Maharashtra', 'Pune', 'Pune Market', 2200, 3500, 30),
  ...generateDemoSeries('Tomato', 'Karnataka', 'Bangalore', 'Yeshwanthpur', 1800, 3200, 30),
  ...generateDemoSeries('Tomato', 'Madhya Pradesh', 'Indore', 'Indore Mandi', 2000, 3000, 30),
  // Potato
  ...generateDemoSeries('Potato', 'Uttar Pradesh', 'Agra', 'Agra Mandi', 800, 1500, 30),
  ...generateDemoSeries('Potato', 'Punjab', 'Jalandhar', 'Jalandhar Mandi', 900, 1600, 30),
  // Rice
  ...generateDemoSeries('Rice', 'Punjab', 'Amritsar', 'Amritsar Mandi', 2500, 3800, 30),
  ...generateDemoSeries('Rice', 'West Bengal', 'Kolkata', 'Kolkata Market', 2800, 4000, 30),
  // Wheat
  ...generateDemoSeries('Wheat', 'Madhya Pradesh', 'Bhopal', 'Bhopal Mandi', 2200, 2800, 30),
  ...generateDemoSeries('Wheat', 'Haryana', 'Karnal', 'Karnal Mandi', 2100, 2700, 30),
  // Onion
  ...generateDemoSeries('Onion', 'Maharashtra', 'Nashik', 'Lasalgaon Mandi', 1200, 2800, 30),
  ...generateDemoSeries('Onion', 'Karnataka', 'Hubli', 'Hubli Market', 1000, 2600, 30),
];

function generateDemoSeries(commodity, state, district, market, baseMin, baseMax, days) {
  const series = [];
  const now = new Date();
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const fluctuation = Math.sin(i * 0.3) * 200 + (Math.random() - 0.5) * 300;
    const modalPrice = Math.round((baseMin + baseMax) / 2 + fluctuation);
    const minPrice = Math.round(modalPrice - 200 - Math.random() * 200);
    const maxPrice = Math.round(modalPrice + 200 + Math.random() * 200);
    series.push({
      commodity,
      state,
      district,
      market,
      minPrice: Math.max(minPrice, baseMin - 400),
      maxPrice: Math.min(maxPrice, baseMax + 400),
      modalPrice: Math.max(modalPrice, baseMin),
      date: date.toISOString().split('T')[0],
      source: 'demo',
    });
  }
  return series;
}

/**
 * Try to fetch live market data from data.gov.in
 * Falls back to demo data if unavailable
 */
async function getMarketData(commodity, state, district) {
  // Try live API first
  if (config.market.apiKey && config.market.apiKey !== 'your_data_gov_api_key_here') {
    try {
      const response = await axios.get(`${config.market.apiUrl}/9ef84268-d588-465a-a308-a864a43d0070`, {
        params: {
          'api-key': config.market.apiKey,
          format: 'json',
          limit: 50,
          'filters[commodity]': commodity,
          ...(state && { 'filters[state]': state }),
          ...(district && { 'filters[district]': district }),
        },
        timeout: 15000,
      });

      if (response.data?.records?.length) {
        return {
          source: 'api',
          data: response.data.records.map((r) => ({
            commodity: r.commodity,
            market: r.market,
            state: r.state,
            district: r.district,
            minPrice: parseFloat(r.min_price),
            maxPrice: parseFloat(r.max_price),
            modalPrice: parseFloat(r.modal_price),
            date: r.arrival_date,
          })),
        };
      }
    } catch (error) {
      logger.warn('Live market API unavailable, using fallback:', error.message);
    }
  }

  // Fallback to demo data
  let filtered = DEMO_MARKET_DATA;
  if (commodity) {
    filtered = filtered.filter((d) => d.commodity.toLowerCase() === commodity.toLowerCase());
  }
  if (state) {
    filtered = filtered.filter((d) => d.state.toLowerCase() === state.toLowerCase());
  }
  if (district) {
    filtered = filtered.filter((d) => d.district.toLowerCase() === district.toLowerCase());
  }

  return {
    source: 'demo',
    disclaimer: 'This is demonstration data for development/hackathon purposes. It does not reflect actual market prices.',
    data: filtered,
  };
}

/**
 * Get price trend for a commodity
 */
function getMarketTrend(data) {
  if (!data || data.length < 2) {
    return { trend: 'insufficient_data', change: 0 };
  }

  const sorted = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
  const recent = sorted.slice(-7);
  const older = sorted.slice(-14, -7);

  if (recent.length === 0) return { trend: 'insufficient_data', change: 0 };

  const recentAvg = recent.reduce((sum, d) => sum + d.modalPrice, 0) / recent.length;
  const olderAvg = older.length > 0
    ? older.reduce((sum, d) => sum + d.modalPrice, 0) / older.length
    : recentAvg;

  const change = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;

  const latestPrice = recent[recent.length - 1];

  return {
    trend: change > 2 ? 'up' : change < -2 ? 'down' : 'stable',
    changePercent: parseFloat(change.toFixed(1)),
    latestPrice: latestPrice.modalPrice,
    minPrice: Math.min(...recent.map((d) => d.minPrice)),
    maxPrice: Math.max(...recent.map((d) => d.maxPrice)),
    avgPrice: Math.round(recentAvg),
    recentPrices: recent.map((d) => ({ date: d.date, price: d.modalPrice })),
  };
}

/**
 * Get list of available commodities, states, markets
 */
function getAvailableCommodities() {
  const commodities = [...new Set(DEMO_MARKET_DATA.map((d) => d.commodity))];
  const states = [...new Set(DEMO_MARKET_DATA.map((d) => d.state))];
  return { commodities, states };
}

function getMarketsForState(state) {
  const filtered = DEMO_MARKET_DATA.filter(
    (d) => d.state.toLowerCase() === state.toLowerCase()
  );
  return {
    districts: [...new Set(filtered.map((d) => d.district))],
    markets: [...new Set(filtered.map((d) => d.market))],
  };
}

module.exports = { getMarketData, getMarketTrend, getAvailableCommodities, getMarketsForState };
