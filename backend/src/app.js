/**
 * src/app.js
 * Express application setup.
 * Configures global middlewares (CORS, Morgan, JSON parsers), registers routing tables, and integrates error handling.
 */

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import syllabusRoutes from './routes/syllabus.routes.js';
import coRoutes from './routes/co.routes.js';
import questionPaperRoutes from './routes/questionPaper.routes.js';
import mappingRoutes from './routes/mapping.routes.js';

// Import custom error middlewares
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';

// Setup __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Enable Cross-Origin Resource Sharing (CORS)
app.use(cors());

// HTTP request logger
app.use(morgan('dev'));

// Parse JSON and URL-encoded request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploaded files (syllabus and question papers)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Register API Route Handlers
app.use('/api/v1/syllabus', syllabusRoutes);
app.use('/api/v1/co', coRoutes);
app.use('/api/v1/question-papers', questionPaperRoutes);
app.use('/api/v1/mappings', mappingRoutes);

// Root/Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'OBE Automation System Backend is healthy and running.',
    timestamp: new Date()
  });
});

// Fallback for Page Not Found (404)
app.use(notFoundHandler);

// Global Error Handler Middleware
app.use(errorHandler);

export default app;
