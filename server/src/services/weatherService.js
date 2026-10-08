const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = `${config.weather.apiUrl}/forecast`;

// Simple in-memory cache
const weatherCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCacheKey(lat, lon) {
  return `${lat.toFixed(2)}_${lon.toFixed(2)}`;
}

/**
 * Search for location by name → returns lat/lon
 */
async function searchLocation(query) {
  try {
    const response = await axios.get(GEOCODING_URL, {
      params: { name: query, count: 5, language: 'en', format: 'json' },
      timeout: 10000,
    });

    if (!response.data?.results?.length) {
      return [];
    }

    return response.data.results.map((r) => ({
      name: r.name,
      state: r.admin1 || '',
      country: r.country || '',
      latitude: r.latitude,
      longitude: r.longitude,
    }));
  } catch (error) {
    logger.error('Geocoding error:', error.message);
    throw new Error('Location search is temporarily unavailable.');
  }
}

/**
 * Get current weather + hourly + daily forecast
 */
async function getWeather(latitude, longitude) {
  const cacheKey = getCacheKey(latitude, longitude);
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const response = await axios.get(FORECAST_URL, {
      params: {
        latitude,
        longitude,
        current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m',
        hourly: 'temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m',
        daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weather_code,sunrise,sunset,wind_speed_10m_max',
        timezone: 'auto',
        forecast_days: 7,
      },
      timeout: 10000,
    });

    const data = response.data;

    const result = {
      current: {
        temperature: data.current?.temperature_2m,
        feelsLike: data.current?.apparent_temperature,
        humidity: data.current?.relative_humidity_2m,
        precipitation: data.current?.precipitation,
        weatherCode: data.current?.weather_code,
        weatherDescription: getWeatherDescription(data.current?.weather_code),
        windSpeed: data.current?.wind_speed_10m,
        windDirection: data.current?.wind_direction_10m,
      },
      hourly: {
        time: data.hourly?.time?.slice(0, 48) || [],
        temperature: data.hourly?.temperature_2m?.slice(0, 48) || [],
        humidity: data.hourly?.relative_humidity_2m?.slice(0, 48) || [],
        precipitationProbability: data.hourly?.precipitation_probability?.slice(0, 48) || [],
        precipitation: data.hourly?.precipitation?.slice(0, 48) || [],
        weatherCode: data.hourly?.weather_code?.slice(0, 48) || [],
        windSpeed: data.hourly?.wind_speed_10m?.slice(0, 48) || [],
      },
      daily: {
        time: data.daily?.time || [],
        temperatureMax: data.daily?.temperature_2m_max || [],
        temperatureMin: data.daily?.temperature_2m_min || [],
        precipitationSum: data.daily?.precipitation_sum || [],
        precipitationProbabilityMax: data.daily?.precipitation_probability_max || [],
        weatherCode: data.daily?.weather_code || [],
        sunrise: data.daily?.sunrise || [],
        sunset: data.daily?.sunset || [],
        windSpeedMax: data.daily?.wind_speed_10m_max || [],
      },
      timezone: data.timezone,
    };

    weatherCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    logger.error('Weather API error:', error.message);
    throw new Error('Weather information is temporarily unavailable.');
  }
}

/**
 * Get agricultural weather advisory based on weather data
 */
function getWeatherAdvisory(weatherData) {
  const advisories = [];
  const current = weatherData.current;

  // Check next 24h hourly precipitation probabilities
  const next24hRainProb = weatherData.hourly.precipitationProbability.slice(0, 24);
  const maxRainProb = Math.max(...next24hRainProb, 0);
  const avgRainProb = next24hRainProb.reduce((a, b) => a + b, 0) / (next24hRainProb.length || 1);
  const next24hPrecipitation = weatherData.hourly.precipitation.slice(0, 24);
  const totalPrecipitation = next24hPrecipitation.reduce((a, b) => a + b, 0);

  // Irrigation advice
  if (maxRainProb > 60) {
    advisories.push({
      category: 'irrigation',
      status: 'POSTPONE',
      reason: `Rain probability is ${maxRainProb}% in the next 24 hours. Consider postponing irrigation.`,
      icon: '💧',
    });
  } else if (maxRainProb > 30) {
    advisories.push({
      category: 'irrigation',
      status: 'CAUTION',
      reason: `Moderate rain probability (${maxRainProb}%). Monitor conditions before irrigating.`,
      icon: '💧',
    });
  } else {
    advisories.push({
      category: 'irrigation',
      status: 'GOOD',
      reason: 'Low rain probability. Irrigation can proceed as planned.',
      icon: '💧',
    });
  }

  // Spraying advice
  if (current.windSpeed > 20) {
    advisories.push({
      category: 'spraying',
      status: 'AVOID',
      reason: `Wind speed is high (${current.windSpeed} km/h). Outdoor spraying is not recommended.`,
      icon: '🌿',
    });
  } else if (maxRainProb > 50) {
    advisories.push({
      category: 'spraying',
      status: 'CAUTION',
      reason: 'Rain expected soon. Spraying may be washed away. Consider waiting.',
      icon: '🌿',
    });
  } else if (current.windSpeed > 10) {
    advisories.push({
      category: 'spraying',
      status: 'CAUTION',
      reason: `Moderate wind (${current.windSpeed} km/h). Spray drift possible.`,
      icon: '🌿',
    });
  } else {
    advisories.push({
      category: 'spraying',
      status: 'GOOD',
      reason: 'Wind and weather conditions are suitable for spraying.',
      icon: '🌿',
    });
  }

  // Field work advice
  if (totalPrecipitation > 10) {
    advisories.push({
      category: 'fieldWork',
      status: 'AVOID',
      reason: 'Heavy rainfall expected. Avoid field operations.',
      icon: '🚜',
    });
  } else if (current.temperature > 40) {
    advisories.push({
      category: 'fieldWork',
      status: 'CAUTION',
      reason: `Very high temperature (${current.temperature}°C). Avoid prolonged field work during peak hours.`,
      icon: '🚜',
    });
  } else if (totalPrecipitation > 2) {
    advisories.push({
      category: 'fieldWork',
      status: 'CAUTION',
      reason: 'Some rainfall expected. Plan field work for dry periods.',
      icon: '🚜',
    });
  } else {
    advisories.push({
      category: 'fieldWork',
      status: 'GOOD',
      reason: 'Weather conditions are suitable for field work.',
      icon: '🚜',
    });
  }

  // Crop inspection
  if (current.humidity > 85) {
    advisories.push({
      category: 'inspection',
      status: 'RECOMMENDED',
      reason: `High humidity (${current.humidity}%). Inspect crops for fungal diseases.`,
      icon: '🔍',
    });
  } else {
    advisories.push({
      category: 'inspection',
      status: 'NORMAL',
      reason: 'Regular crop inspection recommended.',
      icon: '🔍',
    });
  }

  return {
    advisories,
    summary: generateWeatherSummary(current, maxRainProb, totalPrecipitation),
    rainProbability: maxRainProb,
  };
}

function generateWeatherSummary(current, maxRainProb, totalPrecipitation) {
  const parts = [];
  parts.push(`Temperature: ${current.temperature}°C`);
  if (current.humidity > 80) parts.push(`High humidity (${current.humidity}%)`);
  if (maxRainProb > 50) parts.push(`Rain likely (${maxRainProb}% probability)`);
  if (current.windSpeed > 15) parts.push(`Windy conditions (${current.windSpeed} km/h)`);
  if (totalPrecipitation > 5) parts.push(`Expected rainfall: ${totalPrecipitation.toFixed(1)}mm`);
  return parts.join('. ') + '.';
}

function getWeatherDescription(code) {
  const descriptions = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Depositing rime fog',
    51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
    61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
    66: 'Light freezing rain', 67: 'Heavy freezing rain',
    71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
    80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
    95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Thunderstorm with heavy hail',
  };
  return descriptions[code] || 'Unknown';
}

module.exports = { searchLocation, getWeather, getWeatherAdvisory, getWeatherDescription };
