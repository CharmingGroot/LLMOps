#!/usr/bin/env node

/**
 * @llmops/cli - CLI tool for LLMOps pipeline management
 */

import { Command } from 'commander';
import { createRunCommand } from './commands/run.js';
import { createStatusCommand } from './commands/status.js';
import { createValidateCommand } from './commands/validate.js';

const CLI_VERSION = '0.1.0';

const program = new Command()
  .name('llmops')
  .description('LLMOps Pipeline Management CLI')
  .version(CLI_VERSION);

program.addCommand(createRunCommand());
program.addCommand(createStatusCommand());
program.addCommand(createValidateCommand());

program.parse();
