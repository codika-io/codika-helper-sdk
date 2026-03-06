/**
 * Status Command
 *
 * Shows identity, use case context, and deploy readiness — like `git status` for Codika.
 *
 * Usage:
 *   codika-helper status [path] [options]
 *
 * Options:
 *   --json      Output as JSON
 *   --verify    Run quick validation on the use case
 */

import { Command } from 'commander';
import { resolve, basename, join } from 'path';
import { existsSync, readdirSync, statSync } from 'fs';
import {
  getActiveProfile,
  listProfiles,
  resolveApiKey,
  describeApiKeySource,
  maskApiKey,
  findProfileByOrgId,
  checkProfileExpiry,
} from '../../utils/config.js';
import { readProjectJson } from '../../utils/project-json.js';
import { readVersion } from '../../utils/version-manager.js';

// ── Types ────────────────────────────────────────────────

export type ProfileMatchStatus =
  | { status: 'match'; profileName: string }
  | { status: 'mismatch'; activeProfileName: string; suggestedProfileName: string | null }
  | { status: 'no-org-in-project' }
  | { status: 'no-profile' };

export interface StatusResult {
  identity: {
    loggedIn: boolean;
    profileName: string | null;
    profileCount: number;
    organizationName: string | null;
    organizationId: string | null;
    keyPrefix: string | null;
    keySource: string;
    type: string | null;
  };
  useCase: {
    path: string;
    name: string;
    hasConfigTs: boolean;
    hasWorkflowsDir: boolean;
    workflowCount: number;
    hasProjectJson: boolean;
    projectId: string | null;
    organizationId: string | null;
    hasVersionJson: boolean;
    currentVersion: string;
    profileMatch: ProfileMatchStatus;
  } | null;
  readiness: {
    ready: boolean;
    missing: string[];
    warnings: string[];
    validation?: { valid: boolean; mustViolations: number; shouldWarnings: number };
  };
}

// ── Gather status ────────────────────────────────────────

export async function gatherStatus(
  targetPath: string,
  runVerify: boolean,
  projectFile?: string,
): Promise<StatusResult> {
  const absolutePath = resolve(targetPath);

  // ── Identity ──────────────────────────────────────────
  const activeProfile = getActiveProfile();
  const profiles = listProfiles();
  const apiKey = resolveApiKey();
  const keySource = describeApiKeySource();

  const identity: StatusResult['identity'] = {
    loggedIn: !!apiKey,
    profileName: activeProfile?.name ?? null,
    profileCount: profiles.length,
    organizationName: activeProfile?.profile.organizationName ?? null,
    organizationId: activeProfile?.profile.organizationId ?? null,
    keyPrefix: apiKey ? maskApiKey(apiKey) : null,
    keySource,
    type: activeProfile?.profile.type ?? null,
  };

  // ── Use case detection ────────────────────────────────
  const hasConfigTs = existsSync(join(absolutePath, 'config.ts'));
  const workflowsDir = join(absolutePath, 'workflows');
  const hasWorkflowsDir = existsSync(workflowsDir) && statSync(workflowsDir).isDirectory();
  const isUseCase = hasConfigTs || hasWorkflowsDir;

  let useCase: StatusResult['useCase'] = null;

  if (isUseCase) {
    const projectJson = readProjectJson(absolutePath, projectFile);
    const versionJsonPath = join(absolutePath, 'version.json');
    const hasVersionJson = existsSync(versionJsonPath);
    const currentVersion = readVersion(absolutePath);

    let workflowCount = 0;
    if (hasWorkflowsDir) {
      try {
        workflowCount = readdirSync(workflowsDir).filter(f => f.endsWith('.json')).length;
      } catch {
        // ignore read errors
      }
    }

    // Profile match check
    let profileMatch: ProfileMatchStatus;
    const projectOrgId = projectJson?.organizationId ?? null;

    if (!activeProfile) {
      profileMatch = { status: 'no-profile' };
    } else if (!projectOrgId) {
      profileMatch = { status: 'no-org-in-project' };
    } else if (activeProfile.profile.organizationId === projectOrgId) {
      profileMatch = { status: 'match', profileName: activeProfile.name };
    } else {
      const suggested = findProfileByOrgId(projectOrgId);
      profileMatch = {
        status: 'mismatch',
        activeProfileName: activeProfile.name,
        suggestedProfileName: suggested?.name ?? null,
      };
    }

    useCase = {
      path: absolutePath,
      name: basename(absolutePath),
      hasConfigTs,
      hasWorkflowsDir,
      workflowCount,
      hasProjectJson: !!projectJson,
      projectId: projectJson?.projectId ?? null,
      organizationId: projectOrgId,
      hasVersionJson,
      currentVersion,
      profileMatch,
    };
  }

  // ── Readiness ─────────────────────────────────────────
  const missing: string[] = [];
  const warnings: string[] = [];

  if (!apiKey) {
    missing.push("No API key (run 'codika-helper login')");
  }

  if (isUseCase) {
    if (!hasConfigTs) {
      missing.push('Missing config.ts');
    }
    if (!hasWorkflowsDir || useCase!.workflowCount === 0) {
      missing.push('No workflow files in workflows/');
    }
    if (!useCase!.hasProjectJson) {
      missing.push("Missing project.json (run 'codika-helper project create')");
    } else if (!useCase!.projectId) {
      missing.push('project.json has no projectId');
    }

    // Profile mismatch warning
    if (useCase!.profileMatch.status === 'mismatch') {
      const pm = useCase!.profileMatch as Extract<ProfileMatchStatus, { status: 'mismatch' }>;
      const hint = pm.suggestedProfileName
        ? ` (try: codika-helper use ${pm.suggestedProfileName})`
        : '';
      warnings.push(`Active profile org does not match project.json org${hint}`);
    }
  }

  // Expiry warning
  const expiry = checkProfileExpiry();
  if (expiry) {
    if (expiry.expired) {
      warnings.push('API key has expired');
    } else if (expiry.daysLeft <= 7) {
      warnings.push(`API key expires in ${expiry.daysLeft} day${expiry.daysLeft === 1 ? '' : 's'}`);
    }
  }

  // ── Optional validation ───────────────────────────────
  let validation: StatusResult['readiness']['validation'] | undefined;

  if (runVerify && isUseCase) {
    try {
      const { validateUseCase } = await import('../../validation/runner.js');
      const result = await validateUseCase({ path: absolutePath });
      validation = {
        valid: result.valid,
        mustViolations: result.summary.must,
        shouldWarnings: result.summary.should,
      };
      if (!result.valid) {
        missing.push(`Validation failed (${result.summary.must} violation${result.summary.must === 1 ? '' : 's'})`);
      }
    } catch {
      warnings.push('Validation could not run');
    }
  }

  const ready = missing.length === 0 && apiKey !== undefined && (isUseCase ? true : false);

  return {
    identity,
    useCase,
    readiness: {
      ready: isUseCase ? ready : false,
      missing,
      warnings,
      validation,
    },
  };
}

// ── Human-readable output ────────────────────────────────

const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

function formatStatus(result: StatusResult): string {
  const lines: string[] = [];

  // ── Identity section ──────────────────────────────────
  lines.push(`${BOLD}Identity${RESET}`);

  if (!result.identity.loggedIn) {
    lines.push(`  ${DIM}Not logged in${RESET}`);
    lines.push('');
  } else {
    if (result.identity.organizationName) {
      const orgDisplay = result.identity.organizationId
        ? `${result.identity.organizationName} (${result.identity.organizationId})`
        : result.identity.organizationName;
      lines.push(`  Organization:  ${orgDisplay}`);
    }
    if (result.identity.profileName) {
      const countSuffix = result.identity.profileCount > 1
        ? ` (${result.identity.profileCount} total)`
        : '';
      lines.push(`  Profile:       ${result.identity.profileName}${countSuffix}`);
    }
    if (result.identity.keyPrefix) {
      lines.push(`  Key:           ${result.identity.keyPrefix}`);
    }
    lines.push('');
  }

  // ── Use case section ──────────────────────────────────
  if (result.useCase) {
    lines.push(`${BOLD}Use Case: ${result.useCase.name}${RESET}`);
    lines.push(`  Path:          ${result.useCase.path}`);

    const versionSuffix = result.useCase.hasVersionJson ? '' : ` ${DIM}(default)${RESET}`;
    lines.push(`  Version:       ${result.useCase.currentVersion}${versionSuffix}`);

    lines.push(`  Workflows:     ${result.useCase.workflowCount} file${result.useCase.workflowCount === 1 ? '' : 's'}`);

    if (result.useCase.projectId) {
      lines.push(`  Project ID:    ${result.useCase.projectId}`);
    } else {
      lines.push(`  Project:       ${DIM}not configured${RESET}`);
    }

    // Profile match
    const pm = result.useCase.profileMatch;
    if (pm.status === 'match') {
      lines.push(`  Profile Match: ${GREEN}\u2713 ${pm.profileName}${RESET}`);
    } else if (pm.status === 'mismatch') {
      const hint = pm.suggestedProfileName
        ? ` (try: codika-helper use ${pm.suggestedProfileName})`
        : '';
      lines.push(`  Profile Match: ${RED}\u2717 mismatch${RESET}${hint}`);
    } else if (pm.status === 'no-org-in-project') {
      lines.push(`  Profile Match: ${DIM}n/a (no org in project.json)${RESET}`);
    } else {
      lines.push(`  Profile Match: ${DIM}n/a (not logged in)${RESET}`);
    }

    lines.push('');
  }

  // ── Validation section (if run) ───────────────────────
  if (result.readiness.validation) {
    const v = result.readiness.validation;
    if (v.valid) {
      lines.push(`${GREEN}\u2713 Validation passed${RESET}`);
    } else {
      lines.push(`${RED}\u2717 Validation failed${RESET} (${v.mustViolations} must, ${v.shouldWarnings} should)`);
    }
    lines.push('');
  }

  // ── Readiness section ─────────────────────────────────
  if (result.readiness.ready) {
    lines.push(`${GREEN}\u2713 Ready to deploy${RESET}`);
  } else {
    if (result.useCase) {
      lines.push(`${RED}\u2717 Not ready to deploy${RESET}`);
    } else {
      lines.push(`${DIM}No use case detected at this path${RESET}`);
    }

    if (result.readiness.missing.length > 0) {
      for (const item of result.readiness.missing) {
        lines.push(`    \u2022 ${item}`);
      }
    }
  }

  // ── Warnings ──────────────────────────────────────────
  if (result.readiness.warnings.length > 0) {
    lines.push('');
    for (const w of result.readiness.warnings) {
      lines.push(`  ${YELLOW}\u26A0 ${w}${RESET}`);
    }
  }

  return lines.join('\n');
}

// ── Command definition ───────────────────────────────────

export const statusCommand = new Command('status')
  .description('Show identity and use case context')
  .argument('[path]', 'Path to check (default: current directory)', '.')
  .option('--json', 'Output as JSON')
  .option('--verify', 'Run quick validation on the use case')
  .option('--project-file <path>', 'Path to custom project file (e.g., project-client-a.json)')
  .action(async (path: string, options: { json?: boolean; verify?: boolean; projectFile?: string }) => {
    try {
      const result = await gatherStatus(path, !!options.verify, options.projectFile);

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log('');
        console.log(formatStatus(result));
        console.log('');
      }

      // Exit 0 for informational results (including non-use-case dirs)
      // Exit 1 only when a use case exists but has blocking issues
      const hasUseCase = result.useCase?.hasConfigTs || result.useCase?.hasWorkflowsDir;
      process.exit(hasUseCase && !result.readiness.ready ? 1 : 0);
    } catch (error) {
      console.error(`\n${RED}Error:${RESET} ${(error as Error).message}\n`);
      process.exit(2);
    }
  });
