/**
 * Configuration Loader - Load and parse pipeline config files
 */

import { readFile } from 'fs/promises';
import { resolve } from 'path';
import type { PipelineConfig } from '@llmops/core';
import { validatePipelineConfig, ConfigurationError } from '@llmops/core';

export async function loadConfig(configPath: string): Promise<PipelineConfig> {
  const absolutePath = resolve(configPath);

  let rawContent: string;
  try {
    rawContent = await readFile(absolutePath, 'utf-8');
  } catch (error) {
    throw new ConfigurationError(`Failed to read config file: ${absolutePath}`, {
      path: absolutePath,
      error: (error as Error).message,
    });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch (error) {
    throw new ConfigurationError(`Failed to parse config file as JSON: ${absolutePath}`, {
      path: absolutePath,
      error: (error as Error).message,
    });
  }

  return validatePipelineConfig(parsed);
}
