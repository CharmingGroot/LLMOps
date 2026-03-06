import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

vi.mock('@llmops/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@llmops/core')>();
  return { ...original, logInfo: vi.fn(), logError: vi.fn(), logDebug: vi.fn(), logWarn: vi.fn() };
});

vi.mock('@llmops/state', () => ({
  MLflowClient: class {
    searchRuns = vi.fn();
    getRun = vi.fn();
    listArtifacts = vi.fn();
  },
}));

describe('Health API', () => {
  const app = createApp({ trackingUri: 'http://localhost:5000' });

  it('GET /api/health should return ok status', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.version).toBe('0.1.0');
    expect(res.body.timestamp).toBeDefined();
  });
});
