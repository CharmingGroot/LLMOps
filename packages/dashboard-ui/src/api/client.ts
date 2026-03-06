/**
 * API Client for Dashboard
 */

import type { RunSummary, HealthResponse } from '../types/api.js';

const BASE_URL = '/api';

async function fetchJSON<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${response.status}`);
  }
  return response.json();
}

export async function fetchHealth(): Promise<HealthResponse> {
  return fetchJSON<HealthResponse>('/health');
}

export async function fetchRuns(experimentIds: string): Promise<RunSummary[]> {
  const data = await fetchJSON<{ runs: RunSummary[] }>(
    `/pipelines/runs?experimentIds=${encodeURIComponent(experimentIds)}`
  );
  return data.runs || [];
}

export async function fetchRun(runId: string): Promise<RunSummary> {
  const data = await fetchJSON<{ run: RunSummary }>(`/pipelines/runs/${runId}`);
  return data.run;
}

export interface ArtifactItem {
  path: string;
  is_dir: boolean;
  file_size?: number;
}

export async function fetchArtifacts(runId: string, path?: string): Promise<ArtifactItem[]> {
  const query = path ? `?path=${encodeURIComponent(path)}` : '';
  const data = await fetchJSON<{ files: ArtifactItem[] }>(
    `/pipelines/runs/${runId}/artifacts${query}`
  );
  return data.files || [];
}
