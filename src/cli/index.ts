#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning
/**
 * Codika SDK CLI
 *
 * Command-line interface for deploying and managing Codika use cases.
 *
 * Usage:
 *   codika <command> [options]
 *
 * Commands:
 *   login                                       Save API key (alias for config set)
 *   init <path>                                 Scaffold a new use case folder
 *   config set|show|clear                       Manage CLI configuration
 *   deploy use-case <path>                      Deploy a use case to the Codika platform
 *   deploy process-data-ingestion <path>        Deploy a process-level data ingestion configuration
 *   project create --name "..."                 Create a new project
 *   verify workflow <path>                      Validate a single workflow JSON file
 *   verify use-case <path>                      Validate an entire use-case folder
 *   publish <templateId>                        Publish a deployment to production
 *   redeploy                                    Redeploy a deployment instance with parameter overrides
 *   list executions <processInstanceId>         List recent executions
 */

import { program, Command } from 'commander';
import { createRequire } from 'module';
import { deployCommand } from './commands/deploy/index.js';
import { getCommand } from './commands/get/index.js';
import { projectCommand } from './commands/project/index.js';
import { verifyCommand } from './commands/verify/index.js';
import { configCommand, runConfigSet } from './commands/config/index.js';
import { triggerCommand } from './commands/trigger.js';
import { whoamiCommand } from './commands/whoami.js';
import { useCommand } from './commands/use.js';
import { logoutCommand } from './commands/logout.js';
import { initCommand } from './commands/init.js';
import { statusCommand } from './commands/status.js';
import { completionCommand } from './commands/completion.js';
import { publishCommand } from './commands/publish.js';
import { redeployCommand } from './commands/redeploy.js';
import { listCommand } from './commands/list/index.js';
import { integrationCommand } from './commands/integration/index.js';
import { checkProfileExpiry } from '../utils/config.js';

// Read version from package.json dynamically
const require = createRequire(import.meta.url);
const { version: VERSION } = require('../../package.json');

program
  .name('codika')
  .description('Codika CLI - Deploy and manage use cases')
  .version(VERSION, '-V, --cli-version');

// Register commands
program.addCommand(deployCommand);
program.addCommand(getCommand);
program.addCommand(projectCommand);
program.addCommand(verifyCommand);
program.addCommand(configCommand);
program.addCommand(triggerCommand);

// Top-level `login` alias for `config set`
const loginCommand = new Command('login')
  .description('Save API key (alias for "config set")')
  .option('--api-key <key>', 'API key (skips interactive prompt)')
  .option('--base-url <url>', 'Base URL override (default: production)')
  .option('--name <name>', 'Custom profile name (auto-derived if omitted)')
  .option('--skip-verify', 'Save without verifying the key')
  .action(async (options) => {
    await runConfigSet(options);
  });
program.addCommand(loginCommand);
program.addCommand(initCommand);
program.addCommand(whoamiCommand);
program.addCommand(useCommand);
program.addCommand(logoutCommand);
program.addCommand(statusCommand);
program.addCommand(completionCommand);
program.addCommand(publishCommand);
program.addCommand(redeployCommand);
program.addCommand(listCommand);
program.addCommand(integrationCommand);

// Profile expiry warning — runs before every command
program.hook('preAction', () => {
  const expiry = checkProfileExpiry();
  if (!expiry) return;

  if (expiry.expired) {
    process.stderr.write(
      `\x1b[33m\u26A0 API key "${expiry.profileName}" expired on ${new Date(expiry.expiresAt).toLocaleDateString()}. Run 'codika login' to refresh.\x1b[0m\n`
    );
  } else if (expiry.daysLeft <= 7) {
    process.stderr.write(
      `\x1b[33m\u26A0 API key "${expiry.profileName}" expires in ${expiry.daysLeft} day${expiry.daysLeft !== 1 ? 's' : ''}. Run 'codika login' to refresh.\x1b[0m\n`
    );
  }
});

program.parse();
