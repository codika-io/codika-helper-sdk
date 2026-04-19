/**
 * `codika auth login-request --email <email>`
 *
 * Requests a 6-digit OTP for an existing account so the CLI can mint a
 * fresh `cko_` API key.
 */

import { Command } from 'commander';
import { resolveEndpointUrl } from '../../../utils/config.js';
import { loginRequest } from '../../../utils/auth-flow-client.js';

interface LoginRequestOptions {
  email: string;
  baseUrl?: string;
  apiUrl?: string;
  json?: boolean;
}

export const loginRequestCommand = new Command('login-request')
  .description('Request a 6-digit OTP for an existing account')
  .requiredOption('--email <email>', 'Email address of the existing account')
  .option('--base-url <url>', 'Codika API base URL override (default: production)')
  .option('--api-url <url>', 'Full URL to the cliRequestLoginOtp endpoint (overrides --base-url)')
  .option('--json', 'Emit JSON output')
  .action(async (options: LoginRequestOptions) => {
    const url = resolveEndpointUrl('cliRequestLoginOtp', options.apiUrl, undefined);
    const baseOverrideUrl = options.baseUrl
      ? options.baseUrl.replace(/\/$/, '') + '/clirequestloginotp'
      : undefined;
    const finalUrl = options.apiUrl || baseOverrideUrl || url;

    const result = await loginRequest(options.email, finalUrl);

    if (options.json) {
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
      process.exit(result.success ? 0 : 1);
    }

    if (result.success) {
      console.log('');
      console.log('\x1b[32m\u2713 OTP sent\x1b[0m');
      console.log('');
      console.log(`  Email:   ${result.data.email}`);
      console.log(`  Expires: in ${result.data.expiresInSeconds}s (~${Math.round(result.data.expiresInSeconds / 60)} minutes)`);
      console.log('');
      console.log('Check your inbox for the 6-digit code, then run:');
      console.log(`  codika auth login-complete --email ${options.email} --code <6-digit-code>`);
      console.log('');
      process.exit(0);
    }

    console.error('');
    console.error(`\x1b[31m\u2717 ${result.error.code}\x1b[0m  ${result.error.message}`);
    if (result.error.nextAction) {
      console.error(`  ${result.error.nextAction}`);
    }
    console.error('');
    process.exit(1);
  });
