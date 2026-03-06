/**
 * Error handling middleware
 */

import type { Request, Response, NextFunction } from 'express';
import { isLLMOpsError, getErrorMessage } from '@llmops/core';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (isLLMOpsError(err)) {
    res.status(400).json({
      error: err.message,
      code: err.code,
      details: err.details,
    });
    return;
  }

  res.status(500).json({
    error: getErrorMessage(err),
  });
}
