/**
 * ConnectionIndicator - Shows WebSocket connection status
 */

import React from 'react';
import type { ConnectionStatus } from '../types/api.js';

interface ConnectionIndicatorProps {
  status: ConnectionStatus;
  onReconnect?: () => void;
}

const STATUS_CONFIG: Record<ConnectionStatus, { color: string; label: string }> = {
  connecting: { color: '#f59e0b', label: 'Connecting...' },
  connected: { color: '#22c55e', label: 'Connected' },
  disconnected: { color: '#6b7280', label: 'Disconnected' },
  error: { color: '#ef4444', label: 'Connection Error' },
};

export function ConnectionIndicator({
  status,
  onReconnect,
}: ConnectionIndicatorProps): React.ReactElement {
  const config = STATUS_CONFIG[status];

  return (
    <div data-testid="connection-indicator" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span
        data-testid="connection-dot"
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: config.color,
          display: 'inline-block',
        }}
      />
      <span data-testid="connection-label">{config.label}</span>
      {(status === 'disconnected' || status === 'error') && onReconnect && (
        <button data-testid="reconnect-button" onClick={onReconnect}>
          Reconnect
        </button>
      )}
    </div>
  );
}
