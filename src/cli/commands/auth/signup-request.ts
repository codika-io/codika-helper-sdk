/**
 * `codika auth signup-request --email <email>`
 *
 * Starts the CLI OTP signup flow: requests a 6-digit code to the given email.
 */

import { Command } from 'commander';
import { resolveEndpointUrl } from '../../../utils/config.js';
import { signupRequest } from '../../../utils/auth-flow-client.js';

interface SignupRequestOptions {
  email: string;
  baseUrl?: string;
  apiUrl?: string;
  json?: boolean;
}

export const signupRequestCommand = new Command('signup-request')
  .description('Request a 6-digit OTP for a new CLI signup')
  .requiredOption('--email <email>', 'Email address to register')
  .option('--base-url <url>', 'Codika API base URL override (default: production)')
  .option('--api-url <url>', 'Full URL to the cliRequestSignupOtp endpoint (overrides --base-url)')
  .option('--json', 'Emit JSON output')
  .action(async (options: SignupRequestOptions) => {
    const url = resolveEndpointUrl('cliRequestSignupOtp', options.apiUrl, undefined);
    const baseOverrideUrl = options.baseUrl
      ? options.baseUrl.replace(/\/$/, '') + '/clirequestsignupotp'
      : undefined;
    const finalUrl = options.apiUrl || baseOverrideUrl || url;

    const result = await signupRequest(options.email, finalUrl);

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
      console.log(`  codika auth signup-complete --email ${options.email} --code <6-digit-code>`);
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
