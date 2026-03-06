/**
 * Sidebar navigation
 */

import React from 'react';

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'models', label: 'Models' },
  { id: 'logs', label: 'Live Logs' },
];

export function Sidebar({ activePage, onNavigate }: SidebarProps): React.ReactElement {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>LLMOps</h1>
        <span>Pipeline Dashboard</span>
      </div>
      <ul className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <li
            key={item.id}
            className={activePage === item.id ? 'active' : ''}
            onClick={() => onNavigate(item.id)}
          >
            {item.label}
          </li>
        ))}
      </ul>
    </aside>
  );
}
