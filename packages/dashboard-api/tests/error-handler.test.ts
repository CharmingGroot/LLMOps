import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { errorHandler } from '../src/middleware/error-handler.js';
import { LLMOpsError } from '@llmops/core';

vi.mock('@llmops/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@llmops/core')>();
  return { ...original, logInfo: vi.fn(), logError: vi.fn(), logDebug: vi.fn(), logWarn: vi.fn() };
});

describe('errorHandler middleware', () => {
  function createTestApp(error: Error) {
    const app = express();
    app.get('/test', (_req, _res, next) => {
      next(error);
    });
    app.use(errorHandler);
    return app;
  }

  it('should return 400 for LLMOpsError', async () => {
    const app = createTestApp(new LLMOpsError('Bad input', 'VALIDATION_ERROR', { field: 'name' }));

    const res = await request(app).get('/test');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Bad input');
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.details).toEqual({ field: 'name' });
  });

  it('should return 500 for generic errors', async () => {
    const app = createTestApp(new Error('Something broke'));

    const res = await request(app).get('/test');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Something broke');
  });
});
