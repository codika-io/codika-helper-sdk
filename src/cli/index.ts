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
 *   deploy <path>           Deploy a use case to the Codika platform
 *   verify workflow <path>  Validate a single workflow JSON file
 *   verify use-case <path>  Validate an entire use-case folder
 */

import { program } from 'commander';
import { deployCommand } from './commands/deploy.js';
import { verifyCommand } from './commands/verify/index.js';

const VERSION = '1.3.0';

program
  .name('codika-helper')
  .description('Codika Helper SDK CLI - Deploy and manage use cases')
  .version(VERSION);

// Register commands
program.addCommand(deployCommand);
program.addCommand(verifyCommand);

program.parse();
