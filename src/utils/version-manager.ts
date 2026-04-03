/**
 * Version Manager
 * Utilities for managing version.json files and semver operations.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { VersionStrategy } from '../types/process-types.js';

/**
 * Semver version parts
 */
export interface SemverVersion {
  major: number;
  minor: number;
  patch: number;
}

/**
 * Local version increment strategy
 */
export type LocalVersionStrategy = 'patch' | 'minor' | 'major';

/**
 * Resolved version strategies for both API and local versioning
 */
export interface ResolvedVersionStrategies {
  apiStrategy: VersionStrategy;
  localStrategy: LocalVersionStrategy;
  explicitVersion?: string;
}

/**
 * Read version from version.json in a use case folder.
 * Returns "1.0.0" if the file doesn't exist.
 */
export function readVersion(useCasePath: string): string {
  const versionPath = join(useCasePath, 'version.json');
  if (!existsSync(versionPath)) {
    return '1.0.0';
  }
  const data = JSON.parse(readFileSync(versionPath, 'utf-8'));
  return data.version;
}

/**
 * Write version to version.json in a use case folder.
 */
export function writeVersion(useCasePath: string, version: string): void {
  const versionPath = join(useCasePath, 'version.json');
  writeFileSync(versionPath, JSON.stringify({ version }, null, 2) + '\n');
}

/**
 * Parse a semver string (X.Y.Z) into parts.
 */
export function parseSemver(version: string): SemverVersion {
  const parts = version.split('.');
  if (parts.length !== 3) {
    throw new Error(`Invalid semver format: ${version}. Expected X.Y.Z format.`);
  }

  const [major, minor, patch] = parts.map((p) => parseInt(p, 10));

  if (isNaN(major) || isNaN(minor) || isNaN(patch)) {
    throw new Error(`Invalid semver format: ${version}. All parts must be numbers.`);
  }

  return { major, minor, patch };
}

/**
 * Format semver parts back to string.
 */
export function formatSemver(version: SemverVersion): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

/**
 * Increment a semver version based on strategy.
 */
export function incrementSemver(
  version: SemverVersion,
  strategy: LocalVersionStrategy
): SemverVersion {
  switch (strategy) {
    case 'major':
      return { major: version.major + 1, minor: 0, patch: 0 };
    case 'minor':
      return { major: version.major, minor: version.minor + 1, patch: 0 };
    case 'patch':
    default:
      return { major: version.major, minor: version.minor, patch: version.patch + 1 };
  }
}

/**
 * Resolve shorthand CLI flags to API and local version strategies.
 *
 * | Flag               | API strategy  | Local strategy |
 * |--------------------|---------------|----------------|
 * | (default / --patch)| minor_bump    | patch          |
 * | --minor            | minor_bump    | minor          |
 * | --major            | major_bump    | major          |
 * | --target-version X.Y | explicit     | patch          |
 */
export function resolveVersionStrategies(flags: {
  patch?: boolean;
  minor?: boolean;
  major?: boolean;
  version?: string;
}): ResolvedVersionStrategies {
  if (flags.major) {
    return { apiStrategy: 'major_bump', localStrategy: 'major' };
  }

  if (flags.minor) {
    return { apiStrategy: 'minor_bump', localStrategy: 'minor' };
  }

  if (flags.version) {
    const parts = flags.version.split('.');
    if (parts.length !== 2 || isNaN(parseInt(parts[0])) || isNaN(parseInt(parts[1]))) {
      throw new Error(
        `Invalid version format "${flags.version}". Expected "X.Y" format (e.g., "1.0").`
      );
    }
    return {
      apiStrategy: 'explicit',
      localStrategy: 'patch',
      explicitVersion: flags.version,
    };
  }

  // Default: --patch or no flags
  return { apiStrategy: 'minor_bump', localStrategy: 'patch' };
}
