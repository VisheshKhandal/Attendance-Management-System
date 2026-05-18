import mongoose from 'mongoose';
import { env } from '../config/env.js';

async function connectDatabase() {
  try {
    await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
}

export { connectDatabase };
