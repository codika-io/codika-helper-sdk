/**
 * Rule: CODIKA-SUBMIT
 *
 * In parent workflows that have a Codika Init node, every terminal node
 * (node with no outgoing edges) that is reachable from the Init node
 * must be a Codika Submit Result or Codika Report Error.
 *
 * This ensures that every execution path that begins tracking (Init)
 * also ends tracking (Submit/Report Error).
 *
 * Terminal nodes NOT reachable from a Codika Init are ignored — they
 * belong to branches that don't participate in execution tracking
 * (e.g., early-exit guard branches in routers).
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
  description: 'Terminal nodes reachable from Codika Init must be Submit Result or Report Error',
  details: 'Add Codika Submit Result node at the end of success paths, and Codika Report Error at the end of error paths',
  category: 'codika',
};

// Valid result operations
const VALID_RESULT_OPERATIONS = ['submitResult', 'reportError', 'ingestionCallback'];

// Valid init operations
const VALID_INIT_OPERATIONS = ['initWorkflow', 'initDataIngestion'];

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
 * Check if a node is a Codika Init node
 */
function isCodikaInitNode(node: NodeRef): boolean {
  if (!node.type.toLowerCase().includes('codika')) {
    return false;
  }

  const params = node.params || {};
  const operation = params.operation as string | undefined;

  return VALID_INIT_OPERATIONS.includes(operation || '');
}

/**
 * Find all nodes reachable from a given node via BFS
 */
function findReachableNodes(graph: Graph, startId: string): Set<string> {
  const reachable = new Set<string>();
  const queue = [startId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (reachable.has(current)) continue;
    reachable.add(current);

    for (const edge of graph.edges) {
      if (edge.from === current && !reachable.has(edge.to)) {
        queue.push(edge.to);
      }
    }
  }

  return reachable;
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

  // Check if this is a sub-workflow (exempt from this rule)
  if (graph.nodes.some(n => isSubWorkflowTrigger(n))) {
    return [];
  }

  // Find all Codika Init nodes
  const initNodes = graph.nodes.filter(n => isCodikaInitNode(n));

  // No Init nodes — CODIKA-INIT rule handles that; nothing for us to check
  if (initNodes.length === 0) {
    return [];
  }

  // Find all nodes reachable from any Init node
  const reachableFromInit = new Set<string>();
  for (const initNode of initNodes) {
    const reachable = findReachableNodes(graph, initNode.id);
    for (const id of reachable) {
      reachableFromInit.add(id);
    }
  }

  // Find all terminal nodes
  const terminalNodes = findTerminalNodes(graph);

  // Check terminal nodes that are reachable from Init
  const nonCompliantTerminals: NodeRef[] = [];

  for (const terminal of terminalNodes) {
    // Skip terminals not reachable from Init (e.g., early-exit guards)
    if (!reachableFromInit.has(terminal.id)) {
      continue;
    }

    // Skip Init nodes themselves (if Init is terminal, that's a different issue)
    if (isCodikaInitNode(terminal)) {
      continue;
    }

    // Check if it's a Codika result node
    if (isCodikaResultNode(terminal)) {
      continue;
    }

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
      message: `Workflow paths reachable from Codika Init end without Submit Result or Report Error: ${terminalNames}`,
      raw_details: `Add a Codika Submit Result node (operation: submitResult) at the end of success paths, and Codika Report Error (operation: reportError) at the end of error paths. This is required for proper execution tracking on the Codika platform. Terminal nodes not reachable from Codika Init are not checked.`,
      nodeId: nonCompliantTerminals[0]?.id,
      line: ctx.nodeLines?.[nonCompliantTerminals[0]?.id || ''],
    });
  }

  return findings;
};
