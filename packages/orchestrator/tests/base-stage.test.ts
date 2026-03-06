import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StageType } from '@llmops/core';
import { BaseStage } from '../src/stages/base-stage.js';
import type { StageConfig, RunContext, StageResult } from '@llmops/core';

vi.mock('@llmops/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@llmops/core')>();
  return {
    ...original,
    logInfo: vi.fn(),
    logError: vi.fn(),
    logDebug: vi.fn(),
  };
});

vi.mock('@llmops/state', () => {
  return {
    RunManager: class MockRunManager {
      updateStage = vi.fn().mockResolvedValue(undefined);
      getClient = vi.fn();
    },
  };
});

class SuccessStage extends BaseStage {
  readonly type = StageType.PREPROCESS;
  readonly name = 'SuccessStage';

  protected async run(_config: StageConfig, _context: RunContext): Promise<StageResult> {
    return { success: true, metrics: { accuracy: 0.95 } };
  }
}

class FailingStage extends BaseStage {
  readonly type = StageType.TRAIN;
  readonly name = 'FailingStage';

  protected async run(_config: StageConfig, _context: RunContext): Promise<StageResult> {
    throw new Error('Training failed');
  }
}

const MOCK_CONFIG: StageConfig = {
  id: 'stage-1',
  name: 'Test Stage',
  type: StageType.PREPROCESS,
  module: { type: 'python', entrypoint: 'test.py' },
};

const MOCK_CONTEXT: RunContext = {
  runId: 'run-1',
  pipelineId: 'pipe-1',
  experimentId: 'exp-1',
  triggeredBy: 'test',
  timestamp: new Date(),
  config: {
    id: 'pipe-1',
    name: 'Test Pipeline',
    stages: [],
    mlflow: { trackingUri: 'http://localhost:5000', experimentName: 'test' },
  },
};

describe('BaseStage', () => {
  describe('successful execution', () => {
    it('should return result from run()', async () => {
      const stage = new SuccessStage();
      const result = await stage.execute(MOCK_CONFIG, MOCK_CONTEXT);

      expect(result.success).toBe(true);
      expect(result.metrics).toEqual({ accuracy: 0.95 });
    });

    it('should implement IStage interface', () => {
      const stage = new SuccessStage();

      expect(stage.type).toBe(StageType.PREPROCESS);
      expect(stage.name).toBe('SuccessStage');
      expect(typeof stage.execute).toBe('function');
    });
  });

  describe('failed execution', () => {
    it('should propagate errors from run()', async () => {
      const stage = new FailingStage();

      await expect(stage.execute(MOCK_CONFIG, MOCK_CONTEXT)).rejects.toThrow('Training failed');
    });
  });

  describe('checkCondition', () => {
    it('should return true when no condition set', async () => {
      const stage = new SuccessStage();
      // checkCondition is protected, test via execute with no condition
      const result = await stage.execute(MOCK_CONFIG, MOCK_CONTEXT);

      expect(result.success).toBe(true);
    });
  });
});
