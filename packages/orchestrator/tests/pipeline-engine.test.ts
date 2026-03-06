import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  StageType,
  PipelineExecutionError,
} from '@llmops/core';
import type { PipelineConfig, StageConfig, RunContext, StageResult } from '@llmops/core';
import { PipelineEngine } from '../src/core/pipeline-engine.js';
import { StageRegistry } from '../src/registry/stage-registry.js';
import { BaseStage } from '../src/stages/base-stage.js';
import type { IStage } from '../src/stages/base-stage.js';

// Mock @llmops/core logger functions
vi.mock('@llmops/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@llmops/core')>();
  return {
    ...original,
    logInfo: vi.fn(),
    logError: vi.fn(),
    logDebug: vi.fn(),
    logWarn: vi.fn(),
  };
});

// Mock @llmops/state RunManager
vi.mock('@llmops/state', () => {
  return {
    RunManager: class MockRunManager {
      startPipeline = vi.fn().mockResolvedValue('run-test-123');
      endPipeline = vi.fn().mockResolvedValue(undefined);
      updateStage = vi.fn().mockResolvedValue(undefined);
      getClient = vi.fn().mockReturnValue({
        getOrCreateExperiment: vi.fn().mockResolvedValue('exp-test-1'),
      });
    },
  };
});

// Concrete test stages
class MockPreprocessStage implements IStage {
  readonly type = StageType.PREPROCESS;
  readonly name = 'MockPreprocess';
  async execute(_config: StageConfig, _context: RunContext): Promise<StageResult> {
    return { success: true };
  }
}

class MockTrainStage implements IStage {
  readonly type = StageType.TRAIN;
  readonly name = 'MockTrain';
  async execute(_config: StageConfig, _context: RunContext): Promise<StageResult> {
    return { success: true, metrics: { accuracy: 0.95 } };
  }
}

class FailingStage implements IStage {
  readonly type = StageType.BENCHMARK;
  readonly name = 'FailingBenchmark';
  async execute(_config: StageConfig, _context: RunContext): Promise<StageResult> {
    throw new Error('Benchmark failed');
  }
}

const VALID_CONFIG: PipelineConfig = {
  id: 'pipe-1',
  name: 'Test Pipeline',
  stages: [
    {
      id: 'preprocess',
      name: 'Preprocess',
      type: StageType.PREPROCESS,
      module: { type: 'python', entrypoint: 'preprocess.py' },
    },
    {
      id: 'train',
      name: 'Train',
      type: StageType.TRAIN,
      module: { type: 'python', entrypoint: 'train.py' },
      dependencies: ['preprocess'],
    },
  ],
  mlflow: {
    trackingUri: 'http://localhost:5000',
    experimentName: 'test-exp',
  },
};

describe('PipelineEngine', () => {
  let registry: StageRegistry;
  let engine: PipelineEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = new StageRegistry();
    engine = new PipelineEngine(registry);
  });

  describe('execute - successful pipeline', () => {
    it('should execute all stages in order and return success', async () => {
      registry.register(StageType.PREPROCESS, MockPreprocessStage as any);
      registry.register(StageType.TRAIN, MockTrainStage as any);

      const result = await engine.execute(VALID_CONFIG);

      expect(result.status).toBe('success');
      expect(result.runId).toBe('run-test-123');
      expect(result.stages).toHaveLength(2);
      expect(result.stages[0].stageId).toBe('preprocess');
      expect(result.stages[0].status).toBe('success');
      expect(result.stages[1].stageId).toBe('train');
      expect(result.stages[1].status).toBe('success');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('execute - stage failure stops pipeline', () => {
    it('should stop pipeline when a stage fails', async () => {
      registry.register(StageType.PREPROCESS, MockPreprocessStage as any);
      registry.register(StageType.TRAIN, FailingStage as any);

      const config: PipelineConfig = {
        ...VALID_CONFIG,
        stages: [
          {
            id: 'preprocess',
            name: 'Preprocess',
            type: StageType.PREPROCESS,
            module: { type: 'python', entrypoint: 'preprocess.py' },
          },
          {
            id: 'train',
            name: 'Train',
            type: StageType.TRAIN,
            module: { type: 'python', entrypoint: 'train.py' },
          },
        ],
      };

      await expect(engine.execute(config)).rejects.toThrow(PipelineExecutionError);
    });
  });

  describe('execute - skip stages', () => {
    it('should skip specified stages', async () => {
      registry.register(StageType.PREPROCESS, MockPreprocessStage as any);
      registry.register(StageType.TRAIN, MockTrainStage as any);

      const result = await engine.execute(VALID_CONFIG, {
        skipStages: ['preprocess'],
      });

      expect(result.stages[0].stageId).toBe('preprocess');
      expect(result.stages[0].status).toBe('skipped');
      expect(result.stages[1].stageId).toBe('train');
      expect(result.stages[1].status).toBe('success');
    });
  });

  describe('execute - context propagation', () => {
    it('should pass RunContext to all stages', async () => {
      const executeSpy = vi.fn().mockResolvedValue({ success: true });

      class SpyStage implements IStage {
        readonly type = StageType.PREPROCESS;
        readonly name = 'SpyStage';
        execute = executeSpy;
      }

      registry.register(StageType.PREPROCESS, SpyStage as any);

      const singleStageConfig: PipelineConfig = {
        ...VALID_CONFIG,
        stages: [
          {
            id: 'preprocess',
            name: 'Preprocess',
            type: StageType.PREPROCESS,
            module: { type: 'python', entrypoint: 'preprocess.py' },
          },
        ],
      };

      await engine.execute(singleStageConfig);

      expect(executeSpy).toHaveBeenCalledTimes(1);
      const [config, context] = executeSpy.mock.calls[0];
      expect(context.runId).toBe('run-test-123');
      expect(context.pipelineId).toBe('pipe-1');
      expect(context.experimentId).toBe('exp-test-1');
    });
  });

  describe('getRegistry / getEventBus', () => {
    it('should expose registry', () => {
      expect(engine.getRegistry()).toBe(registry);
    });

    it('should expose event bus', () => {
      expect(engine.getEventBus()).toBeDefined();
    });
  });

  describe('execute - validation errors', () => {
    it('should reject invalid config', async () => {
      const badConfig = { id: '', name: '', stages: [], mlflow: {} } as any;

      await expect(engine.execute(badConfig)).rejects.toThrow();
    });
  });
});
