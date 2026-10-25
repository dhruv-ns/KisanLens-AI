const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',

  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/kisanlens',
  },

  // AI Configuration — 100% Gnani AI (Voice STT: Prisma v2.5, TTS: Timbre v2.5, LLM: Evon v3.3)
  gnani: {
    apiKey: process.env.GNANI_API_KEY || process.env.GEMINI_API_KEY || '',
    evonEndpoint: process.env.GNANI_EVON_ENDPOINT || 'https://api.vachana.ai/v1/chat/completions',
    evonEnabled: process.env.GNANI_EVON_ENABLED !== 'false', // Enabled by default
  },

  // Legacy reference (deprecated)
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'deprecated',
  },

  weather: {
    apiUrl: process.env.WEATHER_API_URL || 'https://api.open-meteo.com/v1',
  },

  market: {
    apiUrl: process.env.MARKET_API_URL || 'https://api.data.gov.in/resource',
    apiKey: process.env.MARKET_API_KEY || '',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production',
    expiry: process.env.JWT_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  client: {
    url: process.env.CLIENT_URL || 'http://localhost:5173',
  },

  imagekit: {
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY || '',
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY || '',
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || '',
  },

  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
};

module.exports = config;
