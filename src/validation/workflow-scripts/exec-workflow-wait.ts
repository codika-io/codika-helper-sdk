/**
 * Script: EXEC-WORKFLOW-WAIT
 *
 * Validates that Execute Workflow nodes have waitForSubWorkflow: true
 * in their options. Without this setting, the parent workflow does not
 * wait for the sub-workflow to complete and return values are silently
 * lost — leading to undefined data in downstream nodes.
 */

import type { Finding, RuleMetadata } from '../types.js';

export const metadata: RuleMetadata = {
  id: 'EXEC-WORKFLOW-WAIT',
  name: 'exec_workflow_wait',
  severity: 'should',
  description: 'Execute Workflow nodes should have waitForSubWorkflow: true',
  details:
    'Without waitForSubWorkflow: true, the parent workflow does not wait for the ' +
    'sub-workflow to complete. Return values are silently lost, causing undefined ' +
    'data in downstream nodes.',
  fixable: true,
  category: 'structure',
};

const EXEC_WORKFLOW_TYPE = 'n8n-nodes-base.executeWorkflow';

/**
 * Set waitForSubWorkflow: true on a node. Simple JSON parse/modify/stringify.
 * Formatting is handled by WORKFLOW-FORMAT which runs last.
 */
function patchWaitForSubWorkflow(content: string, nodeId: string): string {
  const workflow = JSON.parse(content);
  for (const n of workflow.nodes) {
    if (n.id === nodeId) {
      if (!n.parameters) n.parameters = {};
      if (!n.parameters.options) n.parameters.options = {};
      n.parameters.options.waitForSubWorkflow = true;
      break;
    }
  }
  return JSON.stringify(workflow, null, 2) + '\n';
}

/**
 * Check that all executeWorkflow nodes have waitForSubWorkflow: true
 */
export function checkExecWorkflowWait(content: string, path: string): Finding[] {
  const findings: Finding[] = [];

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    return [];
  }

  const nodes: any[] = parsed.nodes || [];

  for (const node of nodes) {
    if (node.type !== EXEC_WORKFLOW_TYPE) continue;

    const options = node.parameters?.options;
    const waitForSubWorkflow = options?.waitForSubWorkflow;

    // Skip if explicitly set to false — that's a deliberate fire-and-forget choice
    if (waitForSubWorkflow === false) continue;

    // Only flag when waitForSubWorkflow is missing entirely (oversight)
    if (waitForSubWorkflow !== true) {
      const nodeName = node.name || node.id;
      const nodeId = node.id;

      findings.push({
        rule: metadata.id,
        severity: metadata.severity,
        path,
        message: `Node "${nodeName}" is missing waitForSubWorkflow: true — sub-workflow return values will be lost`,
        raw_details:
          'Add waitForSubWorkflow: true to the node\'s options to ensure the parent ' +
          'workflow waits for the sub-workflow to complete before continuing. ' +
          'Set to false explicitly if fire-and-forget is intentional.',
        nodeId,
        fixable: true,
        fix: {
          description: `Add waitForSubWorkflow: true to "${nodeName}"`,
          apply: (fileContent: string) => {
            return patchWaitForSubWorkflow(fileContent, nodeId);
          },
        },
      });
    }
  }

  return findings;
}
