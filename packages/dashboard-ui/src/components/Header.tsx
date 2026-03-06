/**
 * Header with title and connection status
 */

import React from 'react';
import type { ConnectionStatus } from '../types/api.js';
import { ConnectionIndicator } from './ConnectionIndicator.js';

interface HeaderProps {
  title: string;
  wsStatus: ConnectionStatus;
  onReconnect: () => void;
}

export function Header({ title, wsStatus, onReconnect }: HeaderProps): React.ReactElement {
  return (
    <header className="header">
      <span className="header-title">{title}</span>
      <ConnectionIndicator status={wsStatus} onReconnect={onReconnect} />
    </header>
  );
}
