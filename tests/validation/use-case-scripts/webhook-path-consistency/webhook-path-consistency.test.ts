/**
 * Tests for WEBHOOK-PATH-CONSISTENCY validation script
 *
 * This script validates that HTTP trigger URLs in config.ts match
 * the webhook node paths in the corresponding workflow JSON files.
 * Also validates manualTriggerUrl for schedule triggers.
 */

import { describe, it, expect } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  checkWebhookPathConsistency,
  RULE_ID,
  metadata,
} from '../../../../src/validation/use-case-scripts/webhook-path-consistency.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES_PATH = join(__dirname, 'fixtures');

describe('WEBHOOK-PATH-CONSISTENCY Script', () => {
  describe('metadata', () => {
    it('should have correct rule ID', () => {
      expect(RULE_ID).toBe('WEBHOOK-PATH-CONSISTENCY');
    });

    it('should have "must" severity', () => {
      expect(metadata.severity).toBe('must');
    });

    it('should have guideRef', () => {
      expect(metadata.guideRef).toBeDefined();
      expect(metadata.guideRef?.path).toBe('specific/http-triggers.md');
      expect(metadata.guideRef?.section).toBe('URL Path Pattern');
    });

    it('should not be fixable', () => {
      expect(metadata.fixable).toBe(false);
    });
  });

  describe('valid use cases', () => {
    it('should PASS when single HTTP trigger path matches workflow webhook', async () => {
      const useCasePath = join(FIXTURES_PATH, 'valid-single-http');
      const findings = await checkWebhookPathConsistency(useCasePath);

      expect(findings).toHaveLength(0);
    });

    it('should PASS when schedule trigger manualTriggerUrl matches workflow webhook', async () => {
      const useCasePath = join(FIXTURES_PATH, 'valid-schedule-with-manual');
      const findings = await checkWebhookPathConsistency(useCasePath);

      expect(findings).toHaveLength(0);
    });

    it('should PASS when multiple HTTP triggers all match their workflows', async () => {
      const useCasePath = join(FIXTURES_PATH, 'valid-multiple-http');
      const findings = await checkWebhookPathConsistency(useCasePath);

      expect(findings).toHaveLength(0);
    });

    it('should PASS when mixed HTTP and schedule triggers all match', async () => {
      const useCasePath = join(FIXTURES_PATH, 'valid-mixed-triggers');
      const findings = await checkWebhookPathConsistency(useCasePath);

      expect(findings).toHaveLength(0);
    });

    it('should PASS when schedule trigger has no manualTriggerUrl', async () => {
      const useCasePath = join(FIXTURES_PATH, 'schedule-without-manual');
      const findings = await checkWebhookPathConsistency(useCasePath);

      expect(findings).toHaveLength(0);
    });

    it('should PASS for subworkflow-only use case (no HTTP triggers)', async () => {
      const useCasePath = join(FIXTURES_PATH, 'no-http-triggers');
      const findings = await checkWebhookPathConsistency(useCasePath);

      expect(findings).toHaveLength(0);
    });
  });

  describe('URL structure errors', () => {
    it('should FAIL when URL is missing base URL pattern', async () => {
      const useCasePath = join(FIXTURES_PATH, 'invalid-missing-base-url');
      const findings = await checkWebhookPathConsistency(useCasePath);

      expect(findings.length).toBeGreaterThanOrEqual(1);
      const finding = findings.find(f => f.message.includes('Invalid url structure'));
      expect(finding).toBeDefined();
      expect(finding?.severity).toBe('must');
      expect(finding?.raw_details).toContain('{{ORGSECRET_N8N_BASE_URL_TERCESORG}}');
    });

    it('should FAIL when URL is missing /webhook/ prefix', async () => {
      const useCasePath = join(FIXTURES_PATH, 'invalid-missing-webhook-prefix');
      const findings = await checkWebhookPathConsistency(useCasePath);

      expect(findings.length).toBeGreaterThanOrEqual(1);
      const finding = findings.find(f => f.message.includes('/webhook/'));
      expect(finding).toBeDefined();
      expect(finding?.severity).toBe('must');
    });

    it('should include correct guide reference for URL structure issues', async () => {
      const useCasePath = join(FIXTURES_PATH, 'invalid-missing-base-url');
      const findings = await checkWebhookPathConsistency(useCasePath);

      const finding = findings[0];
      expect(finding?.guideRef).toBeDefined();
      expect(finding?.guideRef?.path).toBe('specific/http-triggers.md');
    });
  });

  describe('path mismatch errors', () => {
    it('should FAIL when HTTP trigger path does not match workflow webhook', async () => {
      const useCasePath = join(FIXTURES_PATH, 'invalid-path-mismatch-http');
      const findings = await checkWebhookPathConsistency(useCasePath);

      expect(findings.length).toBeGreaterThanOrEqual(1);
      const finding = findings.find(f => f.message.includes('path mismatch'));
      expect(finding).toBeDefined();
      expect(finding?.severity).toBe('must');
    });

    it('should FAIL when manualTriggerUrl path does not match workflow webhook', async () => {
      const useCasePath = join(FIXTURES_PATH, 'invalid-path-mismatch-manual');
      const findings = await checkWebhookPathConsistency(useCasePath);

      expect(findings.length).toBeGreaterThanOrEqual(1);
      const finding = findings.find(f => f.message.includes('path mismatch'));
      expect(finding).toBeDefined();
    });

    it('should include both expected and actual paths in the finding', async () => {
      const useCasePath = join(FIXTURES_PATH, 'invalid-path-mismatch-http');
      const findings = await checkWebhookPathConsistency(useCasePath);

      const finding = findings[0];
      expect(finding?.raw_details).toContain('Config url path:');
      expect(finding?.raw_details).toContain('Workflow webhook path');
    });

    it('should report correct guideRef for HTTP vs schedule trigger issues', async () => {
      const useCasePath = join(FIXTURES_PATH, 'invalid-path-mismatch-manual');
      const findings = await checkWebhookPathConsistency(useCasePath);

      const finding = findings[0];
      expect(finding?.guideRef?.path).toBe('specific/schedule-triggers.md');
    });
  });

  describe('multiple trigger scenarios', () => {
    it('should report only failing triggers when some match and some do not', async () => {
      const useCasePath = join(FIXTURES_PATH, 'invalid-partial-match-multiple');
      const findings = await checkWebhookPathConsistency(useCasePath);

      // Should have exactly 1 finding (the bad one), not 3
      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain('bad-workflow');
    });

    it('should handle multiple errors in the same use case', async () => {
      const useCasePath = join(FIXTURES_PATH, 'invalid-mixed-errors');
      const findings = await checkWebhookPathConsistency(useCasePath);

      // Should have 2 findings: one for path mismatch, one for missing base URL
      expect(findings).toHaveLength(2);
    });
  });

  describe('edge cases', () => {
    it('should FAIL when HTTP trigger exists but workflow has no webhook node', async () => {
      const useCasePath = join(FIXTURES_PATH, 'missing-webhook-node');
      const findings = await checkWebhookPathConsistency(useCasePath);

      expect(findings.length).toBeGreaterThanOrEqual(1);
      const finding = findings.find(f => f.message.includes('no webhook node'));
      expect(finding).toBeDefined();
      expect(finding?.severity).toBe('must');
    });

    it('should handle non-existent use-case path gracefully', async () => {
      const useCasePath = join(FIXTURES_PATH, 'does-not-exist');
      const findings = await checkWebhookPathConsistency(useCasePath);

      // Should return empty array (no config.ts means nothing to validate)
      expect(findings).toHaveLength(0);
    });

    it('should point to workflow file for path mismatch issues', async () => {
      const useCasePath = join(FIXTURES_PATH, 'invalid-path-mismatch-http');
      const findings = await checkWebhookPathConsistency(useCasePath);

      const finding = findings[0];
      expect(finding?.path).toContain('workflows/');
      expect(finding?.path).toContain('.json');
    });
  });
});
