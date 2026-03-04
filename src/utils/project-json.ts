/**
 * Project JSON Utility
 *
 * Reads and writes `project.json` — a file that stores the deployment target
 * (project ID) separately from the use case configuration.
 *
 * Resolution priority for project ID:
 *   --project-id flag > project.json file
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, isAbsolute, resolve } from 'path';

const PROJECT_JSON_FILENAME = 'project.json';

/**
 * Resolve the path to the project file.
 * When projectFile is provided, it can be absolute or relative to basePath.
 * When omitted, defaults to `project.json` inside basePath.
 */
function resolveProjectFilePath(basePath: string, projectFile?: string): string {
  if (!projectFile) return join(basePath, PROJECT_JSON_FILENAME);
  return isAbsolute(projectFile) ? projectFile : resolve(basePath, projectFile);
}

export interface DeploymentEntry {
  templateId: string;
  createdAt: string;
}

export interface ProjectJson {
  projectId: string;
  devProcessInstanceId?: string;
  prodProcessInstanceId?: string;
  organizationId?: string;
  deployments?: Record<string, DeploymentEntry>;
}

/**
 * Read project.json (or a custom project file) from a use case folder.
 * Returns null if the file doesn't exist or is invalid.
 *
 * @param useCasePath - Path to the use case folder
 * @param projectFile - Optional path to a custom project file (absolute or relative to useCasePath)
 */
export function readProjectJson(useCasePath: string, projectFile?: string): ProjectJson | null {
  const filePath = resolveProjectFilePath(useCasePath, projectFile);
  if (!existsSync(filePath)) {
    return null;
  }
  try {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (typeof parsed.projectId === 'string' && parsed.projectId) {
      const result: ProjectJson = { projectId: parsed.projectId };
      if (typeof parsed.devProcessInstanceId === 'string' && parsed.devProcessInstanceId) {
        result.devProcessInstanceId = parsed.devProcessInstanceId;
      }
      if (typeof parsed.prodProcessInstanceId === 'string' && parsed.prodProcessInstanceId) {
        result.prodProcessInstanceId = parsed.prodProcessInstanceId;
      }
      if (typeof parsed.organizationId === 'string' && parsed.organizationId) {
        result.organizationId = parsed.organizationId;
      }
      if (parsed.deployments && typeof parsed.deployments === 'object' && !Array.isArray(parsed.deployments)) {
        result.deployments = parsed.deployments as Record<string, DeploymentEntry>;
      }
      return result;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Write project.json (or a custom project file) to a directory.
 *
 * @param dirPath - Directory to write into
 * @param data - Project data to write
 * @param projectFile - Optional custom filename (absolute or relative to dirPath)
 */
export function writeProjectJson(dirPath: string, data: ProjectJson, projectFile?: string): string {
  const filePath = resolveProjectFilePath(dirPath, projectFile);
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  return filePath;
}

/**
 * Update project.json (or a custom project file) by merging partial data into the existing file.
 * Creates the file if it doesn't exist (requires at least projectId in that case).
 *
 * @param dirPath - Directory containing the project file
 * @param update - Partial data to merge
 * @param projectFile - Optional custom filename (absolute or relative to dirPath)
 */
export function updateProjectJson(dirPath: string, update: Partial<ProjectJson>, projectFile?: string): string {
  const filePath = resolveProjectFilePath(dirPath, projectFile);
  let existing: Record<string, unknown> = {};
  if (existsSync(filePath)) {
    try {
      existing = JSON.parse(readFileSync(filePath, 'utf-8'));
    } catch {
      // If file is corrupt, start fresh
    }
  }
  const merged = { ...existing, ...update };

  // Deep merge deployments: preserve existing entries when adding new ones
  if (update.deployments && existing.deployments && typeof existing.deployments === 'object') {
    merged.deployments = { ...existing.deployments, ...update.deployments };
  }

  writeFileSync(filePath, JSON.stringify(merged, null, 2) + '\n');
  return filePath;
}

/**
 * Resolve project ID with priority: explicit flag value > project file.
 * Returns the project ID and its source.
 *
 * @param options.flagValue - Explicit --project-id flag value (highest priority)
 * @param options.useCasePath - Path to the use case folder
 * @param options.projectFile - Optional path to a custom project file
 */
export function resolveProjectId(options: {
  flagValue?: string;
  useCasePath: string;
  projectFile?: string;
}): { projectId: string; source: string } {
  if (options.flagValue) {
    return { projectId: options.flagValue, source: 'flag' };
  }

  const projectJson = readProjectJson(options.useCasePath, options.projectFile);
  if (projectJson) {
    const source = options.projectFile || 'project.json';
    return { projectId: projectJson.projectId, source };
  }

  throw new Error(
    `No project ID found. Either:\n` +
    `  1. Run 'codika-helper project create --name "..." --path ${options.useCasePath}' to create project.json\n` +
    `  2. Add project.json with {"projectId": "..."} to the use case folder\n` +
    `  3. Pass --project-id flag\n` +
    `  4. Pass --project-file flag pointing to a custom project file`
  );
}
