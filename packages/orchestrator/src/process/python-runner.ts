/**
 * Python Process Runner
 */

import { spawn } from 'child_process';
import type { ModuleConfig, RunContext } from '@llmops/core';
import { StageExecutionError, logInfo, logError } from '@llmops/core';
import { StreamHandler } from './stream-handler.js';

export interface ProcessResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export class PythonRunner {
  /**
   * Run a Python module
   */
  async run(config: ModuleConfig, context: RunContext): Promise<ProcessResult> {
    logInfo('Starting Python process', {
      entrypoint: config.entrypoint,
      runId: context.runId,
    });

    // Build command arguments
    const args = [
      config.entrypoint,
      '--run-id',
      context.runId,
      '--mlflow-tracking-uri',
      context.config.mlflow.trackingUri,
      '--experiment-id',
      context.experimentId,
      ...(config.args || []),
    ];

    // Build environment
    const env = {
      ...process.env,
      ...config.env,
      MLFLOW_TRACKING_URI: context.config.mlflow.trackingUri,
      MLFLOW_EXPERIMENT_NAME: context.config.mlflow.experimentName,
      LLMOPS_RUN_ID: context.runId,
      LLMOPS_PIPELINE_ID: context.pipelineId,
    };

    // Spawn process
    const childProcess = spawn('python', args, {
      cwd: config.workingDir || process.cwd(),
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Handle stdout/stderr
    const streamHandler = new StreamHandler(context);
    let stdout = '';
    let stderr = '';

    childProcess.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      stdout += text;
      streamHandler.handleStdout(text);
    });

    childProcess.stderr.on('data', (data: Buffer) => {
      const text = data.toString();
      stderr += text;
      streamHandler.handleStderr(text);
    });

    // Wait for process to complete
    return new Promise((resolve, reject) => {
      childProcess.on('exit', (code, signal) => {
        const exitCode = code ?? -1;

        if (exitCode === 0) {
          logInfo('Python process completed successfully', {
            entrypoint: config.entrypoint,
            runId: context.runId,
            exitCode,
          });
          resolve({ exitCode, stdout, stderr });
        } else {
          const error = new StageExecutionError(
            config.entrypoint,
            `Python process failed with exit code ${exitCode}`,
            exitCode,
            { signal, stdout: stdout.substring(-500), stderr: stderr.substring(-500) }
          );
          logError(error, { runId: context.runId });
          reject(error);
        }
      });

      childProcess.on('error', (error) => {
        const execError = new StageExecutionError(
          config.entrypoint,
          `Failed to spawn Python process: ${error.message}`,
          undefined,
          { originalError: error }
        );
        logError(execError, { runId: context.runId });
        reject(execError);
      });
    });
  }

  /**
   * Run with timeout
   */
  async runWithTimeout(
    config: ModuleConfig,
    context: RunContext,
    timeoutMs: number
  ): Promise<ProcessResult> {
    return Promise.race([
      this.run(config, context),
      new Promise<ProcessResult>((_, reject) => {
        setTimeout(() => {
          reject(
            new StageExecutionError(
              config.entrypoint,
              `Process timed out after ${timeoutMs}ms`,
              -1,
              { timeout: timeoutMs }
            )
          );
        }, timeoutMs);
      }),
    ]);
  }
}
