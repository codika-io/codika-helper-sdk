/**
 * Organization Command
 *
 * Parent command that contains subcommands for managing
 * organizations on the Codika platform.
 *
 * Usage:
 *   codika organization create --name "My Organization"
 */

import { Command } from 'commander';
import { createOrganizationCommand } from './create.js';
import { createOrganizationKeyCommand } from './create-key.js';

export const organizationCommand = new Command('organization')
  .description('Manage organizations on the Codika platform')
  .addCommand(createOrganizationCommand)
  .addCommand(createOrganizationKeyCommand);
