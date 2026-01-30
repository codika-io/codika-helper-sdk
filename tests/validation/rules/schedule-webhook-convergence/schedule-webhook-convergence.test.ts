/**
 * Tests for SCHEDULE-WEBHOOK-CONVERGENCE Rule
 *
 * Rule: Scheduled workflows must have a webhook node that connects to the same
 * downstream node as the schedule trigger.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseN8n } from '@replikanti/flowlint-core';
import type { Graph } from '@replikanti/flowlint-core';
import {
  scheduleWebhookConvergence,
  metadata,
  RULE_ID,
} from '../../../../src/validation/rules/schedule-webhook-convergence.js';
import { createRuleContext, expectFindingWithRule } from '../../../helpers/test-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadLocalFixture(filename: string): { content: string; graph: Graph } {
  const filepath = join(__dirname, 'fixtures', filename);
  const content = readFileSync(filepath, 'utf-8');
  const graph = parseN8n(content);
  return { content, graph };
}

describe('SCHEDULE-WEBHOOK-CONVERGENCE Rule', () => {
  const ctx = createRuleContext();

  describe('metadata', () => {
    it('should have correct rule ID', () => {
      expect(RULE_ID).toBe('SCHEDULE-WEBHOOK-CONVERGENCE');
      expect(metadata.id).toBe('SCHEDULE-WEBHOOK-CONVERGENCE');
    });

    it('should have "must" severity', () => {
      expect(metadata.severity).toBe('must');
    });

    it('should have guideRef', () => {
      expect(metadata.guideRef).toBeDefined();
      expect(metadata.guideRef.path).toBe('specific/schedule-triggers.md');
    });
  });

  describe('valid workflows', () => {
    it('should PASS when schedule and webhook connect to the same node', () => {
      const { graph } = loadLocalFixture('valid-same-target.json');
      const findings = scheduleWebhookConvergence(graph, ctx);

      expect(findings).toHaveLength(0);
    });

    it('should PASS when workflow has no schedule trigger (rule does not apply)', () => {
      const workflowJson = JSON.stringify({
        name: 'HTTP Only Workflow',
        nodes: [
          {
            id: '1',
            name: 'Webhook',
            type: 'n8n-nodes-base.webhook',
            position: [0, 0],
            parameters: {},
          },
          {
            id: '2',
            name: 'Process',
            type: 'n8n-nodes-base.code',
            position: [200, 0],
            parameters: {},
          },
        ],
        connections: {
          Webhook: { main: [[{ node: 'Process', type: 'main', index: 0 }]] },
        },
        settings: { executionOrder: 'v1' },
      });
      const graph = parseN8n(workflowJson);
      const findings = scheduleWebhookConvergence(graph, ctx);

      expect(findings).toHaveLength(0);
    });

    it('should PASS when multiple webhooks exist and at least one connects to same node', () => {
      const workflowJson = JSON.stringify({
        name: 'Multiple Webhooks',
        nodes: [
          {
            id: '1',
            name: 'Schedule Trigger',
            type: 'n8n-nodes-base.scheduleTrigger',
            position: [0, 0],
            parameters: {},
          },
          {
            id: '2',
            name: 'Manual Webhook',
            type: 'n8n-nodes-base.webhook',
            position: [0, 200],
            parameters: { path: 'manual' },
          },
          {
            id: '3',
            name: 'Other Webhook',
            type: 'n8n-nodes-base.webhook',
            position: [0, 400],
            parameters: { path: 'other' },
          },
          {
            id: '4',
            name: 'Codika Init',
            type: 'n8n-nodes-codika.codika',
            position: [200, 100],
            parameters: { operation: 'initWorkflow' },
          },
          {
            id: '5',
            name: 'Other Process',
            type: 'n8n-nodes-base.code',
            position: [200, 400],
            parameters: {},
          },
        ],
        connections: {
          'Schedule Trigger': { main: [[{ node: 'Codika Init', type: 'main', index: 0 }]] },
          'Manual Webhook': { main: [[{ node: 'Codika Init', type: 'main', index: 0 }]] },
          'Other Webhook': { main: [[{ node: 'Other Process', type: 'main', index: 0 }]] },
        },
        settings: { executionOrder: 'v1' },
      });
      const graph = parseN8n(workflowJson);
      const findings = scheduleWebhookConvergence(graph, ctx);

      expect(findings).toHaveLength(0);
    });

  });

  describe('invalid workflows', () => {
    it('should FAIL when schedule trigger exists but no webhook node', () => {
      const workflowJson = JSON.stringify({
        name: 'Schedule Without Webhook',
        nodes: [
          {
            id: '1',
            name: 'Schedule Trigger',
            type: 'n8n-nodes-base.scheduleTrigger',
            position: [0, 0],
            parameters: {},
          },
          {
            id: '2',
            name: 'Process',
            type: 'n8n-nodes-base.code',
            position: [200, 0],
            parameters: {},
          },
        ],
        connections: {
          'Schedule Trigger': { main: [[{ node: 'Process', type: 'main', index: 0 }]] },
        },
        settings: { executionOrder: 'v1' },
      });
      const graph = parseN8n(workflowJson);
      const findings = scheduleWebhookConvergence(graph, ctx);

      expect(findings).toHaveLength(1);
      const finding = expectFindingWithRule(findings, 'SCHEDULE-WEBHOOK-CONVERGENCE');
      expect(finding.severity).toBe('must');
      expect(finding.message).toContain('requires a webhook node');
    });

    it('should FAIL when schedule and webhook connect to different nodes', () => {
      const { graph } = loadLocalFixture('invalid-different-targets.json');
      const findings = scheduleWebhookConvergence(graph, ctx);

      expect(findings).toHaveLength(1);
      const finding = expectFindingWithRule(findings, 'SCHEDULE-WEBHOOK-CONVERGENCE');
      expect(finding.message).toContain('do not connect to the same downstream node');
    });

    it('should include helpful details about connections', () => {
      const { graph } = loadLocalFixture('invalid-different-targets.json');
      const findings = scheduleWebhookConvergence(graph, ctx);

      expect(findings[0].raw_details).toContain('Schedule trigger');
      expect(findings[0].raw_details).toContain('connects to');
    });

    it('should FAIL for missing-webhook.json fixture', () => {
      const { graph } = loadLocalFixture('missing-webhook.json');
      const findings = scheduleWebhookConvergence(graph, ctx);

      expect(findings).toHaveLength(1);
      expectFindingWithRule(findings, 'SCHEDULE-WEBHOOK-CONVERGENCE');
    });
  });

  describe('edge cases', () => {
    it('should handle workflow with no nodes', () => {
      const graph = parseN8n(
        JSON.stringify({
          name: 'Empty Workflow',
          nodes: [],
          connections: {},
          settings: { executionOrder: 'v1' },
        })
      );
      const findings = scheduleWebhookConvergence(graph, ctx);

      expect(findings).toHaveLength(0);
    });

    it('should handle schedule trigger with no connections (dead end)', () => {
      const workflowJson = JSON.stringify({
        name: 'Dead End Schedule',
        nodes: [
          {
            id: '1',
            name: 'Schedule Trigger',
            type: 'n8n-nodes-base.scheduleTrigger',
            position: [0, 0],
            parameters: {},
          },
          {
            id: '2',
            name: 'Webhook',
            type: 'n8n-nodes-base.webhook',
            position: [0, 200],
            parameters: {},
          },
        ],
        connections: {},
        settings: { executionOrder: 'v1' },
      });
      const graph = parseN8n(workflowJson);
      const findings = scheduleWebhookConvergence(graph, ctx);

      // Should not report - dead end is a different concern
      expect(findings).toHaveLength(0);
    });

    it('should include nodeId in the finding', () => {
      const workflowJson = JSON.stringify({
        name: 'Test',
        nodes: [
          {
            id: 'schedule-123',
            name: 'Schedule Trigger',
            type: 'n8n-nodes-base.scheduleTrigger',
            position: [0, 0],
            parameters: {},
          },
          {
            id: 'process-456',
            name: 'Process',
            type: 'n8n-nodes-base.code',
            position: [200, 0],
            parameters: {},
          },
        ],
        connections: {
          'Schedule Trigger': { main: [[{ node: 'Process', type: 'main', index: 0 }]] },
        },
        settings: { executionOrder: 'v1' },
      });
      const graph = parseN8n(workflowJson);
      const findings = scheduleWebhookConvergence(graph, ctx);

      expect(findings[0].nodeId).toBe('schedule-123');
    });

    it('should handle multiple schedule triggers', () => {
      const workflowJson = JSON.stringify({
        name: 'Multiple Schedules',
        nodes: [
          {
            id: '1',
            name: 'Morning Schedule',
            type: 'n8n-nodes-base.scheduleTrigger',
            position: [0, 0],
            parameters: {},
          },
          {
            id: '2',
            name: 'Evening Schedule',
            type: 'n8n-nodes-base.scheduleTrigger',
            position: [0, 200],
            parameters: {},
          },
          {
            id: '3',
            name: 'Process A',
            type: 'n8n-nodes-base.code',
            position: [200, 0],
            parameters: {},
          },
          {
            id: '4',
            name: 'Process B',
            type: 'n8n-nodes-base.code',
            position: [200, 200],
            parameters: {},
          },
        ],
        connections: {
          'Morning Schedule': { main: [[{ node: 'Process A', type: 'main', index: 0 }]] },
          'Evening Schedule': { main: [[{ node: 'Process B', type: 'main', index: 0 }]] },
        },
        settings: { executionOrder: 'v1' },
      });
      const graph = parseN8n(workflowJson);
      const findings = scheduleWebhookConvergence(graph, ctx);

      // Should report 2 findings (one for each schedule without matching webhook)
      expect(findings).toHaveLength(2);
    });
  });

  describe('error message quality', () => {
    it('should include schedule trigger name in the message', () => {
      const workflowJson = JSON.stringify({
        name: 'Test',
        nodes: [
          {
            id: '1',
            name: 'Daily Report Schedule',
            type: 'n8n-nodes-base.scheduleTrigger',
            position: [0, 0],
            parameters: {},
          },
          {
            id: '2',
            name: 'Process',
            type: 'n8n-nodes-base.code',
            position: [200, 0],
            parameters: {},
          },
        ],
        connections: {
          'Daily Report Schedule': { main: [[{ node: 'Process', type: 'main', index: 0 }]] },
        },
        settings: { executionOrder: 'v1' },
      });
      const graph = parseN8n(workflowJson);
      const findings = scheduleWebhookConvergence(graph, ctx);

      expect(findings[0].message).toContain('Daily Report Schedule');
    });

    it('should include documentation reference', () => {
      const workflowJson = JSON.stringify({
        name: 'Test',
        nodes: [
          {
            id: '1',
            name: 'Schedule',
            type: 'n8n-nodes-base.scheduleTrigger',
            position: [0, 0],
            parameters: {},
          },
          {
            id: '2',
            name: 'Process',
            type: 'n8n-nodes-base.code',
            position: [200, 0],
            parameters: {},
          },
        ],
        connections: {
          Schedule: { main: [[{ node: 'Process', type: 'main', index: 0 }]] },
        },
        settings: { executionOrder: 'v1' },
      });
      const graph = parseN8n(workflowJson);
      const findings = scheduleWebhookConvergence(graph, ctx);

      expect(findings[0].raw_details).toContain('.guides/specific/schedule-triggers.md');
    });
  });
});
