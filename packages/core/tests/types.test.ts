import { describe, it, expect } from 'vitest';
import { StageType, PipelineEvent } from '../src/types/index.js';

describe('StageType enum', () => {
  it('should define all stage types', () => {
    expect(StageType.PREPROCESS).toBe('preprocess');
    expect(StageType.TRAIN).toBe('train');
    expect(StageType.BENCHMARK).toBe('benchmark');
    expect(StageType.DEPLOY).toBe('deploy');
  });

  it('should have exactly 4 stage types', () => {
    const values = Object.values(StageType);
    expect(values).toHaveLength(4);
  });
});

describe('PipelineEvent enum', () => {
  it('should define pipeline lifecycle events', () => {
    expect(PipelineEvent.PIPELINE_STARTED).toBe('pipeline:started');
    expect(PipelineEvent.PIPELINE_COMPLETED).toBe('pipeline:completed');
    expect(PipelineEvent.PIPELINE_FAILED).toBe('pipeline:failed');
  });

  it('should define stage lifecycle events', () => {
    expect(PipelineEvent.STAGE_STARTED).toBe('stage:started');
    expect(PipelineEvent.STAGE_COMPLETED).toBe('stage:completed');
    expect(PipelineEvent.STAGE_FAILED).toBe('stage:failed');
    expect(PipelineEvent.STAGE_SKIPPED).toBe('stage:skipped');
  });

  it('should define MLflow events', () => {
    expect(PipelineEvent.METRIC_LOGGED).toBe('metric:logged');
    expect(PipelineEvent.PARAM_LOGGED).toBe('param:logged');
    expect(PipelineEvent.ARTIFACT_UPLOADED).toBe('artifact:uploaded');
    expect(PipelineEvent.TAG_SET).toBe('tag:set');
  });

  it('should define log events', () => {
    expect(PipelineEvent.LOG_OUTPUT).toBe('log:output');
    expect(PipelineEvent.LOG_ERROR).toBe('log:error');
  });
});

describe('Type definitions compile check', () => {
  it('should allow creating valid PipelineConfig object', () => {
    const config = {
      id: 'pipe-1',
      name: 'Test Pipeline',
      stages: [
        {
          id: 'stage-1',
          name: 'Preprocess',
          type: StageType.PREPROCESS,
          module: { type: 'python' as const, entrypoint: 'preprocess.py' },
        },
      ],
      mlflow: {
        trackingUri: 'http://localhost:5000',
        experimentName: 'test',
      },
    };

    expect(config.id).toBe('pipe-1');
    expect(config.stages[0].type).toBe(StageType.PREPROCESS);
  });

  it('should allow creating valid RunContext object', () => {
    const context = {
      runId: 'run-1',
      pipelineId: 'pipe-1',
      experimentId: 'exp-1',
      triggeredBy: 'user',
      timestamp: new Date(),
      config: {
        id: 'pipe-1',
        name: 'Test',
        stages: [],
        mlflow: { trackingUri: 'http://localhost:5000', experimentName: 'test' },
      },
    };

    expect(context.runId).toBe('run-1');
    expect(context.timestamp).toBeInstanceOf(Date);
  });

  it('should allow creating valid ExecutionResult object', () => {
    const result = {
      runId: 'run-1',
      status: 'success' as const,
      stages: [
        {
          stageId: 'stage-1',
          stageName: 'Preprocess',
          status: 'success' as const,
          startTime: new Date(),
          endTime: new Date(),
          duration: 1000,
        },
      ],
      startTime: new Date(),
      endTime: new Date(),
      duration: 5000,
    };

    expect(result.status).toBe('success');
    expect(result.stages).toHaveLength(1);
  });
});
