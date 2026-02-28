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
import { join } from 'path';

const PROJECT_JSON_FILENAME = 'project.json';

export interface ProjectJson {
  projectId: string;
}

/**
 * Read project.json from a use case folder.
 * Returns null if the file doesn't exist or is invalid.
 */
export function readProjectJson(useCasePath: string): ProjectJson | null {
  const filePath = join(useCasePath, PROJECT_JSON_FILENAME);
  if (!existsSync(filePath)) {
    return null;
  }
  try {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (typeof parsed.projectId === 'string' && parsed.projectId) {
      return { projectId: parsed.projectId };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Write project.json to a directory.
 */
export function writeProjectJson(dirPath: string, data: ProjectJson): string {
  const filePath = join(dirPath, PROJECT_JSON_FILENAME);
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  return filePath;
}

/**
 * Resolve project ID with priority: explicit flag value > project.json file.
 * Returns the project ID and its source.
 */
export function resolveProjectId(options: {
  flagValue?: string;
  useCasePath: string;
}): { projectId: string; source: string } {
  if (options.flagValue) {
    return { projectId: options.flagValue, source: 'flag' };
  }

  const projectJson = readProjectJson(options.useCasePath);
  if (projectJson) {
    return { projectId: projectJson.projectId, source: 'project.json' };
  }

  throw new Error(
    `No project ID found. Either:\n` +
    `  1. Run 'codika-helper project create --name "..." --path ${options.useCasePath}' to create project.json\n` +
    `  2. Add project.json with {"projectId": "..."} to the use case folder\n` +
    `  3. Pass --project-id flag`
  );
}
