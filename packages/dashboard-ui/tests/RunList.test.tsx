// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { RunList } from '../src/components/RunList.js';
import type { RunSummary } from '../src/types/api.js';

const MOCK_RUNS: RunSummary[] = [
  {
    info: { runId: 'run-1', status: 'FINISHED', startTime: 1700000000000, endTime: 1700000060000 },
    data: { metrics: [], params: [], tags: [] },
  },
  {
    info: { runId: 'run-2', status: 'FAILED', startTime: 1700000100000 },
    data: { metrics: [], params: [], tags: [] },
  },
];

describe('RunList', () => {
  it('should show loading state', () => {
    const { getByTestId } = render(
      <RunList runs={[]} loading={true} error={null} />
    );

    expect(getByTestId('run-list-loading').textContent).toContain('Loading');
  });

  it('should show error state', () => {
    const { getByTestId } = render(
      <RunList runs={[]} loading={false} error="Network error" />
    );

    expect(getByTestId('run-list-error').textContent).toContain('Network error');
  });

  it('should show empty state', () => {
    const { getByTestId } = render(
      <RunList runs={[]} loading={false} error={null} />
    );

    expect(getByTestId('run-list-empty').textContent).toContain('No runs');
  });

  it('should render run rows', () => {
    const { getAllByTestId, getByTestId } = render(
      <RunList runs={MOCK_RUNS} loading={false} error={null} />
    );

    expect(getByTestId('run-list')).toBeDefined();
    expect(getAllByTestId('run-row')).toHaveLength(2);
  });

  it('should display run IDs and status badges', () => {
    const { getAllByTestId } = render(
      <RunList runs={MOCK_RUNS} loading={false} error={null} />
    );

    const rows = getAllByTestId('run-row');
    expect(rows[0].textContent).toContain('run-1');
    expect(rows[1].textContent).toContain('run-2');
  });

  it('should call onSelectRun when row clicked', () => {
    const onSelect = vi.fn();
    const { getAllByTestId } = render(
      <RunList runs={MOCK_RUNS} loading={false} error={null} onSelectRun={onSelect} />
    );

    fireEvent.click(getAllByTestId('run-row')[0]);

    expect(onSelect).toHaveBeenCalledWith('run-1');
  });

  it('should show duration for completed runs', () => {
    const { getAllByTestId } = render(
      <RunList runs={MOCK_RUNS} loading={false} error={null} />
    );

    const rows = getAllByTestId('run-row');
    expect(rows[0].textContent).toContain('1m');
    expect(rows[1].textContent).toContain('-'); // no endTime
  });
});
