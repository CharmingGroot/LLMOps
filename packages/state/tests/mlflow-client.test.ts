import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { MLflowClient } from '../src/client/mlflow-client.js';

vi.mock('axios', () => {
  const mockInterceptors = {
    response: { use: vi.fn() },
    request: { use: vi.fn() },
  };
  const mockInstance = {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: mockInterceptors,
  };
  return {
    default: {
      create: vi.fn(() => mockInstance),
    },
  };
});

// Suppress logger output during tests
vi.mock('@llmops/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@llmops/core')>();
  return {
    ...original,
    logDebug: vi.fn(),
    logError: vi.fn(),
    logInfo: vi.fn(),
    logWarn: vi.fn(),
  };
});

const TRACKING_URI = 'http://localhost:5000';

function getHttpClient(client: MLflowClient) {
  // Access the internal axios instance via the mock
  const mockAxios = axios.create();
  return mockAxios as unknown as { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> };
}

describe('MLflowClient', () => {
  let client: MLflowClient;
  let http: { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    client = new MLflowClient(TRACKING_URI);
    http = getHttpClient(client);
  });

  it('should create axios instance with correct baseURL', () => {
    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: `${TRACKING_URI}/api/2.0/mlflow`,
        timeout: 30000,
      })
    );
  });

  describe('getOrCreateExperiment', () => {
    it('should return existing experiment id', async () => {
      http.get.mockResolvedValueOnce({
        data: { experiment: { experiment_id: 'exp-123' } },
      });

      const result = await client.getOrCreateExperiment('my-exp');

      expect(result).toBe('exp-123');
      expect(http.get).toHaveBeenCalledWith('/experiments/get-by-name', {
        params: { experiment_name: 'my-exp' },
      });
    });

    it('should create experiment if not found', async () => {
      http.get.mockRejectedValueOnce(new Error('Not found'));
      http.post.mockResolvedValueOnce({
        data: { experiment_id: 'exp-new' },
      });

      const result = await client.getOrCreateExperiment('new-exp', 's3://artifacts');

      expect(result).toBe('exp-new');
      expect(http.post).toHaveBeenCalledWith('/experiments/create', {
        name: 'new-exp',
        artifactLocation: 's3://artifacts',
      });
    });
  });

  describe('createRun', () => {
    it('should create a run and return runId', async () => {
      http.post.mockResolvedValueOnce({
        data: { run: { info: { run_id: 'run-abc' } } },
      });

      const result = await client.createRun({
        experimentId: 'exp-1',
        startTime: 1000,
        runName: 'test-run',
      });

      expect(result).toBe('run-abc');
      expect(http.post).toHaveBeenCalledWith('/runs/create', expect.objectContaining({
        experiment_id: 'exp-1',
        run_name: 'test-run',
      }));
    });
  });

  describe('getRun', () => {
    it('should fetch run by id', async () => {
      const mockRun = { info: { runId: 'run-1' }, data: { metrics: [], params: [], tags: [] } };
      http.get.mockResolvedValueOnce({ data: { run: mockRun } });

      const result = await client.getRun('run-1');

      expect(result).toEqual(mockRun);
      expect(http.get).toHaveBeenCalledWith('/runs/get', { params: { run_id: 'run-1' } });
    });
  });

  describe('logParam', () => {
    it('should log a parameter', async () => {
      http.post.mockResolvedValueOnce({});

      await client.logParam('run-1', 'learning_rate', '0.01');

      expect(http.post).toHaveBeenCalledWith('/runs/log-parameter', {
        run_id: 'run-1',
        key: 'learning_rate',
        value: '0.01',
      });
    });
  });

  describe('logParams', () => {
    it('should log multiple parameters', async () => {
      http.post.mockResolvedValue({});

      await client.logParams('run-1', { lr: '0.01', epochs: '10' });

      expect(http.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('logMetric', () => {
    it('should log a metric with timestamp', async () => {
      http.post.mockResolvedValueOnce({});

      await client.logMetric('run-1', 'accuracy', 0.95, 1234567890, 5);

      expect(http.post).toHaveBeenCalledWith('/runs/log-metric', {
        run_id: 'run-1',
        key: 'accuracy',
        value: 0.95,
        timestamp: 1234567890,
        step: 5,
      });
    });

    it('should use Date.now() if timestamp not provided', async () => {
      http.post.mockResolvedValueOnce({});
      const before = Date.now();

      await client.logMetric('run-1', 'loss', 0.5);

      const call = http.post.mock.calls[0];
      expect(call[1].timestamp).toBeGreaterThanOrEqual(before);
    });
  });

  describe('logMetrics', () => {
    it('should log multiple metrics', async () => {
      http.post.mockResolvedValue({});

      await client.logMetrics('run-1', { accuracy: 0.95, loss: 0.05 });

      expect(http.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('setTag', () => {
    it('should set a tag', async () => {
      http.post.mockResolvedValueOnce({});

      await client.setTag('run-1', 'model_type', 'gpt');

      expect(http.post).toHaveBeenCalledWith('/runs/set-tag', {
        run_id: 'run-1',
        key: 'model_type',
        value: 'gpt',
      });
    });
  });

  describe('setTags', () => {
    it('should set multiple tags', async () => {
      http.post.mockResolvedValue({});

      await client.setTags('run-1', { env: 'prod', version: '1.0' });

      expect(http.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateRun', () => {
    it('should update run status', async () => {
      http.post.mockResolvedValueOnce({});

      await client.updateRun('run-1', 'FINISHED');

      expect(http.post).toHaveBeenCalledWith('/runs/update', expect.objectContaining({
        run_id: 'run-1',
        status: 'FINISHED',
      }));
    });
  });

  describe('searchRuns', () => {
    it('should search runs with filters', async () => {
      const mockRuns = [{ info: { runId: 'r1' } }];
      http.post.mockResolvedValueOnce({ data: { runs: mockRuns } });

      const result = await client.searchRuns({
        experimentIds: ['exp-1'],
        filter: 'metrics.accuracy > 0.9',
        maxResults: 50,
      });

      expect(result).toEqual(mockRuns);
      expect(http.post).toHaveBeenCalledWith('/runs/search', {
        experiment_ids: ['exp-1'],
        filter: 'metrics.accuracy > 0.9',
        max_results: 50,
        order_by: undefined,
      });
    });
  });

  describe('logArtifact', () => {
    it('should log artifact as tag (simplified)', async () => {
      http.post.mockResolvedValueOnce({});

      await client.logArtifact('run-1', '/path/to/model', 'models');

      expect(http.post).toHaveBeenCalledWith('/runs/set-tag', {
        run_id: 'run-1',
        key: 'artifact:models',
        value: '/path/to/model',
      });
    });
  });

  describe('listArtifacts', () => {
    it('should list artifacts for a run', async () => {
      const mockResponse = { rootUri: 's3://bucket', files: [{ path: 'model.pkl', isDir: false }] };
      http.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await client.listArtifacts('run-1', 'models');

      expect(result).toEqual(mockResponse);
      expect(http.get).toHaveBeenCalledWith('/artifacts/list', {
        params: { run_id: 'run-1', path: 'models' },
      });
    });
  });
});
