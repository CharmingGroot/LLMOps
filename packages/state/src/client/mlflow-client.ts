/**
 * MLflow REST API Client
 */

import axios, { type AxiosInstance } from 'axios';
import type {
  Run,
  CreateRunRequest,
  LogMetricRequest,
  LogParamRequest,
  SetTagRequest,
  UpdateRunRequest,
  SearchRunsRequest,
  SearchRunsResponse,
  ListArtifactsRequest,
  ListArtifactsResponse,
  CreateExperimentRequest,
  RegisteredModel,
  ModelVersion,
} from '@llmops/core';
import { MLflowError, logError, logDebug } from '@llmops/core';

export class MLflowClient {
  private readonly client: AxiosInstance;

  constructor(trackingUri: string) {
    this.client = axios.create({
      baseURL: `${trackingUri}/api/2.0/mlflow`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        const message = error.response?.data?.message || error.message;
        const statusCode = error.response?.status;
        logError(new Error(`MLflow API error: ${message}`), {
          statusCode,
          url: error.config?.url,
        });
        throw new MLflowError(message, statusCode);
      }
    );
  }

  /**
   * Get or create an experiment by name
   */
  async getOrCreateExperiment(name: string, artifactLocation?: string): Promise<string> {
    try {
      // Try to get experiment by name
      const response = await this.client.get('/experiments/get-by-name', {
        params: { experiment_name: name },
      });
      return response.data.experiment.experiment_id;
    } catch (error) {
      // If not found, create it
      logDebug(`Experiment ${name} not found, creating...`);
      const createRequest: CreateExperimentRequest = {
        name,
        artifactLocation,
      };
      const response = await this.client.post('/experiments/create', createRequest);
      return response.data.experiment_id;
    }
  }

  /**
   * Create a new run
   */
  async createRun(request: CreateRunRequest): Promise<string> {
    logDebug('Creating MLflow run', { experimentId: request.experimentId });
    const response = await this.client.post('/runs/create', {
      experiment_id: request.experimentId,
      start_time: request.startTime || Date.now(),
      tags: request.tags,
      run_name: request.runName,
    });
    const runId = response.data.run.info.run_id;
    logDebug('MLflow run created', { runId });
    return runId;
  }

  /**
   * Get a run by ID
   */
  async getRun(runId: string): Promise<Run> {
    const response = await this.client.get('/runs/get', {
      params: { run_id: runId },
    });
    return response.data.run;
  }

  /**
   * Log a parameter
   */
  async logParam(runId: string, key: string, value: string): Promise<void> {
    const request: LogParamRequest = { runId, key, value };
    await this.client.post('/runs/log-parameter', {
      run_id: request.runId,
      key: request.key,
      value: String(request.value),
    });
    logDebug('Parameter logged', { runId, key, value });
  }

  /**
   * Log multiple parameters
   */
  async logParams(runId: string, params: Record<string, any>): Promise<void> {
    const promises = Object.entries(params).map(([key, value]) =>
      this.logParam(runId, key, String(value))
    );
    await Promise.all(promises);
  }

  /**
   * Log a metric
   */
  async logMetric(
    runId: string,
    key: string,
    value: number,
    timestamp?: number,
    step?: number
  ): Promise<void> {
    const request: LogMetricRequest = {
      runId,
      key,
      value,
      timestamp: timestamp || Date.now(),
      step,
    };
    await this.client.post('/runs/log-metric', {
      run_id: request.runId,
      key: request.key,
      value: request.value,
      timestamp: request.timestamp,
      step: request.step,
    });
    logDebug('Metric logged', { runId, key, value, step });
  }

  /**
   * Log multiple metrics
   */
  async logMetrics(
    runId: string,
    metrics: Record<string, number>,
    timestamp?: number,
    step?: number
  ): Promise<void> {
    const promises = Object.entries(metrics).map(([key, value]) =>
      this.logMetric(runId, key, value, timestamp, step)
    );
    await Promise.all(promises);
  }

  /**
   * Set a tag
   */
  async setTag(runId: string, key: string, value: string): Promise<void> {
    const request: SetTagRequest = { runId, key, value };
    await this.client.post('/runs/set-tag', {
      run_id: request.runId,
      key: request.key,
      value: request.value,
    });
    logDebug('Tag set', { runId, key, value });
  }

  /**
   * Set multiple tags
   */
  async setTags(runId: string, tags: Record<string, string>): Promise<void> {
    const promises = Object.entries(tags).map(([key, value]) =>
      this.setTag(runId, key, value)
    );
    await Promise.all(promises);
  }

  /**
   * Update run status
   */
  async updateRun(runId: string, status: 'FINISHED' | 'FAILED' | 'KILLED'): Promise<void> {
    const request: UpdateRunRequest = {
      runId,
      status,
      endTime: Date.now(),
    };
    await this.client.post('/runs/update', {
      run_id: request.runId,
      status: request.status,
      end_time: request.endTime,
    });
    logDebug('Run updated', { runId, status });
  }

  /**
   * Search runs
   */
  async searchRuns(request: SearchRunsRequest): Promise<Run[]> {
    const response = await this.client.post<SearchRunsResponse>('/runs/search', {
      experiment_ids: request.experimentIds,
      filter: request.filter,
      max_results: request.maxResults || 100,
      order_by: request.orderBy,
    });
    return response.data.runs;
  }

  /**
   * Log artifact (file upload)
   */
  async logArtifact(runId: string, localPath: string, artifactPath?: string): Promise<void> {
    // Note: MLflow requires file upload via the artifact API
    // This is a simplified version - real implementation would use FormData
    logDebug('Artifact upload requested', { runId, localPath, artifactPath });
    // TODO: Implement actual file upload
    // For now, just set a tag indicating artifact location
    await this.setTag(runId, `artifact:${artifactPath || 'default'}`, localPath);
  }

  // ==================== Model Registry ====================

  /**
   * Create a registered model
   */
  async createRegisteredModel(name: string, description?: string): Promise<RegisteredModel> {
    const response = await this.client.post('/registered-models/create', {
      name,
      description,
    });
    return response.data.registered_model;
  }

  /**
   * Get a registered model by name
   */
  async getRegisteredModel(name: string): Promise<RegisteredModel> {
    const response = await this.client.get('/registered-models/get', {
      params: { name },
    });
    return response.data.registered_model;
  }

  /**
   * List all registered models
   */
  async listRegisteredModels(maxResults: number = 100): Promise<RegisteredModel[]> {
    const response = await this.client.get('/registered-models/list', {
      params: { max_results: maxResults },
    });
    return response.data.registered_models || [];
  }

  /**
   * Create a model version
   */
  async createModelVersion(
    name: string,
    source: string,
    runId?: string,
    description?: string
  ): Promise<ModelVersion> {
    const response = await this.client.post('/model-versions/create', {
      name,
      source,
      run_id: runId,
      description,
    });
    return response.data.model_version;
  }

  /**
   * Get model version details
   */
  async getModelVersion(name: string, version: string): Promise<ModelVersion> {
    const response = await this.client.get('/model-versions/get', {
      params: { name, version },
    });
    return response.data.model_version;
  }

  /**
   * List versions for a model
   */
  async getLatestVersions(name: string, stages?: string[]): Promise<ModelVersion[]> {
    const response = await this.client.post('/registered-models/get-latest-versions', {
      name,
      stages,
    });
    return response.data.model_versions || [];
  }

  /**
   * Transition model version stage
   */
  async transitionModelStage(
    name: string,
    version: string,
    stage: 'Staging' | 'Production' | 'Archived' | 'None'
  ): Promise<ModelVersion> {
    const response = await this.client.post('/model-versions/transition-stage', {
      name,
      version,
      stage,
      archive_existing_versions: stage === 'Production',
    });
    return response.data.model_version;
  }

  /**
   * List artifacts
   */
  async listArtifacts(runId: string, path?: string): Promise<ListArtifactsResponse> {
    const request: ListArtifactsRequest = { runId, path };
    const response = await this.client.get<ListArtifactsResponse>('/artifacts/list', {
      params: {
        run_id: request.runId,
        path: request.path,
      },
    });
    return response.data;
  }
}
