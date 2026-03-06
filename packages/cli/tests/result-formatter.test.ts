import { describe, it, expect } from 'vitest';
import { formatResult } from '../src/formatters/result-formatter.js';
import type { ExecutionResult } from '@llmops/core';

describe('formatResult', () => {
  it('should format successful result', () => {
    const result: ExecutionResult = {
      runId: 'run-123',
      status: 'success',
      stages: [
        { stageId: 'preprocess', stageName: 'Preprocess', status: 'success', duration: 1500 },
        { stageId: 'train', stageName: 'Train', status: 'success', duration: 65000 },
      ],
      startTime: new Date('2025-01-01T00:00:00Z'),
      endTime: new Date('2025-01-01T00:01:06Z'),
      duration: 66500,
    };

    const output = formatResult(result);

    expect(output).toContain('run-123');
    expect(output).toContain('SUCCESS');
    expect(output).toContain('[OK] Preprocess');
    expect(output).toContain('[OK] Train');
    expect(output).toContain('1m 6s');
  });

  it('should format failed result with error', () => {
    const result: ExecutionResult = {
      runId: 'run-fail',
      status: 'failed',
      stages: [
        { stageId: 'preprocess', stageName: 'Preprocess', status: 'success', duration: 500 },
        { stageId: 'train', stageName: 'Train', status: 'failed', duration: 200 },
      ],
      startTime: new Date(),
      endTime: new Date(),
      duration: 700,
      error: new Error('Training crashed'),
    };

    const output = formatResult(result);

    expect(output).toContain('FAILED');
    expect(output).toContain('[FAIL] Train');
    expect(output).toContain('Training crashed');
  });

  it('should show skipped stages', () => {
    const result: ExecutionResult = {
      runId: 'run-skip',
      status: 'success',
      stages: [
        { stageId: 'preprocess', stageName: 'Preprocess', status: 'skipped' },
        { stageId: 'train', stageName: 'Train', status: 'success', duration: 100 },
      ],
      startTime: new Date(),
      endTime: new Date(),
      duration: 100,
    };

    const output = formatResult(result);

    expect(output).toContain('[SKIP] Preprocess');
  });

  it('should format duration in ms for short runs', () => {
    const result: ExecutionResult = {
      runId: 'run-fast',
      status: 'success',
      stages: [],
      startTime: new Date(),
      endTime: new Date(),
      duration: 500,
    };

    const output = formatResult(result);

    expect(output).toContain('500ms');
  });

  it('should format duration in seconds', () => {
    const result: ExecutionResult = {
      runId: 'run-med',
      status: 'success',
      stages: [],
      startTime: new Date(),
      endTime: new Date(),
      duration: 5000,
    };

    const output = formatResult(result);

    expect(output).toContain('5s');
  });
});
