/**
 * Run Detail Page — Shows detailed info for a single run
 */

import React, { useState, useEffect } from 'react';
import type { RunSummary } from '../types/api.js';
import { fetchRun } from '../api/client.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { MetricsChart } from '../components/MetricsChart.js';
import { StageTimeline } from '../components/StageTimeline.js';

interface RunDetailPageProps {
  runId: string;
  onBack: () => void;
}

export function RunDetailPage({ runId, onBack }: RunDetailPageProps): React.ReactElement {
  const [run, setRun] = useState<RunSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchRun(runId)
      .then((data) => { if (!cancelled) setRun(data); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [runId]);

  if (loading) {
    return <div className="loading"><div className="spinner" />Loading run details...</div>;
  }

  if (error || !run) {
    return (
      <div>
        <button onClick={onBack} style={{ marginBottom: '16px' }}>Back</button>
        <div style={{ color: 'var(--error)' }}>Error: {error || 'Run not found'}</div>
      </div>
    );
  }

  const tags = run.data?.tags || [];
  const params = run.data?.params || [];
  const metrics = run.data?.metrics || [];
  const runName = tags.find((t) => t.key === 'mlflow.runName')?.value || runId;
  const pipelineId = tags.find((t) => t.key === 'pipeline.id')?.value;

  // Extract stage info from tags
  const stageIds = tags
    .filter((t) => t.key.match(/^stage\..+\.status$/))
    .map((t) => {
      const id = t.key.split('.')[1];
      return {
        id,
        name: id,
        status: t.value,
        startTime: tags.find((tt) => tt.key === `stage.${id}.start_time`)?.value,
        endTime: tags.find((tt) => tt.key === `stage.${id}.end_time`)?.value,
      };
    });

  return (
    <div>
      <button onClick={onBack} style={{ marginBottom: '16px' }}>Back to Dashboard</button>

      {/* Run Info */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Run Info</span>
          <StatusBadge status={run.info.status} />
        </div>
        <table>
          <tbody>
            <tr><td style={{ color: 'var(--text-muted)', width: '150px' }}>Run ID</td><td style={{ fontFamily: 'var(--font-mono)' }}>{run.info.runId}</td></tr>
            <tr><td style={{ color: 'var(--text-muted)' }}>Name</td><td>{runName}</td></tr>
            {pipelineId && <tr><td style={{ color: 'var(--text-muted)' }}>Pipeline</td><td>{pipelineId}</td></tr>}
            <tr><td style={{ color: 'var(--text-muted)' }}>Start Time</td><td>{new Date(run.info.startTime).toLocaleString()}</td></tr>
            {run.info.endTime && <tr><td style={{ color: 'var(--text-muted)' }}>End Time</td><td>{new Date(run.info.endTime).toLocaleString()}</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Stage Timeline */}
      {stageIds.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Stage Timeline</span>
          </div>
          <StageTimeline stages={stageIds} />
        </div>
      )}

      {/* Metrics */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Metrics ({metrics.length})</span>
        </div>
        <MetricsChart metrics={metrics} />
      </div>

      {/* Parameters */}
      {params.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Parameters ({params.length})</span>
          </div>
          <table>
            <thead>
              <tr><th>Key</th><th>Value</th></tr>
            </thead>
            <tbody>
              {params.map((p) => (
                <tr key={p.key}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{p.key}</td>
                  <td>{p.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Tags ({tags.length})</span>
          </div>
          <table>
            <thead>
              <tr><th>Key</th><th>Value</th></tr>
            </thead>
            <tbody>
              {tags.map((t) => (
                <tr key={t.key}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{t.key}</td>
                  <td style={{ wordBreak: 'break-all' }}>{t.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
