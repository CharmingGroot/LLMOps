import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StreamHandler } from '../src/process/stream-handler.js';
import type { RunContext } from '@llmops/core';

const mockLogInfo = vi.fn();
const mockLogWarn = vi.fn();
const mockLogErr = vi.fn();

vi.mock('@llmops/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@llmops/core')>();
  return {
    ...original,
    logInfo: (...args: any[]) => mockLogInfo(...args),
    logWarn: (...args: any[]) => mockLogWarn(...args),
    logError: (...args: any[]) => mockLogErr(...args),
    logDebug: vi.fn(),
  };
});

const MOCK_CONTEXT: RunContext = {
  runId: 'run-1',
  pipelineId: 'pipe-1',
  experimentId: 'exp-1',
  triggeredBy: 'test',
  timestamp: new Date(),
  config: {
    id: 'pipe-1',
    name: 'Test',
    stages: [],
    mlflow: { trackingUri: 'http://localhost:5000', experimentName: 'test' },
  },
};

describe('StreamHandler', () => {
  let handler: StreamHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new StreamHandler(MOCK_CONTEXT);
  });

  describe('handleStdout', () => {
    it('should log each line as info', () => {
      handler.handleStdout('line1\nline2\n');

      expect(mockLogInfo).toHaveBeenCalledTimes(2);
      expect(mockLogInfo).toHaveBeenCalledWith('line1', { runId: 'run-1' });
      expect(mockLogInfo).toHaveBeenCalledWith('line2', { runId: 'run-1' });
    });

    it('should skip empty lines', () => {
      handler.handleStdout('\n  \n\n');

      expect(mockLogInfo).not.toHaveBeenCalled();
    });
  });

  describe('handleStderr', () => {
    it('should detect error level from message content', () => {
      handler.handleStderr('An error occurred\n');

      expect(mockLogErr).toHaveBeenCalledTimes(1);
    });

    it('should detect warning level from message content', () => {
      handler.handleStderr('Warning: something happened\n');

      expect(mockLogWarn).toHaveBeenCalledTimes(1);
    });

    it('should default to info for normal stderr', () => {
      handler.handleStderr('Some info message\n');

      expect(mockLogInfo).toHaveBeenCalledTimes(1);
    });

    it('should skip empty lines', () => {
      handler.handleStderr('\n  \n');

      expect(mockLogInfo).not.toHaveBeenCalled();
      expect(mockLogErr).not.toHaveBeenCalled();
    });
  });

  describe('log level detection', () => {
    it('should detect error from exception keyword', () => {
      handler.handleStderr('Exception raised in module\n');
      expect(mockLogErr).toHaveBeenCalledTimes(1);
    });

    it('should detect warn from warning keyword', () => {
      handler.handleStderr('DeprecationWarning: old API\n');
      expect(mockLogWarn).toHaveBeenCalledTimes(1);
    });
  });
});
