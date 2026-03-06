import { describe, it, expect } from 'vitest';
import {
  validatePipelineConfig,
  validateStageConfig,
  validateMLflowConfig,
  validateStageDependencies,
} from '../src/utils/validation.js';
import { ValidationError } from '../src/utils/errors.js';
import type { StageConfig } from '../src/types/pipeline.js';

const VALID_MODULE = {
  type: 'python' as const,
  entrypoint: 'train.py',
};

const VALID_MLFLOW = {
  trackingUri: 'http://localhost:5000',
  experimentName: 'test-exp',
};

const VALID_STAGE: StageConfig = {
  id: 'preprocess',
  name: 'Preprocess',
  type: 'preprocess' as any,
  module: VALID_MODULE,
};

const VALID_PIPELINE = {
  id: 'pipeline-1',
  name: 'Test Pipeline',
  stages: [VALID_STAGE],
  mlflow: VALID_MLFLOW,
};

describe('validatePipelineConfig', () => {
  it('should validate a correct pipeline config', () => {
    const result = validatePipelineConfig(VALID_PIPELINE);

    expect(result.id).toBe('pipeline-1');
    expect(result.name).toBe('Test Pipeline');
    expect(result.stages).toHaveLength(1);
  });

  it('should reject config with empty id', () => {
    expect(() =>
      validatePipelineConfig({ ...VALID_PIPELINE, id: '' })
    ).toThrow(ValidationError);
  });

  it('should reject config with no stages', () => {
    expect(() =>
      validatePipelineConfig({ ...VALID_PIPELINE, stages: [] })
    ).toThrow(ValidationError);
  });

  it('should reject config with invalid mlflow trackingUri', () => {
    expect(() =>
      validatePipelineConfig({
        ...VALID_PIPELINE,
        mlflow: { ...VALID_MLFLOW, trackingUri: 'not-a-url' },
      })
    ).toThrow(ValidationError);
  });

  it('should accept optional fields', () => {
    const result = validatePipelineConfig({
      ...VALID_PIPELINE,
      description: 'A test pipeline',
      metadata: { version: '1.0' },
    });

    expect(result.description).toBe('A test pipeline');
    expect(result.metadata).toEqual({ version: '1.0' });
  });

  it('should reject completely invalid input', () => {
    expect(() => validatePipelineConfig(null)).toThrow();
    expect(() => validatePipelineConfig({})).toThrow(ValidationError);
  });
});

describe('validateStageConfig', () => {
  it('should validate a correct stage config', () => {
    const result = validateStageConfig(VALID_STAGE);

    expect(result.id).toBe('preprocess');
    expect(result.type).toBe('preprocess');
  });

  it('should accept optional retryPolicy', () => {
    const result = validateStageConfig({
      ...VALID_STAGE,
      retryPolicy: { maxRetries: 3, backoff: 'exponential', initialDelay: 1000 },
    });

    expect(result.retryPolicy?.maxRetries).toBe(3);
  });

  it('should reject invalid stage type', () => {
    expect(() =>
      validateStageConfig({ ...VALID_STAGE, type: 'invalid' })
    ).toThrow(ValidationError);
  });

  it('should reject retryPolicy with maxRetries > 10', () => {
    expect(() =>
      validateStageConfig({
        ...VALID_STAGE,
        retryPolicy: { maxRetries: 11, backoff: 'linear', initialDelay: 100 },
      })
    ).toThrow(ValidationError);
  });

  it('should accept optional dependencies', () => {
    const result = validateStageConfig({
      ...VALID_STAGE,
      dependencies: ['other-stage'],
    });

    expect(result.dependencies).toEqual(['other-stage']);
  });

  it('should accept optional condition', () => {
    const result = validateStageConfig({
      ...VALID_STAGE,
      condition: { field: 'accuracy', operator: 'gte', value: 0.9 },
    });

    expect(result.condition?.operator).toBe('gte');
  });
});

describe('validateMLflowConfig', () => {
  it('should validate a correct MLflow config', () => {
    const result = validateMLflowConfig(VALID_MLFLOW);

    expect(result.trackingUri).toBe('http://localhost:5000');
    expect(result.experimentName).toBe('test-exp');
  });

  it('should reject invalid URL', () => {
    expect(() =>
      validateMLflowConfig({ ...VALID_MLFLOW, trackingUri: 'bad' })
    ).toThrow(ValidationError);
  });

  it('should reject empty experimentName', () => {
    expect(() =>
      validateMLflowConfig({ ...VALID_MLFLOW, experimentName: '' })
    ).toThrow(ValidationError);
  });

  it('should accept optional artifactLocation', () => {
    const result = validateMLflowConfig({
      ...VALID_MLFLOW,
      artifactLocation: 's3://bucket/artifacts',
    });

    expect(result.artifactLocation).toBe('s3://bucket/artifacts');
  });
});

describe('validateStageDependencies', () => {
  it('should pass for stages without dependencies', () => {
    const stages: StageConfig[] = [
      { ...VALID_STAGE, id: 'a' },
      { ...VALID_STAGE, id: 'b' },
    ];

    expect(() => validateStageDependencies(stages)).not.toThrow();
  });

  it('should pass for valid linear dependencies', () => {
    const stages: StageConfig[] = [
      { ...VALID_STAGE, id: 'a' },
      { ...VALID_STAGE, id: 'b', dependencies: ['a'] },
      { ...VALID_STAGE, id: 'c', dependencies: ['b'] },
    ];

    expect(() => validateStageDependencies(stages)).not.toThrow();
  });

  it('should detect circular dependencies', () => {
    const stages: StageConfig[] = [
      { ...VALID_STAGE, id: 'a', dependencies: ['c'] },
      { ...VALID_STAGE, id: 'b', dependencies: ['a'] },
      { ...VALID_STAGE, id: 'c', dependencies: ['b'] },
    ];

    expect(() => validateStageDependencies(stages)).toThrow(ValidationError);
    expect(() => validateStageDependencies(stages)).toThrow('Circular dependency');
  });

  it('should detect self-referencing dependency', () => {
    const stages: StageConfig[] = [
      { ...VALID_STAGE, id: 'a', dependencies: ['a'] },
    ];

    expect(() => validateStageDependencies(stages)).toThrow(ValidationError);
  });

  it('should detect non-existent dependency', () => {
    const stages: StageConfig[] = [
      { ...VALID_STAGE, id: 'a', dependencies: ['z'] },
    ];

    expect(() => validateStageDependencies(stages)).toThrow(ValidationError);
    expect(() => validateStageDependencies(stages)).toThrow('non-existent');
  });
});
