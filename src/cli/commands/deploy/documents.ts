/**
 * Deploy Documents Command
 *
 * Uploads use case documentation (stage markdown files) to the Codika platform.
 * Auto-discovers documents from the use case's documents/ folder.
 *
 * Usage:
 *   codika-helper deploy documents <path> [options]
 */

import { Command } from 'commander';
import { resolve, join, basename } from 'path';
import { existsSync, readFileSync, readdirSync } from 'fs';
import {
  deployDocuments,
  isDeployDocumentsSuccess,
  type DocumentInput,
} from '../../../utils/document-deploy-client.js';
import { exitWithError } from '../../utils/output.js';
import { resolveApiKeyForOrg, resolveEndpointUrl, API_KEY_MISSING_MESSAGE } from '../../../utils/config.js';
import { readProjectJson, resolveProjectId } from '../../../utils/project-json.js';

interface DocumentsCommandOptions {
  apiUrl?: string;
  apiKey?: string;
  projectId?: string;
  projectFile?: string;
  json?: boolean;
}

// ── Helpers ──────────────────────────────────────────────

/**
 * Derive a human-readable title from a document filename.
 * "1_business_requirements.md" → "Business Requirements"
 */
function titleFromFilename(filename: string): string {
  return basename(filename, '.md')
    .replace(/^\d+_/, '')
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Extract a summary from markdown content.
 * Uses the first non-heading, non-empty paragraph (max 200 chars).
 */
function extractSummary(content: string): string {
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('---')) {
      return trimmed.length > 200 ? trimmed.slice(0, 197) + '...' : trimmed;
    }
  }
  return 'Use case documentation';
}

/**
 * Discover stage document files (1_*.md through 4_*.md) in a directory.
 */
function discoverStageFiles(documentsDir: string): { stage: number; filename: string }[] {
  const files = readdirSync(documentsDir).filter(f => f.endsWith('.md'));
  const stages: { stage: number; filename: string }[] = [];

  for (const stage of [1, 2, 3, 4]) {
    const match = files.find(f => f.startsWith(`${stage}_`));
    if (match) {
      stages.push({ stage, filename: match });
    }
  }

  return stages;
}

/**
 * Extract PROJECT_ID from config.ts by reading it as text.
 */
function extractProjectIdFromConfig(configPath: string): string | undefined {
  const content = readFileSync(configPath, 'utf-8');
  const match = content.match(/PROJECT_ID\s*=\s*['"]([^'"]+)['"]/);
  return match?.[1];
}

// ── Command ──────────────────────────────────────────────

export const documentsCommand = new Command('documents')
  .description('Deploy use case documents (stage markdown files) to the Codika platform')
  .argument('<path>', 'Path to the use case folder (must contain a documents/ subfolder)')
  .option('--api-url <url>', 'Codika API URL (env: CODIKA_API_URL)')
  .option('--api-key <key>', 'Codika API key (env: CODIKA_API_KEY)')
  .option('--project-id <id>', 'Override project ID')
  .option('--project-file <path>', 'Path to custom project file (e.g., project-client-a.json)')
  .option('--json', 'Output result as JSON')
  .action(async (path: string, options: DocumentsCommandOptions) => {
    try {
      await runDeployDocuments(path, options);
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({
          success: false,
          error: {
            code: 'CLI_ERROR',
            message: error instanceof Error ? error.message : String(error),
          },
        }, null, 2));
      } else {
        console.error(`\x1b[31mError:\x1b[0m ${error instanceof Error ? error.message : error}`);
      }
      process.exit(1);
    }
  });

async function runDeployDocuments(
  useCasePath: string,
  options: DocumentsCommandOptions
): Promise<void> {
  const absolutePath = resolve(useCasePath);

  if (!existsSync(absolutePath)) {
    exitWithError(`Use case path does not exist: ${absolutePath}`);
  }

  // Check for documents/ folder
  const documentsDir = join(absolutePath, 'documents');
  if (!existsSync(documentsDir)) {
    exitWithError(
      `No documents/ folder found in: ${absolutePath}\n` +
      'Expected: <use-case-path>/documents/1_*.md, 2_*.md, etc.'
    );
  }

  // Resolve API URL
  const apiUrl = resolveEndpointUrl('deployDocuments', options.apiUrl);

  // Resolve API key with org-aware fallback
  const projectJson = readProjectJson(absolutePath, options.projectFile);
  const keyResult = resolveApiKeyForOrg({
    flagValue: options.apiKey,
    organizationId: projectJson?.organizationId,
  });
  const apiKey = keyResult.apiKey;
  if (!apiKey) {
    exitWithError(API_KEY_MISSING_MESSAGE);
  }
  if (keyResult.autoSelected && keyResult.profileName && !options.json) {
    console.log(`Using profile "${keyResult.profileName}" (matches project organization)`);
  }

  // Resolve project ID: --project-id > project.json > config.ts
  let projectId: string | undefined;
  if (options.projectId) {
    projectId = options.projectId;
  } else {
    try {
      const resolved = resolveProjectId({
        flagValue: options.projectId,
        useCasePath: absolutePath,
        projectFile: options.projectFile,
      });
      projectId = resolved.projectId;
    } catch {
      // Fallback: extract from config.ts
      const configPath = join(absolutePath, 'config.ts');
      if (existsSync(configPath)) {
        projectId = extractProjectIdFromConfig(configPath);
      }
    }
  }

  if (!projectId) {
    exitWithError(
      'Could not determine project ID.\n' +
      'Either:\n' +
      '  1. Add project.json with {"projectId": "..."}\n' +
      '  2. Export PROJECT_ID in config.ts\n' +
      '  3. Pass --project-id flag'
    );
  }

  // Discover stage files
  const stageFiles = discoverStageFiles(documentsDir);
  if (stageFiles.length === 0) {
    exitWithError(
      'No stage files found in documents/ folder.\n' +
      'Expected files named: 1_*.md, 2_*.md, 3_*.md, 4_*.md'
    );
  }

  // Read and prepare documents
  const documents: DocumentInput[] = [];
  if (!options.json) {
    console.log('');
    console.log('Reading document files...');
  }

  for (const { stage, filename } of stageFiles) {
    const filePath = join(documentsDir, filename);
    const content = readFileSync(filePath, 'utf-8');

    if (!content.trim()) {
      exitWithError(`${filename} is empty — refusing to upload`);
    }

    const title = titleFromFilename(filename);
    const summary = extractSummary(content);
    const wordCount = content.trim().split(/\s+/).filter(w => w.length > 0).length;

    documents.push({ stage, title, content: content.trim(), summary });

    if (!options.json) {
      console.log(`  Stage ${stage}: ${filename} → "${title}" (${content.length} chars, ~${wordCount} words)`);
    }
  }

  if (!options.json) {
    console.log(`\nUploading ${documents.length} document(s)...`);
  }

  // Deploy
  const result = await deployDocuments({
    projectId: projectId!,
    documents,
    apiUrl,
    apiKey,
  });

  // Output result
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (isDeployDocumentsSuccess(result)) {
    console.log('');
    console.log('\x1b[32m✓ Documents Deployed Successfully\x1b[0m');
    console.log('');
    for (const doc of result.documentsCreated) {
      console.log(`  Stage ${doc.stage}: v${doc.version} (${doc.documentId})`);
    }
    if (result.requestId) {
      console.log(`\n  Request ID: ${result.requestId}`);
    }
    console.log('');
  } else {
    console.log('');
    console.log('\x1b[31m✗ Document Deployment Failed\x1b[0m');
    console.log('');
    console.log(`  Error: ${result.error}`);
    if (result.errorCode) console.log(`  Error Code: ${result.errorCode}`);
    if (result.details) console.log(`  Details: ${JSON.stringify(result.details)}`);
    if (result.requestId) console.log(`  Request ID: ${result.requestId}`);
    console.log('');
  }

  process.exit(result.success ? 0 : 1);
}
