/**
 * Notes Command
 *
 * Parent command for managing project notes (project knowledge base).
 *
 * Usage:
 *   codika notes upsert <projectId> --type <type> --title "..." --content "..." --summary "..."
 *   codika notes list <projectId> [--type <type>]
 *   codika notes get <projectId> --type <type> [--version <version>] [--history]
 */

import { Command } from 'commander';
import { upsertCommand } from './upsert.js';
import { notesListCommand } from './list.js';
import { notesGetCommand } from './get.js';

export const notesCommand = new Command('notes')
  .description('Manage project notes')
  .addCommand(upsertCommand)
  .addCommand(notesListCommand)
  .addCommand(notesGetCommand);
