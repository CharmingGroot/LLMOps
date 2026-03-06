// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { ConnectionIndicator } from '../src/components/ConnectionIndicator.js';

describe('ConnectionIndicator', () => {
  it('should show connected status', () => {
    const { getByTestId } = render(<ConnectionIndicator status="connected" />);

    expect(getByTestId('connection-label').textContent).toBe('Connected');
    expect(getByTestId('connection-dot').style.backgroundColor).toBe('rgb(34, 197, 94)');
  });

  it('should show connecting status', () => {
    const { getByTestId } = render(<ConnectionIndicator status="connecting" />);

    expect(getByTestId('connection-label').textContent).toBe('Connecting...');
  });

  it('should show disconnected status with reconnect button', () => {
    const onReconnect = vi.fn();
    const { getByTestId } = render(
      <ConnectionIndicator status="disconnected" onReconnect={onReconnect} />
    );

    expect(getByTestId('connection-label').textContent).toBe('Disconnected');
    const button = getByTestId('reconnect-button');
    expect(button).toBeDefined();

    fireEvent.click(button);
    expect(onReconnect).toHaveBeenCalledTimes(1);
  });

  it('should show error status with reconnect button', () => {
    const onReconnect = vi.fn();
    const { getByTestId } = render(
      <ConnectionIndicator status="error" onReconnect={onReconnect} />
    );

    expect(getByTestId('connection-label').textContent).toBe('Connection Error');
    expect(getByTestId('reconnect-button')).toBeDefined();
  });

  it('should not show reconnect button when connected', () => {
    const { queryByTestId } = render(
      <ConnectionIndicator status="connected" onReconnect={vi.fn()} />
    );

    expect(queryByTestId('reconnect-button')).toBeNull();
  });

  it('should not show reconnect button when no handler provided', () => {
    const { queryByTestId } = render(
      <ConnectionIndicator status="disconnected" />
    );

    expect(queryByTestId('reconnect-button')).toBeNull();
  });
});
