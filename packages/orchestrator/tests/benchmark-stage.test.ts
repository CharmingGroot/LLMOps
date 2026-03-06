import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StageType } from '@llmops/core';
import type { StageConfig, RunContext } from '@llmops/core';
import { BenchmarkStage } from '../src/stages/impl/benchmark-stage.js';

vi.mock('@llmops/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@llmops/core')>();
  return { ...original, logInfo: vi.fn(), logError: vi.fn(), logDebug: vi.fn(), logWarn: vi.fn() };
});

const mockLogBenchmarkResults = vi.fn().mockResolvedValue(undefined);

vi.mock('@llmops/state', () => ({
  RunManager: class {
    updateStage = vi.fn().mockResolvedValue(undefined);
    logBenchmarkResults = mockLogBenchmarkResults;
    getClient = vi.fn();
  },
}));

const mockPythonRun = vi.fn();

vi.mock('../src/process/python-runner.js', () => ({
  PythonRunner: class {
    run = mockPythonRun;
  },
}));

const MOCK_CONTEXT: RunContext = {
  runId: 'run-1',
  pipelineId: 'pipe-1',
  experimentId: 'exp-1',
  triggeredBy: 'test',
  timestamp: new Date(),
  config: {
    id: 'pipe-1',
    name: 'Test',
    stages: [],
    mlflow: { trackingUri: 'http://localhost:5000', experimentName: 'test' },
  },
};

describe('BenchmarkStage', () => {
  let stage: BenchmarkStage;

  beforeEach(() => {
    vi.clearAllMocks();
    stage = new BenchmarkStage();
    mockPythonRun.mockResolvedValue({
      exitCode: 0,
      stdout: 'METRIC:accuracy=0.92\nMETRIC:latency_ms=45\n',
      stderr: '',
    });
  });

  it('should implement IStage interface', () => {
    expect(stage.type).toBe('benchmark');
    expect(stage.name).toBe('Benchmark');
  });

  describe('without gating condition', () => {
    const config: StageConfig = {
      id: 'benchmark',
      name: 'Benchmark',
      type: StageType.BENCHMARK,
      module: { type: 'python', entrypoint: 'modules/benchmark/main.py' },
    };

    it('should pass when no condition set', async () => {
      const result = await stage.execute(config, MOCK_CONTEXT);

      expect(result.success).toBe(true);
      expect(result.metrics).toEqual({ accuracy: 0.92, latency_ms: 45 });
    });

    it('should log benchmark results to MLflow', async () => {
      await stage.execute(config, MOCK_CONTEXT);

      expect(mockLogBenchmarkResults).toHaveBeenCalledWith(
        'run-1',
        { accuracy: 0.92, latency_ms: 45 },
        true
      );
    });
  });

  describe('with gating condition - pass', () => {
    const config: StageConfig = {
      id: 'benchmark',
      name: 'Benchmark',
      type: StageType.BENCHMARK,
      module: { type: 'python', entrypoint: 'modules/benchmark/main.py' },
      condition: { field: 'accuracy', operator: 'gte', value: 0.9 },
    };

    it('should pass when condition is met', async () => {
      const result = await stage.execute(config, MOCK_CONTEXT);
      expect(result.success).toBe(true);
    });
  });

  describe('with gating condition - fail', () => {
    const config: StageConfig = {
      id: 'benchmark',
      name: 'Benchmark',
      type: StageType.BENCHMARK,
      module: { type: 'python', entrypoint: 'modules/benchmark/main.py' },
      condition: { field: 'accuracy', operator: 'gte', value: 0.95 },
    };

    it('should throw when condition is not met', async () => {
      await expect(stage.execute(config, MOCK_CONTEXT)).rejects.toThrow('gating failed');
    });

    it('should log failed benchmark to MLflow', async () => {
      try {
        await stage.execute(config, MOCK_CONTEXT);
      } catch {
        // expected
      }

      expect(mockLogBenchmarkResults).toHaveBeenCalledWith(
        'run-1',
        { accuracy: 0.92, latency_ms: 45 },
        false
      );
    });
  });

  describe('gating operators', () => {
    const makeConfig = (operator: string, value: number): StageConfig => ({
      id: 'benchmark',
      name: 'Benchmark',
      type: StageType.BENCHMARK,
      module: { type: 'python', entrypoint: 'modules/benchmark/main.py' },
      condition: { field: 'accuracy', operator: operator as any, value },
    });

    it('gt: 0.92 > 0.9 should pass', async () => {
      const result = await stage.execute(makeConfig('gt', 0.9), MOCK_CONTEXT);
      expect(result.success).toBe(true);
    });

    it('gt: 0.92 > 0.92 should fail', async () => {
      await expect(stage.execute(makeConfig('gt', 0.92), MOCK_CONTEXT)).rejects.toThrow();
    });

    it('lt: 0.92 < 1.0 should pass', async () => {
      const result = await stage.execute(makeConfig('lt', 1.0), MOCK_CONTEXT);
      expect(result.success).toBe(true);
    });

    it('eq: 0.92 == 0.92 should pass', async () => {
      const result = await stage.execute(makeConfig('eq', 0.92), MOCK_CONTEXT);
      expect(result.success).toBe(true);
    });

    it('ne: 0.92 != 0.5 should pass', async () => {
      const result = await stage.execute(makeConfig('ne', 0.5), MOCK_CONTEXT);
      expect(result.success).toBe(true);
    });

    it('lte: 0.92 <= 0.92 should pass', async () => {
      const result = await stage.execute(makeConfig('lte', 0.92), MOCK_CONTEXT);
      expect(result.success).toBe(true);
    });
  });

  describe('missing gating field', () => {
    const config: StageConfig = {
      id: 'benchmark',
      name: 'Benchmark',
      type: StageType.BENCHMARK,
      module: { type: 'python', entrypoint: 'modules/benchmark/main.py' },
      condition: { field: 'nonexistent', operator: 'gte', value: 0.5 },
    };

    it('should fail when gating field is not in metrics', async () => {
      await expect(stage.execute(config, MOCK_CONTEXT)).rejects.toThrow('gating failed');
    });
  });
});
