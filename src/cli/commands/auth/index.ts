/**
 * Auth Command
 *
 * Parent command for the OTP-based CLI signup/login flow on the Codika
 * platform. Lets agents self-provision accounts from the terminal without
 * a browser.
 *
 * Usage:
 *   codika auth signup-request --email you@example.com
 *   codika auth signup-complete --email you@example.com --code 123456 --company "Acme"
 *   codika auth login-request --email you@example.com
 *   codika auth login-complete --email you@example.com --code 123456 [--organization-id <id>]
 */

import { Command } from 'commander';
import { signupRequestCommand } from './signup-request.js';
import { signupCompleteCommand } from './signup-complete.js';
import { loginRequestCommand } from './login-request.js';
import { loginCompleteCommand } from './login-complete.js';

export const authCommand = new Command('auth')
  .description('OTP-based CLI signup / login (agent self-provisioning)')
  .addCommand(signupRequestCommand)
  .addCommand(signupCompleteCommand)
  .addCommand(loginRequestCommand)
  .addCommand(loginCompleteCommand);
