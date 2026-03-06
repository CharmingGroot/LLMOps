/**
 * Pipeline Engine - Orchestrates stage execution
 */

import type {
  PipelineConfig,
  RunContext,
  ExecutionResult,
  ExecutionOptions,
  StageExecutionInfo,
} from '@llmops/core';
import {
  validatePipelineConfig,
  validateStageDependencies,
  PipelineExecutionError,
  logInfo,
  logError,
} from '@llmops/core';
import { RunManager } from '@llmops/state';
import { StageRegistry } from '../registry/stage-registry.js';
import { EventBus } from '../events/event-bus.js';

export class PipelineEngine {
  private registry: StageRegistry;
  private eventBus: EventBus;

  constructor(registry?: StageRegistry) {
    this.registry = registry || new StageRegistry();
    this.eventBus = new EventBus();
  }

  /**
   * Execute a pipeline
   */
  async execute(
    config: PipelineConfig,
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    const startTime = new Date();

    // Validate configuration
    logInfo('Validating pipeline configuration', { pipelineId: config.id });
    const validatedConfig = validatePipelineConfig(config);
    validateStageDependencies(validatedConfig.stages);

    // Initialize run manager
    const runManager = new RunManager(config.mlflow.trackingUri);

    let runId: string;
    try {
      // Start pipeline run
      runId = await runManager.startPipeline(
        validatedConfig,
        options.triggeredBy || 'unknown'
      );

      logInfo('Pipeline execution started', {
        pipelineId: config.id,
        runId,
      });

      // Build run context
      const context = await this.buildContext(runId, validatedConfig);

      // Emit pipeline started event
      // this.eventBus.emit(PipelineEvent.PIPELINE_STARTED, {
      //   runId,
      //   pipelineId: config.id,
      //   triggeredBy: options.triggeredBy || 'unknown',
      //   experimentId: context.experimentId,
      //   timestamp: new Date(),
      // });

      // Execute stages
      const stageResults: StageExecutionInfo[] = [];

      for (const stageConfig of validatedConfig.stages) {
        // Check if stage should be skipped
        if (options.skipStages?.includes(stageConfig.id)) {
          logInfo(`Skipping stage: ${stageConfig.id}`);
          stageResults.push({
            stageId: stageConfig.id,
            stageName: stageConfig.name,
            status: 'skipped',
          });
          continue;
        }

        // Execute stage
        const stageResult = await this.executeStage(stageConfig, context);
        stageResults.push(stageResult);

        // Stop if stage failed
        if (stageResult.status === 'failed') {
          throw new PipelineExecutionError(
            config.id,
            `Stage ${stageConfig.id} failed`,
            { stageId: stageConfig.id, error: stageResult.error }
          );
        }
      }

      // End pipeline successfully
      await runManager.endPipeline(runId, 'success');

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // Emit pipeline completed event
      // this.eventBus.emit(PipelineEvent.PIPELINE_COMPLETED, {
      //   runId,
      //   pipelineId: config.id,
      //   status: 'success',
      //   duration,
      //   timestamp: new Date(),
      // });

      logInfo('Pipeline execution completed successfully', {
        pipelineId: config.id,
        runId,
        duration,
      });

      return {
        runId,
        status: 'success',
        stages: stageResults,
        startTime,
        endTime,
        duration,
      };
    } catch (error) {
      const err = error as Error;
      logError(err, { pipelineId: config.id });

      // End pipeline with failure
      if (runId!) {
        await runManager.endPipeline(runId, 'failed', err);
      }

      // Emit pipeline failed event
      // this.eventBus.emit(PipelineEvent.PIPELINE_FAILED, {
      //   runId: runId!,
      //   pipelineId: config.id,
      //   status: 'failed',
      //   duration: Date.now() - startTime.getTime(),
      //   error: err,
      //   timestamp: new Date(),
      // });

      throw error;
    }
  }

  /**
   * Execute a single stage
   */
  private async executeStage(
    config: any,
    context: RunContext
  ): Promise<StageExecutionInfo> {
    const startTime = new Date();

    try {
      // Load stage from registry
      const stage = this.registry.loadStage(config.type);

      // Execute stage
      await stage.execute(config, context);

      const endTime = new Date();
      return {
        stageId: config.id,
        stageName: config.name,
        status: 'success',
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
      };
    } catch (error) {
      const endTime = new Date();
      return {
        stageId: config.id,
        stageName: config.name,
        status: 'failed',
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        error: error as Error,
      };
    }
  }

  /**
   * Build run context
   */
  private async buildContext(runId: string, config: PipelineConfig): Promise<RunContext> {
    // Get experiment ID from MLflow
    const runManager = new RunManager(config.mlflow.trackingUri);
    const experimentId = await runManager
      .getClient()
      .getOrCreateExperiment(config.mlflow.experimentName);

    return {
      runId,
      pipelineId: config.id,
      experimentId,
      triggeredBy: 'unknown',
      timestamp: new Date(),
      config,
    };
  }

  /**
   * Get stage registry
   */
  getRegistry(): StageRegistry {
    return this.registry;
  }

  /**
   * Get event bus
   */
  getEventBus(): EventBus {
    return this.eventBus;
  }
}
