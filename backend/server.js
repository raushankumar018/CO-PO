/**
 * server.js
 * Entry point for the Outcome Based Education (OBE) Automation System backend.
 * Responsible for environment configuration, database connection, and starting the Express server.
 */

import dotenv from 'dotenv';
import app from './src/app.js';
import connectDB from './src/config/db.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;

// Connect to MongoDB Database
connectDB()
  .then(() => {
    // Start the Express server
    const server = app.listen(PORT, () => {
      console.log(`[Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });

    // Handle Unhandled Promise Rejections
    process.on('unhandledRejection', (err) => {
      console.error(`[Error] Unhandled Promise Rejection: ${err.message}`);
      console.log('[Server] Gracefully shutting down due to unhandled rejection...');
      server.close(() => {
        process.exit(1);
      });
    });
  })
  .catch((err) => {
    console.error(`[Database] Failed to connect to MongoDB: ${err.message}`);
    process.exit(1);
  });

// Handle Uncaught Exceptions
process.on('uncaughtException', (err) => {
  console.error(`[Error] Uncaught Exception: ${err.message}`);
  console.log('[Server] Shutting down immediately due to uncaught exception...');
  process.exit(1);
});
