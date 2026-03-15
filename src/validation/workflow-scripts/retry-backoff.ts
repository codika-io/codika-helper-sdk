/**
 * Script: RETRY-BACKOFF
 *
 * Validates that API/HTTP nodes have retry configuration enabled.
 * Replaces flowlint-core R1 with better node type detection and auto-fix.
 *
 * Flagged node types: HTTP Request, Google, Facebook, Slack, Twilio,
 * and other external API integrations.
 *
 * Excluded: Internal nodes (Code, IF, Set, Merge, triggers, Codika nodes,
 * sub-workflow calls, etc.)
 */

import type { Finding, RuleMetadata } from '../types.js';

export const metadata: RuleMetadata = {
  id: 'RETRY-BACKOFF',
  name: 'retry_backoff',
  severity: 'should',
  description: 'API/HTTP nodes should have retry configuration enabled',
  details: 'Enable "Retry on Fail" in node settings to handle transient API failures gracefully',
  fixable: true,
  category: 'resilience',
};

// Default retry configuration for auto-fix
const DEFAULT_MAX_TRIES = 3;
const DEFAULT_WAIT_BETWEEN_TRIES = 1000;

// ---------------------------------------------------------------------------
// Node type classification
// ---------------------------------------------------------------------------

/**
 * Node types that are internal / control-flow and should NOT be flagged.
 * Checked by exact match on the last segment of the type.
 */
const INTERNAL_NODE_NAMES = new Set([
  'code',
  'function',
  'functionItem',
  'if',
  'switch',
  'set',
  'merge',
  'noOp',
  'stickyNote',
  'splitInBatches',
  'itemLists',
  'dateTime',
  'crypto',
  'xml',
  'html',
  'markdown',
  'compression',
  'renameKeys',
  'splitOut',
  'aggregate',
  'removeDuplicates',
  'limit',
  'sort',
  'filter',
  'respondToWebhook',
  'wait',
  'executeWorkflow',
  'executeWorkflowTrigger',
  'webhook',
  'scheduleTrigger',
  'manualTrigger',
  'errorTrigger',
  'workflowTrigger',
  'emailReadImap',
  'codika',
  'localFileTrigger',
  'readBinaryFiles',
  'writeBinaryFile',
  'readPdf',
  'convertToFile',
  'extractFromFile',
  // Database / data-store nodes (reliable internal connections)
  'supabase',
  'postgres',
  'mySql',
  'mongoDb',
  'redis',
  'elasticsearch',
]);

/**
 * Determine if a node type represents an external API call that should have retry.
 */
function isApiNode(type: string): boolean {
  // Extract the node name (last segment after the last dot)
  const segments = type.split('.');
  const nodeName = segments[segments.length - 1];

  // Skip internal/control-flow nodes
  if (INTERNAL_NODE_NAMES.has(nodeName)) {
    return false;
  }

  // Skip Codika custom nodes
  if (type.includes('codika')) {
    return false;
  }

  // Skip LangChain nodes (AI chain internals, not direct API calls)
  if (type.includes('langchain')) {
    return false;
  }

  // Skip trigger nodes (they receive, not send)
  if (nodeName.toLowerCase().endsWith('trigger')) {
    return false;
  }

  // Flag known external API / SaaS integration patterns
  // Excludes databases (supabase, postgres, mysql, mongodb, redis, elasticsearch)
  // which are typically on internal networks with reliable connections
  const apiPatterns = /http|request|google|gmail|facebook|slack|telegram|twilio|notion|airtable|hubspot|stripe|microsoft|outlook|teams|discord|github|gitlab|jira|asana|trello|shopify|mailchimp|sendgrid|aws|azure|s3/i;

  if (apiPatterns.test(type)) {
    return true;
  }

  // Flag httpRequest explicitly
  if (nodeName === 'httpRequest') {
    return true;
  }

  // For other node types, check if they're likely API integrations
  // (nodes from n8n-nodes-base that aren't in the internal list are usually integrations)
  if (type.startsWith('n8n-nodes-base.') && !INTERNAL_NODE_NAMES.has(nodeName)) {
    // Only flag if the name suggests an external service
    // (conservative: don't flag unknown nodes)
    return false;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Retry detection
// ---------------------------------------------------------------------------

interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  parameters?: Record<string, unknown>;
  retryOnFail?: boolean;
  maxTries?: number;
  waitBetweenTries?: number;
}

/**
 * Check if a node has retry configuration enabled.
 * Checks three locations (same as flowlint R1):
 * 1. node.parameters.options.retryOnFail
 * 2. node.parameters.retryOnFail
 * 3. node.retryOnFail (top-level)
 */
function hasRetryEnabled(node: WorkflowNode): boolean {
  // Check top-level
  if (node.retryOnFail === true) return true;

  // Check parameters
  const params = node.parameters || {};
  if (params.retryOnFail === true) return true;

  // Check parameters.options
  const options = params.options as Record<string, unknown> | undefined;
  if (options?.retryOnFail === true) return true;

  return false;
}

// ---------------------------------------------------------------------------
// Main validation function
// ---------------------------------------------------------------------------

export function checkRetryBackoff(content: string, path: string): Finding[] {
  const findings: Finding[] = [];

  let workflow: { nodes?: WorkflowNode[] };
  try {
    workflow = JSON.parse(content);
  } catch {
    return findings;
  }

  if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
    return findings;
  }

  for (const node of workflow.nodes) {
    if (!isApiNode(node.type)) continue;
    if (hasRetryEnabled(node)) continue;

    findings.push({
      rule: metadata.id,
      severity: metadata.severity,
      path,
      message: `Node "${node.name}" is missing retry/backoff configuration`,
      raw_details:
        'Enable "Retry on Fail" in the node settings. This helps handle transient API ' +
        'failures (timeouts, rate limits, 5xx errors) gracefully.',
      nodeId: node.id,
      fixable: true,
      fix: {
        description: `Enable retry on "${node.name}" (3 retries, 1s wait)`,
        apply: (fileContent: string) => {
          const parsed = JSON.parse(fileContent);
          const target = parsed.nodes.find((n: WorkflowNode) => n.id === node.id);
          if (target) {
            target.retryOnFail = true;
            // Only set defaults if not already configured
            if (target.maxTries === undefined) {
              target.maxTries = DEFAULT_MAX_TRIES;
            }
            if (target.waitBetweenTries === undefined) {
              target.waitBetweenTries = DEFAULT_WAIT_BETWEEN_TRIES;
            }
          }
          return JSON.stringify(parsed, null, 2);
        },
      },
    });
  }

  return findings;
}
