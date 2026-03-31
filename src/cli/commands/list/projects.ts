/**
 * List Projects Command
 *
 * Lists projects for the authenticated organization.
 */

import { Command } from 'commander';
import {
  listProjectsOrThrow,
  type ListProjectsSuccessResponse,
  type ProjectSummary,
} from '../../../utils/list-projects-client.js';
import { resolveApiKey, resolveEndpointUrl, API_KEY_MISSING_MESSAGE } from '../../../utils/config.js';

export const projectsCommand = new Command('projects')
  .description('List projects for the organization')
  .option('--archived', 'Show archived projects instead of active ones')
  .option('--limit <n>', 'Number of results (default: 50, max: 100)')
  .option('--api-url <url>', 'Override API URL')
  .option('--api-key <key>', 'Override API key')
  .option('--json', 'Output result as JSON')
  .option('--profile <name>', 'Use a specific profile instead of the active one')
  .action(async (options: ListProjectsCommandOptions) => {
    try {
      await runListProjects(options);
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

interface ListProjectsCommandOptions {
  archived?: boolean;
  limit?: string;
  apiUrl?: string;
  apiKey?: string;
  json?: boolean;
  profile?: string;
}

async function runListProjects(options: ListProjectsCommandOptions): Promise<void> {
  // Resolve API key
  const apiKey = resolveApiKey(options.apiKey, options.profile);
  if (!apiKey) {
    exitWithError(API_KEY_MISSING_MESSAGE);
  }

  // Resolve API URL
  const apiUrl = resolveEndpointUrl('listProjects', options.apiUrl, options.profile);

  // Parse limit
  let limit: number | undefined;
  if (options.limit) {
    limit = parseInt(options.limit, 10);
    if (isNaN(limit) || limit < 1) {
      exitWithError('Invalid limit. Must be a positive integer.');
    }
  }

  if (!options.json) {
    console.log('\nFetching projects...');
    console.log('');
  }

  const result = await listProjectsOrThrow({
    apiUrl,
    apiKey,
    archived: options.archived,
    limit,
  });

  // --json: structured JSON output
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  }

  // Default: formatted table
  printProjectTable(result);
  process.exit(0);
}

function printProjectTable(result: ListProjectsSuccessResponse): void {
  const { projects, organizationId } = result.data;

  if (projects.length === 0) {
    console.log(`\x1b[33m● No projects found\x1b[0m`);
    console.log('');
    return;
  }

  console.log(`\x1b[32m● Projects\x1b[0m (${organizationId})`);
  console.log('');

  // Column headers
  const nameW = 34;
  const statusW = 14;
  const publishedW = 11;
  const createdW = 12;

  console.log(
    `  ${'Name'.padEnd(nameW)}${'Status'.padEnd(statusW)}${'Published'.padEnd(publishedW)}${'Created'.padEnd(createdW)}`,
  );
  console.log(
    `  ${'─'.repeat(nameW)}${'─'.repeat(statusW)}${'─'.repeat(publishedW)}${'─'.repeat(createdW)}`,
  );

  for (const project of projects) {
    const name = truncate(project.name, nameW - 2).padEnd(nameW);
    const status = formatStatus(project).padEnd(statusW);
    const published = (project.hasPublishedProcess ? 'yes' : 'no').padEnd(publishedW);
    const created = project.createdAt
      ? new Date(project.createdAt).toISOString().slice(0, 10)
      : '—';

    console.log(`  ${name}${status}${published}${created}`);
  }

  console.log('');
  console.log(`  Showing ${projects.length} project${projects.length !== 1 ? 's' : ''}`);
  console.log('');
}

function formatStatus(project: ProjectSummary): string {
  if (project.archived) return '📦 archived';
  switch (project.status) {
    case 'completed': return '\x1b[32m✓ completed\x1b[0m';
    case 'in_progress': return '\x1b[36m● in_progress\x1b[0m';
    case 'draft': return '\x1b[33m○ draft\x1b[0m';
    default: return project.status;
  }
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

function exitWithError(message: string): never {
  console.error(`\x1b[31mError:\x1b[0m ${message}`);
  process.exit(2);
}
