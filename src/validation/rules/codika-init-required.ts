/**
 * Rule: CODIKA-INIT
 *
 * Every parent workflow must have a Codika Init node as the second node
 * (immediately after the trigger). This ensures execution tracking is initialized.
 *
 * Valid init operations:
 * - initWorkflow (standard workflows)
 * - initDataIngestion (RAG ingestion workflows)
 *
 * Exception: Sub-workflows (starting with Execute Workflow Trigger) are exempt
 * as they inherit execution context from the parent workflow.
 */

import type { Graph, Finding, RuleRunner, RuleContext, NodeRef } from '@replikanti/flowlint-core';
import type { RuleMetadata } from '../types.js';

export const metadata: RuleMetadata = {
  id: 'CODIKA-INIT',
  name: 'codika_init_required',
  severity: 'must',
  description: 'Parent workflows must have Codika Init as the second node (after trigger)',
  details: 'Add a Codika Init node immediately after the trigger to enable execution tracking',
  category: 'codika',
};

// Trigger node types that start workflows
const TRIGGER_TYPES = [
  'n8n-nodes-base.webhook',
  'n8n-nodes-base.scheduleTrigger',
  'n8n-nodes-base.manualTrigger',
  'n8n-nodes-base.gmailTrigger',
  'n8n-nodes-base.calendlyTrigger',
  'n8n-nodes-base.slackTrigger',
  'n8n-nodes-base.telegramTrigger',
  'n8n-nodes-base.start',
];

// Sub-workflow trigger - exempt from this rule
const SUBWORKFLOW_TRIGGER = 'n8n-nodes-base.executeWorkflowTrigger';

// Codika node type
const CODIKA_NODE_TYPE = 'n8n-nodes-codika.codika';

// Valid init operations
const VALID_INIT_OPERATIONS = ['initWorkflow', 'initDataIngestion'];

/**
 * Check if a node is a trigger node
 */
function isTriggerNode(node: NodeRef): boolean {
  const nodeType = node.type.toLowerCase();
  return TRIGGER_TYPES.some(t => nodeType.includes(t.toLowerCase().replace('n8n-nodes-base.', ''))) ||
         nodeType.includes('trigger') ||
         nodeType.includes('webhook');
}

/**
 * Check if a node is a sub-workflow trigger (exempt from rule)
 */
function isSubWorkflowTrigger(node: NodeRef): boolean {
  return node.type.toLowerCase().includes('executeworkflowtrigger');
}

/**
 * Check if a node is a valid Codika Init node
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
 * Find the trigger node (node with no incoming edges, or a trigger type)
 */
function findTriggerNode(graph: Graph): NodeRef | null {
  // First, find nodes with no incoming edges
  const nodesWithIncoming = new Set<string>();
  for (const edge of graph.edges) {
    nodesWithIncoming.add(edge.to);
  }

  // Find trigger candidates (no incoming edges)
  const triggerCandidates = graph.nodes.filter(n => !nodesWithIncoming.has(n.id));

  // Prefer actual trigger types
  for (const node of triggerCandidates) {
    if (isTriggerNode(node)) {
      return node;
    }
  }

  // Fallback to first node without incoming edges (excluding sticky notes)
  return triggerCandidates.find(n => !n.type.includes('stickyNote')) || null;
}

/**
 * Find nodes directly connected to the trigger (second nodes)
 */
function findSecondNodes(graph: Graph, triggerId: string): NodeRef[] {
  const secondNodeIds = graph.edges
    .filter(e => e.from === triggerId)
    .map(e => e.to);

  return graph.nodes.filter(n => secondNodeIds.includes(n.id));
}

export const codikaInitRequired: RuleRunner = (graph: Graph, ctx: RuleContext): Finding[] => {
  const findings: Finding[] = [];

  // Find the trigger node
  const triggerNode = findTriggerNode(graph);

  if (!triggerNode) {
    // No trigger found, can't validate
    return [];
  }

  // Check if this is a sub-workflow (exempt from this rule)
  if (isSubWorkflowTrigger(triggerNode)) {
    return [];
  }

  // Find nodes connected directly to the trigger
  const secondNodes = findSecondNodes(graph, triggerNode.id);

  if (secondNodes.length === 0) {
    // Trigger has no connections - different issue (dead end)
    return [];
  }

  // Check if ANY of the second nodes is a Codika Init
  const hasCodikaInit = secondNodes.some(n => isCodikaInitNode(n));

  if (!hasCodikaInit) {
    // Build helpful message about what we found
    const secondNodeNames = secondNodes.map(n => `"${n.name || n.type}"`).join(', ');

    findings.push({
      rule: metadata.id,
      severity: metadata.severity,
      path: ctx.path,
      message: `Workflow must have Codika Init as the second node. Found: ${secondNodeNames}`,
      raw_details: `Add a Codika Init node (operation: initWorkflow or initDataIngestion) immediately after the trigger "${triggerNode.name || triggerNode.type}". This is required for execution tracking on the Codika platform.`,
      nodeId: triggerNode.id,
      line: ctx.nodeLines?.[triggerNode.id],
    });
  }

  return findings;
};
