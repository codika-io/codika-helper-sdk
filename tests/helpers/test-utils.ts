/**
 * Test Utilities
 *
 * Helper functions and factories for writing validation tests.
 */

import { defaultConfig } from '@replikanti/flowlint-core';
import type { RuleContext } from '@replikanti/flowlint-core';
import type { Finding } from '../../src/validation/types.js';

/**
 * Create a rule context for testing
 */
export function createRuleContext(path: string = 'test-workflow.json'): RuleContext {
  return {
    cfg: defaultConfig,
    path,
  };
}

/**
 * Create a minimal workflow JSON string for testing
 */
export function createMinimalWorkflow(options: {
  name?: string;
  triggerType?: string;
  hasCodikaInit?: boolean;
  hasSubmitResult?: boolean;
  isSubworkflow?: boolean;
}): string {
  const {
    name = 'Test Workflow',
    triggerType = 'n8n-nodes-base.webhook',
    hasCodikaInit = true,
    hasSubmitResult = true,
    isSubworkflow = false,
  } = options;

  const actualTriggerType = isSubworkflow
    ? 'n8n-nodes-base.executeWorkflowTrigger'
    : triggerType;

  const nodes: any[] = [
    {
      id: 'trigger-001',
      name: isSubworkflow ? 'Execute Workflow Trigger' : 'Webhook Trigger',
      type: actualTriggerType,
      typeVersion: 1,
      position: [0, 0],
      parameters: {},
    },
  ];

  const connections: any = {};
  let previousNode = isSubworkflow ? 'Execute Workflow Trigger' : 'Webhook Trigger';

  if (hasCodikaInit && !isSubworkflow) {
    nodes.push({
      id: 'codika-init-001',
      name: 'Codika Init',
      type: 'n8n-nodes-codika.codika',
      typeVersion: 1,
      position: [220, 0],
      parameters: {
        resource: 'initializeExecution',
        operation: 'initWorkflow',
      },
    });
    connections[previousNode] = {
      main: [[{ node: 'Codika Init', type: 'main', index: 0 }]],
    };
    previousNode = 'Codika Init';
  }

  // Add a processing node
  nodes.push({
    id: 'process-001',
    name: 'Process Data',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [440, 0],
    parameters: { jsCode: 'return items;' },
  });
  connections[previousNode] = {
    main: [[{ node: 'Process Data', type: 'main', index: 0 }]],
  };
  previousNode = 'Process Data';

  if (hasSubmitResult && !isSubworkflow) {
    nodes.push({
      id: 'codika-submit-001',
      name: 'Codika Submit Result',
      type: 'n8n-nodes-codika.codika',
      typeVersion: 1,
      position: [660, 0],
      parameters: {
        resource: 'result',
        operation: 'submitResult',
      },
    });
    connections[previousNode] = {
      main: [[{ node: 'Codika Submit Result', type: 'main', index: 0 }]],
    };
  }

  return JSON.stringify({
    name,
    nodes,
    connections,
    settings: { executionOrder: 'v1' },
  });
}

/**
 * Assert that findings contain a specific rule
 */
export function expectFindingWithRule(findings: Finding[], ruleId: string): Finding {
  const finding = findings.find(f => f.rule === ruleId);
  if (!finding) {
    throw new Error(
      `Expected finding with rule "${ruleId}" but got: ${findings.map(f => f.rule).join(', ') || 'none'}`
    );
  }
  return finding;
}

/**
 * Assert that findings do NOT contain a specific rule
 */
export function expectNoFindingWithRule(findings: Finding[], ruleId: string): void {
  const finding = findings.find(f => f.rule === ruleId);
  if (finding) {
    throw new Error(
      `Expected no finding with rule "${ruleId}" but found: ${finding.message}`
    );
  }
}

/**
 * Count findings by severity
 */
export function countBySeverity(findings: Finding[]): { must: number; should: number; nit: number } {
  return {
    must: findings.filter(f => f.severity === 'must').length,
    should: findings.filter(f => f.severity === 'should').length,
    nit: findings.filter(f => f.severity === 'nit').length,
  };
}

/**
 * Filter findings to only those from custom rules (CODIKA-*)
 */
export function filterCustomRuleFindings(findings: Finding[]): Finding[] {
  return findings.filter(f => f.rule.startsWith('CODIKA-'));
}

/**
 * Filter findings to only workflow script findings
 */
export function filterWorkflowScriptFindings(findings: Finding[]): Finding[] {
  return findings.filter(f =>
    f.rule.startsWith('INSTPARM-') ||
    f.rule.startsWith('PLACEHOLDER-') ||
    f.rule.startsWith('CRED-')
  );
}
