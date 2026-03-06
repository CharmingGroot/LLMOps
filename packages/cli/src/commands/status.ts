/**
 * Status Command - Query pipeline run status
 */

import { Command } from 'commander';
import { MLflowClient } from '@llmops/state';
import { logError } from '@llmops/core';

export function createStatusCommand(): Command {
  const command = new Command('status')
    .description('Get status of a pipeline run')
    .argument('<run-id>', 'MLflow run ID')
    .option('--tracking-uri <uri>', 'MLflow tracking URI', 'http://localhost:5000')
    .action(async (runId: string, options: StatusOptions) => {
      await queryStatus(runId, options);
    });

  return command;
}

interface StatusOptions {
  trackingUri: string;
}

async function queryStatus(runId: string, options: StatusOptions): Promise<void> {
  try {
    const client = new MLflowClient(options.trackingUri);
    const run = await client.getRun(runId);

    console.log(`Run ID:     ${run.info.runId}`);
    console.log(`Status:     ${run.info.status}`);
    console.log(`Start Time: ${new Date(run.info.startTime).toISOString()}`);

    if (run.info.endTime) {
      console.log(`End Time:   ${new Date(run.info.endTime).toISOString()}`);
    }

    if (run.data.params.length > 0) {
      console.log('\nParameters:');
      for (const param of run.data.params) {
        console.log(`  ${param.key} = ${param.value}`);
      }
    }

    if (run.data.metrics.length > 0) {
      console.log('\nMetrics:');
      for (const metric of run.data.metrics) {
        console.log(`  ${metric.key} = ${metric.value}`);
      }
    }

    const stageTags = run.data.tags
      .filter((t) => t.key.startsWith('stage.'))
      .sort((a, b) => a.key.localeCompare(b.key));

    if (stageTags.length > 0) {
      console.log('\nStages:');
      for (const tag of stageTags) {
        console.log(`  ${tag.key} = ${tag.value}`);
      }
    }
  } catch (error) {
    logError(error as Error);
    console.error(`\nFailed to get run status: ${(error as Error).message}`);
    process.exitCode = 1;
  }
}
