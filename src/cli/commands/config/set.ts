/**
 * Config Set Command
 *
 * Saves API key to the config file and verifies it against the platform.
 * Base URL defaults to production; --base-url flag overrides for dev/staging.
 *
 * Usage:
 *   codika-helper config set
 *   codika-helper config set --api-key <key>
 *   codika-helper config set --api-key <key> --base-url <url>
 */

import { Command } from 'commander';
import { createInterface } from 'readline';
import {
  writeConfig,
  maskApiKey,
  resolveEndpointUrl,
  PRODUCTION_BASE_URL,
} from '../../../utils/config.js';

export interface ConfigSetOptions {
  apiKey?: string;
  baseUrl?: string;
  skipVerify?: boolean;
}

/**
 * Core logic for config set / login — reused by both commands.
 */
export async function runConfigSet(options: ConfigSetOptions): Promise<void> {
  let apiKey = options.apiKey;
  const baseUrl = options.baseUrl || PRODUCTION_BASE_URL;

  // Interactive prompt for API key if not provided via flag
  if (!apiKey) {
    apiKey = await promptMasked('API key: ');
    if (!apiKey) {
      console.error('\x1b[31mError:\x1b[0m API key cannot be empty.');
      process.exit(1);
    }
  }

  // Verify the key against the platform
  if (!options.skipVerify) {
    console.log('');
    console.log('Verifying API key...');

    const verifyUrl = resolveEndpointUrl('verifyApiKey', baseUrl !== PRODUCTION_BASE_URL ? baseUrl + '/verifyApiKey' : undefined);
    const result = await verifyApiKeyRemote(apiKey, verifyUrl);

    if (!result.success) {
      console.log('');
      console.log(`\x1b[31m\u2717 API key verification failed\x1b[0m`);
      console.log('');
      console.log(`  ${result.error}`);
      console.log('');
      process.exit(1);
    }

    // Save config
    writeConfig({ apiKey, ...(baseUrl !== PRODUCTION_BASE_URL && { baseUrl }) });

    console.log('');
    console.log('\x1b[32m\u2713 Logged in successfully\x1b[0m');
    console.log('');
    if (result.data?.organizationName) {
      console.log(`  Organization: ${result.data.organizationName}`);
    }
    if (result.data?.keyName) {
      console.log(`  Key name:     ${result.data.keyName}`);
    }
    console.log(`  Key:          ${maskApiKey(apiKey)}`);
    if (result.data?.scopes) {
      console.log(`  Scopes:       ${result.data.scopes.join(', ')}`);
    }
    if (result.data?.expiresAt) {
      console.log(`  Expires:      ${new Date(result.data.expiresAt).toLocaleDateString()}`);
    }
    if (baseUrl !== PRODUCTION_BASE_URL) {
      console.log(`  Base URL:     ${baseUrl}`);
    }
    console.log('');
  } else {
    // Skip verification — just save
    writeConfig({ apiKey, ...(baseUrl !== PRODUCTION_BASE_URL && { baseUrl }) });

    console.log('');
    console.log('\x1b[32m\u2713 Configuration saved\x1b[0m');
    console.log('');
    console.log(`  API key:  ${maskApiKey(apiKey)}`);
    if (baseUrl !== PRODUCTION_BASE_URL) {
      console.log(`  Base URL: ${baseUrl}`);
    }
    console.log('');
  }
}

export const configSetCommand = new Command('set')
  .description('Save API key and base URL to config file')
  .option('--api-key <key>', 'API key (skips interactive prompt)')
  .option('--base-url <url>', 'Base URL override (default: production)')
  .option('--skip-verify', 'Save without verifying the key')
  .action(async (options: ConfigSetOptions) => {
    await runConfigSet(options);
  });

// ── Verify API key against the platform ──────────────────

interface VerifyResult {
  success: boolean;
  error?: string;
  data?: {
    type: string;
    keyName?: string;
    keyPrefix?: string;
    scopes?: string[];
    organizationId?: string;
    organizationName?: string;
    createdAt?: string;
    expiresAt?: string;
    lastUsedAt?: string;
  };
}

async function verifyApiKeyRemote(apiKey: string, url: string): Promise<VerifyResult> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Process-Manager-Key': apiKey,
      },
    });

    const body = await response.json() as any;

    if (!response.ok) {
      return {
        success: false,
        error: body?.error?.message || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    if (body.success) {
      return { success: true, data: body.data };
    }

    return { success: false, error: body?.error?.message || 'Unknown error' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// ── Interactive prompts ──────────────────────────────────

/**
 * Prompt for a value with masked input (characters replaced with *)
 */
function promptMasked(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Override output to mask characters
    const originalWrite = (rl as any)._writeToOutput;
    (rl as any)._writeToOutput = function (str: string) {
      if (str === prompt || str === '\r\n' || str === '\n') {
        originalWrite.call(rl, str);
      } else {
        originalWrite.call(rl, '*'.repeat(str.length));
      }
    };

    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}
