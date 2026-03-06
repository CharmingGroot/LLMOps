/**
 * Base Stage - Abstract class for all stages
 */

import type { StageConfig, RunContext, StageResult, StageType } from '@llmops/core';
import { logInfo, logError } from '@llmops/core';
import { RunManager } from '@llmops/state';

export interface IStage {
  readonly type: StageType;
  readonly name: string;
  execute(config: StageConfig, context: RunContext): Promise<StageResult>;
}

export abstract class BaseStage implements IStage {
  abstract readonly type: StageType;
  abstract readonly name: string;

  /**
   * Execute the stage with common lifecycle management
   */
  async execute(config: StageConfig, context: RunContext): Promise<StageResult> {
    const startTime = Date.now();

    logInfo(`Starting stage: ${this.name}`, {
      stageId: config.id,
      stageName: this.name,
      runId: context.runId,
    });

    // Update stage status to running
    const runManager = new RunManager(context.config.mlflow.trackingUri);
    await runManager.updateStage(context.runId, config.id, 'running');

    // Emit event
    // context.events?.emit(PipelineEvent.STAGE_STARTED, {
    //   runId: context.runId,
    //   stageId: config.id,
    //   stageName: this.name,
    //   stageType: this.type,
    //   timestamp: new Date(),
    // });

    try {
      // Run stage-specific logic
      const result = await this.run(config, context);

      const duration = Date.now() - startTime;

      // Update stage status to success
      await runManager.updateStage(context.runId, config.id, 'success');

      // Emit event
      // context.events?.emit(PipelineEvent.STAGE_COMPLETED, {
      //   runId: context.runId,
      //   stageId: config.id,
      //   stageName: this.name,
      //   status: 'success',
      //   duration,
      //   timestamp: new Date(),
      // });

      logInfo(`Stage completed: ${this.name}`, {
        stageId: config.id,
        runId: context.runId,
        duration,
      });

      return result;
    } catch (error) {
      const err = error as Error;

      // Update stage status to failed
      await runManager.updateStage(context.runId, config.id, 'failed');

      // Emit event
      // context.events?.emit(PipelineEvent.STAGE_FAILED, {
      //   runId: context.runId,
      //   stageId: config.id,
      //   stageName: this.name,
      //   status: 'failed',
      //   duration,
      //   error: err,
      //   timestamp: new Date(),
      // });

      logError(err, {
        stageId: config.id,
        stageName: this.name,
        runId: context.runId,
      });

      throw error;
    }
  }

  /**
   * Stage-specific implementation
   */
  protected abstract run(config: StageConfig, context: RunContext): Promise<StageResult>;

  /**
   * Check if stage condition is met
   */
  protected async checkCondition(config: StageConfig, _context: RunContext): Promise<boolean> {
    if (!config.condition) {
      return true;
    }

    // TODO: Implement condition checking
    // For now, always return true
    return true;
  }
}
