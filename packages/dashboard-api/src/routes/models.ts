/**
 * Model Registry API Routes
 */

import { Router, type Request, type Response } from 'express';
import { MLflowClient } from '@llmops/state';
import { getErrorMessage } from '@llmops/core';

export interface ModelRouterConfig {
  trackingUri: string;
}

export function createModelRouter(config: ModelRouterConfig): Router {
  const router = Router();
  const client = new MLflowClient(config.trackingUri);

  // GET /api/models - List registered models
  router.get('/', async (_req: Request, res: Response) => {
    try {
      const limit = Number(_req.query.limit) || 100;
      const models = await client.listRegisteredModels(limit);
      res.json({ models });
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  // GET /api/models/:name - Get a specific model
  router.get('/:name', async (req: Request, res: Response) => {
    try {
      const model = await client.getRegisteredModel(req.params.name as string);
      res.json({ model });
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  // GET /api/models/:name/versions - Get latest versions
  router.get('/:name/versions', async (req: Request, res: Response) => {
    try {
      const stages = req.query.stages
        ? (req.query.stages as string).split(',')
        : undefined;
      const versions = await client.getLatestVersions(req.params.name as string, stages);
      res.json({ versions });
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  // POST /api/models/:name/promote - Transition model stage
  router.post('/:name/promote', async (req: Request, res: Response) => {
    try {
      const { version, stage } = req.body;
      if (!version || !stage) {
        res.status(400).json({ error: 'version and stage are required' });
        return;
      }
      const validStages = ['Staging', 'Production', 'Archived', 'None'];
      if (!validStages.includes(stage)) {
        res.status(400).json({ error: `stage must be one of: ${validStages.join(', ')}` });
        return;
      }
      const result = await client.transitionModelStage(
        req.params.name as string,
        version,
        stage
      );
      res.json({ model_version: result });
    } catch (error) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  return router;
}
