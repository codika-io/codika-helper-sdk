/**
 * Create Project Command
 *
 * Creates a new project on the Codika platform via API key.
 */

import { Command } from 'commander';
import { resolve } from 'path';
import {
  createProject,
  isCreateProjectSuccess,
  isCreateProjectError,
} from '../../../utils/project-client.js';
import { resolveApiKey, resolveEndpointUrl, getActiveProfile, API_KEY_MISSING_MESSAGE } from '../../../utils/config.js';
import { writeProjectJson } from '../../../utils/project-json.js';
import type { ProjectJson } from '../../../utils/project-json.js';

export const createProjectCommand = new Command('create')
  .description('Create a new project on the Codika platform')
  .requiredOption('--name <name>', 'Project name')
  .option('--description <description>', 'Project description')
  .option('--template-id <templateId>', 'Template ID (defaults to platform default)')
  .option('--organization-id <organizationId>', 'Organization ID (required for admin key, derived from org API key)')
  .option('--path <dir>', 'Write project.json into this directory after creation')
  .option('--project-file <path>', 'Custom filename for project file (default: project.json)')
  .option('--api-url <url>', 'Override API URL')
  .option('--api-key <key>', 'Override API key')
  .option('--json', 'Output as JSON')
  .option('--profile <name>', 'Use a specific profile')
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
  path?: string;
  projectFile?: string;
  apiUrl?: string;
  apiKey?: string;
  json?: boolean;
  profile?: string;
}

async function runCreateProject(options: CreateProjectCommandOptions): Promise<void> {
  // Resolve API URL: --api-url > config baseUrl + path > production default
  const apiUrl = resolveEndpointUrl('createProject', options.apiUrl, options.profile);

  // Resolve API key: --api-key > CODIKA_API_KEY env > config file
  const apiKey = resolveApiKey(options.apiKey, options.profile);
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

  // Write project.json if --path was provided and creation succeeded
  let projectJsonPath: string | undefined;
  if (options.path && isCreateProjectSuccess(result)) {
    const dirPath = resolve(options.path);
    const projectData: ProjectJson = { projectId: result.data.projectId };

    // Include organizationId from --organization-id flag or active profile
    const orgId = options.organizationId || getActiveProfile()?.profile.organizationId;
    if (orgId) {
      projectData.organizationId = orgId;
    }

    projectJsonPath = writeProjectJson(dirPath, projectData, options.projectFile);
  }

  if (options.json) {
    console.log(JSON.stringify({
      ...result,
      ...(projectJsonPath && { projectJsonPath }),
    }, null, 2));
  } else if (isCreateProjectSuccess(result)) {
    console.log('');
    console.log('\x1b[32m✓ Project Created Successfully\x1b[0m');
    console.log('');
    console.log(`  Project ID: ${result.data.projectId}`);
    console.log(`  Request ID: ${result.requestId}`);
    if (projectJsonPath) {
      console.log(`  Wrote project.json to ${projectJsonPath}`);
    }
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
