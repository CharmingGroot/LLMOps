/**
 * Health Check Route
 */

import { Router, type Request, type Response } from 'express';

export function createHealthRouter(): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
    });
  });

  return router;
}
