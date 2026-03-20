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

// Skill utilities
export {
  readSkillFiles,
  validateSkill,
  parseSkillFrontmatter,
} from './utils/skill-parser.js';

// Document deployment client
export {
  deployDocuments,
  isDeployDocumentsSuccess,
  type DocumentInput,
  type DeployDocumentsResult,
  type DeployDocumentsSuccessResult,
  type DeployDocumentsErrorResult,
} from './utils/document-deploy-client.js';

// Project JSON (project ID management)
export {
  readProjectJson,
  writeProjectJson,
  updateProjectJson,
  resolveProjectId,
  type ProjectJson,
  type DataIngestionDeploymentEntry,
} from './utils/project-json.js';

// Integration client
export {
  createIntegrationRemote,
  deleteIntegrationRemote,
  listIntegrationsRemote,
  isCreateIntegrationSuccess,
  isDeleteIntegrationSuccess,
  isDeleteIntegrationPending,
  isListIntegrationsSuccess,
  type CreateIntegrationRequest,
  type CreateIntegrationResponse,
  type CreateIntegrationOptions,
  type DeleteIntegrationRequest,
  type DeleteIntegrationResponse,
  type DeleteIntegrationOptions,
  type ListIntegrationsRequest,
  type ListIntegrationsResponse,
  type ListIntegrationsOptions,
  type IntegrationSummaryEntry,
} from './utils/integration-client.js';

// Encryption
export {
  encryptSecret,
  fetchPublicKey,
  type EncryptedField,
  type EncryptedData,
} from './utils/encryption.js';

// Integration field registry
export {
  INTEGRATION_FIELDS,
  OAUTH_INTEGRATIONS,
  getIntegrationDef,
  isOAuthIntegration,
  type IntegrationFieldDef,
} from './data/integration-fields.js';

// Configuration
export {
  readConfig,
  writeConfig,
  clearConfig,
  resolveApiKey,
  resolveApiKeyForOrg,
  resolveBaseUrl,
  resolveEndpointUrl,
  getActiveProfile,
  listProfiles,
  setActiveProfile,
  upsertProfile,
  removeProfile,
  findProfileByOrgId,
  deriveProfileName,
  maskApiKey,
  checkProfileExpiry,
  PRODUCTION_BASE_URL,
  ENDPOINTS,
  API_KEY_MISSING_MESSAGE,
  type CodikaConfig,
  type ProfileData,
  type EndpointName,
  type ExpiryCheck,
} from './utils/config.js';
