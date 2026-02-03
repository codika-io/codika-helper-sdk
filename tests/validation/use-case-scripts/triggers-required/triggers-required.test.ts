/**
 * Tests for TRIGGERS-REQUIRED validation script
 *
 * This script validates that every workflow in config.ts has a non-empty
 * triggers array. An empty or missing triggers array means the workflow
 * cannot be triggered at runtime.
 */

import { describe, it, expect } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  checkTriggersRequired,
  RULE_ID,
  metadata,
} from '../../../../src/validation/use-case-scripts/triggers-required.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES_PATH = join(__dirname, 'fixtures');

describe('TRIGGERS-REQUIRED Script', () => {
  describe('metadata', () => {
    it('should have correct rule ID', () => {
      expect(RULE_ID).toBe('TRIGGERS-REQUIRED');
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
    it('should PASS when workflow has an HTTP trigger', async () => {
      const useCasePath = join(FIXTURES_PATH, 'valid-http-trigger');
      const findings = await checkTriggersRequired(useCasePath);

      expect(findings).toHaveLength(0);
    });

    it('should PASS when workflow has a schedule trigger', async () => {
      const useCasePath = join(FIXTURES_PATH, 'valid-schedule-trigger');
      const findings = await checkTriggersRequired(useCasePath);

      expect(findings).toHaveLength(0);
    });

    it('should PASS when workflow has a service_event trigger', async () => {
      const useCasePath = join(FIXTURES_PATH, 'valid-service-event-trigger');
      const findings = await checkTriggersRequired(useCasePath);

      expect(findings).toHaveLength(0);
    });

    it('should PASS when workflow has a subworkflow trigger', async () => {
      const useCasePath = join(FIXTURES_PATH, 'valid-subworkflow-trigger');
      const findings = await checkTriggersRequired(useCasePath);

      expect(findings).toHaveLength(0);
    });
  });

  describe('invalid use cases', () => {
    it('should FAIL when triggers array is empty', async () => {
      const useCasePath = join(FIXTURES_PATH, 'empty-triggers');
      const findings = await checkTriggersRequired(useCasePath);

      expect(findings).toHaveLength(1);
      expect(findings[0].rule).toBe(RULE_ID);
      expect(findings[0].severity).toBe('must');
      expect(findings[0].message).toContain('gdrive-watcher');
      expect(findings[0].message).toContain('no triggers defined');
    });

    it('should FAIL when triggers field is missing entirely', async () => {
      const useCasePath = join(FIXTURES_PATH, 'missing-triggers');
      const findings = await checkTriggersRequired(useCasePath);

      expect(findings).toHaveLength(1);
      expect(findings[0].rule).toBe(RULE_ID);
      expect(findings[0].severity).toBe('must');
      expect(findings[0].message).toContain('main');
      expect(findings[0].message).toContain('no triggers defined');
    });

    it('should include guideRef in findings', async () => {
      const useCasePath = join(FIXTURES_PATH, 'empty-triggers');
      const findings = await checkTriggersRequired(useCasePath);

      expect(findings[0].guideRef).toBeDefined();
      expect(findings[0].guideRef?.path).toBe('specific/third-party-triggers.md');
    });

    it('should include actionable raw_details', async () => {
      const useCasePath = join(FIXTURES_PATH, 'empty-triggers');
      const findings = await checkTriggersRequired(useCasePath);

      expect(findings[0].raw_details).toBeDefined();
      expect(findings[0].raw_details).toContain('service_event');
    });
  });

  describe('multiple workflow scenarios', () => {
    it('should report only the workflow with empty triggers, not the valid one', async () => {
      const useCasePath = join(FIXTURES_PATH, 'multiple-workflows-one-empty');
      const findings = await checkTriggersRequired(useCasePath);

      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain('bad-workflow');
      expect(findings[0].message).not.toContain('good-workflow');
    });
  });

  describe('edge cases', () => {
    it('should handle non-existent use-case path gracefully', async () => {
      const useCasePath = join(FIXTURES_PATH, 'does-not-exist');
      const findings = await checkTriggersRequired(useCasePath);

      expect(findings).toHaveLength(0);
    });
  });
});
