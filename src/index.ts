/**
 * @codika-io/helper-sdk
 * Types and utilities for use case configuration, validation, and deployment
 */

// Types
export * from './types/process-types.js';

// Workflow utilities
export {
  loadWorkflowJson,
  encodeWorkflowToBase64,
  decodeWorkflowFromBase64,
  encodeWorkflowFromString,
  loadAndEncodeWorkflow,
} from './utils/workflow-encoding.js';

// Deployment client
export {
  deployProcess,
  deployProcessOrThrow,
  isDeploySuccess,
  isDeployError,
  type DeployOptions,
  type DeployResult,
} from './utils/deploy-client.js';

// High-level use case deployer
export {
  deployUseCaseFromFolder,
  type DeployUseCaseOptions,
  type DeployUseCaseResult,
} from './utils/use-case-deployer.js';

// Validation
export {
  validateWorkflow,
  validateUseCase,
  getAvailableRules,
} from './validation/runner.js';

export type {
  Finding,
  ValidationResult,
  FindingSummary,
  WorkflowValidationOptions,
  UseCaseValidationOptions,
  WorkflowScript,
  UseCaseScript,
  RuleMetadata,
} from './validation/types.js';

export { customRules } from './validation/rules/index.js';
export { workflowScripts } from './validation/workflow-scripts/index.js';
export { useCaseScripts } from './validation/use-case-scripts/index.js';
export { applyFixes } from './validation/fixer.js';
