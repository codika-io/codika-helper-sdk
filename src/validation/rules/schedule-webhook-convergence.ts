/**
 * Rule: SCHEDULE-WEBHOOK-CONVERGENCE
 *
 * When a workflow has a Schedule Trigger, it must also have a Webhook node
 * for manual execution, and both must connect to the same downstream node.
 *
 * This ensures:
 * - Scheduled workflows can be manually triggered for testing/debugging
 * - Manual execution follows the same processing flow as scheduled execution
 *
 * @see .guides/specific/schedule-triggers.md - "Manual Trigger Webhook"
 */

import type { Graph, Finding, RuleRunner, RuleContext, NodeRef, Edge } from '@replikanti/flowlint-core';
import type { RuleMetadata } from '../types.js';

export const RULE_ID = 'SCHEDULE-WEBHOOK-CONVERGENCE';

export const metadata: RuleMetadata & { guideRef: { path: string; section: string } } = {
  id: RULE_ID,
  name: 'schedule_webhook_convergence',
  severity: 'must',
  description: 'Scheduled workflows must have a webhook node that connects to the same downstream node',
  details:
    'Add a webhook node to enable manual triggering, and connect it to the same node as the schedule trigger output',
  category: 'triggers',
  guideRef: {
    path: 'specific/schedule-triggers.md',
    section: 'Manual Trigger Webhook',
  },
};

// Node types
const SCHEDULE_TRIGGER_TYPE = 'n8n-nodes-base.scheduleTrigger';
const WEBHOOK_TYPE = 'n8n-nodes-base.webhook';

/**
 * Find all schedule trigger nodes in the workflow
 */
function findScheduleTriggerNodes(graph: Graph): NodeRef[] {
  return graph.nodes.filter(node => node.type.toLowerCase().includes('scheduletrigger'));
}

/**
 * Find all webhook nodes in the workflow
 */
function findWebhookNodes(graph: Graph): NodeRef[] {
  return graph.nodes.filter(node => node.type.toLowerCase().includes('webhook'));
}

/**
 * Get the immediate downstream node IDs for a given node
 */
function getDownstreamNodeIds(graph: Graph, nodeId: string): string[] {
  return graph.edges.filter(edge => edge.from === nodeId).map(edge => edge.to);
}

/**
 * Check if two sets of node IDs have at least one common element
 */
function hasCommonNode(set1: string[], set2: string[]): boolean {
  return set1.some(id => set2.includes(id));
}

export const scheduleWebhookConvergence: RuleRunner = (graph: Graph, ctx: RuleContext): Finding[] => {
  const findings: Finding[] = [];

  // Find schedule trigger nodes
  const scheduleTriggers = findScheduleTriggerNodes(graph);

  // If no schedule triggers, rule doesn't apply
  if (scheduleTriggers.length === 0) {
    return [];
  }

  // Find webhook nodes
  const webhookNodes = findWebhookNodes(graph);

  // Check 1: Must have at least one webhook node when schedule trigger exists
  if (webhookNodes.length === 0) {
    for (const scheduleTrigger of scheduleTriggers) {
      findings.push({
        rule: RULE_ID,
        severity: metadata.severity,
        path: ctx.path,
        message: `Schedule trigger "${scheduleTrigger.name}" requires a webhook node for manual execution`,
        raw_details:
          `Scheduled workflows must have a webhook node to enable manual triggering.\n\n` +
          `Add a webhook node and connect it to the same downstream node as the schedule trigger.\n\n` +
          `See documentation: .guides/${metadata.guideRef.path} > "${metadata.guideRef.section}"`,
        nodeId: scheduleTrigger.id,
        line: ctx.nodeLines?.[scheduleTrigger.id],
      });
    }
    return findings;
  }

  // Check 2: Schedule trigger and webhook must connect to the same downstream node
  for (const scheduleTrigger of scheduleTriggers) {
    const scheduleDownstream = getDownstreamNodeIds(graph, scheduleTrigger.id);

    // Skip if schedule trigger has no connections (dead end - different rule)
    if (scheduleDownstream.length === 0) {
      continue;
    }

    // Check if any webhook connects to the same downstream node
    let hasMatchingWebhook = false;
    const webhookDownstreams: { webhook: NodeRef; downstream: string[] }[] = [];

    for (const webhook of webhookNodes) {
      const webhookDownstream = getDownstreamNodeIds(graph, webhook.id);
      webhookDownstreams.push({ webhook, downstream: webhookDownstream });

      if (hasCommonNode(scheduleDownstream, webhookDownstream)) {
        hasMatchingWebhook = true;
        break;
      }
    }

    if (!hasMatchingWebhook) {
      // Find the downstream node names for better error message
      const scheduleTargetNodes = graph.nodes
        .filter(n => scheduleDownstream.includes(n.id))
        .map(n => n.name || n.type);

      const webhookTargetInfo = webhookDownstreams
        .map(w => {
          const targets = graph.nodes
            .filter(n => w.downstream.includes(n.id))
            .map(n => n.name || n.type);
          return `"${w.webhook.name}" -> [${targets.join(', ') || 'no connections'}]`;
        })
        .join(', ');

      findings.push({
        rule: RULE_ID,
        severity: metadata.severity,
        path: ctx.path,
        message: `Schedule trigger "${scheduleTrigger.name}" and webhook(s) do not connect to the same downstream node`,
        raw_details:
          `The schedule trigger and webhook must connect to the same node to ensure manual execution follows the same flow.\n\n` +
          `Schedule trigger "${scheduleTrigger.name}" connects to: [${scheduleTargetNodes.join(', ')}]\n` +
          `Webhook connections: ${webhookTargetInfo}\n\n` +
          `Connect both triggers to the same downstream node.\n\n` +
          `See documentation: .guides/${metadata.guideRef.path} > "${metadata.guideRef.section}"`,
        nodeId: scheduleTrigger.id,
        line: ctx.nodeLines?.[scheduleTrigger.id],
      });
    }
  }

  return findings;
};

export default scheduleWebhookConvergence;
