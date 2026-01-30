/**
 * Script: WEBHOOK-ID
 *
 * Validates that every n8n-nodes-base.webhook node has a `webhookId`
 * property at the node level (sibling to name, type, parameters).
 *
 * Without webhookId, the webhook path is never registered in production
 * even when the workflow is active, causing 404 errors at runtime.
 */

import type { Finding } from '../types.js';
import type { RuleMetadata } from '../types.js';

export const metadata: RuleMetadata = {
  id: 'WEBHOOK-ID',
  name: 'webhook_id',
  severity: 'must',
  description: 'Webhook nodes must have a webhookId property for production registration',
  details: 'Add a "webhookId" string property to each webhook node (sibling to name/type/parameters)',
  fixable: true,
  category: 'webhook',
};

/**
 * Generate a webhookId by slugifying the node name.
 * Lowercases, replaces spaces and non-alphanumeric chars with hyphens,
 * collapses consecutive hyphens, and trims leading/trailing hyphens.
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Check that all webhook nodes have a webhookId property.
 */
export function checkWebhookId(content: string, path: string): Finding[] {
  const findings: Finding[] = [];

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    return [];
  }

  const nodes: any[] = parsed.nodes;
  if (!Array.isArray(nodes)) {
    return [];
  }

  for (const node of nodes) {
    if (node.type !== 'n8n-nodes-base.webhook') {
      continue;
    }

    if (!node.webhookId || typeof node.webhookId !== 'string') {
      const generatedId = slugify(node.name || 'webhook');

      findings.push({
        rule: metadata.id,
        severity: metadata.severity,
        path,
        message: `Webhook node "${node.name}" is missing webhookId property`,
        raw_details: `Add "webhookId": "${generatedId}" to the node object (sibling to name/type/parameters)`,
        fixable: true,
        fix: {
          description: `Add webhookId "${generatedId}" to webhook node "${node.name}"`,
          apply: (fileContent: string) => {
            const data = JSON.parse(fileContent);
            for (const n of data.nodes) {
              if (
                n.type === 'n8n-nodes-base.webhook' &&
                n.name === node.name &&
                (!n.webhookId || typeof n.webhookId !== 'string')
              ) {
                n.webhookId = slugify(n.name || 'webhook');
              }
            }
            return JSON.stringify(data, null, 2);
          },
        },
      });
    }
  }

  return findings;
}
