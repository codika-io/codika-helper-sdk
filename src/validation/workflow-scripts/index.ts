/**
 * Workflow Scripts
 *
 * Non-Flowlint validation scripts that operate on raw workflow content.
 * These are used for checks that don't fit the graph-based rule pattern.
 */

import type { WorkflowScript } from '../types.js';
import { checkInstparmQuoting } from './instparm-quoting.js';
import { checkPlaceholderSyntax } from './placeholder-syntax.js';
import { checkCredentialPlaceholders } from './credential-placeholders.js';
import { checkWorkflowSettings } from './workflow-settings.js';
import { checkWorkflowSanitization } from './workflow-sanitization.js';
import { checkLlmOutputAccess } from './llm-output-access.js';
import { checkWebhookId } from './webhook-id.js';
import { checkLlmModelId } from './llm-model-id.js';

/**
 * All workflow scripts to run during validation
 *
 * Each script receives the raw file content and path,
 * and returns an array of findings.
 */
export const workflowScripts: WorkflowScript[] = [
  checkInstparmQuoting,
  checkPlaceholderSyntax,
  checkCredentialPlaceholders,
  checkWorkflowSettings,
  checkWorkflowSanitization,
  checkLlmOutputAccess,
  checkWebhookId,
  checkLlmModelId,
];

// Re-export individual scripts
export { checkInstparmQuoting } from './instparm-quoting.js';
export { checkPlaceholderSyntax } from './placeholder-syntax.js';
export { checkCredentialPlaceholders } from './credential-placeholders.js';
export { checkWorkflowSettings } from './workflow-settings.js';
export { checkWorkflowSanitization } from './workflow-sanitization.js';
export { checkLlmOutputAccess } from './llm-output-access.js';
export { checkWebhookId } from './webhook-id.js';
export { checkLlmModelId } from './llm-model-id.js';
