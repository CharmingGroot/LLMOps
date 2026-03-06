import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RunManager } from '../src/managers/run-manager.js';
import type { PipelineConfig } from '@llmops/core';

// Suppress logger output
vi.mock('@llmops/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@llmops/core')>();
  return {
    ...original,
    logDebug: vi.fn(),
    logError: vi.fn(),
    logInfo: vi.fn(),
    logWarn: vi.fn(),
  };
});

// Mock MLflowClient as a class
vi.mock('../src/client/mlflow-client.js', () => {
  return {
    MLflowClient: class MockMLflowClient {
      getOrCreateExperiment = vi.fn().mockResolvedValue('exp-1');
      createRun = vi.fn().mockResolvedValue('run-abc');
      logParams = vi.fn().mockResolvedValue(undefined);
      logParam = vi.fn().mockResolvedValue(undefined);
      logMetric = vi.fn().mockResolvedValue(undefined);
      logMetrics = vi.fn().mockResolvedValue(undefined);
      setTag = vi.fn().mockResolvedValue(undefined);
      setTags = vi.fn().mockResolvedValue(undefined);
      updateRun = vi.fn().mockResolvedValue(undefined);
      getRun = vi.fn();
      searchRuns = vi.fn();
      logArtifact = vi.fn().mockResolvedValue(undefined);
      listArtifacts = vi.fn();
    },
  };
});

const MOCK_CONFIG: PipelineConfig = {
  id: 'pipe-1',
  name: 'Test Pipeline',
  stages: [
    {
      id: 'preprocess',
      name: 'Preprocess',
      type: 'preprocess' as any,
      module: { type: 'python', entrypoint: 'preprocess.py' },
    },
    {
      id: 'train',
      name: 'Train',
      type: 'train' as any,
      module: { type: 'python', entrypoint: 'train.py' },
    },
  ],
  mlflow: {
    trackingUri: 'http://localhost:5000',
    experimentName: 'test-exp',
  },
};

describe('RunManager', () => {
  let manager: RunManager;
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new RunManager('http://localhost:5000');
    mockClient = manager.getClient();
  });

  describe('startPipeline', () => {
    it('should create experiment and run', async () => {
      const runId = await manager.startPipeline(MOCK_CONFIG, 'test-user');

      expect(runId).toBe('run-abc');
      expect(mockClient.getOrCreateExperiment).toHaveBeenCalledWith(
        'test-exp',
        undefined
      );
      expect(mockClient.createRun).toHaveBeenCalledWith(
        expect.objectContaining({
          experimentId: 'exp-1',
        })
      );
    });

    it('should log pipeline parameters', async () => {
      await manager.startPipeline(MOCK_CONFIG, 'test-user');

      expect(mockClient.logParams).toHaveBeenCalledWith('run-abc', expect.objectContaining({
        pipeline_id: 'pipe-1',
        pipeline_name: 'Test Pipeline',
        triggered_by: 'test-user',
        num_stages: 2,
      }));
    });

    it('should set initial tags', async () => {
      await manager.startPipeline(MOCK_CONFIG);

      expect(mockClient.setTags).toHaveBeenCalledWith('run-abc', expect.objectContaining({
        status: 'running',
        current_stage: 'preprocess',
      }));
    });

    it('should default triggeredBy to unknown', async () => {
      await manager.startPipeline(MOCK_CONFIG);

      expect(mockClient.logParams).toHaveBeenCalledWith('run-abc', expect.objectContaining({
        triggered_by: 'unknown',
      }));
    });
  });

  describe('updateStage', () => {
    it('should update stage status tags', async () => {
      await manager.updateStage('run-1', 'train', 'running');

      expect(mockClient.setTags).toHaveBeenCalledWith('run-1', expect.objectContaining({
        current_stage: 'train',
        'stage.train.status': 'running',
      }));
    });

    it('should set start_time tag when status is running', async () => {
      await manager.updateStage('run-1', 'train', 'running');

      expect(mockClient.setTag).toHaveBeenCalledWith(
        'run-1',
        'stage.train.start_time',
        expect.any(String)
      );
    });

    it('should set end_time tag when status is not running', async () => {
      await manager.updateStage('run-1', 'train', 'success');

      expect(mockClient.setTag).toHaveBeenCalledWith(
        'run-1',
        'stage.train.end_time',
        expect.any(String)
      );
    });
  });

  describe('logTrainingMetrics', () => {
    it('should log metrics with step', async () => {
      await manager.logTrainingMetrics('run-1', { loss: 0.5, accuracy: 0.8 }, 10);

      expect(mockClient.logMetrics).toHaveBeenCalledWith(
        'run-1',
        { loss: 0.5, accuracy: 0.8 },
        expect.any(Number),
        10
      );
    });
  });

  describe('logBenchmarkResults', () => {
    it('should log benchmark metrics and pass tag', async () => {
      await manager.logBenchmarkResults('run-1', { latency: 50, throughput: 100 }, true);

      expect(mockClient.logMetrics).toHaveBeenCalledWith('run-1', { latency: 50, throughput: 100 });
      expect(mockClient.setTag).toHaveBeenCalledWith('run-1', 'benchmark_pass', '1');
      expect(mockClient.logMetric).toHaveBeenCalledWith('run-1', 'benchmark_pass', 1);
    });

    it('should log benchmark_pass as 0 when not passed', async () => {
      await manager.logBenchmarkResults('run-1', { latency: 200 }, false);

      expect(mockClient.setTag).toHaveBeenCalledWith('run-1', 'benchmark_pass', '0');
      expect(mockClient.logMetric).toHaveBeenCalledWith('run-1', 'benchmark_pass', 0);
    });
  });

  describe('endPipeline', () => {
    it('should set final status and update run on success', async () => {
      await manager.endPipeline('run-1', 'success');

      expect(mockClient.setTag).toHaveBeenCalledWith('run-1', 'status', 'success');
      expect(mockClient.updateRun).toHaveBeenCalledWith('run-1', 'FINISHED');
    });

    it('should log error details on failure', async () => {
      const error = new Error('Training exploded');

      await manager.endPipeline('run-1', 'failed', error);

      expect(mockClient.setTag).toHaveBeenCalledWith('run-1', 'status', 'failed');
      expect(mockClient.setTags).toHaveBeenCalledWith('run-1', expect.objectContaining({
        'error.message': 'Training exploded',
        'error.name': 'Error',
      }));
      expect(mockClient.updateRun).toHaveBeenCalledWith('run-1', 'FAILED');
    });

    it('should log error stack if available', async () => {
      const error = new Error('Stack trace test');

      await manager.endPipeline('run-1', 'failed', error);

      expect(mockClient.setTag).toHaveBeenCalledWith(
        'run-1',
        'error.stack',
        expect.stringContaining('Stack trace test')
      );
    });
  });

  describe('getClient', () => {
    it('should return the MLflow client instance', () => {
      const result = manager.getClient();
      expect(result).toBeDefined();
    });
  });
});
