/**
 * Stage Registry - Plugin architecture for stages
 */

import type { StageType } from '@llmops/core';
import { ConfigurationError, logInfo, logDebug } from '@llmops/core';
import type { IStage } from '../stages/base-stage.js';

export type StageConstructor = new () => IStage;

export class StageRegistry {
  private stages: Map<StageType, StageConstructor> = new Map();

  /**
   * Register a stage
   */
  register(type: StageType, constructor: StageConstructor): void {
    if (this.stages.has(type)) {
      logDebug(`Overwriting existing stage: ${type}`);
    }
    this.stages.set(type, constructor);
    logInfo(`Stage registered: ${type}`);
  }

  /**
   * Load a stage by type
   */
  loadStage(type: StageType): IStage {
    const Constructor = this.stages.get(type);
    if (!Constructor) {
      throw new ConfigurationError(`Stage type '${type}' not registered`, {
        availableTypes: Array.from(this.stages.keys()),
      });
    }
    return new Constructor();
  }

  /**
   * Check if a stage type is registered
   */
  has(type: StageType): boolean {
    return this.stages.has(type);
  }

  /**
   * Get all registered stage types
   */
  getRegisteredTypes(): StageType[] {
    return Array.from(this.stages.keys());
  }

  /**
   * Unregister a stage
   */
  unregister(type: StageType): boolean {
    return this.stages.delete(type);
  }

  /**
   * Clear all registered stages
   */
  clear(): void {
    this.stages.clear();
  }

  /**
   * Load plugins from a directory (future implementation)
   */
  async loadPlugins(pluginDir: string): Promise<void> {
    // TODO: Implement dynamic plugin loading
    logInfo(`Plugin directory: ${pluginDir} (not implemented yet)`);
  }
}
