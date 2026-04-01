/**
 * Docs Command
 *
 * Parent command for managing agent documents (project knowledge base).
 *
 * Usage:
 *   codika docs upsert <projectId> --type <type> --title "..." --content "..." --summary "..."
 *   codika docs list <projectId> [--type <type>]
 *   codika docs get <projectId> --type <type> [--version <version>] [--history]
 */

import { Command } from 'commander';
import { upsertCommand } from './upsert.js';
import { docsListCommand } from './list.js';
import { docsGetCommand } from './get.js';

export const docsCommand = new Command('docs')
  .description('Manage agent documents (project knowledge base)')
  .addCommand(upsertCommand)
  .addCommand(docsListCommand)
  .addCommand(docsGetCommand);
