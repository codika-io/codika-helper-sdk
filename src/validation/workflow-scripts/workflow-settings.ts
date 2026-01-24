/**
 * Script: WORKFLOW-SETTINGS
 *
 * Validates that every workflow has the required settings:
 * - settings.errorWorkflow: "{{ORGSECRET_ERROR_WORKFLOW_ID_TERCESORG}}"
 * - settings.executionOrder: "v1"
 *
 * These settings are critical for:
 * - Error handling: Routes errors to the global error workflow
 * - Execution order: Ensures consistent node execution (v1 = depth-first)
 */

import type { Finding } from '../types.js';
import type { RuleMetadata } from '../types.js';

export const metadata: RuleMetadata = {
  id: 'WORKFLOW-SETTINGS',
  name: 'workflow_settings',
  severity: 'must',
  description: 'Workflows must have required settings (errorWorkflow, executionOrder)',
  details: 'Add settings.errorWorkflow and settings.executionOrder to your workflow',
  fixable: true,
  category: 'settings',
};

// Required settings and their values
const REQUIRED_ERROR_WORKFLOW = '{{ORGSECRET_ERROR_WORKFLOW_ID_TERCESORG}}';
const REQUIRED_EXECUTION_ORDER = 'v1';

/**
 * Check that workflow has required settings
 */
export function checkWorkflowSettings(content: string, path: string): Finding[] {
  const findings: Finding[] = [];

  // Parse as JSON
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    // If not valid JSON, skip this check
    return [];
  }

  const settings = parsed.settings || {};

  // Check errorWorkflow
  if (!settings.errorWorkflow) {
    findings.push({
      rule: metadata.id,
      severity: metadata.severity,
      path,
      message: 'Missing required setting: errorWorkflow',
      raw_details: `Add "errorWorkflow": "${REQUIRED_ERROR_WORKFLOW}" to the settings object`,
      fixable: true,
      fix: {
        description: 'Add errorWorkflow setting',
        apply: (fileContent: string) => {
          const data = JSON.parse(fileContent);
          if (!data.settings) {
            data.settings = {};
          }
          data.settings.errorWorkflow = REQUIRED_ERROR_WORKFLOW;
          return JSON.stringify(data, null, 2);
        },
      },
    });
  } else if (settings.errorWorkflow !== REQUIRED_ERROR_WORKFLOW) {
    findings.push({
      rule: metadata.id,
      severity: metadata.severity,
      path,
      message: `Setting errorWorkflow has wrong value: "${settings.errorWorkflow}"`,
      raw_details: `Change to: "${REQUIRED_ERROR_WORKFLOW}"`,
      fixable: true,
      fix: {
        description: 'Fix errorWorkflow setting',
        apply: (fileContent: string) => {
          const data = JSON.parse(fileContent);
          data.settings.errorWorkflow = REQUIRED_ERROR_WORKFLOW;
          return JSON.stringify(data, null, 2);
        },
      },
    });
  }

  // Check executionOrder
  if (!settings.executionOrder) {
    findings.push({
      rule: metadata.id,
      severity: metadata.severity,
      path,
      message: 'Missing required setting: executionOrder',
      raw_details: `Add "executionOrder": "${REQUIRED_EXECUTION_ORDER}" to the settings object`,
      fixable: true,
      fix: {
        description: 'Add executionOrder setting',
        apply: (fileContent: string) => {
          const data = JSON.parse(fileContent);
          if (!data.settings) {
            data.settings = {};
          }
          data.settings.executionOrder = REQUIRED_EXECUTION_ORDER;
          return JSON.stringify(data, null, 2);
        },
      },
    });
  } else if (settings.executionOrder !== REQUIRED_EXECUTION_ORDER) {
    findings.push({
      rule: metadata.id,
      severity: metadata.severity,
      path,
      message: `Setting executionOrder has wrong value: "${settings.executionOrder}"`,
      raw_details: `Change to: "${REQUIRED_EXECUTION_ORDER}"`,
      fixable: true,
      fix: {
        description: 'Fix executionOrder setting',
        apply: (fileContent: string) => {
          const data = JSON.parse(fileContent);
          data.settings.executionOrder = REQUIRED_EXECUTION_ORDER;
          return JSON.stringify(data, null, 2);
        },
      },
    });
  }

  return findings;
}
