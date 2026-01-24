/**
 * Script: LLM-OUTPUT-ACCESS
 *
 * Checks that LLM chain outputs are correctly accessed via the .output property
 * when using a Structured Output Parser.
 *
 * CORRECT:   $json.output.fieldName
 * CORRECT:   $('LLM Node').first().json.output.fieldName
 * INCORRECT: $json.fieldName (missing .output)
 * INCORRECT: $('LLM Node').first().json.fieldName (missing .output)
 *
 * When chainLlm is used with outputParserStructured, the result is wrapped in
 * an `output` property. Accessing fields directly without .output will fail.
 *
 * This script provides auto-fix capability to add the .output prefix.
 */

import type { Finding, RuleMetadata } from '../types.js';

export const metadata: RuleMetadata = {
  id: 'LLM-OUTPUT-ACCESS',
  name: 'llm_output_access',
  severity: 'must',
  description: 'LLM chain outputs must be accessed via .output property when using structured output parser',
  details:
    'When chainLlm is used with outputParserStructured, the result is wrapped in an output property. ' +
    'Use $json.output.fieldName instead of $json.fieldName',
  fixable: true,
  category: 'ai-nodes',
};

interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  parameters?: Record<string, unknown>;
}

interface WorkflowConnection {
  node: string;
  type: string;
  index: number;
}

interface ParsedWorkflow {
  nodes: WorkflowNode[];
  connections: Record<string, Record<string, WorkflowConnection[][]>>;
}

/**
 * Find all chainLlm nodes that have hasOutputParser: true
 */
function findChainLlmNodesWithParser(workflow: ParsedWorkflow): WorkflowNode[] {
  return workflow.nodes.filter(
    node =>
      node.type === '@n8n/n8n-nodes-langchain.chainLlm' &&
      node.parameters?.hasOutputParser === true
  );
}

/**
 * Find nodes directly connected downstream from a given node (via main connection)
 */
function findDirectDownstreamNodes(workflow: ParsedWorkflow, nodeName: string): string[] {
  const connections = workflow.connections[nodeName];
  if (!connections?.main) return [];

  const downstreamNodes: string[] = [];
  for (const branch of connections.main) {
    for (const conn of branch) {
      if (conn.type === 'main') {
        downstreamNodes.push(conn.node);
      }
    }
  }
  return downstreamNodes;
}

/**
 * Get all node names that have chainLlm with output parser
 */
function getChainLlmNodeNames(workflow: ParsedWorkflow): Set<string> {
  const names = new Set<string>();
  for (const node of workflow.nodes) {
    if (
      node.type === '@n8n/n8n-nodes-langchain.chainLlm' &&
      node.parameters?.hasOutputParser === true
    ) {
      names.add(node.name);
    }
  }
  return names;
}

/**
 * Check if a node is directly downstream from any chainLlm node with output parser
 */
function isDirectlyConnectedToChainLlm(
  workflow: ParsedWorkflow,
  nodeId: string,
  chainLlmNames: Set<string>
): boolean {
  const node = workflow.nodes.find(n => n.id === nodeId);
  if (!node) return false;

  // Check if any chainLlm node connects to this node
  for (const chainName of chainLlmNames) {
    const downstreamNodes = findDirectDownstreamNodes(workflow, chainName);
    if (downstreamNodes.includes(node.name)) {
      return true;
    }
  }
  return false;
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Check for direct $json.fieldName access (should be $json.output.fieldName)
 * This only applies to nodes directly connected to chainLlm
 */
function checkDirectJsonAccess(
  content: string,
  node: WorkflowNode,
  path: string
): Finding[] {
  const findings: Finding[] = [];
  const nodeJson = JSON.stringify(node);

  // Pattern to find $json.fieldName (but not $json.output.fieldName)
  // Negative lookahead to skip $json.output
  const directAccessRegex = /\$json\.(?!output[\.\?\s])([a-zA-Z_][a-zA-Z0-9_]*)/g;

  // Also check for defensive patterns that should be skipped
  const defensivePattern = /\$json\.output\?\.[a-zA-Z_]+\s*\|\|\s*\$json\.[a-zA-Z_]+/;

  // If the node has a defensive pattern, skip it entirely
  if (defensivePattern.test(nodeJson)) {
    return findings;
  }

  let match;
  directAccessRegex.lastIndex = 0;

  while ((match = directAccessRegex.exec(nodeJson)) !== null) {
    const fieldName = match[1];
    const fullMatch = match[0];

    // Skip if this is part of a defensive pattern (check surrounding context)
    const contextStart = Math.max(0, match.index - 50);
    const contextEnd = Math.min(nodeJson.length, match.index + fullMatch.length + 50);
    const context = nodeJson.substring(contextStart, contextEnd);

    // Skip if this looks like a fallback pattern: $json.output?.field || $json.field
    if (/\$json\.output\?\.\w+\s*\|\|/.test(context)) {
      continue;
    }

    // Calculate approximate line number in the original content
    const lineNumber = getLineNumberForNode(content, node.id);

    findings.push({
      rule: metadata.id,
      severity: metadata.severity,
      path,
      message: `LLM chain output accessed without .output prefix: ${fullMatch} should be $json.output.${fieldName}`,
      raw_details: `When chainLlm is used with outputParserStructured, the output is wrapped in an 'output' property. Change ${fullMatch} to $json.output.${fieldName}`,
      nodeId: node.id,
      line: lineNumber,
      fixable: true,
      fix: {
        description: `Change ${fullMatch} to $json.output.${fieldName}`,
        apply: (fileContent: string) => {
          // Find the specific node in the content and fix it
          const parsed = JSON.parse(fileContent);
          const targetNode = parsed.nodes.find((n: WorkflowNode) => n.id === node.id);
          if (targetNode) {
            const nodeStr = JSON.stringify(targetNode);
            // Replace $json.fieldName with $json.output.fieldName (but not $json.output.*)
            const fixedNodeStr = nodeStr.replace(
              new RegExp(`\\$json\\.(?!output[.?\\s])${escapeRegex(fieldName)}`, 'g'),
              `$json.output.${fieldName}`
            );
            const fixedNode = JSON.parse(fixedNodeStr);
            const nodeIndex = parsed.nodes.findIndex((n: WorkflowNode) => n.id === node.id);
            parsed.nodes[nodeIndex] = fixedNode;
          }
          return JSON.stringify(parsed, null, 2);
        },
      },
    });
  }

  return findings;
}

/**
 * Check for named reference access like $('NodeName').first().json.fieldName
 * This applies to any node referencing a chainLlm node by name
 */
function checkNamedReferenceAccess(
  content: string,
  node: WorkflowNode,
  chainLlmNames: Set<string>,
  path: string
): Finding[] {
  const findings: Finding[] = [];
  const nodeJson = JSON.stringify(node);

  for (const chainName of chainLlmNames) {
    // Escape the node name for use in regex
    const escapedName = escapeRegex(chainName);

    // Pattern to find $('NodeName').first().json.fieldName or $('NodeName').item.json.fieldName
    // or $("NodeName") with double quotes
    // But NOT .json.output.fieldName (which is correct)
    // Using word boundary \b to properly detect "output" as a complete word
    const namedRefRegex = new RegExp(
      `\\$\\(['"]${escapedName}['"]\\)\\.(first\\(\\)|item|all\\(\\)\\[\\d+\\])\\.json\\.(?!output\\b)([a-zA-Z_][a-zA-Z0-9_]*)`,
      'g'
    );

    // Also check for defensive patterns
    const defensivePattern = new RegExp(
      `\\$\\(['"]${escapedName}['"]\\).*\\.json\\.output\\?\\.[a-zA-Z_]+\\s*\\|\\|`
    );

    if (defensivePattern.test(nodeJson)) {
      continue;
    }

    let match;
    namedRefRegex.lastIndex = 0;

    while ((match = namedRefRegex.exec(nodeJson)) !== null) {
      const accessor = match[1]; // first(), item, or all()[0]
      const fieldName = match[2];
      const fullMatch = match[0];

      // Skip if this is part of a defensive pattern
      const contextStart = Math.max(0, match.index - 50);
      const contextEnd = Math.min(nodeJson.length, match.index + fullMatch.length + 50);
      const context = nodeJson.substring(contextStart, contextEnd);

      if (/\.json\.output\?\.\w+\s*\|\|/.test(context)) {
        continue;
      }

      const lineNumber = getLineNumberForNode(content, node.id);

      findings.push({
        rule: metadata.id,
        severity: metadata.severity,
        path,
        message: `LLM chain '${chainName}' output accessed without .output prefix: should be $('${chainName}').${accessor}.json.output.${fieldName}`,
        raw_details: `When chainLlm is used with outputParserStructured, the output is wrapped in an 'output' property. Add .output before .${fieldName}`,
        nodeId: node.id,
        line: lineNumber,
        fixable: true,
        fix: {
          description: `Add .output prefix when accessing ${chainName} output`,
          apply: (fileContent: string) => {
            const parsed = JSON.parse(fileContent);
            const targetNode = parsed.nodes.find((n: WorkflowNode) => n.id === node.id);
            if (targetNode) {
              const nodeStr = JSON.stringify(targetNode);
              // Replace .json.fieldName with .json.output.fieldName for this specific node reference
              const fixRegex = new RegExp(
                `(\\$\\(['"]${escapedName}['"]\\)\\.(first\\(\\)|item|all\\(\\)\\[\\d+\\])\\.json)\\.(?!output)${escapeRegex(fieldName)}`,
                'g'
              );
              const fixedNodeStr = nodeStr.replace(fixRegex, `$1.output.${fieldName}`);
              const fixedNode = JSON.parse(fixedNodeStr);
              const nodeIndex = parsed.nodes.findIndex((n: WorkflowNode) => n.id === node.id);
              parsed.nodes[nodeIndex] = fixedNode;
            }
            return JSON.stringify(parsed, null, 2);
          },
        },
      });
    }
  }

  return findings;
}

/**
 * Get approximate line number for a node in the workflow JSON
 */
function getLineNumberForNode(content: string, nodeId: string): number {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`"id": "${nodeId}"`)) {
      return i + 1;
    }
  }
  return 1;
}

/**
 * Main validation function
 */
export function checkLlmOutputAccess(content: string, path: string): Finding[] {
  const findings: Finding[] = [];

  // Try to parse the workflow JSON
  let workflow: ParsedWorkflow;
  try {
    workflow = JSON.parse(content);
  } catch {
    // Not valid JSON, skip
    return findings;
  }

  // Make sure it's a workflow with nodes
  if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
    return findings;
  }

  // Find all chainLlm nodes with output parsers
  const chainLlmNodes = findChainLlmNodesWithParser(workflow);
  if (chainLlmNodes.length === 0) {
    return findings;
  }

  // Get the names of all chainLlm nodes with output parsers
  const chainLlmNames = getChainLlmNodeNames(workflow);

  // Check each node in the workflow
  for (const node of workflow.nodes) {
    // Skip the chainLlm nodes themselves
    if (node.type === '@n8n/n8n-nodes-langchain.chainLlm') {
      continue;
    }

    // Skip output parser nodes
    if (node.type === '@n8n/n8n-nodes-langchain.outputParserStructured') {
      continue;
    }

    // Skip model nodes
    if (node.type.includes('lmChat')) {
      continue;
    }

    // Check for direct $json access if this node is directly connected to a chainLlm
    if (isDirectlyConnectedToChainLlm(workflow, node.id, chainLlmNames)) {
      const directFindings = checkDirectJsonAccess(content, node, path);
      findings.push(...directFindings);
    }

    // Check for named reference access in all nodes
    const namedFindings = checkNamedReferenceAccess(content, node, chainLlmNames, path);
    findings.push(...namedFindings);
  }

  return findings;
}
