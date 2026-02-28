/**
 * Tests for Config Module
 *
 * Tests the config file read/write/clear operations and
 * the resolution chains for API key and base URL.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, readFileSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  readConfig,
  writeConfig,
  clearConfig,
  resolveApiKey,
  resolveBaseUrl,
  resolveEndpointUrl,
  describeApiKeySource,
  describeBaseUrlSource,
  maskApiKey,
  PRODUCTION_BASE_URL,
  ENDPOINTS,
  API_KEY_MISSING_MESSAGE,
} from '../../src/utils/config.js';

// Use a temp directory for all config tests to avoid touching real user config
const TEST_CONFIG_DIR = join(tmpdir(), `codika-helper-test-${process.pid}`);
const TEST_CONFIG_PATH = join(TEST_CONFIG_DIR, 'config.json');

// We need to override the config path for testing.
// The module uses XDG_CONFIG_HOME, so we set that to our temp dir.
const originalXdg = process.env.XDG_CONFIG_HOME;
const originalApiKey = process.env.CODIKA_API_KEY;
const originalBaseUrl = process.env.CODIKA_BASE_URL;
const originalApiUrl = process.env.CODIKA_API_URL;
const originalDataIngestionUrl = process.env.CODIKA_DATA_INGESTION_API_URL;
const originalProjectUrl = process.env.CODIKA_PROJECT_API_URL;

beforeEach(() => {
  // Point config to temp dir
  process.env.XDG_CONFIG_HOME = TEST_CONFIG_DIR;
  // Clear all env vars that might interfere
  delete process.env.CODIKA_API_KEY;
  delete process.env.CODIKA_BASE_URL;
  delete process.env.CODIKA_API_URL;
  delete process.env.CODIKA_DATA_INGESTION_API_URL;
  delete process.env.CODIKA_PROJECT_API_URL;
  // Clean up any leftover config from previous test
  if (existsSync(TEST_CONFIG_DIR)) {
    rmSync(TEST_CONFIG_DIR, { recursive: true });
  }
});

afterEach(() => {
  // Restore original env
  if (originalXdg !== undefined) process.env.XDG_CONFIG_HOME = originalXdg;
  else delete process.env.XDG_CONFIG_HOME;
  if (originalApiKey !== undefined) process.env.CODIKA_API_KEY = originalApiKey;
  else delete process.env.CODIKA_API_KEY;
  if (originalBaseUrl !== undefined) process.env.CODIKA_BASE_URL = originalBaseUrl;
  else delete process.env.CODIKA_BASE_URL;
  if (originalApiUrl !== undefined) process.env.CODIKA_API_URL = originalApiUrl;
  else delete process.env.CODIKA_API_URL;
  if (originalDataIngestionUrl !== undefined) process.env.CODIKA_DATA_INGESTION_API_URL = originalDataIngestionUrl;
  else delete process.env.CODIKA_DATA_INGESTION_API_URL;
  if (originalProjectUrl !== undefined) process.env.CODIKA_PROJECT_API_URL = originalProjectUrl;
  else delete process.env.CODIKA_PROJECT_API_URL;
  // Clean up temp dir
  if (existsSync(TEST_CONFIG_DIR)) {
    rmSync(TEST_CONFIG_DIR, { recursive: true });
  }
});

// ── readConfig / writeConfig / clearConfig ─────────────────

describe('readConfig', () => {
  it('should return empty object when no config file exists', () => {
    expect(readConfig()).toEqual({});
  });

  it('should return empty object when config file is invalid JSON', () => {
    mkdirSync(join(TEST_CONFIG_DIR, 'codika-helper'), { recursive: true });
    writeFileSync(join(TEST_CONFIG_DIR, 'codika-helper', 'config.json'), 'not json');
    expect(readConfig()).toEqual({});
  });

  it('should return config from file', () => {
    writeConfig({ apiKey: 'test-key-123', baseUrl: 'https://custom.example.com' });
    const config = readConfig();
    expect(config.apiKey).toBe('test-key-123');
    expect(config.baseUrl).toBe('https://custom.example.com');
  });
});

describe('writeConfig', () => {
  it('should create config directory and file', () => {
    writeConfig({ apiKey: 'my-key' });
    const configPath = join(TEST_CONFIG_DIR, 'codika-helper', 'config.json');
    expect(existsSync(configPath)).toBe(true);
    const content = JSON.parse(readFileSync(configPath, 'utf-8'));
    expect(content.apiKey).toBe('my-key');
  });

  it('should overwrite existing config', () => {
    writeConfig({ apiKey: 'first' });
    writeConfig({ apiKey: 'second', baseUrl: 'https://new.example.com' });
    const config = readConfig();
    expect(config.apiKey).toBe('second');
    expect(config.baseUrl).toBe('https://new.example.com');
  });
});

describe('clearConfig', () => {
  it('should delete config file', () => {
    writeConfig({ apiKey: 'to-delete' });
    clearConfig();
    expect(readConfig()).toEqual({});
  });

  it('should not throw when no config file exists', () => {
    expect(() => clearConfig()).not.toThrow();
  });
});

// ── resolveApiKey ──────────────────────────────────────────

describe('resolveApiKey', () => {
  it('should return flag value when provided', () => {
    writeConfig({ apiKey: 'from-config' });
    process.env.CODIKA_API_KEY = 'from-env';
    expect(resolveApiKey('from-flag')).toBe('from-flag');
  });

  it('should return env var when no flag', () => {
    writeConfig({ apiKey: 'from-config' });
    process.env.CODIKA_API_KEY = 'from-env';
    expect(resolveApiKey()).toBe('from-env');
  });

  it('should return config value when no flag or env', () => {
    writeConfig({ apiKey: 'from-config' });
    expect(resolveApiKey()).toBe('from-config');
  });

  it('should return undefined when nothing is set', () => {
    expect(resolveApiKey()).toBeUndefined();
  });
});

// ── resolveBaseUrl ─────────────────────────────────────────

describe('resolveBaseUrl', () => {
  it('should return flag value when provided', () => {
    expect(resolveBaseUrl('https://flag.example.com')).toBe('https://flag.example.com');
  });

  it('should return env var when no flag', () => {
    process.env.CODIKA_BASE_URL = 'https://env.example.com';
    expect(resolveBaseUrl()).toBe('https://env.example.com');
  });

  it('should return config value when no flag or env', () => {
    writeConfig({ baseUrl: 'https://config.example.com' });
    expect(resolveBaseUrl()).toBe('https://config.example.com');
  });

  it('should return production default when nothing is set', () => {
    expect(resolveBaseUrl()).toBe(PRODUCTION_BASE_URL);
  });
});

// ── resolveEndpointUrl ─────────────────────────────────────

describe('resolveEndpointUrl', () => {
  it('should return flag override when provided', () => {
    expect(resolveEndpointUrl('deployUseCase', 'https://override.example.com/deploy'))
      .toBe('https://override.example.com/deploy');
  });

  it('should return legacy env var for deployUseCase', () => {
    process.env.CODIKA_API_URL = 'https://legacy.example.com/deploy';
    expect(resolveEndpointUrl('deployUseCase')).toBe('https://legacy.example.com/deploy');
  });

  it('should return legacy env var for deployDataIngestion', () => {
    process.env.CODIKA_DATA_INGESTION_API_URL = 'https://legacy.example.com/ingest';
    expect(resolveEndpointUrl('deployDataIngestion')).toBe('https://legacy.example.com/ingest');
  });

  it('should return legacy env var for createProject', () => {
    process.env.CODIKA_PROJECT_API_URL = 'https://legacy.example.com/project';
    expect(resolveEndpointUrl('createProject')).toBe('https://legacy.example.com/project');
  });

  it('should derive from config baseUrl when no flag or legacy env', () => {
    writeConfig({ baseUrl: 'https://custom.example.com' });
    expect(resolveEndpointUrl('deployUseCase'))
      .toBe('https://custom.example.com/deployProcessUseCase');
  });

  it('should derive from production default when nothing is set', () => {
    expect(resolveEndpointUrl('deployUseCase'))
      .toBe(PRODUCTION_BASE_URL + '/deployProcessUseCase');
    expect(resolveEndpointUrl('createProject'))
      .toBe(PRODUCTION_BASE_URL + '/createProjectViaApiKey');
    expect(resolveEndpointUrl('deployDataIngestion'))
      .toBe(PRODUCTION_BASE_URL + '/deployDataIngestion');
  });

  it('should resolve all endpoint paths correctly', () => {
    for (const [name, path] of Object.entries(ENDPOINTS)) {
      const url = resolveEndpointUrl(name as keyof typeof ENDPOINTS);
      expect(url).toBe(PRODUCTION_BASE_URL + path);
    }
  });
});

// ── describeApiKeySource / describeBaseUrlSource ───────────

describe('describeApiKeySource', () => {
  it('should return "flag" when flag provided', () => {
    expect(describeApiKeySource('some-key')).toBe('flag');
  });

  it('should return env source when env set', () => {
    process.env.CODIKA_API_KEY = 'env-key';
    expect(describeApiKeySource()).toBe('env (CODIKA_API_KEY)');
  });

  it('should return "config file" when saved', () => {
    writeConfig({ apiKey: 'saved-key' });
    expect(describeApiKeySource()).toBe('config file');
  });

  it('should return "not set" when nothing configured', () => {
    expect(describeApiKeySource()).toBe('not set');
  });
});

describe('describeBaseUrlSource', () => {
  it('should return "flag" when flag provided', () => {
    expect(describeBaseUrlSource('https://flag.com')).toBe('flag');
  });

  it('should return env source when env set', () => {
    process.env.CODIKA_BASE_URL = 'https://env.com';
    expect(describeBaseUrlSource()).toBe('env (CODIKA_BASE_URL)');
  });

  it('should return "config file" when saved', () => {
    writeConfig({ baseUrl: 'https://saved.com' });
    expect(describeBaseUrlSource()).toBe('config file');
  });

  it('should return default when nothing configured', () => {
    expect(describeBaseUrlSource()).toBe('default (production)');
  });
});

// ── maskApiKey ─────────────────────────────────────────────

describe('maskApiKey', () => {
  it('should mask long keys showing first 8 chars', () => {
    expect(maskApiKey('abcdefghijklmnop')).toBe('abcdefgh...');
  });

  it('should not mask short keys (8 chars or less)', () => {
    expect(maskApiKey('12345678')).toBe('12345678');
    expect(maskApiKey('short')).toBe('short');
  });
});

// ── Constants ──────────────────────────────────────────────

describe('constants', () => {
  it('should have correct production base URL', () => {
    expect(PRODUCTION_BASE_URL).toBe('https://europe-west1-codika-app.cloudfunctions.net');
  });

  it('should have all expected endpoints', () => {
    expect(ENDPOINTS.deployUseCase).toBe('/deployProcessUseCase');
    expect(ENDPOINTS.deployDataIngestion).toBe('/deployDataIngestion');
    expect(ENDPOINTS.createProject).toBe('/createProjectViaApiKey');
    expect(ENDPOINTS.deployDocuments).toBe('/deployUseCaseDocuments');
    expect(ENDPOINTS.getMetadata).toBe('/getMetadataDocumentsEndpoint');
    expect(ENDPOINTS.verifyApiKey).toBe('/verifyApiKey');
  });

  it('should have a helpful API_KEY_MISSING_MESSAGE', () => {
    expect(API_KEY_MISSING_MESSAGE).toContain('codika-helper login');
    expect(API_KEY_MISSING_MESSAGE).toContain('CODIKA_API_KEY');
    expect(API_KEY_MISSING_MESSAGE).toContain('--api-key');
  });
});
