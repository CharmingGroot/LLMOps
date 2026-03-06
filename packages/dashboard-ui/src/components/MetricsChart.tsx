/**
 * MetricsChart — Simple horizontal bar chart for metrics
 */

import React from 'react';

interface MetricsChartProps {
  metrics: Array<{ key: string; value: number }>;
  maxValue?: number;
}

const BAR_COLORS = [
  'var(--accent)',
  'var(--success)',
  'var(--warning)',
  'var(--error)',
  'var(--info)',
];

export function MetricsChart({ metrics, maxValue }: MetricsChartProps): React.ReactElement {
  if (metrics.length === 0) {
    return <div className="empty-state">No metrics recorded.</div>;
  }

  const max = maxValue ?? Math.max(...metrics.map((m) => Math.abs(m.value)), 1);

  return (
    <div>
      {metrics.map((metric, i) => {
        const pct = Math.min((Math.abs(metric.value) / max) * 100, 100);
        return (
          <div key={metric.key} className="metric-bar-container">
            <div className="metric-bar-label">
              <span>{metric.key}</span>
              <span style={{ color: 'var(--text-muted)' }}>
                {typeof metric.value === 'number' ? metric.value.toFixed(4) : metric.value}
              </span>
            </div>
            <div className="metric-bar-track">
              <div
                className="metric-bar-fill"
                style={{
                  width: `${pct}%`,
                  backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
