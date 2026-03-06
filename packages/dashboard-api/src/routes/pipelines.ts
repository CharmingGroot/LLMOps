/**
 * Pipeline API Routes
 */

import { Router, type Request, type Response } from 'express';
import { MLflowClient } from '@llmops/state';
import { getErrorMessage } from '@llmops/core';

export interface PipelineRouterConfig {
  trackingUri: string;
}

export function createPipelineRouter(config: PipelineRouterConfig): Router {
  const router = Router();
  const client = new MLflowClient(config.trackingUri);

  // GET /api/pipelines/runs - List recent pipeline runs
  router.get('/runs', async (_req: Request, res: Response) => {
    try {
      const experimentIds = (_req.query.experimentIds as string || '').split(',').filter(Boolean);
      if (experimentIds.length === 0) {
        res.status(400).json({ error: 'experimentIds query parameter is required' });
        return;
      }

      const runs = await client.searchRuns({
        experimentIds,
        maxResults: Number(_req.query.limit) || 20,
        orderBy: ['start_time DESC'],
      });

      res.json({ runs });
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  // GET /api/pipelines/runs/:runId - Get a specific run
  router.get('/runs/:runId', async (req: Request, res: Response) => {
    try {
      const run = await client.getRun(req.params.runId);
      res.json({ run });
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  // GET /api/pipelines/runs/:runId/artifacts - List artifacts
  router.get('/runs/:runId/artifacts', async (req: Request, res: Response) => {
    try {
      const artifacts = await client.listArtifacts(
        req.params.runId,
        req.query.path as string | undefined
      );
      res.json(artifacts);
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  return router;
}
