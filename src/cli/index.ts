#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning
/**
 * Codika Helper SDK CLI
 *
 * Command-line interface for deploying and managing Codika use cases.
 *
 * Usage:
 *   codika-helper <command> [options]
 *
 * Commands:
 *   deploy use-case <path>                   Deploy a use case to the Codika platform
 *   deploy process-data-ingestion <path>     Deploy a process-level data ingestion configuration
 *   verify workflow <path>                   Validate a single workflow JSON file
 *   verify use-case <path>                   Validate an entire use-case folder
 */

import { program } from 'commander';
import { createRequire } from 'module';
import { deployCommand } from './commands/deploy/index.js';
import { verifyCommand } from './commands/verify/index.js';

// Read version from package.json dynamically
const require = createRequire(import.meta.url);
const { version: VERSION } = require('../../package.json');

program
  .name('codika-helper')
  .description('Codika Helper SDK CLI - Deploy and manage use cases')
  .version(VERSION);

// Register commands
program.addCommand(deployCommand);
program.addCommand(verifyCommand);

program.parse();
