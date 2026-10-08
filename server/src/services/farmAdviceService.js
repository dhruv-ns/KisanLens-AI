const { getWeather, getWeatherAdvisory } = require('./weatherService');
const logger = require('../utils/logger');

/**
 * The Farm Decision Engine combines crop health, weather, and context
 * into actionable farming decisions using deterministic rules.
 *
 * AI is used only for explanation/summaries, NOT for the core decisions.
 */

/**
 * Generate comprehensive farm advice
 */
async function generateFarmAdvice({ crop, cropStage, latitude, longitude, cropAnalysis }) {
  let weather = null;
  let advisory = null;

  // Get weather data
  if (latitude && longitude) {
    try {
      weather = await getWeather(latitude, longitude);
      advisory = getWeatherAdvisory(weather);
    } catch (error) {
      logger.warn('Weather unavailable for farm advice:', error.message);
    }
  }

  // Build action plan
  const actions = [];

  // Weather-based actions
  if (advisory) {
    for (const adv of advisory.advisories) {
      actions.push({
        category: adv.category,
        status: adv.status,
        reason: adv.reason,
        icon: adv.icon,
        priority: getPriority(adv.status),
      });
    }
  }

  // Crop-health-based actions
  if (cropAnalysis) {
    if (cropAnalysis.severity === 'high') {
      actions.push({
        category: 'cropHealth',
        status: 'URGENT',
        reason: `Crop health alert: ${cropAnalysis.possibleIssue || 'Issue detected'}. Immediate attention recommended.`,
        icon: '🌱',
        priority: 1,
      });
    } else if (cropAnalysis.severity === 'moderate') {
      actions.push({
        category: 'cropHealth',
        status: 'ATTENTION',
        reason: `Possible crop issue: ${cropAnalysis.possibleIssue || 'Monitor closely'}.`,
        icon: '🌱',
        priority: 2,
      });
    } else if (cropAnalysis.severity === 'low') {
      actions.push({
        category: 'cropHealth',
        status: 'MONITOR',
        reason: `Minor crop observation: ${cropAnalysis.possibleIssue || 'Continue monitoring'}.`,
        icon: '🌱',
        priority: 3,
      });
    }
  }

  // Crop stage specific advice
  if (cropStage) {
    const stageAdvice = getCropStageAdvice(crop, cropStage, weather);
    if (stageAdvice) {
      actions.push(stageAdvice);
    }
  }

  // Sort by priority
  actions.sort((a, b) => (a.priority || 5) - (b.priority || 5));

  return {
    crop,
    cropStage,
    weather: weather ? {
      temperature: weather.current.temperature,
      humidity: weather.current.humidity,
      windSpeed: weather.current.windSpeed,
      description: weather.current.weatherDescription,
      rainProbability: advisory?.rainProbability || 0,
    } : null,
    actions,
    summary: advisory?.summary || 'Weather data unavailable.',
    generatedAt: new Date().toISOString(),
  };
}

function getPriority(status) {
  const priorities = {
    URGENT: 1, AVOID: 1,
    ATTENTION: 2, POSTPONE: 2,
    CAUTION: 3, RECOMMENDED: 3,
    MONITOR: 4, NORMAL: 4,
    GOOD: 5,
  };
  return priorities[status] || 5;
}

function getCropStageAdvice(crop, stage, weather) {
  const stageAdvice = {
    sowing: {
      category: 'cropStage',
      status: 'INFO',
      reason: `${crop || 'Crop'} is at sowing stage. Ensure adequate soil moisture for germination.`,
      icon: '🌾',
      priority: 3,
    },
    germination: {
      category: 'cropStage',
      status: 'INFO',
      reason: `${crop || 'Crop'} is germinating. Maintain consistent moisture and watch for pests.`,
      icon: '🌾',
      priority: 3,
    },
    vegetative: {
      category: 'cropStage',
      status: 'INFO',
      reason: `${crop || 'Crop'} is in vegetative growth. Ensure proper nutrition and weed management.`,
      icon: '🌾',
      priority: 3,
    },
    flowering: {
      category: 'cropStage',
      status: 'ATTENTION',
      reason: `${crop || 'Crop'} is flowering. This is a critical stage — avoid stress and ensure adequate water.`,
      icon: '🌸',
      priority: 2,
    },
    fruiting: {
      category: 'cropStage',
      status: 'INFO',
      reason: `${crop || 'Crop'} is in fruiting stage. Monitor for fruit set and pest damage.`,
      icon: '🍅',
      priority: 3,
    },
    harvesting: {
      category: 'cropStage',
      status: 'INFO',
      reason: `${crop || 'Crop'} is ready or near harvest. Plan harvest timing around weather.`,
      icon: '🌾',
      priority: 3,
    },
  };

  return stageAdvice[stage] || null;
}

module.exports = { generateFarmAdvice };
