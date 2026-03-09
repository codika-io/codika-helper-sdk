/**
 * Deploy Command
 *
 * Parent command that contains subcommands for deploying
 * use cases, data ingestion configurations, and documents.
 *
 * Usage:
 *   codika deploy use-case <path>
 *   codika deploy process-data-ingestion <path>
 *   codika deploy documents <path>
 */

import { Command } from 'commander';
import { useCaseCommand } from './use-case.js';
import { processDataIngestionCommand } from './process-data-ingestion.js';
import { documentsCommand } from './documents.js';

export const deployCommand = new Command('deploy')
  .description('Deploy use cases, data ingestion, and documents to the Codika platform')
  .addCommand(useCaseCommand)
  .addCommand(processDataIngestionCommand)
  .addCommand(documentsCommand);
