/**
 * Script: MERGE-BEFORE-TERMINAL
 *
 * Validates that Merge nodes are never directly connected to terminal
 * Codika nodes (Submit Result / Report Error / Ingestion Callback).
 *
 * A Merge node immediately before a terminal Codika node causes the
 * workflow to hang indefinitely: the Merge waits for ALL inputs, but
 * typically only one conditional branch executes.
 *
 * Merge → Code → Submit Result is fine (indirect).
 * Merge → Submit Result is a MUST-fix violation (direct).
 */

import type { Finding, RuleMetadata } from '../types.js';

export const metadata: RuleMetadata = {
  id: 'MERGE-BEFORE-TERMINAL',
  name: 'merge_before_terminal',
  severity: 'must',
  description: 'Merge nodes must not connect directly to terminal Codika nodes',
  details:
    'A Merge node immediately before Codika Submit Result or Report Error ' +
    'causes the workflow to hang because the Merge waits for all inputs. ' +
    'Insert a processing node (e.g., Code or Set) between the Merge and the terminal node, ' +
    'or duplicate the terminal node on each branch.',
  category: 'structure',
};

const CODIKA_NODE_TYPE = 'n8n-nodes-codika.codika';
const MERGE_NODE_TYPE = 'n8n-nodes-base.merge';
const TERMINAL_OPERATIONS = new Set(['submitResult', 'reportError', 'ingestionCallback']);

/**
 * Check for Merge nodes directly connected to terminal Codika nodes
 */
export function checkMergeBeforeTerminal(content: string, path: string): Finding[] {
  const findings: Finding[] = [];

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    return [];
  }

  const nodes: any[] = parsed.nodes || [];
  const connections: Record<string, any> = parsed.connections || {};

  if (nodes.length === 0) return [];

  // Build node lookup by name
  const nodeByName = new Map<string, any>();
  for (const node of nodes) {
    nodeByName.set(node.name, node);
  }

  // Find all Merge nodes
  const mergeNodes = nodes.filter(n => n.type === MERGE_NODE_TYPE);

  for (const mergeNode of mergeNodes) {
    const mergeConnections = connections[mergeNode.name];
    if (!mergeConnections?.main) continue;

    // Check all output indices
    for (const outputGroup of mergeConnections.main) {
      if (!Array.isArray(outputGroup)) continue;

      for (const conn of outputGroup) {
        const targetNode = nodeByName.get(conn.node);
        if (!targetNode) continue;

        // Check if target is a terminal Codika node
        if (
          targetNode.type === CODIKA_NODE_TYPE &&
          TERMINAL_OPERATIONS.has(targetNode.parameters?.operation)
        ) {
          findings.push({
            rule: metadata.id,
            severity: metadata.severity,
            path,
            message: `Merge node "${mergeNode.name}" connects directly to terminal node "${targetNode.name}" — this will cause the workflow to hang`,
            raw_details:
              'The Merge node waits for ALL inputs before passing data downstream, but ' +
              'typically only one conditional branch runs. This causes an infinite wait. ' +
              'Insert a processing node between the Merge and the terminal Codika node, ' +
              'or duplicate the terminal node on each branch feeding into the Merge.',
            nodeId: mergeNode.id,
            guideRef: {
              path: 'specific/codika-nodes.md',
              section: 'Critical Workflow Rules',
            },
          });
        }
      }
    }
  }

  return findings;
}
