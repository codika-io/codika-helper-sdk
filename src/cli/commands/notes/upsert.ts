/**
 * Notes Upsert Command
 *
 * Create or update a project note for a project.
 *
 * Usage:
 *   codika notes upsert <projectId> --type brief --title "Project Brief" --content "..." --summary "Initial"
 *   codika notes upsert <projectId> --type brief --file ./docs/brief.md --summary "Updated brief"
 */

import { Command } from 'commander';
import { readFileSync } from 'fs';
import {
  upsertProjectNote,
  isUpsertSuccess,
} from '../../../utils/project-notes-client.js';
import { resolveApiKey, resolveEndpointUrl, API_KEY_MISSING_MESSAGE } from '../../../utils/config.js';

interface UpsertOptions {
  type: string;
  title?: string;
  content?: string;
  file?: string;
  summary: string;
  agentId?: string;
  majorChange?: boolean;
  apiUrl?: string;
  apiKey?: string;
  profile?: string;
  json?: boolean;
}

export const upsertCommand = new Command('upsert')
  .description('Create or update a project note')
  .argument('<projectId>', 'Project ID')
  .requiredOption('--type <type>', 'Document type ID (e.g. brief, known-issues, changelog)')
  .requiredOption('--summary <summary>', 'Summary of what changed')
  .option('--title <title>', 'Document title (defaults to type ID)')
  .option('--content <content>', 'Document content (markdown)')
  .option('--file <path>', 'Read content from a file instead of --content')
  .option('--agent-id <agentId>', 'Agent identifier')
  .option('--major-change', 'Bump MINOR version instead of PATCH')
  .option('--api-url <url>', 'Override API URL')
  .option('--api-key <key>', 'Override API key')
  .option('--profile <name>', 'Use a specific profile')
  .option('--json', 'Output as JSON')
  .action(async (projectId: string, options: UpsertOptions) => {
    try {
      await runUpsert(projectId, options);
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

async function runUpsert(projectId: string, options: UpsertOptions): Promise<void> {
  const apiUrl = resolveEndpointUrl('upsertProjectNote', options.apiUrl, options.profile);
  const apiKey = resolveApiKey(options.apiKey, options.profile);

  if (!apiKey) {
    exitWithError(API_KEY_MISSING_MESSAGE);
  }

  // Resolve content from --content, --file, or stdin
  let content = options.content;
  if (options.file) {
    content = readFileSync(options.file, 'utf-8');
  } else if (!content && !process.stdin.isTTY) {
    // Read from stdin when piped (e.g. echo "..." | codika notes upsert ...)
    content = readFileSync(0, 'utf-8');
  }
  if (!content) {
    exitWithError('Either --content, --file, or piped stdin is required');
  }

  const title = options.title || options.type;

  const result = await upsertProjectNote({
    projectId,
    documentTypeId: options.type,
    title,
    content,
    summary: options.summary,
    agentId: options.agentId ?? null,
    majorChange: options.majorChange ?? false,
    apiUrl,
    apiKey: apiKey!,
  });

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(isUpsertSuccess(result) ? 0 : 1);
    return;
  }

  if (isUpsertSuccess(result)) {
    const { data } = result;
    const action = data.isNew ? 'Created' : 'Updated';
    console.log(`\x1b[32m${action}\x1b[0m ${data.documentTypeId} → v${data.version}`);
    console.log(`  Document ID: ${data.documentId}`);
    console.log(`  Project:     ${data.projectId}`);
  } else {
    console.error(`\x1b[31mFailed:\x1b[0m ${result.error?.message || 'Unknown error'}`);
    process.exit(1);
  }
}

function exitWithError(message: string): never {
  console.error(`\x1b[31mError:\x1b[0m ${message}`);
  process.exit(1);
}
