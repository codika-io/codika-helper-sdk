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
  // Add more use-case scripts here
];

// Re-export individual scripts
export { checkConfigExports } from './config-exports.js';
export { checkWorkflowImports } from './workflow-imports.js';
export { checkSchemaTypes } from './schema-types.js';
export { checkSubworkflowReferences } from './subworkflow-references.js';
