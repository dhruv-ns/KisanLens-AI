const mongoose = require('mongoose');
const config = require('./index');
const logger = require('../utils/logger');

let isConnected = false;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongodb.uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    isConnected = true;
    logger.info(`MongoDB connected: ${conn.connection.host}`);

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      isConnected = true;
      logger.info('MongoDB reconnected');
    });

    return conn;
  } catch (error) {
    isConnected = false;
    logger.error('MongoDB connection error:', error.message);
    // Don't crash—allow app to start and run in degraded mode
    return null;
  }
};

const isDBConnected = () => isConnected;

module.exports = { connectDB, isDBConnected };
