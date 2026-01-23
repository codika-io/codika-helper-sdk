/**
 * @codika/helper-sdk
 * Types and utilities for use case configuration
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
