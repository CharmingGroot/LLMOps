import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StageType } from '@llmops/core';
import type { StageConfig, RunContext } from '@llmops/core';
import { PreprocessStage } from '../src/stages/impl/preprocess-stage.js';

vi.mock('@llmops/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@llmops/core')>();
  return { ...original, logInfo: vi.fn(), logError: vi.fn(), logDebug: vi.fn(), logWarn: vi.fn() };
});

vi.mock('@llmops/state', () => ({
  RunManager: class {
    updateStage = vi.fn().mockResolvedValue(undefined);
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
  id: 'preprocess',
  name: 'Preprocess',
  type: StageType.PREPROCESS,
  module: { type: 'python', entrypoint: 'modules/preprocess/main.py' },
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

describe('PreprocessStage', () => {
  let stage: PreprocessStage;

  beforeEach(() => {
    vi.clearAllMocks();
    stage = new PreprocessStage();
    mockPythonRun.mockResolvedValue({
      exitCode: 0,
      stdout: 'METRIC:num_samples=1000\nMETRIC:num_features=128\nARTIFACT:data/processed\nSome log line\n',
      stderr: '',
    });
  });

  it('should implement IStage interface', () => {
    expect(stage.type).toBe('preprocess');
    expect(stage.name).toBe('Preprocess');
    expect(typeof stage.execute).toBe('function');
  });

  it('should parse metrics from stdout', async () => {
    const result = await stage.execute(MOCK_CONFIG, MOCK_CONTEXT);

    expect(result.success).toBe(true);
    expect(result.metrics).toEqual({ num_samples: 1000, num_features: 128 });
  });

  it('should parse artifacts from stdout', async () => {
    const result = await stage.execute(MOCK_CONFIG, MOCK_CONTEXT);

    expect(result.artifacts).toEqual(['data/processed']);
  });

  it('should handle empty stdout gracefully', async () => {
    mockPythonRun.mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' });

    const result = await stage.execute(MOCK_CONFIG, MOCK_CONTEXT);

    expect(result.success).toBe(true);
    expect(result.metrics).toEqual({});
    expect(result.artifacts).toEqual([]);
  });
});
