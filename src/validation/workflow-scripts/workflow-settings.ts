/**
 * WORKFLOW-SETTINGS Validation Script
 *
 * Validates that workflows have required settings:
 * - settings.executionOrder: "v1"
 * - settings.errorWorkflow: "{{ORGSECRET_ERROR_WORKFLOW_ID_TERCESORG}}"
 *
 * @see .guides/use-case-guide.md - "Final Verification Checklist" (Section 12)
 */

import type { Finding, RuleMetadata } from '../types.js';

export const RULE_ID = 'WORKFLOW-SETTINGS';

const REQUIRED_ERROR_WORKFLOW = '{{ORGSECRET_ERROR_WORKFLOW_ID_TERCESORG}}';
const REQUIRED_EXECUTION_ORDER = 'v1';

export const metadata: RuleMetadata & { guideRef: { path: string; section: string } } = {
  id: RULE_ID,
  name: 'workflow_settings',
  severity: 'must',
  description: 'Workflows must have required settings: executionOrder and errorWorkflow',
  details: `Add the following to your workflow settings:
  "settings": {
    "executionOrder": "${REQUIRED_EXECUTION_ORDER}",
    "errorWorkflow": "${REQUIRED_ERROR_WORKFLOW}"
  }`,
  fixable: true,
  category: 'settings',
  guideRef: {
    path: 'use-case-guide.md',
    section: 'Final Verification Checklist',
  },
};

/**
 * Validates workflow settings
 */
export function checkWorkflowSettings(content: string, path: string): Finding[] {
  const findings: Finding[] = [];

  // Try to parse JSON
  let workflow: {
    settings?: {
      executionOrder?: string;
      errorWorkflow?: string;
    };
  };

  try {
    workflow = JSON.parse(content);
  } catch {
    findings.push({
      rule: RULE_ID,
      severity: 'must',
      path,
      message: 'Cannot parse workflow JSON',
      raw_details: 'Ensure the workflow file contains valid JSON',
      guideRef: metadata.guideRef,
    });
    return findings;
  }

  // Check if settings object exists
  if (!workflow.settings) {
    findings.push({
      rule: RULE_ID,
      severity: 'must',
      path,
      message: 'Workflow is missing settings object',
      raw_details: `Add a settings object with executionOrder and errorWorkflow`,
      guideRef: metadata.guideRef,
      fixable: true,
      fix: {
        description: 'Add settings object with required properties',
        apply: (content: string) => {
          const wf = JSON.parse(content);
          wf.settings = {
            executionOrder: REQUIRED_EXECUTION_ORDER,
            errorWorkflow: REQUIRED_ERROR_WORKFLOW,
          };
          return JSON.stringify(wf, null, 2);
        },
      },
    });
    return findings;
  }

  // Check executionOrder
  if (!workflow.settings.executionOrder) {
    findings.push({
      rule: RULE_ID,
      severity: 'must',
      path,
      message: 'Missing executionOrder setting',
      raw_details: `Add settings.executionOrder: "${REQUIRED_EXECUTION_ORDER}"`,
      guideRef: metadata.guideRef,
      fixable: true,
      fix: {
        description: 'Add executionOrder setting',
        apply: (content: string) => {
          const wf = JSON.parse(content);
          wf.settings = wf.settings || {};
          wf.settings.executionOrder = REQUIRED_EXECUTION_ORDER;
          return JSON.stringify(wf, null, 2);
        },
      },
    });
  } else if (workflow.settings.executionOrder !== REQUIRED_EXECUTION_ORDER) {
    findings.push({
      rule: RULE_ID,
      severity: 'must',
      path,
      message: `executionOrder should be "${REQUIRED_EXECUTION_ORDER}", found "${workflow.settings.executionOrder}"`,
      raw_details: `Change settings.executionOrder to "${REQUIRED_EXECUTION_ORDER}"`,
      guideRef: metadata.guideRef,
      fixable: true,
      fix: {
        description: 'Fix executionOrder value',
        apply: (content: string) => {
          const wf = JSON.parse(content);
          wf.settings.executionOrder = REQUIRED_EXECUTION_ORDER;
          return JSON.stringify(wf, null, 2);
        },
      },
    });
  }

  // Check errorWorkflow
  if (!workflow.settings.errorWorkflow) {
    findings.push({
      rule: RULE_ID,
      severity: 'must',
      path,
      message: 'Missing errorWorkflow setting',
      raw_details: `Add settings.errorWorkflow: "${REQUIRED_ERROR_WORKFLOW}"`,
      guideRef: metadata.guideRef,
      fixable: true,
      fix: {
        description: 'Add errorWorkflow setting',
        apply: (content: string) => {
          const wf = JSON.parse(content);
          wf.settings = wf.settings || {};
          wf.settings.errorWorkflow = REQUIRED_ERROR_WORKFLOW;
          return JSON.stringify(wf, null, 2);
        },
      },
    });
  } else if (workflow.settings.errorWorkflow !== REQUIRED_ERROR_WORKFLOW) {
    findings.push({
      rule: RULE_ID,
      severity: 'must',
      path,
      message: `errorWorkflow must use placeholder "${REQUIRED_ERROR_WORKFLOW}", found hardcoded value`,
      raw_details: `Replace the hardcoded errorWorkflow value with the placeholder: "${REQUIRED_ERROR_WORKFLOW}"`,
      guideRef: metadata.guideRef,
      fixable: true,
      fix: {
        description: 'Fix errorWorkflow to use placeholder',
        apply: (content: string) => {
          const wf = JSON.parse(content);
          wf.settings.errorWorkflow = REQUIRED_ERROR_WORKFLOW;
          return JSON.stringify(wf, null, 2);
        },
      },
    });
  }

  return findings;
}

export default checkWorkflowSettings;
