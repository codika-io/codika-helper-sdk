/**
 * Process Types - Duplicated from codika_app_platform
 * These types define the structure for process deployments
 *
 * UNIFIED FLAT STRUCTURE: All field properties are at the top level (no nested config)
 */

// ============================================================================
// PROCESS TYPE
// ============================================================================

/**
 * ProcessType values - use for setting values
 * Example: processType: ProcessType.personal
 *
 * Controls how instances are created:
 * - personal: Each user installs their own instance (default)
 * - organizational: One shared instance per organization
 */
export const ProcessType = {
  personal: 'personal',
  organizational: 'organizational'
} as const;

/**
 * ProcessType type - use for type annotations
 * Values: 'personal' | 'organizational'
 */
export type ProcessType = typeof ProcessType[keyof typeof ProcessType];

// ============================================================================
// Form Schema Types (Flat Structure)
// ============================================================================

/**
 * Field types supported in form schemas
 */
export type FieldType =
  | 'string'
  | 'text'
  | 'number'
  | 'boolean'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'radio'
  | 'file'
  | 'array'
  | 'object'
  | 'objectArray';

/**
 * Base interface for all form fields
 */
export interface FormFieldBase {
  key: string;
  label: string;
  description?: string;
  tooltip?: string;
  placeholder?: string;
  required?: boolean;
}

/**
 * String field - single-line text input
 */
export interface FormStringField extends FormFieldBase {
  type: 'string';
  defaultValue?: string;
  minLength?: number;
  maxLength?: number;
  regex?: string;
  regexError?: string;
}

/**
 * Text field - multi-line textarea
 */
export interface FormTextField extends FormFieldBase {
  type: 'text';
  defaultValue?: string;
  minLength?: number;
  maxLength?: number;
  rows?: number;
  regex?: string;
  regexError?: string;
}

/**
 * Number field - numeric input
 */
export interface FormNumberField extends FormFieldBase {
  type: 'number';
  defaultValue?: number;
  numberType?: 'integer' | 'double';
  min?: number;
  max?: number;
  step?: number;
}

/**
 * Boolean field - checkbox or switch toggle
 */
export interface FormBooleanField extends FormFieldBase {
  type: 'boolean';
  defaultValue?: boolean;
  enabledLabel?: string;
  disabledLabel?: string;
}

/**
 * Date field - date picker
 */
export interface FormDateField extends FormFieldBase {
  type: 'date';
  defaultValue?: string;
  minDate?: string;
  maxDate?: string;
}

/**
 * Select field - dropdown single selection
 */
export interface FormSelectField extends FormFieldBase {
  type: 'select';
  defaultValue?: string;
  options: Array<{ value: string; label: string }>;
}

/**
 * MultiSelect field - multiple selection
 */
export interface FormMultiSelectField extends FormFieldBase {
  type: 'multiselect';
  defaultValue?: string[];
  options: Array<{ value: string; label: string }>;
  minSelections?: number;
  maxSelections?: number;
}

/**
 * Radio field - single selection with visible options
 */
export interface FormRadioField extends FormFieldBase {
  type: 'radio';
  defaultValue?: string;
  options: Array<{ value: string; label: string }>;
}

/**
 * File field - file upload
 */
export interface FormFileField extends FormFieldBase {
  type: 'file';
  maxSize?: number;
  allowedMimeTypes?: string[];
  showPreview?: boolean;
  tags?: string[];
}

/**
 * Base type for array item fields (primitive fields without key/label/required)
 * These properties are managed by the array container itself
 */
type ArrayItemFieldBase = Omit<FormFieldBase, 'key' | 'label' | 'required'>;

/**
 * Union type for all primitive field types that can be used as array items
 * (excludes array, objectArray, file, section, multiselect)
 * Note: multiselect excluded because it produces nested arrays which Firestore cannot store
 */
export type FormArrayItemField =
  | (ArrayItemFieldBase & Omit<FormStringField, keyof FormFieldBase> & { type: 'string' })
  | (ArrayItemFieldBase & Omit<FormTextField, keyof FormFieldBase> & { type: 'text' })
  | (ArrayItemFieldBase & Omit<FormNumberField, keyof FormFieldBase> & { type: 'number' })
  | (ArrayItemFieldBase & Omit<FormBooleanField, keyof FormFieldBase> & { type: 'boolean' })
  | (ArrayItemFieldBase & Omit<FormDateField, keyof FormFieldBase> & { type: 'date' })
  | (ArrayItemFieldBase & Omit<FormSelectField, keyof FormFieldBase> & { type: 'select' })
  | (ArrayItemFieldBase & Omit<FormRadioField, keyof FormFieldBase> & { type: 'radio' });

/**
 * Array field - repeatable input of primitive values
 *
 * Uses itemField to define the field type and all its properties directly,
 * giving access to ALL type-specific properties (e.g., rows for text fields).
 */
export interface FormArrayField extends FormFieldBase {
  type: 'array';
  defaultValue?: (string | number | boolean)[];
  itemField: FormArrayItemField;
  minItems?: number;
  maxItems?: number;
}

/**
 * Object field - single structured object with nested fields
 */
export interface FormObjectField extends FormFieldBase {
  type: 'object';
  schema: FormInputItem[];
  defaultValue?: Record<string, unknown>;
}

/**
 * ObjectArray field - array of structured objects
 */
export interface FormObjectArrayField extends FormFieldBase {
  type: 'objectArray';
  defaultValue?: Record<string, unknown>[];
  itemSchema: FormInputItem[];
  minItems?: number;
  maxItems?: number;
}

/**
 * Union type for all form field types
 */
export type FormField =
  | FormStringField
  | FormTextField
  | FormNumberField
  | FormBooleanField
  | FormDateField
  | FormSelectField
  | FormMultiSelectField
  | FormRadioField
  | FormFileField
  | FormArrayField
  | FormObjectField
  | FormObjectArrayField;

/**
 * Section container for organizing fields
 */
export interface FormSection {
  type: 'section';
  title: string;
  description?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  inputSchema: FormInputItem[];
}

/**
 * Item in form schema - either a field or a section
 */
export type FormInputItem = FormField | FormSection;

/**
 * Main form input schema - array of fields or sections
 */
export type FormInputSchema = FormInputItem[];

/**
 * Form Output Schema Types
 */
export type FormOutputItem = FormField | FormSection;
export type FormOutputSchema = FormOutputItem[];

// ============================================================================
// Workflow Trigger Types
// ============================================================================

export interface HttpTrigger {
  triggerId: string;
  type: 'http';
  url: string;
  method: 'POST' | 'GET' | 'PUT' | 'DELETE';
  title?: string | null;
  description?: string;
  inputSchema?: FormInputSchema;
  authMethod?: 'none' | 'bearer' | 'basic';
  authToken?: string;
}

export interface ScheduleTrigger {
  triggerId: string;
  type: 'schedule';
  cronExpression: string;
  timezone: string;
  humanReadable: string;
  manualTriggerUrl: string;
  title?: string | null;
  description?: string;
}

export interface ServiceEventTrigger {
  triggerId: string;
  type: 'service_event';
  service: 'telegram' | 'email' | 'slack' | 'discord' | 'other';
  eventType: string;
  title?: string | null;
  description?: string;
}

// Sub-workflow Trigger - workflow called by another workflow via executeWorkflow node
// Workflows with this trigger type are NOT shown in the UI for direct user execution

// n8n's native input schema format for sub-workflows
export type SubworkflowInputType = 'string' | 'number' | 'boolean' | 'array' | 'object';

export interface SubworkflowInput {
  name: string;
  type: SubworkflowInputType;
}

export interface SubworkflowTrigger {
  triggerId: string;
  type: 'subworkflow';
  title?: string | null;
  description?: string;
  // Input schema matching n8n's executeWorkflowTrigger format
  inputSchema?: SubworkflowInput[];
  // Which workflows can call this (optional, for documentation/validation)
  calledBy?: string[]; // workflowTemplateIds
}

// Data Ingestion Trigger - "What KB documents feed into this workflow?"
// Workflows with this trigger type are NOT shown in the playground UI.
// They are triggered internally when KB documents are parsed.
export interface DataIngestionTrigger {
  triggerId: string;
  type: 'data_ingestion';
  title?: string | null;
  description?: string;
  // Webhook path templates (resolved during deployment via placeholder replacement)
  webhooks: {
    embed: string;   // e.g., '{{USERDATA_PROCESS_INSTANCE_UID_ATADRESU}}/instance-embed'
    delete: string;  // e.g., '{{USERDATA_PROCESS_INSTANCE_UID_ATADRESU}}/instance-embed-delete'
  };
  // Cost per successful embedding execution (in display credits)
  cost?: number;
}

export type WorkflowTrigger = HttpTrigger | ScheduleTrigger | ServiceEventTrigger | SubworkflowTrigger | DataIngestionTrigger;

// ============================================================================
// Workflow Category & Data Ingestion Types
// ============================================================================

/**
 * Workflow Category
 * Distinguishes user-facing workflows from internal data processing workflows
 */
export type WorkflowCategory = 'user_facing' | 'data_ingestion';

/**
 * Data Ingestion Endpoint Configuration
 * Quick reference to the data ingestion workflow for fast lookup
 */
export interface DataIngestionEndpoint {
  workflowTemplateId: string;  // Points to workflow in array
  webhookUrl: string;          // Direct URL for calling the ingestion endpoint
  purpose: string;             // Description of what this ingestion does
}

// ============================================================================
// Agent Configuration Types
// ============================================================================

/**
 * Agent Configuration
 * Defines an AI agent associated with a process deployment
 */
export interface AgentConfig {
  id: string;           // Unique identifier (e.g., 'proposal-writer')
  name: string;         // Display name (e.g., 'Proposal Writer Agent')
  systemPrompt: string; // System prompt content in markdown format
  title: string;        // Display title for UI
  description: string;  // Agent description
  welcomeMessage: string; // Welcome message shown before first chat (markdown)
}

// ============================================================================
// Workflow Configuration Types
// ============================================================================

export interface KnowledgeBaseAccessConfig {
  processDocTags: string[];
  processInstanceDocTags: string[];
}

export interface WorkflowInfo {
  workflowTemplateId: string;
  workflowId: string;
  workflowName: string;
  triggers: WorkflowTrigger[];
  markdownInfo?: string | null;
  knowledgeBaseAccess: KnowledgeBaseAccessConfig;
  integrationUids?: string[];
  workflowCategory?: WorkflowCategory; // Default: 'user_facing' - data_ingestion workflows are hidden from users
  outputSchema?: FormOutputSchema;
  n8nWorkflowJsonBase64?: string;
  n8nWorkflowId?: string;
  n8nWorkflowIsActive?: boolean;
  n8nActivationError?: string;
  cost?: number; // Execution cost in display credits (integer). Deducted from org credits when workflow completes.
  costEstimationForLLMTokens?: number; // Estimated credit cost for LLM token usage in this workflow
}

export interface WorkflowConfigurationInput {
  workflowTemplateId: string;
  workflowId: string;
  workflowName: string;
  triggers: WorkflowTrigger[];
  markdownInfo?: string;
  knowledgeBaseAccess: KnowledgeBaseAccessConfig;
  integrationUids?: string[];
  workflowCategory?: WorkflowCategory; // Default: 'user_facing'
  outputSchema?: FormOutputSchema;
  n8nWorkflowJsonBase64: string; // Required for API deployments
  cost?: number; // Execution cost in display credits (integer). Deducted from org credits when workflow completes.
  costEstimationForLLMTokens?: number; // Estimated credit cost for LLM token usage in this workflow
}

// ============================================================================
// Deployment Input Schema Types (Flat Structure)
// ============================================================================

/**
 * Field types for deployment parameters
 * Excludes 'file' as it's not needed for deployment configuration
 */
export type DeploymentFieldType = Exclude<FieldType, 'file'>;

/**
 * Base interface for all deployment input fields
 */
export interface DeploymentFieldBase {
  key: string;
  type: DeploymentFieldType;
  label: string;
  description?: string;
  tooltip?: string;
  placeholder?: string;
  required?: boolean;
}

/**
 * String field - single line text input
 */
export interface DeploymentStringField extends DeploymentFieldBase {
  type: 'string';
  defaultValue?: string;
  minLength?: number;
  maxLength?: number;
  regex?: string;
  regexError?: string;
}

/**
 * Text field - multi-line textarea input
 */
export interface DeploymentTextField extends DeploymentFieldBase {
  type: 'text';
  defaultValue?: string;
  minLength?: number;
  maxLength?: number;
  rows?: number;
  regex?: string;
  regexError?: string;
}

/**
 * Number field - numeric input
 */
export interface DeploymentNumberField extends DeploymentFieldBase {
  type: 'number';
  defaultValue?: number;
  numberType?: 'integer' | 'double';
  min?: number;
  max?: number;
  step?: number;
}

/**
 * Boolean field - toggle/switch input
 */
export interface DeploymentBooleanField extends DeploymentFieldBase {
  type: 'boolean';
  defaultValue?: boolean;
  enabledLabel?: string;
  disabledLabel?: string;
}

/**
 * Date field - date picker
 */
export interface DeploymentDateField extends DeploymentFieldBase {
  type: 'date';
  defaultValue?: string;
  minDate?: string;
  maxDate?: string;
}

/**
 * Select field - dropdown single selection
 */
export interface DeploymentSelectField extends DeploymentFieldBase {
  type: 'select';
  options: Array<{ value: string; label: string }>;
  defaultValue?: string;
}

/**
 * MultiSelect field - multiple selection
 */
export interface DeploymentMultiSelectField extends DeploymentFieldBase {
  type: 'multiselect';
  options: Array<{ value: string; label: string }>;
  defaultValue?: string[];
  minSelections?: number;
  maxSelections?: number;
}

/**
 * Radio field - radio button group
 */
export interface DeploymentRadioField extends DeploymentFieldBase {
  type: 'radio';
  options: Array<{ value: string; label: string }>;
  defaultValue?: string;
}

/**
 * Base type for deployment array item fields (primitive fields without key/label/required)
 * These properties are managed by the array container itself
 */
type DeploymentArrayItemFieldBase = Omit<DeploymentFieldBase, 'key' | 'label' | 'required'>;

/**
 * Union type for all primitive field types that can be used as deployment array items
 * (excludes array, objectArray, object, section, file, multiselect)
 * Note: multiselect excluded because it produces nested arrays which Firestore cannot store
 */
export type DeploymentArrayItemField =
  | (DeploymentArrayItemFieldBase & Omit<DeploymentStringField, keyof DeploymentFieldBase> & { type: 'string' })
  | (DeploymentArrayItemFieldBase & Omit<DeploymentTextField, keyof DeploymentFieldBase> & { type: 'text' })
  | (DeploymentArrayItemFieldBase & Omit<DeploymentNumberField, keyof DeploymentFieldBase> & { type: 'number' })
  | (DeploymentArrayItemFieldBase & Omit<DeploymentBooleanField, keyof DeploymentFieldBase> & { type: 'boolean' })
  | (DeploymentArrayItemFieldBase & Omit<DeploymentDateField, keyof DeploymentFieldBase> & { type: 'date' })
  | (DeploymentArrayItemFieldBase & Omit<DeploymentSelectField, keyof DeploymentFieldBase> & { type: 'select' })
  | (DeploymentArrayItemFieldBase & Omit<DeploymentRadioField, keyof DeploymentFieldBase> & { type: 'radio' });

/**
 * Array field - repeatable input of primitive values
 *
 * Uses itemField to define the field type and all its properties directly,
 * giving access to ALL type-specific properties (e.g., rows for text fields).
 */
export interface DeploymentArrayField extends DeploymentFieldBase {
  type: 'array';
  defaultValue?: (string | number | boolean)[];
  /** Item field definition. Defaults to { type: 'string' } if not specified. */
  itemField?: DeploymentArrayItemField;
  minItems?: number;
  maxItems?: number;
}

/**
 * Object field - single structured object with nested fields
 */
export interface DeploymentObjectField extends DeploymentFieldBase {
  type: 'object';
  schema: DeploymentInputItem[];
  defaultValue?: Record<string, unknown>;
}

/**
 * ObjectArray field - array of objects with structured schema
 */
export interface DeploymentObjectArrayField extends DeploymentFieldBase {
  type: 'objectArray';
  itemSchema: DeploymentInputItem[];
  defaultValue?: Record<string, unknown>[];
  minItems?: number;
  maxItems?: number;
}

/**
 * Union type for all deployment input field types
 */
export type DeploymentInputField =
  | DeploymentStringField
  | DeploymentTextField
  | DeploymentNumberField
  | DeploymentBooleanField
  | DeploymentDateField
  | DeploymentSelectField
  | DeploymentMultiSelectField
  | DeploymentRadioField
  | DeploymentArrayField
  | DeploymentObjectField
  | DeploymentObjectArrayField;

/**
 * Section for grouping deployment fields
 */
export interface DeploymentSection {
  type: 'section';
  title: string;
  description?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  inputSchema: DeploymentInputItem[];
}

/**
 * Item in deployment input schema - either a field or a section
 */
export type DeploymentInputItem = DeploymentInputField | DeploymentSection;

/**
 * Schema for deployment input fields
 */
export type DeploymentInputSchema = DeploymentInputItem[];

/**
 * Type for deployment parameter values
 */
export type DeploymentParameterValue = string | number | boolean | string[] | (string | number | boolean)[] | Record<string, unknown> | Record<string, unknown>[];

/**
 * Record of deployment parameter values keyed by field key
 */
export type DeploymentParameterValues = Record<string, DeploymentParameterValue>;

// ============================================================================
// Process Deployment Configuration
// ============================================================================

export interface ProcessDeploymentConfigurationInput {
  // Required display metadata
  title: string;
  subtitle: string;
  description: string;

  // Workflow configuration
  workflows: WorkflowConfigurationInput[];
  processDeploymentMarkdown: string;
  releaseNotes?: string;
  tags: string[];
  integrationUids: string[];
  dataIngestionEndpoint?: DataIngestionEndpoint;
  icon?: string;
  deploymentInputSchema?: DeploymentInputSchema;
  defaultDeploymentParameters?: DeploymentParameterValues;
  agent?: AgentConfig;
  processType?: ProcessType;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export type VersionStrategy = 'major_bump' | 'minor_bump' | 'explicit';

// ============================================================================
// Metadata Document Types
// ============================================================================

/**
 * Metadata document for deployment
 * Represents ANY file with its relative path for exact reconstruction
 */
export interface MetadataDocument {
  /** Relative path from use case root (e.g., "config.ts", "workflows/main.json", ".codika-agent/prd/prd.md") */
  relativePath: string;
  /** MIME content type (e.g., "application/json", "text/markdown") */
  contentType: string;
  /** Base64-encoded file content */
  contentBase64: string;
  /** Optional description of the document */
  description?: string;
}

/**
 * Result of uploading a metadata document
 */
export interface MetadataDocumentUploadResult {
  /** Relative path for reconstruction */
  relativePath: string;
  /** Storage path in Firebase Storage */
  storagePath: string;
  /** Whether the upload was successful */
  success: boolean;
  /** Error message if upload failed */
  error?: string;
}

export interface DeployProcessUseCaseRequest {
  projectId: string;
  versionStrategy?: VersionStrategy;
  explicitVersion?: string;
  configuration: ProcessDeploymentConfigurationInput;
  /** Optional metadata documents to store alongside the deployment */
  metadataDocuments?: MetadataDocument[];
}

export interface DeployedWorkflowInfo {
  workflowTemplateId: string;
  n8nWorkflowId: string;
  status: 'active' | 'inactive' | 'failed';
}

export interface DeployProcessUseCaseSuccessData {
  templateId: string;
  version: string;
  isNewProcess: boolean;
  processId: string;
  processInstanceId?: string;
  deploymentInstanceId: string;
  workflowsDeployed: DeployedWorkflowInfo[];
  deploymentStatus: 'deployed' | 'failed' | 'pending';
  error?: string;
  /** Results of metadata document uploads, if any were provided */
  metadataDocumentsStored?: MetadataDocumentUploadResult[];
}

export interface DeployProcessUseCaseSuccessResponse {
  success: true;
  data: DeployProcessUseCaseSuccessData;
  requestId: string;
}

export type DeployProcessUseCaseErrorCode =
  | 'INVALID_REQUEST'
  | 'INVALID_PROJECT_ID'
  | 'INVALID_CONFIGURATION'
  | 'INVALID_WORKFLOW_JSON'
  | 'INVALID_VERSION'
  | 'UNAUTHORIZED'
  | 'PROJECT_NOT_FOUND'
  | 'ORGANIZATION_NOT_FOUND'
  | 'USER_NOT_FOUND'
  | 'DEPLOYMENT_IN_PROGRESS'
  | 'N8N_DEPLOYMENT_FAILED'
  | 'INTERNAL_ERROR';

export interface DeployProcessUseCaseErrorDetails {
  field?: string;
  reason?: string;
  index?: number;
}

export interface DeployProcessUseCaseErrorResponse {
  success: false;
  error: {
    code: DeployProcessUseCaseErrorCode;
    message: string;
    details?: DeployProcessUseCaseErrorDetails;
  };
  requestId: string;
}

export type DeployProcessUseCaseResponse =
  | DeployProcessUseCaseSuccessResponse
  | DeployProcessUseCaseErrorResponse;

// ============================================================================
// Process Data Ingestion Types (Separate from ProcessDeployment)
// ============================================================================

/**
 * Process Data Ingestion Configuration Input
 */
export interface ProcessDataIngestionConfigInput {
  workflowTemplateId: string;
  workflowName: string;
  n8nWorkflowJsonBase64: string;
  webhooks: {
    embed: string;
    delete: string;
  };
  purpose: string;
  markdownInfo?: string;
  cost?: number;
}

export type DataIngestionVersionStrategy = 'major_bump' | 'minor_bump' | 'explicit';

export interface DeployDataIngestionRequest {
  processId: string;
  versionStrategy?: DataIngestionVersionStrategy;
  explicitVersion?: string;
  config: ProcessDataIngestionConfigInput;
}

export interface DeployDataIngestionResponse {
  success: boolean;
  dataIngestionId: string;
  version: string;
  status: 'pending' | 'active' | 'failed' | 'inactive' | 'superseded';
  webhookUrls?: {
    embed: string;
    delete: string;
  };
  error?: string;
}
