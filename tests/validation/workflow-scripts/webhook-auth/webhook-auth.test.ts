/**
 * Tests for WEBHOOK-AUTH validator
 *
 * Validates that every n8n-nodes-base.webhook node uses headerAuth
 * with Codika's ORGSECRET webhook auth credential placeholders.
 */

import { describe, it, expect } from 'vitest';
import { checkWebhookAuth, metadata } from '../../../../src/validation/workflow-scripts/webhook-auth.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES_PATH = join(__dirname, 'fixtures');

function loadFixture(filename: string): string {
  return readFileSync(join(FIXTURES_PATH, filename), 'utf-8');
}

const testPath = '/test/workflow.json';

describe('WEBHOOK-AUTH Script', () => {
  describe('metadata', () => {
    it('should have correct rule ID', () => {
      expect(metadata.id).toBe('WEBHOOK-AUTH');
    });

    it('should have "must" severity', () => {
      expect(metadata.severity).toBe('must');
    });

    it('should be marked as fixable', () => {
      expect(metadata.fixable).toBe(true);
    });

    it('should have "webhook" category', () => {
      expect(metadata.category).toBe('webhook');
    });
  });

  describe('valid workflows', () => {
    it('should PASS for webhook with correct headerAuth and credentials', () => {
      const content = loadFixture('valid-with-auth.json');
      const findings = checkWebhookAuth(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for sub-workflows (no webhook nodes to check)', () => {
      const content = loadFixture('valid-subworkflow.json');
      const findings = checkWebhookAuth(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for workflow with no webhook nodes', () => {
      const content = JSON.stringify({
        name: 'No Webhooks',
        nodes: [
          { name: 'Code', type: 'n8n-nodes-base.code', parameters: {} }
        ]
      });
      const findings = checkWebhookAuth(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for empty nodes array', () => {
      const content = JSON.stringify({ name: 'Empty', nodes: [] });
      const findings = checkWebhookAuth(content, testPath);
      expect(findings).toHaveLength(0);
    });
  });

  describe('invalid - missing auth', () => {
    it('should FAIL for webhook without authentication parameter', () => {
      const content = loadFixture('invalid-no-auth.json');
      const findings = checkWebhookAuth(content, testPath);

      expect(findings).toHaveLength(1);
      expect(findings[0].rule).toBe('WEBHOOK-AUTH');
      expect(findings[0].severity).toBe('must');
      expect(findings[0].message).toContain('Webhook Trigger');
      expect(findings[0].message).toContain('headerAuth');
    });

    it('should FAIL for webhook with headerAuth but wrong credential placeholders', () => {
      const content = loadFixture('invalid-wrong-cred.json');
      const findings = checkWebhookAuth(content, testPath);

      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain('credentials.httpHeaderAuth.id');
    });
  });

  describe('auto-fix', () => {
    it('should add headerAuth and correct credentials when missing', () => {
      const content = loadFixture('invalid-no-auth.json');
      const findings = checkWebhookAuth(content, testPath);

      expect(findings[0].fixable).toBe(true);
      const fixed = findings[0].fix!.apply(content);
      const parsed = JSON.parse(fixed);

      expect(parsed.nodes[0].parameters.authentication).toBe('headerAuth');
      expect(parsed.nodes[0].credentials.httpHeaderAuth.id).toBe('{{ORGSECRET_WEBHOOK_AUTH_CRED_ID_TERCESORG}}');
      expect(parsed.nodes[0].credentials.httpHeaderAuth.name).toBe('{{ORGSECRET_WEBHOOK_AUTH_CRED_NAME_TERCESORG}}');
    });

    it('should pass re-validation after fix', () => {
      const content = loadFixture('invalid-no-auth.json');
      const findings = checkWebhookAuth(content, testPath);
      const fixed = findings[0].fix!.apply(content);
      const recheck = checkWebhookAuth(fixed, testPath);
      expect(recheck).toHaveLength(0);
    });

    it('should fix wrong credentials', () => {
      const content = loadFixture('invalid-wrong-cred.json');
      const findings = checkWebhookAuth(content, testPath);
      const fixed = findings[0].fix!.apply(content);
      const parsed = JSON.parse(fixed);

      expect(parsed.nodes[0].credentials.httpHeaderAuth.id).toBe('{{ORGSECRET_WEBHOOK_AUTH_CRED_ID_TERCESORG}}');
      expect(parsed.nodes[0].credentials.httpHeaderAuth.name).toBe('{{ORGSECRET_WEBHOOK_AUTH_CRED_NAME_TERCESORG}}');
    });
  });

  describe('edge cases', () => {
    it('should handle invalid JSON gracefully', () => {
      const findings = checkWebhookAuth('not json {{{', testPath);
      expect(findings).toHaveLength(0);
    });

    it('should handle missing nodes array', () => {
      const content = JSON.stringify({ name: 'Test' });
      const findings = checkWebhookAuth(content, testPath);
      expect(findings).toHaveLength(0);
    });
  });
});
