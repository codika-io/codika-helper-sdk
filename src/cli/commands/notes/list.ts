/**
 * Notes List Command
 *
 * List project notes for a project.
 *
 * Usage:
 *   codika notes list <projectId>
 *   codika notes list <projectId> --type brief
 */

import { Command } from 'commander';
import {
  getProjectNotes,
  isGetSuccess,
} from '../../../utils/project-notes-client.js';
import { resolveApiKey, resolveEndpointUrl, API_KEY_MISSING_MESSAGE } from '../../../utils/config.js';

interface ListOptions {
  type?: string;
  apiUrl?: string;
  apiKey?: string;
  profile?: string;
  json?: boolean;
}

export const notesListCommand = new Command('list')
  .description('List project notes for a project')
  .argument('<projectId>', 'Project ID')
  .option('--type <type>', 'Filter by document type ID')
  .option('--api-url <url>', 'Override API URL')
  .option('--api-key <key>', 'Override API key')
  .option('--profile <name>', 'Use a specific profile')
  .option('--json', 'Output as JSON')
  .action(async (projectId: string, options: ListOptions) => {
    try {
      await runList(projectId, options);
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({
          success: false,
          error: { message: error instanceof Error ? error.message : String(error) },
        }, null, 2));
      } else {
        console.error(`\x1b[31mError:\x1b[0m ${error instanceof Error ? error.message : String(error)}`);
      }
      process.exit(1);
    }
  });

async function runList(projectId: string, options: ListOptions): Promise<void> {
  const apiUrl = resolveEndpointUrl('getProjectNotes', options.apiUrl, options.profile);
  const apiKey = resolveApiKey(options.apiKey, options.profile);

  if (!apiKey) {
    console.error(`\x1b[31mError:\x1b[0m ${API_KEY_MISSING_MESSAGE}`);
    process.exit(1);
  }

  const result = await getProjectNotes({
    projectId,
    documentTypeId: options.type,
    apiUrl,
    apiKey: apiKey!,
  });

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(isGetSuccess(result) ? 0 : 1);
    return;
  }

  if (isGetSuccess(result)) {
    const { documents } = result.data;
    if (documents.length === 0) {
      console.log('No project notes found.');
      return;
    }

    console.log(`Project notes for project ${projectId}:\n`);
    for (const doc of documents) {
      console.log(`  \x1b[36m${doc.documentTypeId}\x1b[0m  v${doc.version}  "${doc.title}"`);
      console.log(`    ${doc.summary}  (${doc.wordCount} words)`);
    }
    console.log(`\n${documents.length} document(s)`);
  } else {
    console.error(`\x1b[31mFailed:\x1b[0m ${result.error?.message || 'Unknown error'}`);
    process.exit(1);
  }
}
