/**
 * Run Command - Execute a pipeline
 */

import { Command } from 'commander';
import { StageType, logInfo, logError } from '@llmops/core';
import {
  PipelineEngine,
  StageRegistry,
  PreprocessStage,
  TrainStage,
  BenchmarkStage,
  DeployStage,
} from '@llmops/orchestrator';
import { loadConfig } from '../config/loader.js';
import { formatResult } from '../formatters/result-formatter.js';

export function createRunCommand(): Command {
  const command = new Command('run')
    .description('Execute a pipeline from config file')
    .argument('<config>', 'Path to pipeline config JSON file')
    .option('--triggered-by <user>', 'User or system that triggered the run', 'cli')
    .option('--skip <stages...>', 'Stage IDs to skip')
    .option('--dry-run', 'Validate config without executing', false)
    .action(async (configPath: string, options: RunOptions) => {
      await executeRun(configPath, options);
    });

  return command;
}

interface RunOptions {
  triggeredBy: string;
  skip?: string[];
  dryRun: boolean;
}

async function executeRun(configPath: string, options: RunOptions): Promise<void> {
  try {
    // Load config
    logInfo('Loading pipeline configuration', { configPath });
    const config = await loadConfig(configPath);

    if (options.dryRun) {
      console.log('[DRY RUN] Configuration is valid.');
      console.log(`Pipeline: ${config.name} (${config.id})`);
      console.log(`Stages: ${config.stages.map((s) => s.id).join(' → ')}`);
      return;
    }

    // Build registry with default stages
    const registry = createDefaultRegistry();
    const engine = new PipelineEngine(registry);

    // Execute
    logInfo('Executing pipeline', {
      pipelineId: config.id,
      triggeredBy: options.triggeredBy,
    });

    const result = await engine.execute(config, {
      triggeredBy: options.triggeredBy,
      skipStages: options.skip,
    });

    console.log(formatResult(result));
  } catch (error) {
    logError(error as Error);
    console.error(`\nPipeline execution failed: ${(error as Error).message}`);
    process.exitCode = 1;
  }
}

function createDefaultRegistry(): StageRegistry {
  const registry = new StageRegistry();
  registry.register(StageType.PREPROCESS, PreprocessStage as any);
  registry.register(StageType.TRAIN, TrainStage as any);
  registry.register(StageType.BENCHMARK, BenchmarkStage as any);
  registry.register(StageType.DEPLOY, DeployStage as any);
  return registry;
}
