/**
 * Tests for WEBHOOK-ID validator
 *
 * Validates that every n8n-nodes-base.webhook node has a webhookId property
 * at the node level for production webhook registration.
 */

import { describe, it, expect } from 'vitest';
import { checkWebhookId, metadata } from '../../../../src/validation/workflow-scripts/webhook-id.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the directory of this file for fixtures path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES_PATH = join(__dirname, 'fixtures');

/**
 * Load a fixture file from the local fixtures folder
 */
function loadFixture(filename: string): string {
  return readFileSync(join(FIXTURES_PATH, filename), 'utf-8');
}

const testPath = '/test/workflow.json';

describe('WEBHOOK-ID Script', () => {
  // ============================================================================
  // METADATA
  // ============================================================================
  describe('metadata', () => {
    it('should have correct rule ID', () => {
      expect(metadata.id).toBe('WEBHOOK-ID');
    });

    it('should have "must" severity', () => {
      expect(metadata.severity).toBe('must');
    });

    it('should be marked as fixable', () => {
      expect(metadata.fixable).toBe(true);
    });

    it('should have a description', () => {
      expect(metadata.description).toBeTruthy();
    });

    it('should have "webhook" category', () => {
      expect(metadata.category).toBe('webhook');
    });
  });

  // ============================================================================
  // VALID WORKFLOWS
  // ============================================================================
  describe('valid workflows', () => {
    it('should PASS for valid-webhook-with-id.json fixture', () => {
      const content = loadFixture('valid-webhook-with-id.json');
      const findings = checkWebhookId(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for valid-multiple-webhooks.json fixture', () => {
      const content = loadFixture('valid-multiple-webhooks.json');
      const findings = checkWebhookId(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for valid-no-webhook-nodes.json fixture', () => {
      const content = loadFixture('valid-no-webhook-nodes.json');
      const findings = checkWebhookId(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for valid-subworkflow.json fixture', () => {
      const content = loadFixture('valid-subworkflow.json');
      const findings = checkWebhookId(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS when workflow has empty nodes array', () => {
      const content = JSON.stringify({
        name: 'Test Workflow',
        nodes: [],
      });
      const findings = checkWebhookId(content, testPath);
      expect(findings).toHaveLength(0);
    });
  });

  // ============================================================================
  // INVALID: Missing webhookId
  // ============================================================================
  describe('invalid - missing webhookId', () => {
    it('should FAIL for invalid-missing-webhook-id.json fixture', () => {
      const content = loadFixture('invalid-missing-webhook-id.json');
      const findings = checkWebhookId(content, testPath);

      expect(findings).toHaveLength(1);
      expect(findings[0].rule).toBe('WEBHOOK-ID');
      expect(findings[0].severity).toBe('must');
      expect(findings[0].message).toContain('HTTP Trigger');
      expect(findings[0].message).toContain('webhookId');
    });

    it('should FAIL for each webhook node in invalid-multiple-missing.json fixture', () => {
      const content = loadFixture('invalid-multiple-missing.json');
      const findings = checkWebhookId(content, testPath);

      expect(findings).toHaveLength(2);
      expect(findings[0].message).toContain('Webhook A');
      expect(findings[1].message).toContain('Webhook B');
    });

    it('should FAIL only for the missing one in invalid-partial-missing.json fixture', () => {
      const content = loadFixture('invalid-partial-missing.json');
      const findings = checkWebhookId(content, testPath);

      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain('Webhook Without ID');
    });

    it('should FAIL when webhookId is not a string', () => {
      const content = JSON.stringify({
        name: 'Test Workflow',
        nodes: [
          {
            name: 'HTTP Trigger',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 2,
            position: [250, 300],
            parameters: {},
            webhookId: 123, // not a string
          },
        ],
      });
      const findings = checkWebhookId(content, testPath);

      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain('HTTP Trigger');
    });

    it('should FAIL when webhookId is empty string', () => {
      const content = JSON.stringify({
        name: 'Test Workflow',
        nodes: [
          {
            name: 'HTTP Trigger',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 2,
            position: [250, 300],
            parameters: {},
            webhookId: '',
          },
        ],
      });
      const findings = checkWebhookId(content, testPath);

      expect(findings).toHaveLength(1);
    });

    it('should report finding with correct path', () => {
      const content = loadFixture('invalid-missing-webhook-id.json');
      const customPath = '/my-project/workflows/main.json';
      const findings = checkWebhookId(content, customPath);

      expect(findings[0].path).toBe(customPath);
    });
  });

  // ============================================================================
  // AUTO-FIX FUNCTIONALITY
  // ============================================================================
  describe('auto-fix functionality', () => {
    it('should provide fixable finding with fix function', () => {
      const content = loadFixture('invalid-missing-webhook-id.json');
      const findings = checkWebhookId(content, testPath);

      expect(findings[0].fixable).toBe(true);
      expect(findings[0].fix).toBeDefined();
      expect(findings[0].fix!.description).toBeTruthy();
    });

    it('should fix by adding webhookId derived from node name', () => {
      const content = loadFixture('invalid-missing-webhook-id.json');
      const findings = checkWebhookId(content, testPath);
      const fixed = findings[0].fix!.apply(content);
      const parsed = JSON.parse(fixed);

      expect(parsed.nodes[0].webhookId).toBe('http-trigger');
    });

    it('should preserve existing node properties after fix', () => {
      const content = loadFixture('invalid-missing-webhook-id.json');
      const findings = checkWebhookId(content, testPath);
      const fixed = findings[0].fix!.apply(content);
      const parsed = JSON.parse(fixed);

      expect(parsed.nodes[0].name).toBe('HTTP Trigger');
      expect(parsed.nodes[0].type).toBe('n8n-nodes-base.webhook');
      expect(parsed.nodes[0].typeVersion).toBe(2);
      expect(parsed.nodes[0].parameters.path).toBe('my-webhook');
      expect(parsed.nodes[0].parameters.httpMethod).toBe('POST');
      expect(parsed.connections).toBeDefined();
      expect(parsed.settings.executionOrder).toBe('v1');
    });

    it('should fix multiple webhook nodes from fixture', () => {
      const content = loadFixture('invalid-multiple-missing.json');
      const findings = checkWebhookId(content, testPath);
      expect(findings).toHaveLength(2);

      // Apply both fixes sequentially
      let fixed = content;
      for (const finding of findings) {
        fixed = finding.fix!.apply(fixed);
      }
      const parsed = JSON.parse(fixed);

      expect(parsed.nodes[0].webhookId).toBe('webhook-a');
      expect(parsed.nodes[2].webhookId).toBe('webhook-b');
    });

    it('should pass re-validation after fix', () => {
      const content = loadFixture('invalid-missing-webhook-id.json');

      // First pass: should find issues
      const findings = checkWebhookId(content, testPath);
      expect(findings).toHaveLength(1);

      // Apply fix
      const fixed = findings[0].fix!.apply(content);

      // Second pass: should pass
      const recheck = checkWebhookId(fixed, testPath);
      expect(recheck).toHaveLength(0);
    });

    it('should pass re-validation after fixing multiple nodes', () => {
      const content = loadFixture('invalid-multiple-missing.json');

      const findings = checkWebhookId(content, testPath);
      expect(findings).toHaveLength(2);

      let fixed = content;
      for (const finding of findings) {
        fixed = finding.fix!.apply(fixed);
      }

      const recheck = checkWebhookId(fixed, testPath);
      expect(recheck).toHaveLength(0);
    });

    it('should slugify node name with special characters', () => {
      const content = JSON.stringify({
        name: 'Test Workflow',
        nodes: [
          {
            name: 'My Webhook (v2)',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 2,
            position: [250, 300],
            parameters: {},
          },
        ],
      }, null, 2);

      const findings = checkWebhookId(content, testPath);
      const fixed = findings[0].fix!.apply(content);
      const parsed = JSON.parse(fixed);

      expect(parsed.nodes[0].webhookId).toBe('my-webhook-v2');
    });

    it('should not add extra leading/trailing hyphens', () => {
      const content = JSON.stringify({
        name: 'Test Workflow',
        nodes: [
          {
            name: '  Webhook  ',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 2,
            position: [250, 300],
            parameters: {},
          },
        ],
      }, null, 2);

      const findings = checkWebhookId(content, testPath);
      const fixed = findings[0].fix!.apply(content);
      const parsed = JSON.parse(fixed);

      expect(parsed.nodes[0].webhookId).toBe('webhook');
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================
  describe('edge cases', () => {
    it('should handle invalid JSON gracefully', () => {
      const content = 'not valid json {{{';
      const findings = checkWebhookId(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should handle empty content', () => {
      const findings = checkWebhookId('', testPath);
      expect(findings).toHaveLength(0);
    });

    it('should handle missing nodes array', () => {
      const content = JSON.stringify({
        name: 'Test Workflow',
        settings: {},
      });
      const findings = checkWebhookId(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should handle nodes that are not an array', () => {
      const content = JSON.stringify({
        name: 'Test Workflow',
        nodes: 'not an array',
      });
      const findings = checkWebhookId(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should ignore non-webhook nodes (from fixture)', () => {
      const content = loadFixture('valid-no-webhook-nodes.json');
      const findings = checkWebhookId(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should handle null nodes array', () => {
      const content = JSON.stringify({
        name: 'Test Workflow',
        nodes: null,
      });
      const findings = checkWebhookId(content, testPath);
      expect(findings).toHaveLength(0);
    });
  });

  // ============================================================================
  // ERROR MESSAGE QUALITY
  // ============================================================================
  describe('error message quality', () => {
    it('should include node name in error message', () => {
      const content = loadFixture('invalid-missing-webhook-id.json');
      const findings = checkWebhookId(content, testPath);

      expect(findings[0].message).toContain('HTTP Trigger');
    });

    it('should include generated webhookId in raw_details', () => {
      const content = loadFixture('invalid-missing-webhook-id.json');
      const findings = checkWebhookId(content, testPath);

      expect(findings[0].raw_details).toContain('http-trigger');
    });
  });
});
