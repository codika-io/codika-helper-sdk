/**
 * Workflow Encoding Utilities
 * Handles loading, encoding, and decoding of n8n workflow JSON files
 */

import { readFileSync } from 'fs';

/**
 * Load a workflow JSON file and return as parsed object
 */
export function loadWorkflowJson(filePath: string): object {
  const content = readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Encode a workflow object to base64 string
 */
export function encodeWorkflowToBase64(workflow: object): string {
  const jsonString = JSON.stringify(workflow);
  return Buffer.from(jsonString, 'utf-8').toString('base64');
}

/**
 * Decode a base64 string back to workflow object
 */
export function decodeWorkflowFromBase64(base64String: string): object {
  const jsonString = Buffer.from(base64String, 'base64').toString('utf-8');
  return JSON.parse(jsonString);
}

/**
 * Encode a JSON string directly to base64
 */
export function encodeWorkflowFromString(jsonString: string): string {
  return Buffer.from(jsonString, 'utf-8').toString('base64');
}

/**
 * Load a workflow JSON file and return as base64 encoded string
 * Convenience function combining load + encode
 */
export function loadAndEncodeWorkflow(filePath: string): string {
  const content = readFileSync(filePath, 'utf-8');
  return encodeWorkflowFromString(content);
}
