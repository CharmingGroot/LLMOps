/**
 * RunList - Displays a list of pipeline runs
 */

import React from 'react';
import type { RunSummary } from '../types/api.js';
import { StatusBadge } from './StatusBadge.js';

interface RunListProps {
  runs: RunSummary[];
  loading: boolean;
  error: string | null;
  onSelectRun?: (runId: string) => void;
}

export function RunList({ runs, loading, error, onSelectRun }: RunListProps): React.ReactElement {
  if (loading) {
    return <div data-testid="run-list-loading">Loading runs...</div>;
  }

  if (error) {
    return (
      <div data-testid="run-list-error" style={{ color: '#ef4444' }}>
        Error: {error}
      </div>
    );
  }

  if (runs.length === 0) {
    return <div data-testid="run-list-empty">No runs found.</div>;
  }

  return (
    <div data-testid="run-list">
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Run ID</th>
            <th>Status</th>
            <th>Start Time</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr
              key={run.info.runId}
              data-testid="run-row"
              onClick={() => onSelectRun?.(run.info.runId)}
              style={{ cursor: onSelectRun ? 'pointer' : 'default' }}
            >
              <td>{run.info.runId}</td>
              <td>
                <StatusBadge status={run.info.status} />
              </td>
              <td>{new Date(run.info.startTime).toLocaleString()}</td>
              <td>{formatDuration(run.info.startTime, run.info.endTime)}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
