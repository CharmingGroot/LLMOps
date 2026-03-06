import { describe, it, expect } from 'vitest';
import {
  LLMOpsError,
  PipelineExecutionError,
  StageExecutionError,
  MLflowError,
  ValidationError,
  ConfigurationError,
  TimeoutError,
  isLLMOpsError,
  getErrorMessage,
  getErrorStack,
} from '../src/utils/errors.js';

describe('LLMOpsError', () => {
  it('should create error with message, code, and details', () => {
    const error = new LLMOpsError('test error', 'TEST_CODE', { key: 'value' });

    expect(error.message).toBe('test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.details).toEqual({ key: 'value' });
    expect(error.name).toBe('LLMOpsError');
    expect(error).toBeInstanceOf(Error);
    expect(error.stack).toBeDefined();
  });
});

describe('PipelineExecutionError', () => {
  it('should include pipelineId in details', () => {
    const error = new PipelineExecutionError('pipe-1', 'Pipeline failed');

    expect(error.pipelineId).toBe('pipe-1');
    expect(error.code).toBe('PIPELINE_EXECUTION_ERROR');
    expect(error.name).toBe('PipelineExecutionError');
    expect(error.details).toEqual({ pipelineId: 'pipe-1' });
    expect(error).toBeInstanceOf(LLMOpsError);
  });
});

describe('StageExecutionError', () => {
  it('should include stageId and exitCode', () => {
    const error = new StageExecutionError('stage-1', 'Stage failed', 1);

    expect(error.stageId).toBe('stage-1');
    expect(error.exitCode).toBe(1);
    expect(error.code).toBe('STAGE_EXECUTION_ERROR');
    expect(error.name).toBe('StageExecutionError');
    expect(error).toBeInstanceOf(LLMOpsError);
  });

  it('should work without exitCode', () => {
    const error = new StageExecutionError('stage-2', 'Stage timeout');

    expect(error.exitCode).toBeUndefined();
  });
});

describe('MLflowError', () => {
  it('should include statusCode', () => {
    const error = new MLflowError('API failed', 500);

    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('MLFLOW_ERROR');
    expect(error.name).toBe('MLflowError');
  });
});

describe('ValidationError', () => {
  it('should include validationErrors array', () => {
    const validationErrors = [{ path: 'name', message: 'required' }];
    const error = new ValidationError('Validation failed', validationErrors);

    expect(error.validationErrors).toEqual(validationErrors);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.name).toBe('ValidationError');
  });
});

describe('ConfigurationError', () => {
  it('should create with message and details', () => {
    const error = new ConfigurationError('Bad config', { field: 'x' });

    expect(error.code).toBe('CONFIGURATION_ERROR');
    expect(error.name).toBe('ConfigurationError');
    expect(error.details).toEqual({ field: 'x' });
  });
});

describe('TimeoutError', () => {
  it('should include timeoutMs', () => {
    const error = new TimeoutError('Timed out', 30000);

    expect(error.timeoutMs).toBe(30000);
    expect(error.code).toBe('TIMEOUT_ERROR');
    expect(error.name).toBe('TimeoutError');
  });
});

describe('isLLMOpsError', () => {
  it('should return true for LLMOpsError instances', () => {
    expect(isLLMOpsError(new LLMOpsError('test', 'CODE'))).toBe(true);
    expect(isLLMOpsError(new PipelineExecutionError('p1', 'fail'))).toBe(true);
    expect(isLLMOpsError(new MLflowError('fail', 500))).toBe(true);
  });

  it('should return false for non-LLMOpsError', () => {
    expect(isLLMOpsError(new Error('generic'))).toBe(false);
    expect(isLLMOpsError('string error')).toBe(false);
    expect(isLLMOpsError(null)).toBe(false);
  });
});

describe('getErrorMessage', () => {
  it('should extract message from Error', () => {
    expect(getErrorMessage(new Error('hello'))).toBe('hello');
  });

  it('should stringify non-Error values', () => {
    expect(getErrorMessage('string error')).toBe('string error');
    expect(getErrorMessage(42)).toBe('42');
  });
});

describe('getErrorStack', () => {
  it('should extract stack from Error', () => {
    const error = new Error('test');
    expect(getErrorStack(error)).toBeDefined();
    expect(getErrorStack(error)).toContain('test');
  });

  it('should return undefined for non-Error', () => {
    expect(getErrorStack('not error')).toBeUndefined();
  });
});
