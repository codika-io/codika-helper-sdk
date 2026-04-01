/**
 * Docs List Command
 *
 * List agent documents for a project.
 *
 * Usage:
 *   codika docs list <projectId>
 *   codika docs list <projectId> --type brief
 */

import { Command } from 'commander';
import {
  getAgentDocuments,
  isGetSuccess,
} from '../../../utils/agent-docs-client.js';
import { resolveApiKey, resolveEndpointUrl, API_KEY_MISSING_MESSAGE } from '../../../utils/config.js';

interface ListOptions {
  type?: string;
  apiUrl?: string;
  apiKey?: string;
  profile?: string;
  json?: boolean;
}

export const docsListCommand = new Command('list')
  .description('List agent documents for a project')
  .argument('<projectId>', 'Project ID')
  .option('--type <type>', 'Filter by document type ID')
  .option('--api-url <url>', 'API URL override')
  .option('--api-key <key>', 'API key override')
  .option('--profile <name>', 'Profile name')
  .option('--json', 'JSON output')
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
  const apiUrl = resolveEndpointUrl('getAgentDocuments', options.apiUrl, options.profile);
  const apiKey = resolveApiKey(options.apiKey, options.profile);

  if (!apiKey) {
    console.error(`\x1b[31mError:\x1b[0m ${API_KEY_MISSING_MESSAGE}`);
    process.exit(1);
  }

  const result = await getAgentDocuments({
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
      console.log('No agent documents found.');
      return;
    }

    console.log(`Agent documents for project ${projectId}:\n`);
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
