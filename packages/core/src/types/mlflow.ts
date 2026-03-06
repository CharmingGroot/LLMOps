/**
 * MLflow REST API type definitions
 */

export interface RunParams {
  experimentId: string;
  startTime: number;
  tags?: Record<string, string>;
  runName?: string;
}

export interface Run {
  info: RunInfo;
  data: RunData;
}

export interface RunInfo {
  runId: string;
  runUuid: string;
  experimentId: string;
  status: RunStatus;
  startTime: number;
  endTime?: number;
  artifactUri: string;
  lifecycleStage: string;
}

export type RunStatus = 'RUNNING' | 'FINISHED' | 'FAILED' | 'KILLED';

export interface RunData {
  metrics: Metric[];
  params: Param[];
  tags: Tag[];
}

export interface Metric {
  key: string;
  value: number;
  timestamp: number;
  step?: number;
}

export interface Param {
  key: string;
  value: string;
}

export interface Tag {
  key: string;
  value: string;
}

export interface Experiment {
  experimentId: string;
  name: string;
  artifactLocation: string;
  lifecycleStage: string;
  lastUpdateTime?: number;
  creationTime?: number;
  tags?: Tag[];
}

export interface ModelInfo {
  name: string;
  version: string;
  stage: ModelStage;
  creationTimestamp: number;
  lastUpdatedTimestamp: number;
  description?: string;
  runId: string;
  source: string;
  status: ModelStatus;
}

export type ModelStage = 'None' | 'Staging' | 'Production' | 'Archived';
export type ModelStatus = 'PENDING_REGISTRATION' | 'READY';

export interface CreateExperimentRequest {
  name: string;
  artifactLocation?: string;
  tags?: Tag[];
}

export interface CreateRunRequest {
  experimentId: string;
  startTime?: number;
  tags?: Tag[];
  runName?: string;
}

export interface LogMetricRequest {
  runId: string;
  key: string;
  value: number;
  timestamp: number;
  step?: number;
}

export interface LogParamRequest {
  runId: string;
  key: string;
  value: string;
}

export interface SetTagRequest {
  runId: string;
  key: string;
  value: string;
}

export interface UpdateRunRequest {
  runId: string;
  status?: RunStatus;
  endTime?: number;
}

export interface SearchRunsRequest {
  experimentIds: string[];
  filter?: string;
  maxResults?: number;
  orderBy?: string[];
}

export interface SearchRunsResponse {
  runs: Run[];
  nextPageToken?: string;
}

export interface ListArtifactsRequest {
  runId: string;
  path?: string;
}

export interface ArtifactInfo {
  path: string;
  isDir: boolean;
  fileSize?: number;
}

export interface ListArtifactsResponse {
  rootUri: string;
  files: ArtifactInfo[];
}
