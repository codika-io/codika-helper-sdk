/**
 * Configuration Module
 *
 * Manages persistent CLI configuration stored in ~/.config/codika/config.json.
 * Supports multiple profiles (API keys with metadata) and active profile switching.
 *
 * Resolution chains for API key and base URL:
 *   --flag > environment variable > active profile > default
 */

import { readFileSync, writeFileSync, mkdirSync, unlinkSync, existsSync, cpSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// ── Types ────────────────────────────────────────────────

export interface ProfileData {
  apiKey: string;
  type: 'org-api-key' | 'admin-api-key' | 'personal-api-key';
  organizationId?: string;
  organizationName?: string;
  keyName?: string;
  keyPrefix?: string;
  scopes?: string[];
  createdAt?: string;
  expiresAt?: string;
  baseUrl?: string | null;
}

export interface CodikaConfig {
  activeProfile: string | null;
  profiles: Record<string, ProfileData>;
}

export type EndpointName = keyof typeof ENDPOINTS;

// ── Constants ────────────────────────────────────────────

export const PRODUCTION_BASE_URL = 'https://api.codika.io';

export const ENDPOINTS = {
  deployUseCase: '/deployprocessusecase',
  deployDataIngestion: '/deploydataingestion',
  createProject: '/createprojectviaapikey',
  deployDocuments: '/deployusecasedocuments',
  getMetadata: '/getmetadatadocumentsendpoint',
  getExecutionDetails: '/getexecutiondetailspublic',
  triggerWorkflow: '/triggerwebhookpublic',
  getExecutionStatus: '/getexecutionstatuspublic',
  verifyApiKey: '/verifyapikey',
  publishUseCase: '/publishprocessdeploymentpublic',
  listExecutions: '/listexecutionspublic',
  getProcessSkills: '/getprocessskillspublic',
  redeployDeploymentInstance: '/redeploydeploymentinstancepublic',
  createIntegration: '/createintegrationpublic',
  deleteIntegration: '/deleteintegrationpublic',
  listIntegrations: '/listintegrationspublic',
  createOrganization: '/createorganizationviaapikey',
  createOrganizationApiKey: '/createorganizationapikeypublic',
  getProcessInstance: '/getprocessinstancepublic',
  listProcessInstances: '/listprocessinstancespublic',
  activateInstance: '/activateprocessinstancepublic',
  deactivateInstance: '/deactivateprocessinstancepublic',
  listProjects: '/listprojectspublic',
  getProject: '/getprojectpublic',
  updateOrganizationApiKey: '/updateorganizationapikeypublic',
  upsertProjectNote: '/upsertprojectnote',
  getProjectNotes: '/getprojectnotes',
} as const;

// ── Config file path ─────────────────────────────────────

function getConfigDir(): string {
  const xdg = process.env.XDG_CONFIG_HOME;
  const base = xdg || join(homedir(), '.config');
  const newDir = join(base, 'codika');
  const oldDir = join(base, 'codika-helper');

  // Migrate from old config directory if needed
  if (!existsSync(newDir) && existsSync(oldDir)) {
    try {
      cpSync(oldDir, newDir, { recursive: true });
      process.stderr.write(
        `\x1b[33mMigrated config from ${oldDir} → ${newDir}\x1b[0m\n`
      );
    } catch {
      // Fall through to use old dir if migration fails
      return oldDir;
    }
  }

  return newDir;
}

function getConfigPath(): string {
  return join(getConfigDir(), 'config.json');
}

// ── Read / Write / Clear ─────────────────────────────────

const EMPTY_CONFIG: CodikaConfig = { activeProfile: null, profiles: {} };

export function readConfig(): CodikaConfig {
  const path = getConfigPath();
  if (!existsSync(path)) {
    return { ...EMPTY_CONFIG, profiles: {} };
  }
  try {
    const raw = readFileSync(path, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.profiles === 'object') {
      return parsed as CodikaConfig;
    }
    return { ...EMPTY_CONFIG, profiles: {} };
  } catch {
    return { ...EMPTY_CONFIG, profiles: {} };
  }
}

export function writeConfig(config: CodikaConfig): void {
  const dir = getConfigDir();
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const path = getConfigPath();
  writeFileSync(path, JSON.stringify(config, null, 2) + '\n', { mode: 0o600 });
}

export function clearConfig(): void {
  const path = getConfigPath();
  if (existsSync(path)) {
    unlinkSync(path);
  }
}

// ── Profile management ───────────────────────────────────

export function getActiveProfile(): { name: string; profile: ProfileData } | null {
  const config = readConfig();
  if (!config.activeProfile || !config.profiles[config.activeProfile]) {
    return null;
  }
  return { name: config.activeProfile, profile: config.profiles[config.activeProfile] };
}

export function listProfiles(): Array<{ name: string; profile: ProfileData; active: boolean }> {
  const config = readConfig();
  return Object.entries(config.profiles).map(([name, profile]) => ({
    name,
    profile,
    active: name === config.activeProfile,
  }));
}

export function setActiveProfile(name: string): void {
  const config = readConfig();
  if (!config.profiles[name]) {
    throw new Error(`Profile "${name}" does not exist.`);
  }
  config.activeProfile = name;
  writeConfig(config);
}

export function upsertProfile(name: string, data: ProfileData): void {
  const config = readConfig();
  config.profiles[name] = data;
  // If this is the only profile, make it active
  if (!config.activeProfile || !config.profiles[config.activeProfile]) {
    config.activeProfile = name;
  }
  writeConfig(config);
}

export function removeProfile(name: string): void {
  const config = readConfig();
  if (!config.profiles[name]) {
    throw new Error(`Profile "${name}" does not exist.`);
  }
  delete config.profiles[name];
  // If we removed the active profile, switch to the first remaining or null
  if (config.activeProfile === name) {
    const remaining = Object.keys(config.profiles);
    config.activeProfile = remaining.length > 0 ? remaining[0] : null;
  }
  writeConfig(config);
}

export function findProfileByOrgId(orgId: string): { name: string; profile: ProfileData } | null {
  const config = readConfig();
  for (const [name, profile] of Object.entries(config.profiles)) {
    if (profile.organizationId === orgId) {
      return { name, profile };
    }
  }
  return null;
}

// ── Profile name derivation ──────────────────────────────

export function deriveProfileName(
  data: { type?: string; organizationName?: string; keyName?: string; keyPrefix?: string },
  existingNames: Set<string>,
): string {
  let base: string;
  if (data.type === 'personal-api-key') {
    // Personal keys have no org — use keyName, keyPrefix, or 'personal'
    if (data.keyName) {
      base = slugify(data.keyName);
    } else if (data.keyPrefix) {
      base = data.keyPrefix;
    } else {
      base = 'personal';
    }
  } else if (data.type === 'org-api-key' && data.organizationName) {
    base = slugify(data.organizationName);
  } else if (data.keyName) {
    base = slugify(data.keyName);
  } else if (data.keyPrefix) {
    base = data.keyPrefix;
  } else {
    base = 'default';
  }

  if (!base) base = 'default';

  let name = base;
  let i = 2;
  while (existingNames.has(name)) {
    name = `${base}-${i}`;
    i++;
  }
  return name;
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ── Resolution chains ────────────────────────────────────

/**
 * Resolve API key with priority: flag > CODIKA_API_KEY env > active profile
 */
export function resolveApiKey(flagValue?: string, profileName?: string): string | undefined {
  if (flagValue) return flagValue;
  if (process.env.CODIKA_API_KEY) return process.env.CODIKA_API_KEY;
  if (profileName) {
    const profile = getProfileByName(profileName);
    return profile?.apiKey;
  }
  const active = getActiveProfile();
  return active?.profile.apiKey;
}

/**
 * Resolve base URL with priority: flag > CODIKA_BASE_URL env > --profile > active profile > production default
 */
export function resolveBaseUrl(flagValue?: string, profileName?: string): string {
  if (flagValue) return flagValue;
  if (process.env.CODIKA_BASE_URL) return process.env.CODIKA_BASE_URL;
  if (profileName) {
    const profile = getProfileByName(profileName);
    if (profile?.baseUrl) return profile.baseUrl;
  }
  const active = getActiveProfile();
  if (active?.profile.baseUrl) return active.profile.baseUrl;
  return PRODUCTION_BASE_URL;
}

/**
 * Get a profile by name. Returns the ProfileData or null if not found.
 */
export function getProfileByName(name: string): ProfileData | null {
  const config = readConfig();
  return config.profiles[name] || null;
}

/**
 * Resolve a full endpoint URL.
 *
 * Priority: flagOverride (full URL) > per-endpoint env var > base URL + path
 *
 * The per-endpoint env vars maintain backward compat:
 *   - deployUseCase:      CODIKA_API_URL
 *   - deployDataIngestion: CODIKA_DATA_INGESTION_API_URL
 *   - createProject:      CODIKA_PROJECT_API_URL
 */
export function resolveEndpointUrl(endpoint: EndpointName, flagOverride?: string, profileName?: string): string {
  if (flagOverride) return flagOverride;

  // Legacy per-endpoint env vars for backward compatibility
  const legacyEnvMap: Partial<Record<EndpointName, string>> = {
    deployUseCase: 'CODIKA_API_URL',
    deployDataIngestion: 'CODIKA_DATA_INGESTION_API_URL',
    createProject: 'CODIKA_PROJECT_API_URL',
  };

  const envVar = legacyEnvMap[endpoint];
  if (envVar && process.env[envVar]) {
    return process.env[envVar]!;
  }

  return resolveBaseUrl(undefined, profileName) + ENDPOINTS[endpoint];
}

/**
 * Resolve API key with org-aware fallback.
 * Priority: flag > env > profile matching organizationId > active profile
 */
export function resolveApiKeyForOrg(options: {
  flagValue?: string;
  organizationId?: string;
}): { apiKey: string | undefined; profileName?: string; autoSelected?: boolean } {
  if (options.flagValue) return { apiKey: options.flagValue };
  if (process.env.CODIKA_API_KEY) return { apiKey: process.env.CODIKA_API_KEY };

  // Try to match by organizationId
  if (options.organizationId) {
    const match = findProfileByOrgId(options.organizationId);
    if (match) {
      return { apiKey: match.profile.apiKey, profileName: match.name, autoSelected: true };
    }
  }

  const active = getActiveProfile();
  return { apiKey: active?.profile.apiKey, profileName: active?.name };
}

// ── Source descriptions ──────────────────────────────────

export function describeApiKeySource(flagValue?: string): string {
  if (flagValue) return 'flag';
  if (process.env.CODIKA_API_KEY) return 'env (CODIKA_API_KEY)';
  const active = getActiveProfile();
  if (active) return `profile "${active.name}"`;
  return 'not set';
}

export function describeBaseUrlSource(flagValue?: string): string {
  if (flagValue) return 'flag';
  if (process.env.CODIKA_BASE_URL) return 'env (CODIKA_BASE_URL)';
  const active = getActiveProfile();
  if (active?.profile.baseUrl) return `profile "${active.name}"`;
  return 'default (production)';
}

/**
 * Mask an API key for display: show first 8 chars + "..."
 */
export function maskApiKey(key: string): string {
  if (key.length <= 8) return key;
  return key.slice(0, 8) + '...';
}

/**
 * Standard error message when API key is missing
 */
export const API_KEY_MISSING_MESSAGE = `API key is required. Either:
  1. Run 'codika login' to save your key
  2. Set CODIKA_API_KEY environment variable
  3. Pass --api-key flag`;

// ── Profile expiry check ─────────────────────────────────

export interface ExpiryCheck {
  daysLeft: number;
  expiresAt: string;
  expired: boolean;
  profileName: string;
}

/**
 * Check if the active profile's API key is near expiry or already expired.
 * Returns null if no active profile or expiresAt is not set (key never expires).
 */
export function checkProfileExpiry(): ExpiryCheck | null {
  const active = getActiveProfile();
  if (!active) return null;

  const { expiresAt } = active.profile;
  if (!expiresAt) return null;

  const expDate = new Date(expiresAt);
  const now = new Date();
  const diffMs = expDate.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return {
    daysLeft,
    expiresAt,
    expired: daysLeft <= 0,
    profileName: active.name,
  };
}
