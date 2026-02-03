/**
 * Tests for TRIGGER-TYPE-CONSISTENCY validation script
 *
 * This script validates that the trigger type in config.ts matches
 * the actual trigger node type in the corresponding workflow JSON.
 */

import { describe, it, expect } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  checkTriggerTypeConsistency,
  RULE_ID,
  metadata,
} from '../../../../src/validation/use-case-scripts/trigger-type-consistency.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES_PATH = join(__dirname, 'fixtures');

describe('TRIGGER-TYPE-CONSISTENCY Script', () => {
  describe('metadata', () => {
    it('should have correct rule ID', () => {
      expect(RULE_ID).toBe('TRIGGER-TYPE-CONSISTENCY');
    });

    it('should have "must" severity', () => {
      expect(metadata.severity).toBe('must');
    });

    it('should have guideRef', () => {
      expect(metadata.guideRef).toBeDefined();
      expect(metadata.guideRef?.path).toBe('specific/third-party-triggers.md');
    });

    it('should not be fixable', () => {
      expect(metadata.fixable).toBe(false);
    });
  });

  describe('valid use cases', () => {
    it('should PASS when config type http matches webhook node', async () => {
      const useCasePath = join(FIXTURES_PATH, 'valid-http-with-webhook');
      const findings = await checkTriggerTypeConsistency(useCasePath);

      expect(findings).toHaveLength(0);
    });

    it('should PASS when config type schedule matches scheduleTrigger node', async () => {
      const useCasePath = join(FIXTURES_PATH, 'valid-schedule-with-schedule-trigger');
      const findings = await checkTriggerTypeConsistency(useCasePath);

      expect(findings).toHaveLength(0);
    });

    it('should PASS when config type service_event matches a third-party trigger node', async () => {
      const useCasePath = join(FIXTURES_PATH, 'valid-service-event-with-gmail');
      const findings = await checkTriggerTypeConsistency(useCasePath);

      expect(findings).toHaveLength(0);
    });

    it('should PASS when config type subworkflow matches executeWorkflowTrigger node', async () => {
      const useCasePath = join(FIXTURES_PATH, 'valid-subworkflow');
      const findings = await checkTriggerTypeConsistency(useCasePath);

      expect(findings).toHaveLength(0);
    });
  });

  describe('invalid use cases', () => {
    it('should FAIL when config type is http but workflow has scheduleTrigger', async () => {
      const useCasePath = join(FIXTURES_PATH, 'mismatch-http-but-schedule-node');
      const findings = await checkTriggerTypeConsistency(useCasePath);

      expect(findings).toHaveLength(1);
      expect(findings[0].rule).toBe(RULE_ID);
      expect(findings[0].severity).toBe('must');
      expect(findings[0].message).toContain('main');
      expect(findings[0].message).toContain('http');
      expect(findings[0].message).toContain('schedule');
    });

    it('should FAIL when config type is schedule but workflow has Google Drive trigger', async () => {
      const useCasePath = join(FIXTURES_PATH, 'mismatch-schedule-but-service-node');
      const findings = await checkTriggerTypeConsistency(useCasePath);

      expect(findings).toHaveLength(1);
      expect(findings[0].rule).toBe(RULE_ID);
      expect(findings[0].severity).toBe('must');
      expect(findings[0].message).toContain('watcher');
      expect(findings[0].message).toContain('schedule');
    });

    it('should FAIL when config type is http but workflow has Gmail trigger', async () => {
      const useCasePath = join(FIXTURES_PATH, 'mismatch-http-but-service-node');
      const findings = await checkTriggerTypeConsistency(useCasePath);

      expect(findings).toHaveLength(1);
      expect(findings[0].rule).toBe(RULE_ID);
      expect(findings[0].severity).toBe('must');
      expect(findings[0].message).toContain('email-handler');
      expect(findings[0].message).toContain('http');
    });

    it('should include guideRef in findings', async () => {
      const useCasePath = join(FIXTURES_PATH, 'mismatch-http-but-schedule-node');
      const findings = await checkTriggerTypeConsistency(useCasePath);

      expect(findings[0].guideRef).toBeDefined();
      expect(findings[0].guideRef?.path).toBe('specific/third-party-triggers.md');
    });

    it('should include actionable raw_details with the actual trigger node type', async () => {
      const useCasePath = join(FIXTURES_PATH, 'mismatch-http-but-schedule-node');
      const findings = await checkTriggerTypeConsistency(useCasePath);

      expect(findings[0].raw_details).toBeDefined();
      expect(findings[0].raw_details).toContain('scheduleTrigger');
    });
  });

  describe('edge cases', () => {
    it('should handle non-existent use-case path gracefully', async () => {
      const useCasePath = join(FIXTURES_PATH, 'does-not-exist');
      const findings = await checkTriggerTypeConsistency(useCasePath);

      expect(findings).toHaveLength(0);
    });
  });
});
