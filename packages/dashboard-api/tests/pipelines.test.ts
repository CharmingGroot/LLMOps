import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

vi.mock('@llmops/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@llmops/core')>();
  return { ...original, logInfo: vi.fn(), logError: vi.fn(), logDebug: vi.fn(), logWarn: vi.fn() };
});

const mockSearchRuns = vi.fn();
const mockGetRun = vi.fn();
const mockListArtifacts = vi.fn();

vi.mock('@llmops/state', () => ({
  MLflowClient: class {
    searchRuns = mockSearchRuns;
    getRun = mockGetRun;
    listArtifacts = mockListArtifacts;
  },
}));

describe('Pipelines API', () => {
  const app = createApp({ trackingUri: 'http://localhost:5000' });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/pipelines/runs', () => {
    it('should return runs for given experiment IDs', async () => {
      mockSearchRuns.mockResolvedValueOnce([
        { info: { runId: 'r1', status: 'FINISHED' } },
      ]);

      const res = await request(app)
        .get('/api/pipelines/runs')
        .query({ experimentIds: 'exp-1' });

      expect(res.status).toBe(200);
      expect(res.body.runs).toHaveLength(1);
      expect(res.body.runs[0].info.runId).toBe('r1');
    });

    it('should return 400 when experimentIds not provided', async () => {
      const res = await request(app).get('/api/pipelines/runs');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('experimentIds');
    });

    it('should return 500 on MLflow error', async () => {
      mockSearchRuns.mockRejectedValueOnce(new Error('MLflow down'));

      const res = await request(app)
        .get('/api/pipelines/runs')
        .query({ experimentIds: 'exp-1' });

      expect(res.status).toBe(500);
      expect(res.body.error).toContain('MLflow down');
    });
  });

  describe('GET /api/pipelines/runs/:runId', () => {
    it('should return a specific run', async () => {
      const mockRun = {
        info: { runId: 'r1', status: 'FINISHED' },
        data: { metrics: [], params: [], tags: [] },
      };
      mockGetRun.mockResolvedValueOnce(mockRun);

      const res = await request(app).get('/api/pipelines/runs/r1');

      expect(res.status).toBe(200);
      expect(res.body.run.info.runId).toBe('r1');
    });

    it('should return 500 on error', async () => {
      mockGetRun.mockRejectedValueOnce(new Error('Not found'));

      const res = await request(app).get('/api/pipelines/runs/nonexistent');

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/pipelines/runs/:runId/artifacts', () => {
    it('should list artifacts for a run', async () => {
      mockListArtifacts.mockResolvedValueOnce({
        rootUri: 's3://bucket',
        files: [{ path: 'model.pkl', isDir: false }],
      });

      const res = await request(app).get('/api/pipelines/runs/r1/artifacts');

      expect(res.status).toBe(200);
      expect(res.body.files).toHaveLength(1);
    });
  });
});
