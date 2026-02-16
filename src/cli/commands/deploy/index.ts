/**
 * Deploy Command
 *
 * Parent command that contains subcommands for deploying
 * use cases and data ingestion configurations.
 *
 * Usage:
 *   codika-helper deploy use-case <path>
 *   codika-helper deploy process-data-ingestion <path>
 */

import { Command } from 'commander';
import { useCaseCommand } from './use-case.js';
import { processDataIngestionCommand } from './process-data-ingestion.js';

export const deployCommand = new Command('deploy')
  .description('Deploy use cases and data ingestion to the Codika platform')
  .addCommand(useCaseCommand)
  .addCommand(processDataIngestionCommand);
