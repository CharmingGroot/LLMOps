/**
 * StatusBadge - Displays pipeline/stage status
 */

import React from 'react';

interface StatusBadgeProps {
  status: string;
  label?: string;
}

const STATUS_STYLES: Record<string, { color: string; text: string }> = {
  success: { color: '#22c55e', text: 'Success' },
  FINISHED: { color: '#22c55e', text: 'Finished' },
  failed: { color: '#ef4444', text: 'Failed' },
  FAILED: { color: '#ef4444', text: 'Failed' },
  running: { color: '#3b82f6', text: 'Running' },
  RUNNING: { color: '#3b82f6', text: 'Running' },
  pending: { color: '#6b7280', text: 'Pending' },
  skipped: { color: '#f59e0b', text: 'Skipped' },
  KILLED: { color: '#dc2626', text: 'Killed' },
};

export function StatusBadge({ status, label }: StatusBadgeProps): React.ReactElement {
  const style = STATUS_STYLES[status] || { color: '#6b7280', text: status };

  return (
    <span
      data-testid="status-badge"
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '4px',
        backgroundColor: style.color,
        color: '#ffffff',
        fontSize: '12px',
        fontWeight: 'bold',
      }}
    >
      {label || style.text}
    </span>
  );
}
