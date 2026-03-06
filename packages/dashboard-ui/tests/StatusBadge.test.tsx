// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { StatusBadge } from '../src/components/StatusBadge.js';

describe('StatusBadge', () => {
  it('should render success status', () => {
    const { getByTestId } = render(<StatusBadge status="success" />);
    const badge = getByTestId('status-badge');

    expect(badge.textContent).toBe('Success');
    expect(badge.style.backgroundColor).toBe('rgb(34, 197, 94)');
  });

  it('should render failed status', () => {
    const { getByTestId } = render(<StatusBadge status="failed" />);

    expect(getByTestId('status-badge').textContent).toBe('Failed');
  });

  it('should render running status', () => {
    const { getByTestId } = render(<StatusBadge status="running" />);

    expect(getByTestId('status-badge').textContent).toBe('Running');
  });

  it('should render FINISHED MLflow status', () => {
    const { getByTestId } = render(<StatusBadge status="FINISHED" />);

    expect(getByTestId('status-badge').textContent).toBe('Finished');
  });

  it('should use custom label when provided', () => {
    const { getByTestId } = render(<StatusBadge status="success" label="Custom" />);

    expect(getByTestId('status-badge').textContent).toBe('Custom');
  });

  it('should handle unknown status gracefully', () => {
    const { getByTestId } = render(<StatusBadge status="unknown_status" />);

    expect(getByTestId('status-badge').textContent).toBe('unknown_status');
  });
});
