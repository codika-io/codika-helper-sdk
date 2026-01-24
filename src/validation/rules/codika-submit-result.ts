/**
 * Rule: CODIKA-SUBMIT
 *
 * Every parent workflow must end with either:
 * - Codika Submit Result (on success paths)
 * - Codika Report Error (on error paths)
 *
 * This ensures that workflow execution results are properly reported
 * back to the Codika platform.
 *
 * Exception: Sub-workflows (starting with Execute Workflow Trigger) are exempt
 * as they return data to the parent workflow instead.
 */

import type { Graph, Finding, RuleRunner, RuleContext, NodeRef } from '@replikanti/flowlint-core';
import type { RuleMetadata } from '../types.js';

export const metadata: RuleMetadata = {
  id: 'CODIKA-SUBMIT',
  name: 'codika_submit_result',
  severity: 'must',
  description: 'Parent workflows must end with Codika Submit Result or Report Error',
  details: 'Add Codika Submit Result node at the end of success paths, and Codika Report Error at the end of error paths',
  category: 'codika',
};

// Valid result operations
const VALID_RESULT_OPERATIONS = ['submitResult', 'reportError'];

/**
 * Check if a node is a sub-workflow trigger (exempt from rule)
 */
function isSubWorkflowTrigger(node: NodeRef): boolean {
  return node.type.toLowerCase().includes('executeworkflowtrigger');
}

/**
 * Check if a node is a Codika result node (Submit Result or Report Error)
 */
function isCodikaResultNode(node: NodeRef): boolean {
  if (!node.type.toLowerCase().includes('codika')) {
    return false;
  }

  const params = node.params || {};
  const operation = params.operation as string | undefined;

  return VALID_RESULT_OPERATIONS.includes(operation || '');
}

/**
 * Find the trigger node
 */
function findTriggerNode(graph: Graph): NodeRef | null {
  const nodesWithIncoming = new Set<string>();
  for (const edge of graph.edges) {
    nodesWithIncoming.add(edge.to);
  }

  const triggerCandidates = graph.nodes.filter(n => !nodesWithIncoming.has(n.id));

  return triggerCandidates.find(n =>
    n.type.toLowerCase().includes('trigger') ||
    n.type.toLowerCase().includes('webhook') ||
    n.type.toLowerCase().includes('start')
  ) || triggerCandidates[0] || null;
}

/**
 * Find all terminal nodes (nodes with no outgoing edges)
 */
function findTerminalNodes(graph: Graph): NodeRef[] {
  const nodesWithOutgoing = new Set<string>();
  for (const edge of graph.edges) {
    nodesWithOutgoing.add(edge.from);
  }

  return graph.nodes.filter(n =>
    !nodesWithOutgoing.has(n.id) &&
    !n.type.includes('stickyNote')
  );
}

export const codikaSubmitResult: RuleRunner = (graph: Graph, ctx: RuleContext): Finding[] => {
  const findings: Finding[] = [];

  // Find the trigger node
  const triggerNode = findTriggerNode(graph);

  if (!triggerNode) {
    return [];
  }

  // Check if this is a sub-workflow (exempt from this rule)
  if (isSubWorkflowTrigger(triggerNode)) {
    return [];
  }

  // Find all terminal nodes (end of workflow paths)
  const terminalNodes = findTerminalNodes(graph);

  if (terminalNodes.length === 0) {
    // No terminal nodes - workflow might be empty or circular
    return [];
  }

  // Check each terminal node
  const nonCompliantTerminals: NodeRef[] = [];

  for (const terminal of terminalNodes) {
    // Skip the trigger itself (might be disconnected)
    if (terminal.id === triggerNode.id) {
      continue;
    }

    // Check if it's a Codika result node
    if (isCodikaResultNode(terminal)) {
      continue;
    }

    // This terminal node doesn't end with Codika result
    nonCompliantTerminals.push(terminal);
  }

  // Report findings for non-compliant paths
  if (nonCompliantTerminals.length > 0) {
    const terminalNames = nonCompliantTerminals
      .map(n => `"${n.name || n.type}"`)
      .join(', ');

    findings.push({
      rule: metadata.id,
      severity: metadata.severity,
      path: ctx.path,
      message: `Workflow paths end without Codika Submit Result or Report Error: ${terminalNames}`,
      raw_details: `Add a Codika Submit Result node (operation: submitResult) at the end of success paths, and Codika Report Error (operation: reportError) at the end of error paths. This is required for proper execution tracking on the Codika platform.`,
      nodeId: nonCompliantTerminals[0]?.id,
      line: ctx.nodeLines?.[nonCompliantTerminals[0]?.id || ''],
    });
  }

  return findings;
};
