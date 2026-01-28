/**
 * Use Case Deployer
 * High-level function to deploy a use case from its folder path
 */

import { createHash } from 'crypto';
import { join, extname, basename, dirname } from 'path';
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
  /** Additional files to include (e.g., PRD, logs) */
  additionalFiles?: Array<{ absolutePath: string; relativePath: string }>;
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
function getMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

/**
 * Generate a short hash of the relative path for collision-safe storage filenames
 */
function hashPath(relativePath: string): string {
  return createHash('md5').update(relativePath).digest('hex').substring(0, 8);
}

/**
 * Get the storage filename with hash prefix to prevent collisions
 * Files with same name in different folders get different hashes
 */
function getStorageFilename(relativePath: string): string {
  const filename = basename(relativePath);
  return `${hashPath(relativePath)}-${filename}`;
}

/**
 * Validate that a relative path is safe (no absolute paths or traversal)
 */
function validateRelativePath(relativePath: string): void {
  if (relativePath.startsWith('/')) {
    throw new Error(`relativePath must not be absolute: ${relativePath}`);
  }
  if (relativePath.includes('..')) {
    throw new Error(`relativePath must not contain '..': ${relativePath}`);
  }
}

/**
 * Read a single file and convert to MetadataDocument
 *
 * @param absolutePath - Absolute path to the file
 * @param relativePath - Relative path for storage and reconstruction
 * @param description - Optional description for the document
 * @returns MetadataDocument or null if file cannot be read
 */
function readFileAsDocument(absolutePath: string, relativePath: string, description?: string): MetadataDocument | null {
  if (!existsSync(absolutePath)) {
    return null;
  }

  const fileStat = statSync(absolutePath);

  // Skip directories
  if (fileStat.isDirectory()) {
    return null;
  }

  // Skip files larger than 10MB
  if (fileStat.size > 10 * 1024 * 1024) {
    console.warn(`Skipping ${relativePath}: exceeds 10MB size limit`);
    return null;
  }

  try {
    const content = readFileSync(absolutePath);
    const contentBase64 = content.toString('base64');
    const contentType = getMimeType(absolutePath);

    return {
      relativePath,
      contentType,
      contentBase64,
      ...(description && { description }),
    };
  } catch (error) {
    console.warn(`Failed to read ${relativePath}: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

/**
 * Read use case source files (config.ts and workflow JSONs) as metadata documents
 * All files use their relative path for exact reconstruction
 *
 * @param useCasePath - Path to the use case folder
 * @returns Array of MetadataDocument objects for source files
 */
function readUseCaseSourceFiles(useCasePath: string): MetadataDocument[] {
  const documents: MetadataDocument[] = [];

  // 1. Read config.ts
  const configPath = join(useCasePath, 'config.ts');
  const configDoc = readFileAsDocument(configPath, 'config.ts', 'Use case configuration');
  if (configDoc) {
    documents.push(configDoc);
  }

  // 2. Read all workflow JSON files from workflows/ directory
  const workflowsPath = join(useCasePath, 'workflows');
  if (existsSync(workflowsPath)) {
    const workflowFiles = readdirSync(workflowsPath).filter(f => f.endsWith('.json'));

    for (const workflowFile of workflowFiles) {
      const doc = readFileAsDocument(
        join(workflowsPath, workflowFile),
        `workflows/${workflowFile}`,  // relativePath includes folder
        `Workflow: ${workflowFile}`
      );
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
    additionalFiles,
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

  // Build document list - all files use relativePath for reconstruction
  const documents: MetadataDocument[] = [];

  // 1. Source files (config.ts, workflows/)
  documents.push(...readUseCaseSourceFiles(useCasePath));

  // 2. Additional files (PRD, logs, etc.)
  if (additionalFiles) {
    for (const file of additionalFiles) {
      validateRelativePath(file.relativePath);
      const doc = readFileAsDocument(file.absolutePath, file.relativePath);
      if (doc) {
        documents.push(doc);
      }
    }
  }

  // Deploy to the platform
  const result = await deployProcess({
    projectId,
    configuration,
    apiKey,
    apiUrl,
    versionStrategy,
    explicitVersion,
    metadataDocuments: documents.length > 0 ? documents : undefined,
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
