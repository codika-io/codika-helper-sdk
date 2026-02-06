/**
 * Custom Flowlint Rules for Codika
 *
 * These rules extend flowlint-core with Codika-specific checks.
 * Rules operate on the parsed workflow Graph structure.
 */

import type { RuleRunner } from '@replikanti/flowlint-core';
import { codikaInitRequired } from './codika-init-required.js';
import { codikaSubmitResult } from './codika-submit-result.js';
import { subworkflowMinParams } from './subworkflow-min-params.js';
import { scheduleWebhookConvergence } from './schedule-webhook-convergence.js';
import { errorBranchRequired } from './error-branch-required.js';

/**
 * All custom Flowlint rules for Codika workflows
 *
 * These are passed to flowlint-core's runAllRules() as extraRules.
 */
export const customRules: RuleRunner[] = [
  codikaInitRequired,
  codikaSubmitResult,
  subworkflowMinParams,
  scheduleWebhookConvergence,
  errorBranchRequired,
  // Add more custom rules here as they are implemented
];

// Re-export individual rules for direct access
export { codikaInitRequired } from './codika-init-required.js';
export { codikaSubmitResult } from './codika-submit-result.js';
export { subworkflowMinParams } from './subworkflow-min-params.js';
export { scheduleWebhookConvergence } from './schedule-webhook-convergence.js';
export { errorBranchRequired } from './error-branch-required.js';
