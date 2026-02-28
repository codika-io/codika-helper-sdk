/**
 * Create Project Command
 *
 * Creates a new project on the Codika platform via API key.
 */

import { Command } from 'commander';
import {
  createProject,
  isCreateProjectSuccess,
  isCreateProjectError,
} from '../../../utils/project-client.js';
import { resolveApiKey, resolveEndpointUrl, API_KEY_MISSING_MESSAGE } from '../../../utils/config.js';

export const createProjectCommand = new Command('create')
  .description('Create a new project on the Codika platform')
  .requiredOption('--name <name>', 'Project name')
  .option('--description <description>', 'Project description')
  .option('--template-id <templateId>', 'Template ID (defaults to platform default)')
  .option('--organization-id <organizationId>', 'Organization ID (required for admin key, derived from org API key)')
  .option('--api-url <url>', 'Codika API URL for project creation (env: CODIKA_PROJECT_API_URL)')
  .option('--api-key <key>', 'Codika API key (env: CODIKA_API_KEY)')
  .option('--json', 'Output result as JSON')
  .action(async (options: CreateProjectCommandOptions) => {
    try {
      await runCreateProject(options);
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({
          success: false,
          error: {
            message: error instanceof Error ? error.message : String(error),
          },
        }, null, 2));
      } else {
        console.error(`\x1b[31mError:\x1b[0m ${error instanceof Error ? error.message : error}`);
      }
      process.exit(1);
    }
  });

interface CreateProjectCommandOptions {
  name: string;
  description?: string;
  templateId?: string;
  organizationId?: string;
  apiUrl?: string;
  apiKey?: string;
  json?: boolean;
}

async function runCreateProject(options: CreateProjectCommandOptions): Promise<void> {
  // Resolve API URL: --api-url > CODIKA_PROJECT_API_URL env > config baseUrl + path > production default
  const apiUrl = resolveEndpointUrl('createProject', options.apiUrl);

  // Resolve API key: --api-key > CODIKA_API_KEY env > config file
  const apiKey = resolveApiKey(options.apiKey);
  if (!apiKey) {
    exitWithError(API_KEY_MISSING_MESSAGE);
  }

  if (!options.json) {
    console.log(`\nCreating project "${options.name}"...`);
  }

  const result = await createProject({
    name: options.name,
    description: options.description,
    templateId: options.templateId,
    apiUrl,
    apiKey,
    organizationId: options.organizationId,
  });

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (isCreateProjectSuccess(result)) {
    console.log('');
    console.log('\x1b[32m✓ Project Created Successfully\x1b[0m');
    console.log('');
    console.log(`  Project ID: ${result.data.projectId}`);
    console.log(`  Request ID: ${result.requestId}`);
    console.log('');
  } else if (isCreateProjectError(result)) {
    console.log('');
    console.log('\x1b[31m✗ Project Creation Failed\x1b[0m');
    console.log('');
    console.log(`  Error:      ${result.error.message}`);
    console.log(`  Request ID: ${result.requestId}`);
    console.log('');
  }

  if (isCreateProjectSuccess(result)) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

function exitWithError(message: string): never {
  console.error(`\x1b[31mError:\x1b[0m ${message}`);
  process.exit(2);
}
