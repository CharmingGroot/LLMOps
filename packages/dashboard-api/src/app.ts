/**
 * Express Application Setup
 */

import express, { type Express } from 'express';
import { createHealthRouter } from './routes/health.js';
import { createPipelineRouter } from './routes/pipelines.js';
import { errorHandler } from './middleware/error-handler.js';

export interface AppConfig {
  trackingUri: string;
}

export function createApp(config: AppConfig): Express {
  const app = express();

  app.use(express.json());

  // CORS headers
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    next();
  });

  // Routes
  app.use('/api/health', createHealthRouter());
  app.use('/api/pipelines', createPipelineRouter({ trackingUri: config.trackingUri }));

  // Error handler
  app.use(errorHandler);

  return app;
}
