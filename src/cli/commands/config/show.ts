/**
 * Config Show Command
 *
 * Displays the current configuration with sources.
 * Exit 0 if configured, exit 1 if no API key is set.
 *
 * Usage:
 *   codika-helper config show
 */

import { Command } from 'commander';
import {
  resolveApiKey,
  resolveBaseUrl,
  describeApiKeySource,
  describeBaseUrlSource,
  maskApiKey,
  PRODUCTION_BASE_URL,
} from '../../../utils/config.js';

export const configShowCommand = new Command('show')
  .description('Display current configuration')
  .action(() => {
    const apiKey = resolveApiKey();
    const baseUrl = resolveBaseUrl();
    const keySource = describeApiKeySource();
    const urlSource = describeBaseUrlSource();

    console.log('');
    console.log('Codika Helper Configuration');
    console.log('');
    if (apiKey) {
      console.log(`  API key:  ${maskApiKey(apiKey)}  (${keySource})`);
    } else {
      console.log(`  API key:  \x1b[33mnot set\x1b[0m`);
    }
    // Only show base URL if it's not the default
    if (baseUrl !== PRODUCTION_BASE_URL) {
      console.log(`  Base URL: ${baseUrl}  (${urlSource})`);
    }
    console.log('');

    if (!apiKey) {
      console.log(`Run 'codika-helper login' to configure your API key.`);
      console.log('');
      process.exit(1);
    }
  });
