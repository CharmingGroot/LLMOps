import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PipelineEvent } from '@llmops/core';
import { EventBus } from '../src/events/event-bus.js';

vi.mock('@llmops/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@llmops/core')>();
  return {
    ...original,
    logDebug: vi.fn(),
  };
});

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  describe('on / emit', () => {
    it('should register handler and receive events', () => {
      const handler = vi.fn();
      bus.on(PipelineEvent.PIPELINE_STARTED, handler);

      const data = { runId: 'run-1', timestamp: new Date() };
      bus.emit(PipelineEvent.PIPELINE_STARTED, data);

      expect(handler).toHaveBeenCalledWith(data);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should support multiple handlers for same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      bus.on(PipelineEvent.STAGE_STARTED, handler1);
      bus.on(PipelineEvent.STAGE_STARTED, handler2);

      bus.emit(PipelineEvent.STAGE_STARTED, { runId: 'r1', timestamp: new Date() });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should not trigger handlers for different events', () => {
      const handler = vi.fn();
      bus.on(PipelineEvent.PIPELINE_STARTED, handler);

      bus.emit(PipelineEvent.PIPELINE_FAILED, { runId: 'r1', timestamp: new Date() });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('off', () => {
    it('should unregister a handler', () => {
      const handler = vi.fn();
      bus.on(PipelineEvent.STAGE_COMPLETED, handler);
      bus.off(PipelineEvent.STAGE_COMPLETED, handler);

      bus.emit(PipelineEvent.STAGE_COMPLETED, { runId: 'r1', timestamp: new Date() });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('once', () => {
    it('should only fire handler once', () => {
      const handler = vi.fn();
      bus.once(PipelineEvent.METRIC_LOGGED, handler);

      const data = { runId: 'r1', timestamp: new Date() };
      bus.emit(PipelineEvent.METRIC_LOGGED, data);
      bus.emit(PipelineEvent.METRIC_LOGGED, data);

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('removeAllListeners', () => {
    it('should remove all listeners for a specific event', () => {
      const h1 = vi.fn();
      const h2 = vi.fn();
      bus.on(PipelineEvent.PIPELINE_STARTED, h1);
      bus.on(PipelineEvent.PIPELINE_FAILED, h2);

      bus.removeAllListeners(PipelineEvent.PIPELINE_STARTED);

      bus.emit(PipelineEvent.PIPELINE_STARTED, { runId: 'r1', timestamp: new Date() });
      bus.emit(PipelineEvent.PIPELINE_FAILED, { runId: 'r1', timestamp: new Date() });

      expect(h1).not.toHaveBeenCalled();
      expect(h2).toHaveBeenCalledTimes(1);
    });

    it('should remove all listeners when no event specified', () => {
      const h1 = vi.fn();
      const h2 = vi.fn();
      bus.on(PipelineEvent.PIPELINE_STARTED, h1);
      bus.on(PipelineEvent.PIPELINE_FAILED, h2);

      bus.removeAllListeners();

      bus.emit(PipelineEvent.PIPELINE_STARTED, { runId: 'r1', timestamp: new Date() });
      bus.emit(PipelineEvent.PIPELINE_FAILED, { runId: 'r1', timestamp: new Date() });

      expect(h1).not.toHaveBeenCalled();
      expect(h2).not.toHaveBeenCalled();
    });
  });

  describe('listenerCount', () => {
    it('should return correct count', () => {
      expect(bus.listenerCount(PipelineEvent.PIPELINE_STARTED)).toBe(0);

      bus.on(PipelineEvent.PIPELINE_STARTED, vi.fn());
      bus.on(PipelineEvent.PIPELINE_STARTED, vi.fn());

      expect(bus.listenerCount(PipelineEvent.PIPELINE_STARTED)).toBe(2);
    });
  });
});
