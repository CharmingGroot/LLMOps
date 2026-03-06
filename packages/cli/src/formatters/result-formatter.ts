/**
 * Result Formatter - Format pipeline execution results for CLI output
 */

import type { ExecutionResult, StageExecutionInfo } from '@llmops/core';

const STATUS_ICONS: Record<string, string> = {
  success: '[OK]',
  failed: '[FAIL]',
  skipped: '[SKIP]',
  pending: '[..]',
  running: '[>>]',
};

export function formatResult(result: ExecutionResult): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(`Pipeline Execution Result`);
  lines.push('='.repeat(50));
  lines.push(`Run ID:   ${result.runId}`);
  lines.push(`Status:   ${result.status.toUpperCase()}`);
  lines.push(`Duration: ${formatDuration(result.duration)}`);
  lines.push('');
  lines.push('Stages:');
  lines.push('-'.repeat(50));

  for (const stage of result.stages) {
    lines.push(formatStage(stage));
  }

  lines.push('-'.repeat(50));

  if (result.error) {
    lines.push(`\nError: ${result.error.message}`);
  }

  return lines.join('\n');
}

function formatStage(stage: StageExecutionInfo): string {
  const icon = STATUS_ICONS[stage.status] || '[??]';
  const duration = stage.duration !== undefined ? ` (${formatDuration(stage.duration)})` : '';
  return `  ${icon} ${stage.stageName} [${stage.stageId}]${duration}`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}
