/**
 * src/config/db.js
 * MongoDB database connection configuration using Mongoose.
 */

import mongoose from 'mongoose';

/**
 * Establishes connection to MongoDB.
 * Connects using the MONGO_URI environment variable or falls back to localhost.
 */
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/obe';
    
    const conn = await mongoose.connect(mongoUri);
    
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`[Database Error] Connection to MongoDB failed: ${error.message}`);
    throw error;
  }
};

export default connectDB;
