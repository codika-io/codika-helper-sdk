/**
 * Script: DB-ALWAYS-OUTPUT
 *
 * Validates that database nodes have alwaysOutputData: true set.
 * Without this, empty query results cause all downstream nodes to
 * be silently skipped — the #1 gotcha in n8n workflow development.
 *
 * This is a top-level node property (not inside parameters).
 */

import type { Finding, RuleMetadata } from '../types.js';

export const metadata: RuleMetadata = {
  id: 'DB-ALWAYS-OUTPUT',
  name: 'db_always_output',
  severity: 'should',
  description: 'Database nodes should have alwaysOutputData: true',
  details:
    'Without alwaysOutputData: true, a database query that returns zero rows will ' +
    'cause all downstream nodes to be silently skipped. Set this property to ensure ' +
    'downstream nodes always receive input (even if empty).',
  fixable: true,
  category: 'resilience',
};

/**
 * Database node types that should have alwaysOutputData: true.
 * Matched by checking the last segment of the node type.
 */
const DATABASE_NODE_NAMES = new Set([
  'supabase',
  'postgres',
  'mysql',
  'microsoftSql',
  'mongoDb',
  'redis',
  'elasticsearch',
]);

/**
 * Check if a node type is a database node
 */
function isDatabaseNode(type: string): boolean {
  const segments = type.split('.');
  const nodeName = segments[segments.length - 1];
  return DATABASE_NODE_NAMES.has(nodeName);
}

/**
 * Set alwaysOutputData: true on a node. Simple JSON parse/modify/stringify.
 * Formatting is handled by WORKFLOW-FORMAT which runs last.
 */
function patchAlwaysOutputData(content: string, nodeId: string): string {
  const workflow = JSON.parse(content);
  for (const n of workflow.nodes) {
    if (n.id === nodeId) {
      n.alwaysOutputData = true;
      break;
    }
  }
  return JSON.stringify(workflow, null, 2) + '\n';
}

/**
 * Check that all database nodes have alwaysOutputData: true
 */
export function checkDbAlwaysOutput(content: string, path: string): Finding[] {
  const findings: Finding[] = [];

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    return [];
  }

  const nodes: any[] = parsed.nodes || [];

  for (const node of nodes) {
    if (!isDatabaseNode(node.type)) continue;

    if (node.alwaysOutputData !== true) {
      const nodeName = node.name || node.id;
      const nodeId = node.id;

      findings.push({
        rule: metadata.id,
        severity: metadata.severity,
        path,
        message: `Database node "${nodeName}" is missing alwaysOutputData: true — empty results will skip downstream nodes`,
        raw_details:
          'Set alwaysOutputData: true on the node to ensure downstream nodes always ' +
          'receive input, even when the query returns zero rows.',
        nodeId,
        fixable: true,
        fix: {
          description: `Add alwaysOutputData: true to "${nodeName}"`,
          apply: (fileContent: string) => {
            return patchAlwaysOutputData(fileContent, nodeId);
          },
        },
      });
    }
  }

  return findings;
}
