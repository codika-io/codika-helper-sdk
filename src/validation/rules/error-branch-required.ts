/**
 * Rule: ERROR-BRANCH-REQUIRED
 *
 * Error-prone nodes (HTTP Request, Google Sheets, Execute Workflow, etc.)
 * must have an error branch to handle failures explicitly.
 *
 * This replaces flowlint-core's R12 (unhandled_error_path) which false-
 * positives on LangChain sub-nodes. The upstream R12 uses broad regex
 * matching — e.g. /put/i matches "outputParserStructured" because it
 * contains "put". LangChain sub-nodes (model, parser, memory, embeddings,
 * document loader) execute within their parent chain/agent node and cannot
 * have independent error branches.
 *
 * An error branch is satisfied by either:
 * - An outgoing edge classified as "error" (second output / red connector)
 * - An outgoing edge to a recognized error handler node (stopAndError, etc.)
 */

import type { Graph, Finding, RuleRunner, RuleContext, NodeRef } from '@replikanti/flowlint-core';
import type { RuleMetadata } from '../types.js';

export const RULE_ID = 'ERROR-BRANCH-REQUIRED';

export const metadata: RuleMetadata = {
  id: RULE_ID,
  name: 'error_branch_required',
  severity: 'must',
  description: 'Error-prone nodes must have an error branch (red connector) for failure handling',
  details:
    'Add onError: "continueErrorOutput" to the node and connect the second output (index 1) ' +
    'to an error handler node. This prevents silent failures in API calls, database operations, ' +
    'and external service interactions.',
  category: 'reliability',
};

/**
 * Patterns matching node types that interact with external services
 * and are likely to fail at runtime.
 *
 * Mirrors flowlint-core's isErrorProneNode() logic.
 */
const API_PATTERN = /http|request|google|facebook|ads/i;
const MUTATION_PATTERN = /write|insert|update|delete|post|put|patch|database|mongo|supabase|sheet/i;
const EXEC_PATTERN = /execute|workflow|function/i;

/**
 * LangChain sub-node types that should be excluded from error branch checks.
 * These nodes run inside their parent chain/agent and cannot have independent error outputs.
 */
const LANGCHAIN_SUBNODE_PATTERN =
  /langchain\.(lmChat|outputParser|memory|embeddings|document|vectorStore|toolCode|toolWorkflow)/i;

/**
 * Check if a node type represents an error-prone operation.
 */
function isErrorProneNode(type: string): boolean {
  return API_PATTERN.test(type) || MUTATION_PATTERN.test(type) || EXEC_PATTERN.test(type);
}

/**
 * Check if a node type is a LangChain sub-node (false positive for error branch checks).
 */
function isLangchainSubnode(type: string): boolean {
  return LANGCHAIN_SUBNODE_PATTERN.test(type);
}

/**
 * Check if a node is a recognized error handler (stopAndError, etc.).
 */
function isErrorHandlerNode(type: string, name?: string): boolean {
  const normalizedName = (name || '').toLowerCase();
  return (
    /stopanderror|errorhandler|raiseerror/i.test(type) ||
    normalizedName.includes('stop and error') ||
    normalizedName.includes('error handler')
  );
}

export const errorBranchRequired: RuleRunner = (graph: Graph, ctx: RuleContext): Finding[] => {
  const findings: Finding[] = [];

  for (const node of graph.nodes) {
    // Only check error-prone nodes
    if (!isErrorProneNode(node.type)) continue;

    // Exclude LangChain sub-nodes (they can't have independent error branches)
    if (isLangchainSubnode(node.type)) continue;

    // Check if the node has an error path
    const hasErrorPath = graph.edges.some(edge => {
      if (edge.from !== node.id) return false;

      // Direct error edge (second output from an error-prone node)
      if (edge.on === 'error') return true;

      // Edge to a recognized error handler node
      const targetNode = graph.nodes.find(n => n.id === edge.to);
      return targetNode ? isErrorHandlerNode(targetNode.type, targetNode.name) : false;
    });

    if (!hasErrorPath) {
      findings.push({
        rule: RULE_ID,
        severity: metadata.severity,
        path: ctx.path,
        message: `Node ${node.name} has no error branch (add a red connector to handler)`,
        raw_details:
          `Add error handling for "${node.name}" (type: ${node.type}).\n\n` +
          `Option 1: Set onError: "continueErrorOutput" on the node and connect the second output ` +
          `(index 1) to an error handler.\n` +
          `Option 2: Connect the node to a Stop And Error node.\n\n` +
          `This prevents silent failures when external API calls or database operations fail.`,
        nodeId: node.id,
        line: ctx.nodeLines?.[node.id],
      });
    }
  }

  return findings;
};

export default errorBranchRequired;
