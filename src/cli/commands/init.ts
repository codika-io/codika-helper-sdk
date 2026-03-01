/**
 * Init Command
 *
 * Scaffolds a new use case folder with config.ts, workflow JSONs,
 * version.json, and optionally creates a project on the platform.
 *
 * Usage:
 *   codika-helper init <path> --name "My Use Case"
 *   codika-helper init <path> --name "My Use Case" --no-project
 *   codika-helper init <path> --name "My Use Case" --project-id abc123
 */

import { Command } from 'commander';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';
import { createInterface } from 'readline';
import { toSlug } from '../templates/slug.js';
import { generateConfigTs } from '../templates/config-template.js';
import {
  generateMainWorkflow,
  generateScheduledWorkflow,
  generateSubWorkflow,
} from '../templates/workflow-templates.js';
import { writeVersion } from '../../utils/version-manager.js';
import { writeProjectJson } from '../../utils/project-json.js';
import {
  createProject,
  isCreateProjectSuccess,
} from '../../utils/project-client.js';
import {
  resolveApiKey,
  resolveEndpointUrl,
  getActiveProfile,
} from '../../utils/config.js';

interface InitOptions {
  name?: string;
  description?: string;
  icon?: string;
  project?: boolean; // Commander inverts --no-project to project: false
  projectId?: string;
  apiUrl?: string;
  apiKey?: string;
  json?: boolean;
}

export const initCommand = new Command('init')
  .description('Scaffold a new use case folder')
  .argument('<path>', 'Directory to create the use case in')
  .option('--name <name>', 'Use case display name')
  .option('--description <desc>', 'Use case description')
  .option('--icon <icon>', 'Lucide icon name (default: Workflow)')
  .option('--no-project', 'Skip project creation on the platform')
  .option('--project-id <id>', 'Use existing project ID instead of creating one')
  .option('--api-url <url>', 'Override API URL')
  .option('--api-key <key>', 'Override API key')
  .option('--json', 'Output result as JSON')
  .action(async (pathArg: string, options: InitOptions) => {
    try {
      await runInit(pathArg, options);
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({
          success: false,
          error: { message: error instanceof Error ? error.message : String(error) },
        }, null, 2));
      } else {
        console.error(`\x1b[31mError:\x1b[0m ${error instanceof Error ? error.message : error}`);
      }
      process.exit(1);
    }
  });

async function runInit(pathArg: string, options: InitOptions): Promise<void> {
  const targetPath = resolve(pathArg);

  // Check if path already contains a config.ts (idempotency guard)
  if (existsSync(join(targetPath, 'config.ts'))) {
    exitWithError(`Directory already contains a config.ts: ${targetPath}`);
  }

  // Get name — interactive prompt if not provided
  let name = options.name;
  if (!name) {
    name = await promptText('Use case name: ');
    if (!name || !name.trim()) {
      exitWithError('Use case name is required.');
    }
    name = name.trim();
  }

  const slug = toSlug(name);
  const description = options.description || `A Codika use case for ${name}`;
  const icon = options.icon || 'Workflow';

  if (!options.json) {
    console.log('');
    console.log(`Creating use case "${name}"...`);
    console.log('');
  }

  // Create directory structure
  mkdirSync(join(targetPath, 'workflows'), { recursive: true });

  const createdFiles: string[] = [];

  // Generate and write config.ts
  const configContent = generateConfigTs({ name, slug, description, icon });
  writeFileSync(join(targetPath, 'config.ts'), configContent);
  createdFiles.push('config.ts');

  // Generate and write workflow files
  const mainWorkflow = generateMainWorkflow(slug);
  writeFileSync(
    join(targetPath, 'workflows/main-workflow.json'),
    JSON.stringify(mainWorkflow, null, 2) + '\n'
  );
  createdFiles.push('workflows/main-workflow.json');

  const scheduledWorkflow = generateScheduledWorkflow(slug);
  writeFileSync(
    join(targetPath, 'workflows/scheduled-report.json'),
    JSON.stringify(scheduledWorkflow, null, 2) + '\n'
  );
  createdFiles.push('workflows/scheduled-report.json');

  const subWorkflow = generateSubWorkflow();
  writeFileSync(
    join(targetPath, 'workflows/text-processor.json'),
    JSON.stringify(subWorkflow, null, 2) + '\n'
  );
  createdFiles.push('workflows/text-processor.json');

  // Write version.json
  writeVersion(targetPath, '1.0.0');
  createdFiles.push('version.json');

  // Handle project creation
  let projectId: string | undefined;
  let organizationId: string | undefined;
  let projectSkipped = false;
  let projectSkipReason: string | undefined;

  if (options.projectId) {
    // Use existing project ID
    projectId = options.projectId;
    writeProjectJson(targetPath, { projectId });
    createdFiles.push('project.json');
  } else if (options.project !== false) {
    // Try to create project on the platform
    const apiKey = resolveApiKey(options.apiKey);

    if (!apiKey) {
      projectSkipped = true;
      projectSkipReason = 'No API key found. Run `codika-helper project create --name \'...\' --path .` later.';
    } else {
      const apiUrl = resolveEndpointUrl('createProject', options.apiUrl);

      const result = await createProject({
        name,
        apiUrl,
        apiKey,
      });

      if (isCreateProjectSuccess(result)) {
        projectId = result.data.projectId;
        organizationId = getActiveProfile()?.profile.organizationId;
        const projectData: { projectId: string; organizationId?: string } = { projectId };
        if (organizationId) {
          projectData.organizationId = organizationId;
        }
        writeProjectJson(targetPath, projectData);
        createdFiles.push('project.json');
      } else {
        projectSkipped = true;
        projectSkipReason = `Project creation failed: ${
          'error' in result ? result.error.message : 'Unknown error'
        }. Run \`codika-helper project create --name '...' --path .\` later.`;
      }
    }
  } else {
    projectSkipped = true;
    projectSkipReason = '--no-project flag was set';
  }

  // Output results
  if (options.json) {
    console.log(JSON.stringify({
      success: true,
      path: targetPath,
      name,
      slug,
      files: createdFiles,
      project: projectId ? { projectId, organizationId } : null,
      projectSkipped,
      projectSkipReason: projectSkipped ? projectSkipReason : undefined,
    }, null, 2));
  } else {
    console.log('  Scaffolding files:');
    for (const file of createdFiles) {
      console.log(`    \x1b[32m✓\x1b[0m ${file}`);
    }

    if (projectSkipped && projectSkipReason) {
      console.log('');
      console.log(`  \x1b[33m⚠ ${projectSkipReason}\x1b[0m`);
    }

    if (projectId) {
      console.log('');
      console.log(`  Project ID: ${projectId}`);
    }

    console.log('');
    console.log('\x1b[32m✓ Done!\x1b[0m Next steps:');
    console.log('');
    console.log(`  1. Edit the workflow JSON files in ${pathArg}/workflows/`);
    console.log(`  2. Update config.ts with your schemas and metadata`);
    console.log(`  3. Run: codika-helper verify use-case ${pathArg}`);
    console.log(`  4. Run: codika-helper deploy use-case ${pathArg}`);
    console.log('');
  }

  process.exit(0);
}

/**
 * Interactive text prompt (no masking).
 */
function promptText(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function exitWithError(message: string): never {
  console.error(`\x1b[31mError:\x1b[0m ${message}`);
  process.exit(2);
}
