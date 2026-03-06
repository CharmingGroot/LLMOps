/**
 * Live Logs Page — WebSocket-based real-time log stream
 */

import React, { useState, useCallback } from 'react';
import type { WSEvent } from '../types/api.js';
import { LogViewer, type LogEntry } from '../components/LogViewer.js';

interface LogsPageProps {
  lastEvent: WSEvent | null;
}

const MAX_LOGS = 500;

export function LogsPage({ lastEvent }: LogsPageProps): React.ReactElement {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Append new events as they arrive
  React.useEffect(() => {
    if (!lastEvent) return;

    const entry: LogEntry = {
      timestamp: lastEvent.timestamp || new Date().toISOString(),
      level: lastEvent.type === 'error' ? 'error' :
             lastEvent.type === 'warn' ? 'warn' : 'info',
      message: lastEvent.message || JSON.stringify(lastEvent.data || lastEvent),
    };

    setLogs((prev) => {
      const next = [...prev, entry];
      return next.length > MAX_LOGS ? next.slice(-MAX_LOGS) : next;
    });
  }, [lastEvent]);

  const handleClear = useCallback(() => setLogs([]), []);

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <span className="card-title">Live Pipeline Logs</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {logs.length} entries
            </span>
            <button onClick={handleClear}>Clear</button>
          </div>
        </div>
        <LogViewer logs={logs} />
      </div>
    </div>
  );
}
