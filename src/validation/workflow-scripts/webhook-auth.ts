/**
 * Script: WEBHOOK-AUTH
 *
 * Validates that every n8n-nodes-base.webhook node uses headerAuth
 * with Codika's webhook auth credential placeholders.
 *
 * This ensures all webhook endpoints are secured — only the Codika
 * Cloud Function (which sends the X-Codika-Webhook-Auth header) can
 * trigger the n8n workflow directly.
 */

import type { Finding, RuleMetadata } from '../types.js';

const EXPECTED_CRED_ID = '{{ORGSECRET_WEBHOOK_AUTH_CRED_ID_TERCESORG}}';
const EXPECTED_CRED_NAME = '{{ORGSECRET_WEBHOOK_AUTH_CRED_NAME_TERCESORG}}';

export const metadata: RuleMetadata = {
  id: 'WEBHOOK-AUTH',
  name: 'webhook_auth',
  severity: 'must',
  description: 'Webhook nodes must use headerAuth with Codika webhook credential placeholders',
  details:
    'Set parameters.authentication to "headerAuth" and add credentials.httpHeaderAuth with ' +
    `id "${EXPECTED_CRED_ID}" and name "${EXPECTED_CRED_NAME}"`,
  fixable: true,
  category: 'webhook',
};

/**
 * Check that all webhook nodes have headerAuth with the correct credential placeholders.
 * Skips sub-workflows (workflows with executeWorkflowTrigger nodes).
 */
export function checkWebhookAuth(content: string, path: string): Finding[] {
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

  // Skip sub-workflows (they don't have webhook nodes that face the outside)
  const isSubWorkflow = nodes.some(
    (n: any) => n.type === 'n8n-nodes-base.executeWorkflowTrigger'
  );
  if (isSubWorkflow) {
    return [];
  }

  for (const node of nodes) {
    if (node.type !== 'n8n-nodes-base.webhook') {
      continue;
    }

    const auth = node.parameters?.authentication;
    const credId = node.credentials?.httpHeaderAuth?.id;
    const credName = node.credentials?.httpHeaderAuth?.name;

    const hasCorrectAuth = auth === 'headerAuth';
    const hasCorrectCredId = credId === EXPECTED_CRED_ID;
    const hasCorrectCredName = credName === EXPECTED_CRED_NAME;

    if (!hasCorrectAuth || !hasCorrectCredId || !hasCorrectCredName) {
      const issues: string[] = [];
      if (!hasCorrectAuth) issues.push(`authentication is "${auth || 'none'}" (expected "headerAuth")`);
      if (!hasCorrectCredId) issues.push(`credentials.httpHeaderAuth.id is missing or incorrect`);
      if (!hasCorrectCredName) issues.push(`credentials.httpHeaderAuth.name is missing or incorrect`);

      findings.push({
        rule: metadata.id,
        severity: metadata.severity,
        path,
        message: `Webhook node "${node.name}" is not secured with Codika webhook auth: ${issues.join('; ')}`,
        raw_details: `Set authentication to "headerAuth" and add credentials.httpHeaderAuth with the ORGSECRET placeholders`,
        fixable: true,
        fix: {
          description: `Add headerAuth with Codika webhook credential to webhook node "${node.name}"`,
          apply: (fileContent: string) => {
            const data = JSON.parse(fileContent);
            for (const n of data.nodes) {
              if (n.type !== 'n8n-nodes-base.webhook') continue;
              if (n.name !== node.name) continue;

              // Set authentication parameter
              if (!n.parameters) n.parameters = {};
              n.parameters.authentication = 'headerAuth';

              // Set credentials
              if (!n.credentials) n.credentials = {};
              n.credentials.httpHeaderAuth = {
                id: EXPECTED_CRED_ID,
                name: EXPECTED_CRED_NAME,
              };
            }
            return JSON.stringify(data, null, 2);
          },
        },
      });
    }
  }

  return findings;
}
