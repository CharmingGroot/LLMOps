import { describe, it, expect, vi } from 'vitest';
import { createRunCommand } from '../src/commands/run.js';
import { createStatusCommand } from '../src/commands/status.js';
import { createValidateCommand } from '../src/commands/validate.js';

vi.mock('@llmops/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@llmops/core')>();
  return { ...original, logInfo: vi.fn(), logError: vi.fn(), logDebug: vi.fn(), logWarn: vi.fn() };
});

vi.mock('@llmops/state', () => ({
  RunManager: class {
    startPipeline = vi.fn().mockResolvedValue('run-1');
    endPipeline = vi.fn().mockResolvedValue(undefined);
    updateStage = vi.fn().mockResolvedValue(undefined);
    getClient = vi.fn().mockReturnValue({ getOrCreateExperiment: vi.fn().mockResolvedValue('exp-1') });
  },
  MLflowClient: class {
    getRun = vi.fn();
  },
}));

vi.mock('@llmops/orchestrator', async (importOriginal) => {
  const original = await importOriginal<typeof import('@llmops/orchestrator')>();
  return {
    ...original,
    PipelineEngine: class {
      execute = vi.fn().mockResolvedValue({
        runId: 'run-1',
        status: 'success',
        stages: [],
        startTime: new Date(),
        endTime: new Date(),
        duration: 100,
      });
    },
  };
});

describe('CLI Commands', () => {
  describe('createRunCommand', () => {
    it('should create run command with correct name', () => {
      const cmd = createRunCommand();

      expect(cmd.name()).toBe('run');
    });

    it('should accept config argument', () => {
      const cmd = createRunCommand();
      const args = cmd.registeredArguments;

      expect(args).toHaveLength(1);
      expect(args[0].name()).toBe('config');
    });

    it('should have --triggered-by option', () => {
      const cmd = createRunCommand();
      const opt = cmd.opts();

      // Default value check
      expect(cmd.getOptionValue('triggeredBy')).toBe('cli');
    });

    it('should have --dry-run option', () => {
      const cmd = createRunCommand();

      expect(cmd.getOptionValue('dryRun')).toBe(false);
    });

    it('should have --skip option', () => {
      const cmd = createRunCommand();
      const options = cmd.options;
      const skipOpt = options.find((o) => o.long === '--skip');

      expect(skipOpt).toBeDefined();
    });
  });

  describe('createStatusCommand', () => {
    it('should create status command with correct name', () => {
      const cmd = createStatusCommand();

      expect(cmd.name()).toBe('status');
    });

    it('should accept run-id argument', () => {
      const cmd = createStatusCommand();
      const args = cmd.registeredArguments;

      expect(args).toHaveLength(1);
      expect(args[0].name()).toBe('run-id');
    });

    it('should have default tracking URI', () => {
      const cmd = createStatusCommand();

      expect(cmd.getOptionValue('trackingUri')).toBe('http://localhost:5000');
    });
  });

  describe('createValidateCommand', () => {
    it('should create validate command with correct name', () => {
      const cmd = createValidateCommand();

      expect(cmd.name()).toBe('validate');
    });

    it('should accept config argument', () => {
      const cmd = createValidateCommand();
      const args = cmd.registeredArguments;

      expect(args).toHaveLength(1);
      expect(args[0].name()).toBe('config');
    });
  });
});
