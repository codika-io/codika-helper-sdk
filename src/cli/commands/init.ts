/**
 * Init Command
 *
 * Scaffolds a new use case folder with config.ts, workflow JSONs,
 * version.json, and optionally creates a project on the platform.
 *
 * Usage:
 *   codika init <path> --name "My Use Case"
 *   codika init <path> --name "My Use Case" --no-project
 *   codika init <path> --name "My Use Case" --project-id abc123
 */

import { Command } from 'commander';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, join, dirname, parse, relative } from 'path';
import { createRequire } from 'module';
import { createInterface } from 'readline';
import { toSlug } from '../templates/slug.js';
import { generateClaudeMd } from '../templates/claude-md-template.js';
import { generateConfigTs } from '../templates/config-template.js';
import {
  generateMainWorkflow,
  generateScheduledWorkflow,
  generateSubWorkflow,
  generateDataIngestionWorkflow,
} from '../templates/workflow-templates.js';
import {
  generateMainWorkflowSkill,
  generateScheduledReportSkill,
} from '../templates/skill-templates.js';
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

const require = createRequire(import.meta.url);
const { version: CLI_VERSION } = require('../../../package.json');

interface InitOptions {
  name?: string;
  description?: string;
  icon?: string;
  project?: boolean; // Commander inverts --no-project to project: false
  projectId?: string;
  install?: boolean; // Commander inverts --no-install to install: false
  withDataIngestion?: boolean;
  projectFile?: string;
  apiUrl?: string;
  apiKey?: string;
  json?: boolean;
  profile?: string;
}

export const initCommand = new Command('init')
  .description('Scaffold a new use case folder')
  .argument('<path>', 'Directory to create the use case in')
  .option('--name <name>', 'Use case display name')
  .option('--description <desc>', 'Use case description')
  .option('--icon <icon>', 'Lucide icon name (default: Workflow)')
  .option('--no-project', 'Skip project creation on the platform')
  .option('--project-id <id>', 'Use existing project ID instead of creating one')
  .option('--no-install', 'Skip npm install after scaffolding')
  .option('--with-data-ingestion', 'Scaffold a data-ingestion/ folder with a template embedding workflow')
  .option('--project-file <path>', 'Custom filename for the project file (default: project.json)')
  .option('--api-url <url>', 'Override API URL')
  .option('--api-key <key>', 'Override API key')
  .option('--json', 'Output result as JSON')
  .option('--profile <name>', 'Use a specific profile instead of the active one')
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
  const configContent = generateConfigTs({ name, slug, description, icon, withDataIngestion: options.withDataIngestion });
  writeFileSync(join(targetPath, 'config.ts'), configContent);
  createdFiles.push('config.ts');

  // Generate and write CLAUDE.md
  const claudeMdContent = generateClaudeMd({ name, slug });
  writeFileSync(join(targetPath, 'CLAUDE.md'), claudeMdContent);
  createdFiles.push('CLAUDE.md');

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

  // Generate and write skill files (Claude Agent Skills format)
  mkdirSync(join(targetPath, 'skills/main-workflow'), { recursive: true });
  mkdirSync(join(targetPath, 'skills/scheduled-report'), { recursive: true });

  const mainSkill = generateMainWorkflowSkill({ slug, name });
  writeFileSync(join(targetPath, 'skills/main-workflow/SKILL.md'), mainSkill);
  createdFiles.push('skills/main-workflow/SKILL.md');

  const reportSkill = generateScheduledReportSkill({ slug, name });
  writeFileSync(join(targetPath, 'skills/scheduled-report/SKILL.md'), reportSkill);
  createdFiles.push('skills/scheduled-report/SKILL.md');

  // Optionally create data-ingestion/ folder
  if (options.withDataIngestion) {
    mkdirSync(join(targetPath, 'data-ingestion'), { recursive: true });
    const diWorkflow = generateDataIngestionWorkflow(slug);
    const diFilename = `${slug}-embedding-ingestion.json`;
    writeFileSync(
      join(targetPath, 'data-ingestion', diFilename),
      JSON.stringify(diWorkflow, null, 2) + '\n'
    );
    createdFiles.push(`data-ingestion/${diFilename}`);
  }

  // Write version.json
  writeVersion(targetPath, '1.0.0');
  createdFiles.push('version.json');

  // Handle project creation
  let projectId: string | undefined;
  let organizationId: string | undefined;
  let projectSkipped = false;
  let projectSkipReason: string | undefined;

  const projectFileName = options.projectFile || 'project.json';

  if (options.projectId) {
    // Use existing project ID
    projectId = options.projectId;
    writeProjectJson(targetPath, { projectId }, options.projectFile);
    createdFiles.push(projectFileName);
  } else if (options.project !== false) {
    // Try to create project on the platform
    const apiKey = resolveApiKey(options.apiKey, options.profile);

    if (!apiKey) {
      projectSkipped = true;
      projectSkipReason = 'No API key found. Run `codika project create --name \'...\' --path .` later.';
    } else {
      const apiUrl = resolveEndpointUrl('createProject', options.apiUrl, options.profile);

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
        writeProjectJson(targetPath, projectData, options.projectFile);
        createdFiles.push(projectFileName);
      } else {
        projectSkipped = true;
        projectSkipReason = `Project creation failed: ${
          'error' in result ? result.error.message : 'Unknown error'
        }. Run \`codika project create --name '...' --path .\` later.`;
      }
    }
  } else {
    projectSkipped = true;
    projectSkipReason = '--no-project flag was set';
  }

  // Handle workspace setup (package.json, tsconfig.json, .gitignore, npm install)
  const existingWorkspace = findExistingWorkspace(targetPath);
  let workspaceCreated = false;
  let npmInstallResult: 'success' | 'skipped' | 'failed' = 'skipped';
  let npmInstallError: string | undefined;

  if (existingWorkspace) {
    if (!options.json) {
      const relPath = relative(targetPath, existingWorkspace) || '.';
      console.log(`  Using workspace at ${relPath}/package.json`);
    }
  } else {
    // Create package.json
    const majorMinor = CLI_VERSION.replace(/\.\d+$/, '.0');
    writeFileSync(join(targetPath, 'package.json'), JSON.stringify({
      private: true,
      type: 'module',
      dependencies: {
        '@codika-io/helper-sdk': `^${majorMinor}`,
      },
    }, null, 2) + '\n');
    createdFiles.push('package.json');

    // Create .gitignore
    writeFileSync(join(targetPath, '.gitignore'), 'node_modules/\n');
    createdFiles.push('.gitignore');

    // Create tsconfig.json for IDE type-checking
    writeFileSync(join(targetPath, 'tsconfig.json'), JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        strict: true,
        noEmit: true,
      },
      include: ['config.ts'],
    }, null, 2) + '\n');
    createdFiles.push('tsconfig.json');

    workspaceCreated = true;

    // Run npm install
    if (options.install !== false) {
      if (!options.json) {
        console.log('');
        console.log('  Installing dependencies...');
      }
      try {
        execSync('npm install --no-fund --no-audit', {
          cwd: targetPath,
          stdio: options.json ? 'pipe' : 'inherit',
          timeout: 120_000,
        });
        npmInstallResult = 'success';
      } catch (e) {
        npmInstallResult = 'failed';
        npmInstallError = e instanceof Error ? e.message : String(e);
      }
    }
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
      workspace: existingWorkspace
        ? { created: false, existingWorkspacePath: existingWorkspace }
        : { created: true, path: targetPath, npmInstall: npmInstallResult },
    }, null, 2));
  } else {
    console.log('');
    console.log('  Scaffolded files:');
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

    if (workspaceCreated) {
      console.log('');
      if (npmInstallResult === 'success') {
        console.log('  \x1b[32m✓\x1b[0m Dependencies installed');
      } else if (npmInstallResult === 'skipped') {
        console.log('  \x1b[33m⚠ npm install skipped (--no-install)\x1b[0m');
        console.log('    Run `npm install` in the use case folder before deploying.');
      } else {
        console.log(`  \x1b[31m✗ npm install failed:\x1b[0m ${npmInstallError}`);
        console.log('    Run `npm install` manually in the use case folder before deploying.');
      }
    }

    console.log('');
    console.log('\x1b[32m✓ Done!\x1b[0m Next steps:');
    console.log('');
    console.log(`  1. Edit the workflow JSON files in ${pathArg}/workflows/`);
    console.log(`  2. Edit the skill files in ${pathArg}/skills/*/SKILL.md`);
    console.log(`  3. Update config.ts with your schemas and metadata`);
    console.log(`  4. Run: codika verify use-case ${pathArg}`);
    console.log(`  5. Run: codika deploy use-case ${pathArg}`);
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

/**
 * Walk up the directory tree looking for a package.json that
 * includes @codika-io/helper-sdk as a dependency or devDependency.
 * Returns the directory path if found, null otherwise.
 */
function findExistingWorkspace(startPath: string): string | null {
  let dir = resolve(startPath);
  const root = parse(dir).root;

  // Start from the parent — we don't check the use case folder itself
  // because we haven't created package.json there yet
  dir = dirname(dir);

  while (dir !== root) {
    const pkgPath = join(dir, 'package.json');
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (deps['@codika-io/helper-sdk']) return dir;
      } catch {
        // Ignore malformed package.json
      }
    }
    dir = dirname(dir);
  }
  return null;
}
