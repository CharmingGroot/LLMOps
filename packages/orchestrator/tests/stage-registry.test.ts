import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StageType, ConfigurationError } from '@llmops/core';
import { StageRegistry } from '../src/registry/stage-registry.js';
import type { IStage } from '../src/stages/base-stage.js';
import type { StageConfig, RunContext, StageResult } from '@llmops/core';

vi.mock('@llmops/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@llmops/core')>();
  return {
    ...original,
    logDebug: vi.fn(),
    logInfo: vi.fn(),
  };
});

class MockPreprocessStage implements IStage {
  readonly type = StageType.PREPROCESS;
  readonly name = 'MockPreprocess';
  async execute(_config: StageConfig, _context: RunContext): Promise<StageResult> {
    return { success: true };
  }
}

class MockTrainStage implements IStage {
  readonly type = StageType.TRAIN;
  readonly name = 'MockTrain';
  async execute(_config: StageConfig, _context: RunContext): Promise<StageResult> {
    return { success: true };
  }
}

describe('StageRegistry', () => {
  let registry: StageRegistry;

  beforeEach(() => {
    registry = new StageRegistry();
  });

  describe('register', () => {
    it('should register a stage by type', () => {
      registry.register(StageType.PREPROCESS, MockPreprocessStage);

      expect(registry.has(StageType.PREPROCESS)).toBe(true);
    });

    it('should allow overwriting existing registration', () => {
      registry.register(StageType.PREPROCESS, MockPreprocessStage);
      registry.register(StageType.PREPROCESS, MockTrainStage);

      const stage = registry.loadStage(StageType.PREPROCESS);
      expect(stage.name).toBe('MockTrain');
    });
  });

  describe('loadStage', () => {
    it('should create a new instance of registered stage', () => {
      registry.register(StageType.PREPROCESS, MockPreprocessStage);

      const stage = registry.loadStage(StageType.PREPROCESS);

      expect(stage).toBeInstanceOf(MockPreprocessStage);
      expect(stage.type).toBe(StageType.PREPROCESS);
      expect(stage.name).toBe('MockPreprocess');
    });

    it('should throw ConfigurationError for unregistered type', () => {
      expect(() => registry.loadStage(StageType.DEPLOY)).toThrow(ConfigurationError);
      expect(() => registry.loadStage(StageType.DEPLOY)).toThrow("not registered");
    });

    it('should return a new instance each time', () => {
      registry.register(StageType.TRAIN, MockTrainStage);

      const stage1 = registry.loadStage(StageType.TRAIN);
      const stage2 = registry.loadStage(StageType.TRAIN);

      expect(stage1).not.toBe(stage2);
    });
  });

  describe('has', () => {
    it('should return true for registered types', () => {
      registry.register(StageType.PREPROCESS, MockPreprocessStage);

      expect(registry.has(StageType.PREPROCESS)).toBe(true);
    });

    it('should return false for unregistered types', () => {
      expect(registry.has(StageType.DEPLOY)).toBe(false);
    });
  });

  describe('getRegisteredTypes', () => {
    it('should return empty array when no stages registered', () => {
      expect(registry.getRegisteredTypes()).toEqual([]);
    });

    it('should return all registered types', () => {
      registry.register(StageType.PREPROCESS, MockPreprocessStage);
      registry.register(StageType.TRAIN, MockTrainStage);

      const types = registry.getRegisteredTypes();

      expect(types).toHaveLength(2);
      expect(types).toContain(StageType.PREPROCESS);
      expect(types).toContain(StageType.TRAIN);
    });
  });

  describe('unregister', () => {
    it('should remove a registered stage', () => {
      registry.register(StageType.PREPROCESS, MockPreprocessStage);

      const result = registry.unregister(StageType.PREPROCESS);

      expect(result).toBe(true);
      expect(registry.has(StageType.PREPROCESS)).toBe(false);
    });

    it('should return false for non-existent type', () => {
      expect(registry.unregister(StageType.DEPLOY)).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all registered stages', () => {
      registry.register(StageType.PREPROCESS, MockPreprocessStage);
      registry.register(StageType.TRAIN, MockTrainStage);

      registry.clear();

      expect(registry.getRegisteredTypes()).toEqual([]);
    });
  });
});
