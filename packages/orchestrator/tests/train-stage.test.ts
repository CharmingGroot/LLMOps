import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StageType } from '@llmops/core';
import type { StageConfig, RunContext } from '@llmops/core';
import { TrainStage } from '../src/stages/impl/train-stage.js';

vi.mock('@llmops/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@llmops/core')>();
  return { ...original, logInfo: vi.fn(), logError: vi.fn(), logDebug: vi.fn(), logWarn: vi.fn() };
});

const mockLogTrainingMetrics = vi.fn().mockResolvedValue(undefined);

vi.mock('@llmops/state', () => ({
  RunManager: class {
    updateStage = vi.fn().mockResolvedValue(undefined);
    logTrainingMetrics = mockLogTrainingMetrics;
    getClient = vi.fn();
  },
}));

const mockPythonRun = vi.fn();

vi.mock('../src/process/python-runner.js', () => ({
  PythonRunner: class {
    run = mockPythonRun;
  },
}));

const MOCK_CONFIG: StageConfig = {
  id: 'train',
  name: 'Train',
  type: StageType.TRAIN,
  module: { type: 'python', entrypoint: 'modules/train/main.py' },
};

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

describe('TrainStage', () => {
  let stage: TrainStage;

  beforeEach(() => {
    vi.clearAllMocks();
    stage = new TrainStage();
    mockPythonRun.mockResolvedValue({
      exitCode: 0,
      stdout: 'METRIC:loss=0.05\nMETRIC:accuracy=0.95\nARTIFACT:models/model.pt\n',
      stderr: '',
    });
  });

  it('should implement IStage interface', () => {
    expect(stage.type).toBe('train');
    expect(stage.name).toBe('Train');
  });

  it('should parse training metrics from stdout', async () => {
    const result = await stage.execute(MOCK_CONFIG, MOCK_CONTEXT);

    expect(result.success).toBe(true);
    expect(result.metrics).toEqual({ loss: 0.05, accuracy: 0.95 });
  });

  it('should parse artifacts from stdout', async () => {
    const result = await stage.execute(MOCK_CONFIG, MOCK_CONTEXT);

    expect(result.artifacts).toEqual(['models/model.pt']);
  });

  it('should log training metrics to MLflow', async () => {
    await stage.execute(MOCK_CONFIG, MOCK_CONTEXT);

    expect(mockLogTrainingMetrics).toHaveBeenCalledWith(
      'run-1',
      { loss: 0.05, accuracy: 0.95 },
      0
    );
  });

  it('should skip MLflow logging when no metrics', async () => {
    mockPythonRun.mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' });

    await stage.execute(MOCK_CONFIG, MOCK_CONTEXT);

    expect(mockLogTrainingMetrics).not.toHaveBeenCalled();
  });
});
