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

// Data ingestion deployment client
export {
  deployDataIngestion,
  deployDataIngestionOrThrow,
  isDataIngestionDeploySuccess,
  isDataIngestionDeployError,
  type DeployDataIngestionOptions,
  type DeployDataIngestionResult,
} from './utils/data-ingestion-deploy-client.js';

// High-level data ingestion deployer
export {
  deployDataIngestionFromFolder,
  type DeployDataIngestionFromFolderOptions,
  type DeployDataIngestionFromFolderResult,
} from './utils/data-ingestion-deployer.js';

// Project client
export {
  createProject as createProjectViaApi,
  createProjectOrThrow as createProjectViaApiOrThrow,
  isCreateProjectSuccess,
  isCreateProjectError,
  type CreateProjectOptions,
  type CreateProjectResponse,
  type CreateProjectSuccessResponse,
  type CreateProjectErrorResponse,
} from './utils/project-client.js';

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

// Project JSON (project ID management)
export {
  readProjectJson,
  writeProjectJson,
  updateProjectJson,
  resolveProjectId,
  type ProjectJson,
} from './utils/project-json.js';

// Configuration
export {
  readConfig,
  writeConfig,
  clearConfig,
  resolveApiKey,
  resolveBaseUrl,
  resolveEndpointUrl,
  maskApiKey,
  PRODUCTION_BASE_URL,
  ENDPOINTS,
  API_KEY_MISSING_MESSAGE,
  type CodikaConfig,
  type EndpointName,
} from './utils/config.js';
