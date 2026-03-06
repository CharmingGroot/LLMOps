/**
 * Event Bus Implementation
 */

import { EventEmitter } from 'events';
import type { EventBus as IEventBus, PipelineEvent, EventData, EventHandler } from '@llmops/core';
import { logDebug } from '@llmops/core';

export class EventBus implements IEventBus {
  private emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(100); // Allow many listeners
  }

  on<T extends EventData>(event: PipelineEvent, handler: EventHandler<T>): void {
    this.emitter.on(event, handler as any);
    logDebug('Event handler registered', { event });
  }

  off<T extends EventData>(event: PipelineEvent, handler: EventHandler<T>): void {
    this.emitter.off(event, handler as any);
    logDebug('Event handler unregistered', { event });
  }

  emit<T extends EventData>(event: PipelineEvent, data: T): void {
    logDebug('Event emitted', { event, runId: data.runId });
    this.emitter.emit(event, data);
  }

  once<T extends EventData>(event: PipelineEvent, handler: EventHandler<T>): void {
    this.emitter.once(event, handler as any);
    logDebug('One-time event handler registered', { event });
  }

  removeAllListeners(event?: PipelineEvent): void {
    if (event) {
      this.emitter.removeAllListeners(event);
    } else {
      this.emitter.removeAllListeners();
    }
  }

  listenerCount(event: PipelineEvent): number {
    return this.emitter.listenerCount(event);
  }
}
