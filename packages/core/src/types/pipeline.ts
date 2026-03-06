/**
 * Pipeline and Stage type definitions
 */

export enum StageType {
  PREPROCESS = 'preprocess',
  TRAIN = 'train',
  BENCHMARK = 'benchmark',
  DEPLOY = 'deploy',
}

export interface PipelineConfig {
  id: string;
  name: string;
  description?: string;
  stages: StageConfig[];
  mlflow: MLflowConfig;
  metadata?: Record<string, any>;
}

export interface StageConfig {
  id: string;
  name: string;
  type: StageType;
  module: ModuleConfig;
  dependencies?: string[];
  retryPolicy?: RetryPolicy;
  timeout?: number;
  condition?: StageCondition;
}

export interface ModuleConfig {
  type: 'python' | 'node' | 'external';
  entrypoint: string;
  args?: string[];
  env?: Record<string, string>;
  workingDir?: string;
}

export interface StageCondition {
  field: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
  value: number | string;
}

export interface RetryPolicy {
  maxRetries: number;
  backoff: 'linear' | 'exponential';
  initialDelay: number;
}

export interface MLflowConfig {
  trackingUri: string;
  experimentName: string;
  artifactLocation?: string;
}

/**
 * Run Context - shared across all stages
 */
export interface RunContext {
  runId: string;
  pipelineId: string;
  experimentId: string;
  triggeredBy: string;
  timestamp: Date;
  config: PipelineConfig;
}

/**
 * Stage execution result
 */
export interface StageResult {
  success: boolean;
  data?: any;
  error?: Error;
  artifacts?: string[];
  metrics?: Record<string, number>;
}

/**
 * Pipeline execution result
 */
export interface ExecutionResult {
  runId: string;
  status: 'success' | 'failed';
  stages: StageExecutionInfo[];
  startTime: Date;
  endTime: Date;
  duration: number;
  error?: Error;
}

export interface StageExecutionInfo {
  stageId: string;
  stageName: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  error?: Error;
}

/**
 * Execution options
 */
export interface ExecutionOptions {
  triggeredBy?: string;
  skipStages?: string[];
  dryRun?: boolean;
}
