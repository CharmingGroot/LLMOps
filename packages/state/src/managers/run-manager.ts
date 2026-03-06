/**
 * Run Manager - Manages pipeline execution lifecycle
 */

import type { PipelineConfig, StageType } from '@llmops/core';
import { logInfo, logError, logDebug } from '@llmops/core';
import { MLflowClient } from '../client/mlflow-client.js';

export class RunManager {
  private client: MLflowClient;

  constructor(trackingUri: string) {
    this.client = new MLflowClient(trackingUri);
  }

  /**
   * Start a new pipeline run
   */
  async startPipeline(
    config: PipelineConfig,
    triggeredBy: string = 'unknown'
  ): Promise<string> {
    logInfo('Starting pipeline', {
      pipelineId: config.id,
      pipelineName: config.name,
      triggeredBy,
    });

    // Get or create experiment
    const experimentId = await this.client.getOrCreateExperiment(
      config.mlflow.experimentName,
      config.mlflow.artifactLocation
    );

    // Create run
    const runId = await this.client.createRun({
      experimentId,
      startTime: Date.now(),
      tags: {
        'pipeline.id': config.id,
        'pipeline.name': config.name,
        'pipeline.triggered_by': triggeredBy,
        'mlflow.runName': `${config.name}_${new Date().toISOString()}`,
      },
      runName: `${config.name}_${new Date().toISOString()}`,
    });

    // Log pipeline parameters
    await this.client.logParams(runId, {
      pipeline_id: config.id,
      pipeline_name: config.name,
      triggered_by: triggeredBy,
      num_stages: config.stages.length,
      stage_order: config.stages.map((s) => s.id).join(','),
    });

    // Set initial tags
    await this.client.setTags(runId, {
      status: 'running',
      current_stage: config.stages[0]?.id || 'none',
    });

    logInfo('Pipeline started', { runId, experimentId });
    return runId;
  }

  /**
   * Update current stage
   */
  async updateStage(
    runId: string,
    stageId: string,
    status: 'running' | 'success' | 'failed' | 'skipped'
  ): Promise<void> {
    logDebug('Updating stage', { runId, stageId, status });

    await this.client.setTags(runId, {
      current_stage: stageId,
      [`stage.${stageId}.status`]: status,
      [`stage.${stageId}.timestamp`]: new Date().toISOString(),
    });

    if (status === 'running') {
      await this.client.setTag(runId, `stage.${stageId}.start_time`, Date.now().toString());
    } else {
      await this.client.setTag(runId, `stage.${stageId}.end_time`, Date.now().toString());
    }
  }

  /**
   * Log training metrics (time-series)
   */
  async logTrainingMetrics(
    runId: string,
    metrics: Record<string, number>,
    step: number
  ): Promise<void> {
    await this.client.logMetrics(runId, metrics, Date.now(), step);
  }

  /**
   * Log benchmark results
   */
  async logBenchmarkResults(
    runId: string,
    results: Record<string, number>,
    passed: boolean
  ): Promise<void> {
    await this.client.logMetrics(runId, results);
    await this.client.setTag(runId, 'benchmark_pass', passed ? '1' : '0');
    await this.client.logMetric(runId, 'benchmark_pass', passed ? 1 : 0);
  }

  /**
   * End pipeline run
   */
  async endPipeline(
    runId: string,
    status: 'success' | 'failed',
    error?: Error
  ): Promise<void> {
    logInfo('Ending pipeline', { runId, status });

    // Set final status
    await this.client.setTag(runId, 'status', status);

    // Log error if failed
    if (error) {
      await this.client.setTags(runId, {
        'error.message': error.message,
        'error.name': error.name,
      });
      if (error.stack) {
        await this.client.setTag(runId, 'error.stack', error.stack.substring(0, 5000));
      }
    }

    // Update run status
    const mlflowStatus = status === 'success' ? 'FINISHED' : 'FAILED';
    await this.client.updateRun(runId, mlflowStatus);

    logInfo('Pipeline ended', { runId, status });
  }

  /**
   * Get MLflow client
   */
  getClient(): MLflowClient {
    return this.client;
  }
}
