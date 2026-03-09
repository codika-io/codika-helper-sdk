/**
 * Tests for Config Module
 *
 * Tests the multi-profile config file read/write/clear operations,
 * profile management, and resolution chains for API key and base URL.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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
  resolveApiKeyForOrg,
  describeApiKeySource,
  describeBaseUrlSource,
  maskApiKey,
  getActiveProfile,
  listProfiles,
  setActiveProfile,
  upsertProfile,
  removeProfile,
  findProfileByOrgId,
  deriveProfileName,
  PRODUCTION_BASE_URL,
  ENDPOINTS,
  API_KEY_MISSING_MESSAGE,
  type ProfileData,
  type CodikaConfig,
} from '../../src/utils/config.js';

// Use a temp directory for all config tests to avoid touching real user config
const TEST_CONFIG_DIR = join(tmpdir(), `codika-test-${process.pid}`);

// We need to override the config path for testing.
// The module uses XDG_CONFIG_HOME, so we set that to our temp dir.
const originalXdg = process.env.XDG_CONFIG_HOME;
const originalApiKey = process.env.CODIKA_API_KEY;
const originalBaseUrl = process.env.CODIKA_BASE_URL;
const originalApiUrl = process.env.CODIKA_API_URL;
const originalDataIngestionUrl = process.env.CODIKA_DATA_INGESTION_API_URL;
const originalProjectUrl = process.env.CODIKA_PROJECT_API_URL;

// Helper to create a profile
function makeProfile(overrides?: Partial<ProfileData>): ProfileData {
  return {
    apiKey: 'cko_test-key-123',
    type: 'org-api-key',
    organizationId: 'org-123',
    organizationName: 'Test Org',
    keyName: 'test-key',
    keyPrefix: 'cko_test',
    scopes: ['deploy:use-case'],
    ...overrides,
  };
}

// Helper to write a v2 config directly
function writeV2Config(config: CodikaConfig): void {
  writeConfig(config);
}

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
  it('should return empty config when no config file exists', () => {
    const config = readConfig();
    expect(config.activeProfile).toBeNull();
    expect(config.profiles).toEqual({});
  });

  it('should return empty config when config file is invalid JSON', () => {
    mkdirSync(join(TEST_CONFIG_DIR, 'codika'), { recursive: true });
    writeFileSync(join(TEST_CONFIG_DIR, 'codika', 'config.json'), 'not json');
    const config = readConfig();
    expect(config.activeProfile).toBeNull();
    expect(config.profiles).toEqual({});
  });

  it('should return config from file', () => {
    const profile = makeProfile();
    writeV2Config({ activeProfile: 'test', profiles: { test: profile } });
    const config = readConfig();
    expect(config.activeProfile).toBe('test');
    expect(config.profiles.test.apiKey).toBe('cko_test-key-123');
    expect(config.profiles.test.organizationName).toBe('Test Org');
  });
});

describe('writeConfig', () => {
  it('should create config directory and file', () => {
    const profile = makeProfile();
    writeV2Config({ activeProfile: 'test', profiles: { test: profile } });
    const configPath = join(TEST_CONFIG_DIR, 'codika', 'config.json');
    expect(existsSync(configPath)).toBe(true);
    const content = JSON.parse(readFileSync(configPath, 'utf-8'));
    expect(content.activeProfile).toBe('test');
    expect(content.profiles.test.apiKey).toBe('cko_test-key-123');
  });

  it('should overwrite existing config', () => {
    writeV2Config({ activeProfile: 'first', profiles: { first: makeProfile({ apiKey: 'cko_first' }) } });
    writeV2Config({ activeProfile: 'second', profiles: { second: makeProfile({ apiKey: 'cko_second' }) } });
    const config = readConfig();
    expect(config.activeProfile).toBe('second');
    expect(config.profiles.second.apiKey).toBe('cko_second');
  });
});

describe('clearConfig', () => {
  it('should delete config file', () => {
    writeV2Config({ activeProfile: 'test', profiles: { test: makeProfile() } });
    clearConfig();
    const config = readConfig();
    expect(config.profiles).toEqual({});
  });

  it('should not throw when no config file exists', () => {
    expect(() => clearConfig()).not.toThrow();
  });
});

// ── Profile management ────────────────────────────────────

describe('getActiveProfile', () => {
  it('should return null when no profiles exist', () => {
    expect(getActiveProfile()).toBeNull();
  });

  it('should return the active profile', () => {
    upsertProfile('test', makeProfile());
    const active = getActiveProfile();
    expect(active).not.toBeNull();
    expect(active!.name).toBe('test');
    expect(active!.profile.organizationName).toBe('Test Org');
  });

  it('should return null when active profile name references missing profile', () => {
    writeV2Config({ activeProfile: 'missing', profiles: {} });
    expect(getActiveProfile()).toBeNull();
  });
});

describe('listProfiles', () => {
  it('should return empty array when no profiles', () => {
    expect(listProfiles()).toEqual([]);
  });

  it('should list all profiles with active flag', () => {
    upsertProfile('org-a', makeProfile({ organizationName: 'Org A' }));
    upsertProfile('org-b', makeProfile({ organizationName: 'Org B' }));
    setActiveProfile('org-b');

    const profiles = listProfiles();
    expect(profiles).toHaveLength(2);
    expect(profiles.find(p => p.name === 'org-a')!.active).toBe(false);
    expect(profiles.find(p => p.name === 'org-b')!.active).toBe(true);
  });
});

describe('upsertProfile', () => {
  it('should create a new profile and set it as active if first', () => {
    upsertProfile('first', makeProfile());
    const active = getActiveProfile();
    expect(active!.name).toBe('first');
  });

  it('should not change active when adding a second profile', () => {
    upsertProfile('first', makeProfile({ apiKey: 'cko_first' }));
    upsertProfile('second', makeProfile({ apiKey: 'cko_second' }));
    const active = getActiveProfile();
    expect(active!.name).toBe('first');
  });

  it('should update an existing profile', () => {
    upsertProfile('test', makeProfile({ keyName: 'old-name' }));
    upsertProfile('test', makeProfile({ keyName: 'new-name' }));
    const profiles = listProfiles();
    expect(profiles).toHaveLength(1);
    expect(profiles[0].profile.keyName).toBe('new-name');
  });
});

describe('setActiveProfile', () => {
  it('should switch the active profile', () => {
    upsertProfile('a', makeProfile({ apiKey: 'cko_a' }));
    upsertProfile('b', makeProfile({ apiKey: 'cko_b' }));
    setActiveProfile('b');
    expect(getActiveProfile()!.name).toBe('b');
  });

  it('should throw when profile does not exist', () => {
    expect(() => setActiveProfile('nonexistent')).toThrow('does not exist');
  });
});

describe('removeProfile', () => {
  it('should remove a profile', () => {
    upsertProfile('a', makeProfile());
    upsertProfile('b', makeProfile({ apiKey: 'cko_b' }));
    removeProfile('b');
    expect(listProfiles()).toHaveLength(1);
    expect(listProfiles()[0].name).toBe('a');
  });

  it('should switch active when removing the active profile', () => {
    upsertProfile('a', makeProfile({ apiKey: 'cko_a' }));
    upsertProfile('b', makeProfile({ apiKey: 'cko_b' }));
    setActiveProfile('a');
    removeProfile('a');
    expect(getActiveProfile()!.name).toBe('b');
  });

  it('should set active to null when removing the last profile', () => {
    upsertProfile('only', makeProfile());
    removeProfile('only');
    expect(getActiveProfile()).toBeNull();
  });

  it('should throw when profile does not exist', () => {
    expect(() => removeProfile('nonexistent')).toThrow('does not exist');
  });
});

describe('findProfileByOrgId', () => {
  it('should find a profile by organization ID', () => {
    upsertProfile('org-a', makeProfile({ organizationId: 'org-111' }));
    upsertProfile('org-b', makeProfile({ organizationId: 'org-222' }));
    const found = findProfileByOrgId('org-222');
    expect(found).not.toBeNull();
    expect(found!.name).toBe('org-b');
  });

  it('should return null when no match', () => {
    upsertProfile('test', makeProfile({ organizationId: 'org-111' }));
    expect(findProfileByOrgId('org-999')).toBeNull();
  });
});

// ── Profile name derivation ──────────────────────────────

describe('deriveProfileName', () => {
  it('should slugify organization name for org keys', () => {
    const name = deriveProfileName(
      { type: 'org-api-key', organizationName: 'Acme Corp' },
      new Set(),
    );
    expect(name).toBe('acme-corp');
  });

  it('should use key name for admin keys', () => {
    const name = deriveProfileName(
      { type: 'admin-api-key', keyName: 'Platform Admin' },
      new Set(),
    );
    expect(name).toBe('platform-admin');
  });

  it('should deduplicate names', () => {
    const name = deriveProfileName(
      { type: 'org-api-key', organizationName: 'Acme Corp' },
      new Set(['acme-corp']),
    );
    expect(name).toBe('acme-corp-2');
  });

  it('should fall back to keyPrefix when no org name or key name', () => {
    const name = deriveProfileName({ keyPrefix: 'cko_HAdu' }, new Set());
    expect(name).toBe('cko_HAdu');
  });

  it('should fall back to "default" when nothing available', () => {
    const name = deriveProfileName({}, new Set());
    expect(name).toBe('default');
  });
});

// ── resolveApiKey ──────────────────────────────────────────

describe('resolveApiKey', () => {
  it('should return flag value when provided', () => {
    upsertProfile('test', makeProfile({ apiKey: 'cko_from-config' }));
    process.env.CODIKA_API_KEY = 'from-env';
    expect(resolveApiKey('from-flag')).toBe('from-flag');
  });

  it('should return env var when no flag', () => {
    upsertProfile('test', makeProfile({ apiKey: 'cko_from-config' }));
    process.env.CODIKA_API_KEY = 'from-env';
    expect(resolveApiKey()).toBe('from-env');
  });

  it('should return active profile key when no flag or env', () => {
    upsertProfile('test', makeProfile({ apiKey: 'cko_from-config' }));
    expect(resolveApiKey()).toBe('cko_from-config');
  });

  it('should return undefined when nothing is set', () => {
    expect(resolveApiKey()).toBeUndefined();
  });
});

// ── resolveApiKeyForOrg ───────────────────────────────────

describe('resolveApiKeyForOrg', () => {
  it('should return flag value when provided', () => {
    const result = resolveApiKeyForOrg({ flagValue: 'from-flag' });
    expect(result.apiKey).toBe('from-flag');
    expect(result.autoSelected).toBeUndefined();
  });

  it('should return env var when no flag', () => {
    process.env.CODIKA_API_KEY = 'from-env';
    const result = resolveApiKeyForOrg({});
    expect(result.apiKey).toBe('from-env');
  });

  it('should auto-select profile matching organizationId', () => {
    upsertProfile('active', makeProfile({ apiKey: 'cko_active', organizationId: 'org-A' }));
    upsertProfile('target', makeProfile({ apiKey: 'cko_target', organizationId: 'org-B' }));

    const result = resolveApiKeyForOrg({ organizationId: 'org-B' });
    expect(result.apiKey).toBe('cko_target');
    expect(result.profileName).toBe('target');
    expect(result.autoSelected).toBe(true);
  });

  it('should fall back to active profile when no org match', () => {
    upsertProfile('active', makeProfile({ apiKey: 'cko_active', organizationId: 'org-A' }));

    const result = resolveApiKeyForOrg({ organizationId: 'org-Z' });
    expect(result.apiKey).toBe('cko_active');
    expect(result.profileName).toBe('active');
    expect(result.autoSelected).toBeUndefined();
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

  it('should return active profile baseUrl when no flag or env', () => {
    upsertProfile('test', makeProfile({ baseUrl: 'https://profile.example.com' }));
    expect(resolveBaseUrl()).toBe('https://profile.example.com');
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

  it('should derive from profile baseUrl when no flag or legacy env', () => {
    upsertProfile('test', makeProfile({ baseUrl: 'https://custom.example.com' }));
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

  it('should return profile name when saved', () => {
    upsertProfile('my-org', makeProfile());
    expect(describeApiKeySource()).toMatch(/profile "my-org"/);
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

  it('should return profile name when saved', () => {
    upsertProfile('my-org', makeProfile({ baseUrl: 'https://saved.com' }));
    expect(describeBaseUrlSource()).toMatch(/profile "my-org"/);
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
    expect(API_KEY_MISSING_MESSAGE).toContain('codika login');
    expect(API_KEY_MISSING_MESSAGE).toContain('CODIKA_API_KEY');
    expect(API_KEY_MISSING_MESSAGE).toContain('--api-key');
  });
});
