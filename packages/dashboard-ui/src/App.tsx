/**
 * LLMOps Dashboard App
 */

import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar.js';
import { Header } from './components/Header.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { RunDetailPage } from './pages/RunDetailPage.js';
import { LogsPage } from './pages/LogsPage.js';
import { ModelsPage } from './pages/ModelsPage.js';
import { useWebSocket } from './hooks/use-websocket.js';

type Page = 'dashboard' | 'run-detail' | 'logs' | 'models';

const PAGE_TITLES: Record<Page, string> = {
  dashboard: 'Dashboard',
  'run-detail': 'Run Detail',
  logs: 'Live Logs',
  models: 'Model Registry',
};

export function App(): React.ReactElement {
  const [page, setPage] = useState<Page>('dashboard');
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const wsUrl = `ws://${window.location.host}/ws`;
  const { status: wsStatus, lastEvent, reconnect } = useWebSocket({
    url: wsUrl,
  });

  const handleSelectRun = (runId: string) => {
    setSelectedRunId(runId);
    setPage('run-detail');
  };

  const handleBack = () => {
    setSelectedRunId(null);
    setPage('dashboard');
  };

  const renderPage = () => {
    switch (page) {
      case 'run-detail':
        return selectedRunId ? (
          <RunDetailPage runId={selectedRunId} onBack={handleBack} />
        ) : (
          <DashboardPage onSelectRun={handleSelectRun} />
        );
      case 'logs':
        return <LogsPage lastEvent={lastEvent} />;
      case 'models':
        return <ModelsPage />;
      default:
        return <DashboardPage onSelectRun={handleSelectRun} />;
    }
  };

  return (
    <div className="layout">
      <Sidebar activePage={page} onNavigate={(p) => { setPage(p as Page); }} />
      <div className="main-content">
        <Header
          wsStatus={wsStatus}
          onReconnect={reconnect}
          title={PAGE_TITLES[page]}
        />
        <div className="content">
          {renderPage()}
        </div>
      </div>
    </div>
  );
}
