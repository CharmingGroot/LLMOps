/**
 * Custom error classes
 */

export class LLMOpsError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'LLMOpsError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class PipelineExecutionError extends LLMOpsError {
  constructor(
    public pipelineId: string,
    message: string,
    details?: any
  ) {
    super(message, 'PIPELINE_EXECUTION_ERROR', { pipelineId, ...details });
    this.name = 'PipelineExecutionError';
  }
}

export class StageExecutionError extends LLMOpsError {
  constructor(
    public stageId: string,
    message: string,
    public exitCode?: number,
    details?: any
  ) {
    super(message, 'STAGE_EXECUTION_ERROR', { stageId, exitCode, ...details });
    this.name = 'StageExecutionError';
  }
}

export class MLflowError extends LLMOpsError {
  constructor(
    message: string,
    public statusCode?: number,
    details?: any
  ) {
    super(message, 'MLFLOW_ERROR', { statusCode, ...details });
    this.name = 'MLflowError';
  }
}

export class ValidationError extends LLMOpsError {
  constructor(
    message: string,
    public validationErrors: any[]
  ) {
    super(message, 'VALIDATION_ERROR', { validationErrors });
    this.name = 'ValidationError';
  }
}

export class ConfigurationError extends LLMOpsError {
  constructor(
    message: string,
    details?: any
  ) {
    super(message, 'CONFIGURATION_ERROR', details);
    this.name = 'ConfigurationError';
  }
}

export class TimeoutError extends LLMOpsError {
  constructor(
    message: string,
    public timeoutMs: number
  ) {
    super(message, 'TIMEOUT_ERROR', { timeoutMs });
    this.name = 'TimeoutError';
  }
}

export function isLLMOpsError(error: any): error is LLMOpsError {
  return error instanceof LLMOpsError;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack;
  }
  return undefined;
}
