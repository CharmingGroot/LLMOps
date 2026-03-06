/**
 * Benchmark Stage - Model evaluation and gating
 */

import type { StageConfig, RunContext, StageResult, StageType } from '@llmops/core';
import { logInfo, logWarn } from '@llmops/core';
import { RunManager } from '@llmops/state';
import { BaseStage } from '../base-stage.js';
import { PythonRunner } from '../../process/python-runner.js';

export class BenchmarkStage extends BaseStage {
  readonly type: StageType = 'benchmark' as StageType;
  readonly name = 'Benchmark';

  protected async run(config: StageConfig, context: RunContext): Promise<StageResult> {
    logInfo('Running benchmark', {
      stageId: config.id,
      runId: context.runId,
    });

    const runner = new PythonRunner();
    const result = await runner.run(config.module, context);

    const metrics = this.parseMetrics(result.stdout);
    const passed = this.evaluateGating(config, metrics);

    // Log benchmark results to MLflow
    const runManager = new RunManager(context.config.mlflow.trackingUri);
    await runManager.logBenchmarkResults(context.runId, metrics, passed);

    if (!passed) {
      logWarn('Benchmark gating failed', {
        stageId: config.id,
        runId: context.runId,
        metrics,
        condition: config.condition,
      });
      throw new Error(
        `Benchmark gating failed: condition not met (${JSON.stringify(config.condition)})`
      );
    }

    logInfo('Benchmark passed', {
      stageId: config.id,
      runId: context.runId,
      metrics,
    });

    return {
      success: true,
      metrics,
    };
  }

  private evaluateGating(
    config: StageConfig,
    metrics: Record<string, number>
  ): boolean {
    const condition = config.condition;
    if (!condition) {
      return true;
    }

    const actualValue = metrics[condition.field];
    if (actualValue === undefined) {
      logWarn(`Gating field '${condition.field}' not found in metrics`);
      return false;
    }

    const expected = Number(condition.value);
    switch (condition.operator) {
      case 'gt':
        return actualValue > expected;
      case 'gte':
        return actualValue >= expected;
      case 'lt':
        return actualValue < expected;
      case 'lte':
        return actualValue <= expected;
      case 'eq':
        return actualValue === expected;
      case 'ne':
        return actualValue !== expected;
      default:
        return false;
    }
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
