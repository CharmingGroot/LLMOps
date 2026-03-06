/**
 * StageTimeline — Shows pipeline stages with status dots
 */

import React from 'react';

interface StageInfo {
  id: string;
  name: string;
  status: string;
  startTime?: string;
  endTime?: string;
}

interface StageTimelineProps {
  stages: StageInfo[];
}

const DOT_COLORS: Record<string, string> = {
  success: 'var(--success)',
  FINISHED: 'var(--success)',
  failed: 'var(--error)',
  FAILED: 'var(--error)',
  running: 'var(--info)',
  RUNNING: 'var(--info)',
  pending: 'var(--text-muted)',
  skipped: 'var(--warning)',
};

export function StageTimeline({ stages }: StageTimelineProps): React.ReactElement {
  if (stages.length === 0) {
    return <div className="empty-state">No stage information available.</div>;
  }

  return (
    <div className="timeline">
      {stages.map((stage) => (
        <div key={stage.id} className="timeline-item">
          <div
            className="timeline-dot"
            style={{ backgroundColor: DOT_COLORS[stage.status] || 'var(--text-muted)' }}
          />
          <div className="timeline-line" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '14px' }}>{stage.name}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {stage.id} — {stage.status}
              {stage.startTime && ` — ${new Date(stage.startTime).toLocaleTimeString()}`}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
