/**
 * Use Case Deployer
 * High-level function to deploy a use case from its folder path
 */

import { join, extname, basename } from 'path';
import { pathToFileURL } from 'url';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import type { ProcessDeploymentConfigurationInput, VersionStrategy, MetadataDocument } from '../types/process-types.js';
import {
  deployProcess,
  isDeploySuccess,
  isDeployError,
  type DeployResult,
} from './deploy-client.js';

/**
 * Options for deploying a use case from folder
 */
export interface DeployUseCaseOptions {
  /** Absolute path to the use case folder (containing config.ts/config.js) */
  useCasePath: string;
  /** API key for authentication */
  apiKey: string;
  /** API URL for deployment */
  apiUrl: string;
  /** Version strategy (defaults to 'minor_bump') */
  versionStrategy?: VersionStrategy;
  /** Explicit version (required if versionStrategy is 'explicit') */
  explicitVersion?: string;
  /** Optional path to metadata directory containing files to upload */
  metadataDir?: string;
}

/**
 * Result of deploying a use case
 * Combines the base DeployResult with additional context for archiving
 */
export type DeployUseCaseResult = DeployResult & {
  /** The project ID from config.ts */
  projectId: string;
  /** The configuration that was deployed (useful for archiving) */
  configuration: ProcessDeploymentConfigurationInput;
  /** List of workflow files from config.ts (useful for archiving) */
  workflowFiles: string[];
};

/**
 * MIME type mapping for common file extensions
 */
const MIME_TYPES: Record<string, string> = {
  // Text/Documentation
  '.md': 'text/markdown',
  '.markdown': 'text/markdown',
  '.txt': 'text/plain',
  '.log': 'text/plain',
  // Data formats
  '.json': 'application/json',
  '.yaml': 'application/x-yaml',
  '.yml': 'application/x-yaml',
  '.xml': 'application/xml',
  '.csv': 'text/csv',
  // Code
  '.ts': 'text/typescript',
  '.js': 'text/javascript',
  '.py': 'text/x-python',
  '.html': 'text/html',
  '.css': 'text/css',
};

/**
 * Get MIME type for a file based on extension
 */
function getMimeType(filename: string): string {
  const ext = extname(filename).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

/**
 * Read a single file and convert to MetadataDocument
 *
 * @param filePath - Absolute path to the file
 * @param filename - Filename to use in the metadata document (can include subdirectory prefix)
 * @param description - Optional description for the document
 * @returns MetadataDocument or null if file cannot be read
 */
function readFileAsMetadata(filePath: string, filename: string, description?: string): MetadataDocument | null {
  if (!existsSync(filePath)) {
    return null;
  }

  const fileStat = statSync(filePath);

  // Skip directories
  if (fileStat.isDirectory()) {
    return null;
  }

  // Skip files larger than 10MB
  if (fileStat.size > 10 * 1024 * 1024) {
    console.warn(`Skipping ${filename}: exceeds 10MB size limit`);
    return null;
  }

  try {
    const content = readFileSync(filePath);
    const contentBase64 = content.toString('base64');
    const contentType = getMimeType(filename);

    return {
      filename,
      contentType,
      contentBase64,
      ...(description && { description }),
    };
  } catch (error) {
    console.warn(`Failed to read ${filename}: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

/**
 * Read metadata files from a directory and convert to MetadataDocument array
 *
 * @param metadataDir - Path to the metadata directory
 * @returns Array of MetadataDocument objects
 */
function readMetadataFiles(metadataDir: string): MetadataDocument[] {
  const documents: MetadataDocument[] = [];

  if (!existsSync(metadataDir)) {
    return documents;
  }

  const stat = statSync(metadataDir);
  if (!stat.isDirectory()) {
    return documents;
  }

  const files = readdirSync(metadataDir);

  for (const file of files) {
    const filePath = join(metadataDir, file);

    // Skip hidden files
    if (file.startsWith('.')) {
      continue;
    }

    const doc = readFileAsMetadata(filePath, file);
    if (doc) {
      documents.push(doc);
    }
  }

  return documents;
}

/**
 * Read use case source files (config.ts and workflow JSONs) as metadata documents
 *
 * @param useCasePath - Path to the use case folder
 * @returns Array of MetadataDocument objects for source files
 */
function readUseCaseSourceFiles(useCasePath: string): MetadataDocument[] {
  const documents: MetadataDocument[] = [];

  // 1. Read config.ts
  const configPath = join(useCasePath, 'config.ts');
  const configDoc = readFileAsMetadata(configPath, 'config.ts', 'Use case configuration file');
  if (configDoc) {
    documents.push(configDoc);
  }

  // 2. Read all workflow JSON files from workflows/ directory
  const workflowsPath = join(useCasePath, 'workflows');
  if (existsSync(workflowsPath)) {
    // Always read all .json files from workflows folder (ignore WORKFLOW_FILES)
    const workflowFiles = readdirSync(workflowsPath).filter(f => f.endsWith('.json'));

    for (const workflowFile of workflowFiles) {
      const workflowPath = join(workflowsPath, workflowFile);
      // Use "workflow-" prefix (not "workflows/") to avoid sanitization issues
      const doc = readFileAsMetadata(workflowPath, `workflow-${workflowFile}`, `Workflow: ${workflowFile}`);
      if (doc) {
        documents.push(doc);
      }
    }
  }

  return documents;
}

/**
 * Expected exports from a config.ts/config.js file
 */
interface ConfigModule {
  PROJECT_ID: string;
  WORKFLOW_FILES: string[];
  getConfiguration: () => ProcessDeploymentConfigurationInput;
}

/**
 * Deploy a use case by pointing at its folder
 *
 * This function:
 * 1. Dynamically imports config.js from the use case folder
 * 2. Extracts PROJECT_ID and calls getConfiguration()
 * 3. Deploys to the Codika platform
 * 4. Returns the result along with context needed for archiving
 *
 * @param options - Deployment options including the use case path
 * @returns Deployment result with additional context
 *
 * @example
 * ```typescript
 * const result = await deployUseCaseFromFolder({
 *   useCasePath: '/path/to/use-cases/my-use-case',
 *   apiKey: 'your-api-key',
 * });
 *
 * if (isDeploySuccess(result)) {
 *   console.log('Deployed version:', result.data.version);
 *   // Archive using result.configuration and result.workflowFiles
 * }
 * ```
 */
export async function deployUseCaseFromFolder(
  options: DeployUseCaseOptions
): Promise<DeployUseCaseResult> {
  const {
    useCasePath,
    apiKey,
    apiUrl,
    versionStrategy,
    explicitVersion,
    metadataDir,
  } = options;

  // Validate use case structure
  const configPath = join(useCasePath, 'config.ts');
  const workflowsPath = join(useCasePath, 'workflows');

  const errors: string[] = [];

  if (!existsSync(configPath)) {
    errors.push(`Missing config.ts at ${configPath}`);
  }

  if (!existsSync(workflowsPath)) {
    errors.push(`Missing workflows/ folder at ${workflowsPath}`);
  }

  if (errors.length > 0) {
    throw new Error(
      `Invalid use case structure at ${useCasePath}:\n` +
        errors.map((e) => `  - ${e}`).join('\n') +
        '\n\nExpected structure:\n' +
        '  use-case-folder/\n' +
        '  ├── config.ts\n' +
        '  └── workflows/\n' +
        '      └── *.json'
    );
  }

  const configUrl = pathToFileURL(configPath).href;

  // Dynamically import the config module
  const configModule = (await import(configUrl)) as ConfigModule;

  // Validate required exports
  if (!configModule.PROJECT_ID) {
    throw new Error(
      `config.js at ${useCasePath} must export PROJECT_ID`
    );
  }

  if (typeof configModule.getConfiguration !== 'function') {
    throw new Error(
      `config.js at ${useCasePath} must export getConfiguration function`
    );
  }

  // Get project ID and configuration
  const projectId = configModule.PROJECT_ID;
  const configuration = configModule.getConfiguration();
  const workflowFiles = configModule.WORKFLOW_FILES || [];

  // Build metadata documents array
  const metadataDocuments: MetadataDocument[] = [];

  // 1. Always include use case source files (config.ts and workflow JSONs)
  const sourceFiles = readUseCaseSourceFiles(useCasePath);
  metadataDocuments.push(...sourceFiles);

  // 2. Add any additional metadata files from the metadata directory
  if (metadataDir) {
    const additionalFiles = readMetadataFiles(metadataDir);
    metadataDocuments.push(...additionalFiles);
  }

  // Deploy to the platform
  const result = await deployProcess({
    projectId,
    configuration,
    apiKey,
    apiUrl,
    versionStrategy,
    explicitVersion,
    metadataDocuments: metadataDocuments.length > 0 ? metadataDocuments : undefined,
  });

  // Return result with additional context for archiving
  return {
    ...result,
    projectId,
    configuration,
    workflowFiles,
  };
}

// Re-export type guards for convenience
export { isDeploySuccess, isDeployError } from './deploy-client.js';
