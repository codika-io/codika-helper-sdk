/**
 * Rerun Command
 *
 * Parent command for re-running existing deployments.
 *
 * Usage:
 *   codika rerun deployment [options]
 */

import { Command } from 'commander';
import { deploymentCommand } from './deployment.js';

export const rerunCommand = new Command('rerun')
  .description('Rerun an existing deployment with refreshed credentials and optional parameter overrides')
  .addCommand(deploymentCommand);
