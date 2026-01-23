/**
 * @codika-io/helper-sdk
 * Types and utilities for use case configuration and deployment
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
