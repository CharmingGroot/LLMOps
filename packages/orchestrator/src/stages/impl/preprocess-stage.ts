/**
 * Preprocess Stage - Data preprocessing execution
 */

import type { StageConfig, RunContext, StageResult, StageType } from '@llmops/core';
import { logInfo } from '@llmops/core';
import { BaseStage } from '../base-stage.js';
import { PythonRunner } from '../../process/python-runner.js';

export class PreprocessStage extends BaseStage {
  readonly type: StageType = 'preprocess' as StageType;
  readonly name = 'Preprocess';

  protected async run(config: StageConfig, context: RunContext): Promise<StageResult> {
    logInfo('Running preprocessing', {
      stageId: config.id,
      runId: context.runId,
    });

    const runner = new PythonRunner();
    const result = await runner.run(config.module, context);

    const artifacts = this.parseArtifacts(result.stdout);
    const metrics = this.parseMetrics(result.stdout);

    logInfo('Preprocessing completed', {
      stageId: config.id,
      runId: context.runId,
      artifacts: artifacts.length,
    });

    return {
      success: true,
      artifacts,
      metrics,
    };
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
}
