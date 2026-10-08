const { getMarketData, getMarketTrend, getAvailableCommodities, getMarketsForState } = require('../services/marketService');

/**
 * GET /api/market?commodity=&state=&district=
 */
async function getMarket(req, res, next) {
  try {
    const { commodity, state, district } = req.query;
    const result = await getMarketData(commodity, state, district);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/market/trend?commodity=&state=
 */
async function getTrend(req, res, next) {
  try {
    const { commodity, state, district } = req.query;
    if (!commodity) {
      return res.status(400).json({ success: false, error: 'Commodity is required.' });
    }
    const result = await getMarketData(commodity, state, district);
    const trend = getMarketTrend(result.data);
    res.json({
      success: true,
      source: result.source,
      disclaimer: result.disclaimer,
      commodity,
      trend,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/market/options
 */
async function getMarketOptions(req, res, next) {
  try {
    const { state } = req.query;
    if (state) {
      const options = getMarketsForState(state);
      return res.json({ success: true, data: options });
    }
    const options = getAvailableCommodities();
    res.json({ success: true, data: options });
  } catch (error) {
    next(error);
  }
}

module.exports = { getMarket, getTrend, getMarketOptions };
