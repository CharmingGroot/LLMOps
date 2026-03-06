/**
 * Train Stage - Model training execution
 */

import type { StageConfig, RunContext, StageResult, StageType } from '@llmops/core';
import { logInfo } from '@llmops/core';
import { RunManager } from '@llmops/state';
import { BaseStage } from '../base-stage.js';
import { PythonRunner } from '../../process/python-runner.js';

export class TrainStage extends BaseStage {
  readonly type: StageType = 'train' as StageType;
  readonly name = 'Train';

  protected async run(config: StageConfig, context: RunContext): Promise<StageResult> {
    logInfo('Running training', {
      stageId: config.id,
      runId: context.runId,
    });

    const runner = new PythonRunner();
    const result = await runner.run(config.module, context);

    const metrics = this.parseMetrics(result.stdout);
    const artifacts = this.parseArtifacts(result.stdout);

    // Log training metrics to MLflow
    if (Object.keys(metrics).length > 0) {
      const runManager = new RunManager(context.config.mlflow.trackingUri);
      await runManager.logTrainingMetrics(context.runId, metrics, 0);
    }

    logInfo('Training completed', {
      stageId: config.id,
      runId: context.runId,
      metrics,
    });

    return {
      success: true,
      artifacts,
      metrics,
    };
  }

  private parseMetrics(stdout: string): Record<string, number> {
    const metrics: Record<string, number> = {};
    for (const line of stdout.split('\n')) {
      const match = line.match(/^METRIC:(\S+)=(\S+)$/);
      if (match) {
        const value = parseFloat(match[2]);
        if (!isNaN(value)) {
          metrics[match[1]] = value;
        }
      }
    }
    return metrics;
  }

  private parseArtifacts(stdout: string): string[] {
    const artifacts: string[] = [];
    for (const line of stdout.split('\n')) {
      const match = line.match(/^ARTIFACT:(.+)$/);
      if (match) {
        artifacts.push(match[1].trim());
      }
    }
    return artifacts;
  }
}
