/**
 * Use Case Scripts
 *
 * Validation scripts that operate on the entire use-case folder.
 * These check configuration files, folder structure, and cross-file consistency.
 */

import type { UseCaseScript } from '../types.js';
import { checkConfigExports } from './config-exports.js';
import { checkWorkflowImports } from './workflow-imports.js';
import { checkSchemaTypes } from './schema-types.js';
import { checkSubworkflowReferences } from './subworkflow-references.js';
import { checkCalledByConsistency } from './calledby-consistency.js';
import { checkIntegrationInheritance } from './integration-inheritance.js';
import { checkWebhookPathConsistency } from './webhook-path-consistency.js';
import { checkTriggersRequired } from './triggers-required.js';
import { checkTriggerTypeConsistency } from './trigger-type-consistency.js';

/**
 * All use-case scripts to run during validation
 *
 * Each script receives the use-case folder path,
 * and returns an array of findings.
 */
export const useCaseScripts: UseCaseScript[] = [
  checkConfigExports,
  checkWorkflowImports,
  checkSchemaTypes,
  checkSubworkflowReferences,
  checkCalledByConsistency,
  checkIntegrationInheritance,
  checkWebhookPathConsistency,
  checkTriggersRequired,
  checkTriggerTypeConsistency,
];

// Re-export individual scripts
export { checkConfigExports } from './config-exports.js';
export { checkWorkflowImports } from './workflow-imports.js';
export { checkSchemaTypes } from './schema-types.js';
export { checkSubworkflowReferences } from './subworkflow-references.js';
export { checkCalledByConsistency } from './calledby-consistency.js';
export { checkIntegrationInheritance } from './integration-inheritance.js';
export { checkWebhookPathConsistency } from './webhook-path-consistency.js';
export { checkTriggersRequired } from './triggers-required.js';
export { checkTriggerTypeConsistency } from './trigger-type-consistency.js';
