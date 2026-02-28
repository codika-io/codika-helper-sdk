/**
 * Configuration Module
 *
 * Manages persistent CLI configuration stored in ~/.config/codika-helper/config.json.
 * Provides resolution chains for API key and base URL:
 *   --flag > environment variable > config file > default
 */

import { readFileSync, writeFileSync, mkdirSync, unlinkSync, existsSync, chmodSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';

// ── Types ────────────────────────────────────────────────

export interface CodikaConfig {
  apiKey?: string;
  baseUrl?: string;
}

export type EndpointName = keyof typeof ENDPOINTS;

// ── Constants ────────────────────────────────────────────

export const PRODUCTION_BASE_URL = 'https://europe-west1-codika-app.cloudfunctions.net';

export const ENDPOINTS = {
  deployUseCase: '/deployProcessUseCase',
  deployDataIngestion: '/deployDataIngestion',
  createProject: '/createProjectViaApiKey',
  deployDocuments: '/deployUseCaseDocuments',
  getMetadata: '/getMetadataDocumentsEndpoint',
  getExecutionDetails: '/getExecutionDetailsPublic',
  verifyApiKey: '/verifyApiKey',
} as const;

// ── Config file path ─────────────────────────────────────

function getConfigDir(): string {
  const xdg = process.env.XDG_CONFIG_HOME;
  const base = xdg || join(homedir(), '.config');
  return join(base, 'codika-helper');
}

function getConfigPath(): string {
  return join(getConfigDir(), 'config.json');
}

// ── Read / Write / Clear ─────────────────────────────────

export function readConfig(): CodikaConfig {
  const path = getConfigPath();
  if (!existsSync(path)) {
    return {};
  }
  try {
    const raw = readFileSync(path, 'utf-8');
    return JSON.parse(raw) as CodikaConfig;
  } catch {
    return {};
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

// ── Resolution chains ────────────────────────────────────

/**
 * Resolve API key with priority: flag > CODIKA_API_KEY env > config file
 */
export function resolveApiKey(flagValue?: string): string | undefined {
  if (flagValue) return flagValue;
  if (process.env.CODIKA_API_KEY) return process.env.CODIKA_API_KEY;
  return readConfig().apiKey;
}

/**
 * Resolve base URL with priority: flag > CODIKA_BASE_URL env > config file > production default
 */
export function resolveBaseUrl(flagValue?: string): string {
  if (flagValue) return flagValue;
  if (process.env.CODIKA_BASE_URL) return process.env.CODIKA_BASE_URL;
  return readConfig().baseUrl || PRODUCTION_BASE_URL;
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
export function resolveEndpointUrl(endpoint: EndpointName, flagOverride?: string): string {
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

  return resolveBaseUrl() + ENDPOINTS[endpoint];
}

/**
 * Describe the source of the current API key (for `config show`)
 */
export function describeApiKeySource(flagValue?: string): string {
  if (flagValue) return 'flag';
  if (process.env.CODIKA_API_KEY) return 'env (CODIKA_API_KEY)';
  if (readConfig().apiKey) return 'config file';
  return 'not set';
}

/**
 * Describe the source of the current base URL (for `config show`)
 */
export function describeBaseUrlSource(flagValue?: string): string {
  if (flagValue) return 'flag';
  if (process.env.CODIKA_BASE_URL) return 'env (CODIKA_BASE_URL)';
  if (readConfig().baseUrl) return 'config file';
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
  1. Run 'codika-helper login' to save your key
  2. Set CODIKA_API_KEY environment variable
  3. Pass --api-key flag`;
