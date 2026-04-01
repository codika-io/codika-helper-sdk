/**
 * Notes Get Command
 *
 * Get a project note's content (current or specific version).
 *
 * Usage:
 *   codika notes get <projectId> --type brief
 *   codika notes get <projectId> --type brief --version 0.1.0
 *   codika notes get <projectId> --type brief --history
 */

import { Command } from 'commander';
import {
  getProjectNotes,
  isGetSuccess,
} from '../../../utils/project-notes-client.js';
import { resolveApiKey, resolveEndpointUrl, API_KEY_MISSING_MESSAGE } from '../../../utils/config.js';

interface GetOptions {
  type: string;
  version?: string;
  history?: boolean;
  apiUrl?: string;
  apiKey?: string;
  profile?: string;
  json?: boolean;
}

export const notesGetCommand = new Command('get')
  .description('Get a project note (content, version, or history)')
  .argument('<projectId>', 'Project ID')
  .requiredOption('--type <type>', 'Document type ID')
  .option('--version <version>', 'Get a specific version (e.g. 0.1.0)')
  .option('--history', 'Show all versions')
  .option('--api-url <url>', 'API URL override')
  .option('--api-key <key>', 'API key override')
  .option('--profile <name>', 'Profile name')
  .option('--json', 'JSON output')
  .action(async (projectId: string, options: GetOptions) => {
    try {
      await runGet(projectId, options);
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

async function runGet(projectId: string, options: GetOptions): Promise<void> {
  const apiUrl = resolveEndpointUrl('getProjectNotes', options.apiUrl, options.profile);
  const apiKey = resolveApiKey(options.apiKey, options.profile);

  if (!apiKey) {
    console.error(`\x1b[31mError:\x1b[0m ${API_KEY_MISSING_MESSAGE}`);
    process.exit(1);
  }

  const result = await getProjectNotes({
    projectId,
    documentTypeId: options.type,
    includeHistory: options.history ?? false,
    version: options.version,
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
      console.log(`No document found for type "${options.type}".`);
      return;
    }

    if (options.history) {
      // Show version list
      console.log(`Version history for "${options.type}":\n`);
      for (const doc of documents) {
        const marker = doc.status === 'current' ? '\x1b[32m*\x1b[0m' : ' ';
        console.log(`  ${marker} v${doc.version}  ${doc.status}  "${doc.summary}"`);
      }
      console.log(`\n${documents.length} version(s)`);
    } else {
      // Show single document
      const doc = documents[0];
      console.log(`\x1b[36m${doc.documentTypeId}\x1b[0m  v${doc.version}  "${doc.title}"`);
      console.log(`Summary: ${doc.summary}`);
      console.log(`Words: ${doc.wordCount}  |  Status: ${doc.status}`);
      if (doc.agentId) console.log(`Agent: ${doc.agentId}`);
      console.log(`\n---\n`);
      console.log(doc.content);
    }
  } else {
    console.error(`\x1b[31mFailed:\x1b[0m ${result.error?.message || 'Unknown error'}`);
    process.exit(1);
  }
}
