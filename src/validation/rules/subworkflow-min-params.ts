/**
 * Rule: SUBWKFL-MIN-PARAMS
 *
 * Every sub-workflow must have at least 1 input parameter.
 * n8n enforces minRequiredFields: 1 on the ExecuteWorkflowTrigger node.
 * Sub-workflows with zero parameters will fail with: "At least 1 field is required."
 *
 * @see .guides/specific/sub-workflows.md - "Input Parameter Requirements" (Section 11)
 */

import type { Graph, RuleRunner, RuleContext, NodeRef } from '@replikanti/flowlint-core';
import type { RuleMetadata, Finding } from '../types.js';

export const RULE_ID = 'SUBWKFL-MIN-PARAMS';

export const metadata: RuleMetadata & { guideRef: { path: string; section: string } } = {
  id: RULE_ID,
  name: 'subworkflow_min_params',
  severity: 'must',
  description: 'Sub-workflows must have at least 1 input parameter',
  details: 'Add at least one input parameter to the Execute Workflow Trigger node. n8n enforces minRequiredFields: 1.',
  category: 'subworkflow',
  guideRef: {
    path: 'specific/sub-workflows.md',
    section: 'Input Parameter Requirements',
  },
};

// Sub-workflow trigger type
const SUBWORKFLOW_TRIGGER = 'executeworkflowtrigger';

/**
 * Check if a node is a sub-workflow trigger
 */
function isSubWorkflowTrigger(node: NodeRef): boolean {
  return node.type.toLowerCase().includes(SUBWORKFLOW_TRIGGER);
}

/**
 * Count input parameters from the Execute Workflow Trigger node
 */
function countInputParams(node: NodeRef): number {
  const params = node.params || {};

  // Check workflowInputs.values array (newer format)
  const workflowInputs = params.workflowInputs as { values?: unknown[] } | undefined;
  if (workflowInputs?.values && Array.isArray(workflowInputs.values)) {
    return workflowInputs.values.length;
  }

  // Check inputSource with defineBelow mode
  const inputSource = params.inputSource as string | undefined;
  if (inputSource === 'defineBelow') {
    // Look for inputDefinitions or schema
    const schema = params.schema as { values?: unknown[] } | undefined;
    if (schema?.values && Array.isArray(schema.values)) {
      return schema.values.length;
    }
  }

  // No parameters found
  return 0;
}

/**
 * Find the sub-workflow trigger node (if any)
 */
function findSubWorkflowTrigger(graph: Graph): NodeRef | null {
  return graph.nodes.find(n => isSubWorkflowTrigger(n)) || null;
}

export const subworkflowMinParams: RuleRunner = (graph: Graph, ctx: RuleContext): Finding[] => {
  const findings: Finding[] = [];

  // Find sub-workflow trigger node
  const triggerNode = findSubWorkflowTrigger(graph);

  // If no sub-workflow trigger, this rule doesn't apply
  if (!triggerNode) {
    return [];
  }

  // Count input parameters
  const paramCount = countInputParams(triggerNode);

  if (paramCount < 1) {
    findings.push({
      rule: RULE_ID,
      severity: metadata.severity,
      path: ctx.path,
      message: `Sub-workflow must have at least 1 input parameter, found ${paramCount}`,
      raw_details: `n8n enforces minRequiredFields: 1 on the ExecuteWorkflowTrigger node. Add at least one input parameter to the workflowInputs.values array. Without this, the workflow will fail with "At least 1 field is required."`,
      nodeId: triggerNode.id,
      line: ctx.nodeLines?.[triggerNode.id],
      guideRef: metadata.guideRef,
    });
  }

  return findings;
};

export default subworkflowMinParams;
