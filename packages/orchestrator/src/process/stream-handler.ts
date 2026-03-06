/**
 * Stream Handler - Captures and processes stdout/stderr
 */

import type { RunContext } from '@llmops/core';
import { logInfo, logWarn, logError as logErr } from '@llmops/core';

export class StreamHandler {
  constructor(private context: RunContext) {}

  /**
   * Handle stdout data
   */
  handleStdout(data: string): void {
    const lines = data.split('\n').filter((line) => line.trim());

    for (const line of lines) {
      // Log to console
      logInfo(line, { runId: this.context.runId });

      // Event emission for real-time streaming (to be wired via EventBus)
      // this.context.events?.emit(PipelineEvent.LOG_OUTPUT, { ... });
    }
  }

  /**
   * Handle stderr data
   */
  handleStderr(data: string): void {
    const lines = data.split('\n').filter((line) => line.trim());

    for (const line of lines) {
      // Check if it's a warning or error
      const level = this.detectLogLevel(line);

      if (level === 'error') {
        logErr(new Error(line), { runId: this.context.runId });
      } else if (level === 'warn') {
        logWarn(line, { runId: this.context.runId });
      } else {
        logInfo(line, { runId: this.context.runId });
      }

      // Event emission for real-time streaming (to be wired via EventBus)
      // this.context.events?.emit(PipelineEvent.LOG_ERROR, { ... });
    }
  }

  /**
   * Detect log level from message content
   */
  private detectLogLevel(message: string): 'info' | 'warn' | 'error' | 'debug' {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('error') || lowerMessage.includes('exception')) {
      return 'error';
    }
    if (lowerMessage.includes('warn') || lowerMessage.includes('warning')) {
      return 'warn';
    }
    if (lowerMessage.includes('debug')) {
      return 'debug';
    }
    return 'info';
  }
}
