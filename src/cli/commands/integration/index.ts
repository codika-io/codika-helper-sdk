/**
 * Integration Command
 *
 * Parent command for managing integrations via the CLI.
 *
 * Usage:
 *   codika integration set <id> --secret KEY=VALUE
 *   codika integration list [--context-type organization]
 *   codika integration delete <id> [--confirm]
 *   codika integration schema <credentialType>
 */

import { Command } from 'commander';
import { setCommand } from './set.js';
import { listSubCommand } from './list.js';
import { deleteSubCommand } from './delete.js';
import { schemaCommand } from './schema.js';

export const integrationCommand = new Command('integration')
  .description('Manage integrations (set, list, delete, schema)')
  .addCommand(setCommand)
  .addCommand(listSubCommand)
  .addCommand(deleteSubCommand)
  .addCommand(schemaCommand);
