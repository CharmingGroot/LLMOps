/**
 * Models Page — MLflow Model Registry browser
 */

import React, { useState, useEffect, useCallback } from 'react';
import { StatusBadge } from '../components/StatusBadge.js';

interface RegisteredModel {
  name: string;
  creation_timestamp: number;
  last_updated_timestamp: number;
  description?: string;
  latest_versions?: ModelVersion[];
}

interface ModelVersion {
  name: string;
  version: string;
  current_stage: string;
  creation_timestamp: number;
  run_id?: string;
  status: string;
}

const STAGE_BADGE: Record<string, string> = {
  None: 'muted',
  Staging: 'warning',
  Production: 'success',
  Archived: 'muted',
};

export function ModelsPage(): React.ReactElement {
  const [models, setModels] = useState<RegisteredModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [versions, setVersions] = useState<ModelVersion[]>([]);
  const [promoting, setPromoting] = useState(false);

  const loadModels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await fetch('/api/models');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setModels(data.models || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load models');
      setModels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadVersions = useCallback(async (name: string) => {
    try {
      const resp = await fetch(`/api/models/${encodeURIComponent(name)}/versions`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setVersions(data.versions || []);
    } catch {
      setVersions([]);
    }
  }, []);

  useEffect(() => { loadModels(); }, [loadModels]);

  useEffect(() => {
    if (selectedModel) loadVersions(selectedModel);
  }, [selectedModel, loadVersions]);

  const handlePromote = async (name: string, version: string, stage: string) => {
    setPromoting(true);
    try {
      const resp = await fetch(`/api/models/${encodeURIComponent(name)}/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version, stage }),
      });
      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.error || `HTTP ${resp.status}`);
      }
      // Reload versions
      await loadVersions(name);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Promote failed');
    } finally {
      setPromoting(false);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner" />Loading models...</div>;
  }

  return (
    <div>
      {/* Model List */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Registered Models</span>
          <button onClick={loadModels}>Refresh</button>
        </div>

        {error ? (
          <div style={{ color: 'var(--error)', padding: '16px' }}>
            {error}
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
              Model Registry may not have any models yet. Run a pipeline to register models.
            </div>
          </div>
        ) : models.length === 0 ? (
          <div className="empty-state">
            <h3>No registered models</h3>
            <p>Run a pipeline with the deploy stage to register models.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Latest Version</th>
                  <th>Stage</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {models.map((model) => {
                  const latest = model.latest_versions?.[0];
                  return (
                    <tr
                      key={model.name}
                      onClick={() => setSelectedModel(model.name)}
                      style={{
                        background: selectedModel === model.name ? 'var(--bg-hover)' : undefined,
                      }}
                    >
                      <td style={{ fontWeight: 600 }}>{model.name}</td>
                      <td>{latest?.version || '-'}</td>
                      <td>
                        {latest ? (
                          <span className={`badge badge-${STAGE_BADGE[latest.current_stage] || 'muted'}`}>
                            {latest.current_stage}
                          </span>
                        ) : '-'}
                      </td>
                      <td>{new Date(model.last_updated_timestamp).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Version Detail */}
      {selectedModel && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">{selectedModel} — Versions</span>
          </div>
          {versions.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', padding: '16px' }}>No versions found.</div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Version</th>
                    <th>Stage</th>
                    <th>Run ID</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {versions.map((v) => (
                    <tr key={v.version}>
                      <td>v{v.version}</td>
                      <td>
                        <span className={`badge badge-${STAGE_BADGE[v.current_stage] || 'muted'}`}>
                          {v.current_stage}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                        {v.run_id ? v.run_id.substring(0, 8) + '...' : '-'}
                      </td>
                      <td><StatusBadge status={v.status === 'READY' ? 'success' : 'pending'} label={v.status} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {v.current_stage !== 'Staging' && (
                            <button
                              disabled={promoting}
                              onClick={(e) => { e.stopPropagation(); handlePromote(v.name, v.version, 'Staging'); }}
                            >
                              Staging
                            </button>
                          )}
                          {v.current_stage !== 'Production' && (
                            <button
                              className="btn-primary"
                              disabled={promoting}
                              onClick={(e) => { e.stopPropagation(); handlePromote(v.name, v.version, 'Production'); }}
                            >
                              Production
                            </button>
                          )}
                          {v.current_stage !== 'Archived' && v.current_stage !== 'None' && (
                            <button
                              disabled={promoting}
                              onClick={(e) => { e.stopPropagation(); handlePromote(v.name, v.version, 'Archived'); }}
                            >
                              Archive
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
