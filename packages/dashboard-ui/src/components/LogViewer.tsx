/**
 * LogViewer — Real-time log stream display
 */

import React, { useRef, useEffect } from 'react';

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

interface LogViewerProps {
  logs: LogEntry[];
  autoScroll?: boolean;
}

export function LogViewer({ logs, autoScroll = true }: LogViewerProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  if (logs.length === 0) {
    return (
      <div className="log-viewer">
        <span style={{ color: 'var(--text-muted)' }}>Waiting for log events...</span>
      </div>
    );
  }

  return (
    <div className="log-viewer" ref={containerRef}>
      {logs.map((log, i) => {
        const levelClass =
          log.level === 'error' ? 'log-error' :
          log.level === 'warn' ? 'log-warn' :
          log.level === 'info' ? 'log-info' : '';

        return (
          <div key={i} className={`log-line ${levelClass}`}>
            <span className="timestamp">{log.timestamp} </span>
            [{log.level.toUpperCase().padEnd(5)}] {log.message}
          </div>
        );
      })}
    </div>
  );
}
