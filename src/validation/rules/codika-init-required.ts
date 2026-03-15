/**
 * Rule: CODIKA-INIT
 *
 * Every parent workflow must contain at least one Codika Init node.
 * This ensures execution tracking is initialized before business logic runs.
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
  description: 'Parent workflows must contain a Codika Init node',
  details: 'Add a Codika Init node to enable execution tracking on the Codika platform',
  category: 'codika',
};

// Sub-workflow trigger - exempt from this rule
const SUBWORKFLOW_TRIGGER = 'n8n-nodes-base.executeWorkflowTrigger';

// Codika node type
const CODIKA_NODE_TYPE = 'n8n-nodes-codika.codika';

// Valid init operations
const VALID_INIT_OPERATIONS = ['initWorkflow', 'initDataIngestion'];

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
 * Check if the workflow is a sub-workflow (has an executeWorkflowTrigger)
 */
function isSubWorkflow(graph: Graph): boolean {
  return graph.nodes.some(n => isSubWorkflowTrigger(n));
}

export const codikaInitRequired: RuleRunner = (graph: Graph, ctx: RuleContext): Finding[] => {
  const findings: Finding[] = [];

  // Empty workflows and sub-workflows are exempt
  if (graph.nodes.length === 0 || isSubWorkflow(graph)) {
    return [];
  }

  // Check if ANY node in the workflow is a valid Codika Init
  const hasCodikaInit = graph.nodes.some(n => isCodikaInitNode(n));

  if (!hasCodikaInit) {
    findings.push({
      rule: metadata.id,
      severity: metadata.severity,
      path: ctx.path,
      message: `Workflow is missing a Codika Init node`,
      raw_details: `Add a Codika Init node (operation: initWorkflow or initDataIngestion) to enable execution tracking on the Codika platform. Sub-workflows are exempt from this rule.`,
    });
  }

  return findings;
};
