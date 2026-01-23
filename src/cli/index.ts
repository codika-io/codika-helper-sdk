#!/usr/bin/env node
/**
 * Codika Helper SDK CLI
 *
 * Command-line interface for deploying and managing Codika use cases.
 *
 * Usage:
 *   codika-helper <command> [options]
 *
 * Commands:
 *   deploy <path>   Deploy a use case to the Codika platform
 *   verify <path>   Validate a use case structure (coming soon)
 */

import { program } from 'commander';
import { deployCommand } from './commands/deploy.js';
import { verifyCommand } from './commands/verify.js';

const VERSION = '1.2.0';

program
  .name('codika-helper')
  .description('Codika Helper SDK CLI - Deploy and manage use cases')
  .version(VERSION);

// Register commands
program.addCommand(deployCommand);
program.addCommand(verifyCommand);

program.parse();
