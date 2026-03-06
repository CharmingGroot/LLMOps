/**
 * Validate Command - Validate pipeline configuration
 */

import { Command } from 'commander';
import { validateStageDependencies, logError } from '@llmops/core';
import { loadConfig } from '../config/loader.js';

export function createValidateCommand(): Command {
  const command = new Command('validate')
    .description('Validate a pipeline configuration file')
    .argument('<config>', 'Path to pipeline config JSON file')
    .action(async (configPath: string) => {
      await validateConfig(configPath);
    });

  return command;
}

async function validateConfig(configPath: string): Promise<void> {
  try {
    const config = await loadConfig(configPath);
    validateStageDependencies(config.stages);

    console.log('Configuration is valid.');
    console.log(`  Pipeline: ${config.name} (${config.id})`);
    console.log(`  Stages:   ${config.stages.length}`);
    console.log(`  MLflow:   ${config.mlflow.trackingUri}`);
    console.log(`  Flow:     ${config.stages.map((s) => s.id).join(' → ')}`);
  } catch (error) {
    logError(error as Error);
    console.error(`\nValidation failed: ${(error as Error).message}`);
    process.exitCode = 1;
  }
}
