/**
 * Configuration validation with zod
 */

import { z } from 'zod';
import type { PipelineConfig, StageConfig, MLflowConfig } from '../types/pipeline.js';
import { ValidationError } from './errors.js';

// MLflow Config Schema
const mlflowConfigSchema = z.object({
  trackingUri: z.string().url(),
  experimentName: z.string().min(1),
  artifactLocation: z.string().optional(),
});

// Module Config Schema
const moduleConfigSchema = z.object({
  type: z.enum(['python', 'node', 'external']),
  entrypoint: z.string().min(1),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  workingDir: z.string().optional(),
});

// Stage Condition Schema
const stageConditionSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(['gt', 'gte', 'lt', 'lte', 'eq', 'ne']),
  value: z.union([z.number(), z.string()]),
});

// Retry Policy Schema
const retryPolicySchema = z.object({
  maxRetries: z.number().int().min(0).max(10),
  backoff: z.enum(['linear', 'exponential']),
  initialDelay: z.number().int().min(0),
});

// Stage Config Schema
const stageConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['preprocess', 'train', 'benchmark', 'deploy']),
  module: moduleConfigSchema,
  dependencies: z.array(z.string()).optional(),
  retryPolicy: retryPolicySchema.optional(),
  timeout: z.number().int().min(0).optional(),
  condition: stageConditionSchema.optional(),
});

// Pipeline Config Schema
const pipelineConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  stages: z.array(stageConfigSchema).min(1),
  mlflow: mlflowConfigSchema,
  metadata: z.record(z.any()).optional(),
});

/**
 * Validate pipeline configuration
 */
export function validatePipelineConfig(config: unknown): PipelineConfig {
  try {
    return pipelineConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(
        'Pipeline configuration validation failed',
        error.errors
      );
    }
    throw error;
  }
}

/**
 * Validate stage configuration
 */
export function validateStageConfig(config: unknown): StageConfig {
  try {
    return stageConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(
        'Stage configuration validation failed',
        error.errors
      );
    }
    throw error;
  }
}

/**
 * Validate MLflow configuration
 */
export function validateMLflowConfig(config: unknown): MLflowConfig {
  try {
    return mlflowConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(
        'MLflow configuration validation failed',
        error.errors
      );
    }
    throw error;
  }
}

/**
 * Check if stages have circular dependencies
 */
export function validateStageDependencies(stages: StageConfig[]): void {
  const graph = new Map<string, Set<string>>();

  // Build dependency graph
  for (const stage of stages) {
    if (!graph.has(stage.id)) {
      graph.set(stage.id, new Set());
    }
    if (stage.dependencies) {
      for (const dep of stage.dependencies) {
        graph.get(stage.id)!.add(dep);
      }
    }
  }

  // Check for cycles using DFS
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = graph.get(nodeId) || new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (hasCycle(neighbor)) {
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  for (const stage of stages) {
    if (!visited.has(stage.id)) {
      if (hasCycle(stage.id)) {
        throw new ValidationError(
          'Circular dependency detected in stages',
          [{ stage: stage.id }]
        );
      }
    }
  }

  // Check all dependencies exist
  const stageIds = new Set(stages.map((s) => s.id));
  for (const stage of stages) {
    if (stage.dependencies) {
      for (const dep of stage.dependencies) {
        if (!stageIds.has(dep)) {
          throw new ValidationError(
            `Stage ${stage.id} depends on non-existent stage ${dep}`,
            [{ stage: stage.id, dependency: dep }]
          );
        }
      }
    }
  }
}
