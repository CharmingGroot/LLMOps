/**
 * Deploy Stage - Model deployment execution
 */

import type { StageConfig, RunContext, StageResult, StageType } from '@llmops/core';
import { logInfo } from '@llmops/core';
import { BaseStage } from '../base-stage.js';
import { PythonRunner } from '../../process/python-runner.js';

export class DeployStage extends BaseStage {
  readonly type: StageType = 'deploy' as StageType;
  readonly name = 'Deploy';

  protected async run(config: StageConfig, context: RunContext): Promise<StageResult> {
    logInfo('Running deployment', {
      stageId: config.id,
      runId: context.runId,
    });

    const runner = new PythonRunner();
    const result = await runner.run(config.module, context);

    const deploymentInfo = this.parseDeploymentInfo(result.stdout);

    logInfo('Deployment completed', {
      stageId: config.id,
      runId: context.runId,
      ...deploymentInfo,
    });

    return {
      success: true,
      data: deploymentInfo,
    };
  }

  private parseDeploymentInfo(stdout: string): Record<string, string> {
    const info: Record<string, string> = {};
    for (const line of stdout.split('\n')) {
      const match = line.match(/^DEPLOY:(\S+)=(.+)$/);
      if (match) {
        info[match[1]] = match[2].trim();
      }
    }
    return info;
  }
}
