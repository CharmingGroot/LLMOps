import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadConfig } from '../src/config/loader.js';
import { ConfigurationError, ValidationError } from '@llmops/core';

vi.mock('@llmops/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@llmops/core')>();
  return { ...original, logInfo: vi.fn(), logError: vi.fn(), logDebug: vi.fn(), logWarn: vi.fn() };
});

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

const { readFile } = await import('fs/promises');
const mockReadFile = vi.mocked(readFile);

const VALID_CONFIG = JSON.stringify({
  id: 'pipe-1',
  name: 'Test',
  stages: [{
    id: 'preprocess',
    name: 'Preprocess',
    type: 'preprocess',
    module: { type: 'python', entrypoint: 'test.py' },
  }],
  mlflow: {
    trackingUri: 'http://localhost:5000',
    experimentName: 'test',
  },
});

describe('loadConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load and validate a valid config file', async () => {
    mockReadFile.mockResolvedValueOnce(VALID_CONFIG);

    const config = await loadConfig('config/pipeline.json');

    expect(config.id).toBe('pipe-1');
    expect(config.name).toBe('Test');
    expect(config.stages).toHaveLength(1);
  });

  it('should throw ConfigurationError when file not found', async () => {
    mockReadFile.mockRejectedValueOnce(new Error('ENOENT'));

    await expect(loadConfig('nonexistent.json')).rejects.toThrow(ConfigurationError);
  });

  it('should throw ConfigurationError for invalid JSON', async () => {
    mockReadFile.mockResolvedValueOnce('{ not valid json }');

    await expect(loadConfig('bad.json')).rejects.toThrow(ConfigurationError);
  });

  it('should throw ValidationError for invalid config structure', async () => {
    mockReadFile.mockResolvedValueOnce(JSON.stringify({ id: '', stages: [] }));

    await expect(loadConfig('invalid.json')).rejects.toThrow(ValidationError);
  });
});
