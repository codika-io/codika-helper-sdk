/**
 * Get Use Case Command
 *
 * Fetches metadata documents from a deployed use case and reconstructs
 * the local folder structure, or lists documents without downloading.
 */

import { Command } from 'commander';
import { resolve, join, dirname } from 'path';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import {
  fetchMetadataOrThrow,
  isFetchMetadataSuccess,
  type StoredMetadataDocument,
} from '../../../utils/metadata-client.js';
import { resolveApiKey, resolveEndpointUrl, API_KEY_MISSING_MESSAGE } from '../../../utils/config.js';

export const useCaseCommand = new Command('use-case')
  .description('Fetch a deployed use case from the Codika platform')
  .argument('<projectId>', 'Project ID to fetch')
  .argument('[outputPath]', 'Output directory (defaults to ./<projectId>)')
  .option('--version <version>', 'Version to fetch in "X.Y" format (fetches latest if omitted)')
  .option('--with-data-ingestion', 'Include data ingestion workflow (default: true)', true)
  .option('--no-data-ingestion', 'Exclude data ingestion workflow')
  .option('--di-version <version>', 'Data ingestion version in "X.Y" format (latest if omitted)')
  .option('--list', 'List documents without downloading')
  .option('--api-url <url>', 'Codika API URL (env: CODIKA_BASE_URL)')
  .option('--api-key <key>', 'Codika API key (env: CODIKA_API_KEY)')
  .option('--json', 'Output result as JSON')
  .action(async (projectId: string, outputPath: string | undefined, options: GetUseCaseCommandOptions) => {
    try {
      await runGetUseCase(projectId, outputPath, options);
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

interface GetUseCaseCommandOptions {
  version?: string;
  dataIngestion?: boolean;
  diVersion?: string;
  list?: boolean;
  apiUrl?: string;
  apiKey?: string;
  json?: boolean;
}

async function runGetUseCase(
  projectId: string,
  outputPathArg: string | undefined,
  options: GetUseCaseCommandOptions,
): Promise<void> {
  // Validate version format if provided
  if (options.version && !/^\d+\.\d+$/.test(options.version)) {
    exitWithError(`Version must be "X.Y" format (e.g., "1.0"). Provided: ${options.version}`);
  }

  if (options.diVersion && !/^\d+\.\d+$/.test(options.diVersion)) {
    exitWithError(`DI version must be "X.Y" format (e.g., "1.0"). Provided: ${options.diVersion}`);
  }

  // Resolve API URL: --api-url > env > config baseUrl + path > production default
  const apiUrl = resolveEndpointUrl('getMetadata', options.apiUrl);

  // Resolve API key: --api-key > CODIKA_API_KEY env > config file
  const apiKey = resolveApiKey(options.apiKey);
  if (!apiKey) {
    exitWithError(API_KEY_MISSING_MESSAGE);
  }

  const outputPath = resolve(outputPathArg || `./${projectId}`);
  const includeContent = !options.list;

  if (!options.json) {
    console.log(`\nFetching use case "${projectId}"...`);
    if (options.version) {
      console.log(`  Version: ${options.version}`);
    }
    if (options.list) {
      console.log('  Mode: list only (no download)');
    } else {
      console.log(`  Output:  ${outputPath}`);
    }
    console.log('');
  }

  // Fetch metadata documents from the API
  const includeDataIngestion = options.dataIngestion !== false;
  const result = await fetchMetadataOrThrow({
    projectId,
    version: options.version,
    includeContent,
    includeDataIngestion,
    dataIngestionVersion: options.diVersion,
    apiUrl,
    apiKey,
  });

  const { documents, version, organizationId, dataIngestionVersion } = result.data;

  // --list mode: display document listing and exit
  if (options.list) {
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`\x1b[32m✓ Found ${documents.length} document(s)\x1b[0m`);
      console.log('');
      console.log(`  Project:      ${projectId}`);
      console.log(`  Version:      ${version}`);
      if (dataIngestionVersion) {
        console.log(`  DI Version:   ${dataIngestionVersion}`);
      }
      console.log(`  Organization: ${organizationId}`);
      console.log('');
      if (documents.length > 0) {
        console.log('  Documents:');
        for (const doc of documents) {
          const sizeKb = (doc.sizeBytes / 1024).toFixed(1);
          console.log(`    ${doc.relativePath}  (${sizeKb} KB, ${doc.contentType})`);
        }
        console.log('');
      }
    }
    process.exit(0);
  }

  // Download mode: decode base64 content and write files to disk
  if (documents.length === 0) {
    if (options.json) {
      console.log(JSON.stringify({
        success: true,
        data: { projectId, version, organizationId, filesDownloaded: 0, outputPath },
      }, null, 2));
    } else {
      console.log('No documents found for this project/version.');
    }
    process.exit(0);
  }

  // Ensure output directory exists
  ensureDir(outputPath);

  let filesDownloaded = 0;

  for (const doc of documents) {
    if (!doc.contentBase64) {
      if (!options.json) {
        console.warn(`  Skipping ${doc.relativePath} (no content)`);
      }
      continue;
    }

    const targetPath = join(outputPath, doc.relativePath);
    ensureDir(dirname(targetPath));
    writeFileSync(targetPath, Buffer.from(doc.contentBase64, 'base64'));
    filesDownloaded++;

    if (!options.json) {
      console.log(`  \x1b[32m✓\x1b[0m ${doc.relativePath}`);
    }
  }

  // Output summary
  if (options.json) {
    console.log(JSON.stringify({
      success: true,
      data: {
        projectId,
        version,
        organizationId,
        ...(dataIngestionVersion ? { dataIngestionVersion } : {}),
        filesDownloaded,
        outputPath,
        documents: documents.map((d) => ({
          relativePath: d.relativePath,
          sizeBytes: d.sizeBytes,
          contentType: d.contentType,
        })),
      },
    }, null, 2));
  } else {
    console.log('');
    console.log('\x1b[32m✓ Use Case Downloaded Successfully\x1b[0m');
    console.log('');
    console.log(`  Project:  ${projectId}`);
    console.log(`  Version:  ${version}`);
    if (dataIngestionVersion) {
      console.log(`  DI Ver:   ${dataIngestionVersion}`);
    }
    console.log(`  Output:   ${outputPath}`);
    console.log(`  Files:    ${filesDownloaded} file(s) downloaded`);
    console.log('');
  }

  process.exit(0);
}

function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

function exitWithError(message: string): never {
  console.error(`\x1b[31mError:\x1b[0m ${message}`);
  process.exit(2);
}
