/**
 * Tests for SCHEDULE-TRIGGER-FIELDS validation script
 *
 * This script validates that schedule triggers in config.ts include all
 * required fields: cronExpression, timezone, humanReadable, manualTriggerUrl.
 * Missing fields cause deployment failures (INVALID_CONFIGURATION) that
 * should be caught during verification.
 */

import { describe, it, expect } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  checkScheduleTriggerFields,
  RULE_ID,
  metadata,
} from '../../../../src/validation/use-case-scripts/schedule-trigger-fields.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES_PATH = join(__dirname, 'fixtures');

describe('SCHEDULE-TRIGGER-FIELDS Script', () => {
  describe('metadata', () => {
    it('should have correct rule ID', () => {
      expect(RULE_ID).toBe('SCHEDULE-TRIGGER-FIELDS');
    });

    it('should have "must" severity', () => {
      expect(metadata.severity).toBe('must');
    });

    it('should not be fixable', () => {
      expect(metadata.fixable).toBe(false);
    });
  });

  describe('valid use cases', () => {
    it('should PASS when schedule trigger has all required fields', async () => {
      const findings = await checkScheduleTriggerFields(join(FIXTURES_PATH, 'valid-complete'));
      expect(findings).toHaveLength(0);
    });

    it('should PASS when there are no schedule triggers', async () => {
      const findings = await checkScheduleTriggerFields(join(FIXTURES_PATH, 'no-schedule-triggers'));
      expect(findings).toHaveLength(0);
    });
  });

  describe('invalid use cases', () => {
    it('should FAIL when schedule trigger is missing timezone, humanReadable, and manualTriggerUrl', async () => {
      const findings = await checkScheduleTriggerFields(join(FIXTURES_PATH, 'missing-timezone'));

      expect(findings).toHaveLength(1);
      expect(findings[0].rule).toBe(RULE_ID);
      expect(findings[0].severity).toBe('must');
      expect(findings[0].message).toContain('my-scheduler');
      expect(findings[0].message).toContain('timezone');
      expect(findings[0].message).toContain('humanReadable');
      expect(findings[0].message).toContain('manualTriggerUrl');
      expect(findings[0].message).toContain('deployment API will reject');
    });

    it('should list all missing fields in raw_details with examples', async () => {
      const findings = await checkScheduleTriggerFields(join(FIXTURES_PATH, 'missing-all-three'));

      expect(findings).toHaveLength(1);
      expect(findings[0].raw_details).toContain('timezone');
      expect(findings[0].raw_details).toContain('humanReadable');
      expect(findings[0].raw_details).toContain('manualTriggerUrl');
      expect(findings[0].raw_details).toContain('Europe/Brussels');
      expect(findings[0].raw_details).toContain('satisfies ScheduleTrigger');
    });

    it('should include a line number', async () => {
      const findings = await checkScheduleTriggerFields(join(FIXTURES_PATH, 'missing-all-three'));

      expect(findings).toHaveLength(1);
      expect(findings[0].line).toBeDefined();
      expect(findings[0].line).toBeGreaterThan(0);
    });
  });

  describe('multiple workflow scenarios', () => {
    it('should report only the invalid schedule trigger, not the valid one', async () => {
      const findings = await checkScheduleTriggerFields(join(FIXTURES_PATH, 'multiple-schedules-one-invalid'));

      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain('bad-scheduler');
      expect(findings[0].message).not.toContain('good-scheduler');
    });
  });

  describe('edge cases', () => {
    it('should handle non-existent use-case path gracefully', async () => {
      const findings = await checkScheduleTriggerFields(join(FIXTURES_PATH, 'does-not-exist'));
      expect(findings).toHaveLength(0);
    });
  });
});
