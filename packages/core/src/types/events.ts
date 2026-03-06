/**
 * Event system type definitions
 */

export enum PipelineEvent {
  // Pipeline events
  PIPELINE_STARTED = 'pipeline:started',
  PIPELINE_COMPLETED = 'pipeline:completed',
  PIPELINE_FAILED = 'pipeline:failed',

  // Stage events
  STAGE_STARTED = 'stage:started',
  STAGE_COMPLETED = 'stage:completed',
  STAGE_FAILED = 'stage:failed',
  STAGE_SKIPPED = 'stage:skipped',

  // MLflow events
  METRIC_LOGGED = 'metric:logged',
  PARAM_LOGGED = 'param:logged',
  ARTIFACT_UPLOADED = 'artifact:uploaded',
  TAG_SET = 'tag:set',

  // Log events
  LOG_OUTPUT = 'log:output',
  LOG_ERROR = 'log:error',
}

export interface EventData {
  runId: string;
  timestamp: Date;
  [key: string]: any;
}

export interface PipelineStartedEvent extends EventData {
  pipelineId: string;
  triggeredBy: string;
  experimentId: string;
}

export interface PipelineCompletedEvent extends EventData {
  pipelineId: string;
  status: 'success' | 'failed';
  duration: number;
  error?: Error;
}

export interface StageStartedEvent extends EventData {
  stageId: string;
  stageName: string;
  stageType: string;
}

export interface StageCompletedEvent extends EventData {
  stageId: string;
  stageName: string;
  status: 'success' | 'failed';
  duration: number;
  error?: Error;
}

export interface MetricLoggedEvent extends EventData {
  key: string;
  value: number;
  step?: number;
}

export interface ParamLoggedEvent extends EventData {
  key: string;
  value: string;
}

export interface ArtifactUploadedEvent extends EventData {
  artifactPath: string;
  localPath: string;
}

export interface TagSetEvent extends EventData {
  key: string;
  value: string;
}

export interface LogOutputEvent extends EventData {
  stageId: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source: 'stdout' | 'stderr';
}

export type EventHandler<T extends EventData = EventData> = (data: T) => void | Promise<void>;

export interface EventBus {
  on<T extends EventData>(event: PipelineEvent, handler: EventHandler<T>): void;
  off<T extends EventData>(event: PipelineEvent, handler: EventHandler<T>): void;
  emit<T extends EventData>(event: PipelineEvent, data: T): void;
  once<T extends EventData>(event: PipelineEvent, handler: EventHandler<T>): void;
}
