/**
 * Dashboard Page — Overview of pipeline runs
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { RunSummary, HealthResponse } from '../types/api.js';
import { fetchRuns, fetchHealth } from '../api/client.js';
import { StatusBadge } from '../components/StatusBadge.js';

interface DashboardPageProps {
  onSelectRun: (runId: string) => void;
}

export function DashboardPage({ onSelectRun }: DashboardPageProps): React.ReactElement {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [healthData, runsData] = await Promise.allSettled([
        fetchHealth(),
        fetchRuns('0'),
      ]);
      if (healthData.status === 'fulfilled') setHealth(healthData.value);
      if (runsData.status === 'fulfilled') setRuns(runsData.value);
      else if (runsData.status === 'rejected') setRuns([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const stats = {
    total: runs.length,
    success: runs.filter((r) => r.info.status === 'FINISHED').length,
    failed: runs.filter((r) => r.info.status === 'FAILED').length,
    running: runs.filter((r) => r.info.status === 'RUNNING').length,
  };

  return (
    <div>
      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Runs</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--success)' }}>{stats.success}</div>
          <div className="stat-label">Successful</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--error)' }}>{stats.failed}</div>
          <div className="stat-label">Failed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--info)' }}>{stats.running}</div>
          <div className="stat-label">Running</div>
        </div>
      </div>

      {/* Health */}
      {health && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <div className="card-header">
            <span className="card-title">System Health</span>
            <StatusBadge status={health.status === 'ok' ? 'success' : 'failed'} label={health.status.toUpperCase()} />
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            API v{health.version} — {new Date(health.timestamp).toLocaleString()}
          </div>
        </div>
      )}

      {/* Run Table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Recent Runs</span>
          <button onClick={loadData}>Refresh</button>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" />Loading...</div>
        ) : error ? (
          <div style={{ color: 'var(--error)', padding: '16px' }}>Error: {error}</div>
        ) : runs.length === 0 ? (
          <div className="empty-state">
            <h3>No runs found</h3>
            <p>Run a pipeline to see results here.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Run ID</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Start Time</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => {
                  const nameTag = run.data?.tags?.find((t) => t.key === 'mlflow.runName');
                  return (
                    <tr key={run.info.runId} onClick={() => onSelectRun(run.info.runId)}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                        {run.info.runId.substring(0, 8)}...
                      </td>
                      <td>{nameTag?.value || '-'}</td>
                      <td><StatusBadge status={run.info.status} /></td>
                      <td>{new Date(run.info.startTime).toLocaleString()}</td>
                      <td>{formatDuration(run.info.startTime, run.info.endTime)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDuration(startTime: number, endTime?: number): string {
  if (!endTime) return '-';
  const ms = endTime - startTime;
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}
