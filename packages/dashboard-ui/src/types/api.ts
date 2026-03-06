/**
 * API response types for dashboard
 */

export interface RunListResponse {
  runs: RunSummary[];
}

export interface RunSummary {
  info: {
    runId: string;
    status: string;
    startTime: number;
    endTime?: number;
  };
  data: {
    metrics: Array<{ key: string; value: number }>;
    params: Array<{ key: string; value: string }>;
    tags: Array<{ key: string; value: string }>;
  };
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  version: string;
}

export interface ErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WSEvent {
  type: string;
  event?: string;
  data?: Record<string, unknown>;
  message?: string;
  timestamp?: string;
}
