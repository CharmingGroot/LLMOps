import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  logger,
  createContextLogger,
  logError,
  logInfo,
  logDebug,
  logWarn,
  LogLevel,
} from '../src/utils/logger.js';

describe('Logger', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should have default log level from env or info', () => {
    expect(logger.level).toBe(process.env.LOG_LEVEL || 'info');
  });

  it('should have console transport', () => {
    expect(logger.transports.length).toBeGreaterThanOrEqual(1);
  });
});

describe('createContextLogger', () => {
  it('should create a child logger with context', () => {
    const childLogger = createContextLogger({
      runId: 'run-123',
      pipelineId: 'pipe-1',
    });

    expect(childLogger).toBeDefined();
    expect(childLogger.info).toBeDefined();
    expect(childLogger.error).toBeDefined();
  });

  it('should create child logger with custom fields', () => {
    const childLogger = createContextLogger({
      stageId: 'stage-1',
      custom: 'value',
    });

    expect(childLogger).toBeDefined();
  });
});

describe('Log utility functions', () => {
  it('should call logError without throwing', () => {
    const spy = vi.spyOn(logger, 'error').mockImplementation(() => logger);
    const error = new Error('test error');

    expect(() => logError(error, { runId: 'run-1' })).not.toThrow();
    expect(spy).toHaveBeenCalled();
  });

  it('should call logInfo without throwing', () => {
    const spy = vi.spyOn(logger, 'info').mockImplementation(() => logger);

    expect(() => logInfo('test message', { pipelineId: 'p1' })).not.toThrow();
    expect(spy).toHaveBeenCalled();
  });

  it('should call logDebug without throwing', () => {
    const spy = vi.spyOn(logger, 'debug').mockImplementation(() => logger);

    expect(() => logDebug('debug msg')).not.toThrow();
    expect(spy).toHaveBeenCalled();
  });

  it('should call logWarn without throwing', () => {
    const spy = vi.spyOn(logger, 'warn').mockImplementation(() => logger);

    expect(() => logWarn('warn msg')).not.toThrow();
    expect(spy).toHaveBeenCalled();
  });
});

describe('LogLevel enum', () => {
  it('should define all log levels', () => {
    expect(LogLevel.ERROR).toBe('error');
    expect(LogLevel.WARN).toBe('warn');
    expect(LogLevel.INFO).toBe('info');
    expect(LogLevel.DEBUG).toBe('debug');
  });
});
