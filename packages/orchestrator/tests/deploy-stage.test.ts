import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StageType } from '@llmops/core';
import type { StageConfig, RunContext } from '@llmops/core';
import { DeployStage } from '../src/stages/impl/deploy-stage.js';

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
  id: 'deploy',
  name: 'Deploy',
  type: StageType.DEPLOY,
  module: { type: 'python', entrypoint: 'modules/deploy/main.py' },
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

describe('DeployStage', () => {
  let stage: DeployStage;

  beforeEach(() => {
    vi.clearAllMocks();
    stage = new DeployStage();
    mockPythonRun.mockResolvedValue({
      exitCode: 0,
      stdout: 'DEPLOY:endpoint=https://api.example.com/staging/model\nDEPLOY:version=1.0.0\nDEPLOY:target=staging\n',
      stderr: '',
    });
  });

  it('should implement IStage interface', () => {
    expect(stage.type).toBe('deploy');
    expect(stage.name).toBe('Deploy');
  });

  it('should parse deployment info from stdout', async () => {
    const result = await stage.execute(MOCK_CONFIG, MOCK_CONTEXT);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      endpoint: 'https://api.example.com/staging/model',
      version: '1.0.0',
      target: 'staging',
    });
  });

  it('should handle empty deployment output', async () => {
    mockPythonRun.mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' });

    const result = await stage.execute(MOCK_CONFIG, MOCK_CONTEXT);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({});
  });
});
