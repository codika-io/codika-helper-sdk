/**
 * Tests for INTEGRATION-INHERITANCE validation script
 *
 * This script validates that workflows declare all integration IDs they use:
 * 1. Direct integrations (from credential placeholders in the workflow JSON)
 * 2. Inherited integrations (from called subworkflows)
 */

import { describe, it, expect } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import {
  checkIntegrationInheritance,
  RULE_ID,
  metadata,
} from '../../../../src/validation/use-case-scripts/integration-inheritance.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES_PATH = join(__dirname, 'fixtures');

describe('INTEGRATION-INHERITANCE Script', () => {
  describe('metadata', () => {
    it('should have correct rule ID', () => {
      expect(RULE_ID).toBe('INTEGRATION-INHERITANCE');
    });

    it('should have "should" severity', () => {
      expect(metadata.severity).toBe('should');
    });

    it('should be fixable', () => {
      expect(metadata.fixable).toBe(true);
    });

    it('should have guideRef', () => {
      expect(metadata.guideRef).toBeDefined();
      expect(metadata.guideRef?.path).toBe('specific/integrations.md');
      expect(metadata.guideRef?.section).toBe('Integration Declaration');
    });
  });

  describe('valid use cases', () => {
    it('should PASS when parent declares all subworkflow integrations', async () => {
      const useCasePath = join(FIXTURES_PATH, 'valid-integrations');
      const findings = await checkIntegrationInheritance(useCasePath);

      expect(findings).toHaveLength(0);
    });

    it('should PASS when subworkflows have no integrations', async () => {
      const useCasePath = join(FIXTURES_PATH, 'no-subworkflow-integrations');
      const findings = await checkIntegrationInheritance(useCasePath);

      expect(findings).toHaveLength(0);
    });
  });

  describe('standalone workflows (no subworkflows)', () => {
    it('should FAIL when standalone workflow is missing its own integrations', async () => {
      const useCasePath = join(FIXTURES_PATH, 'missing-own-integrations');
      const findings = await checkIntegrationInheritance(useCasePath);

      expect(findings.length).toBeGreaterThanOrEqual(1);
      const finding = findings[0];
      expect(finding).toBeDefined();
      expect(finding?.message).toContain('standalone');
      expect(finding?.message).toContain('uses integrations not declared');
      expect(finding?.severity).toBe('should');
    });

    it('should report both anthropic and gmail_oauth as missing for standalone workflow', async () => {
      const useCasePath = join(FIXTURES_PATH, 'missing-own-integrations');
      const findings = await checkIntegrationInheritance(useCasePath);

      const finding = findings[0];
      expect(finding?.message).toContain('anthropic');
      expect(finding?.message).toContain('gmail_oauth');
    });

    it('should mention credential placeholders in raw_details for direct usage', async () => {
      const useCasePath = join(FIXTURES_PATH, 'missing-own-integrations');
      const findings = await checkIntegrationInheritance(useCasePath);

      const finding = findings[0];
      expect(finding?.raw_details).toContain('credential placeholders');
    });
  });

  describe('subworkflow inheritance', () => {
    it('should FAIL when parent is missing integrations from subworkflows', async () => {
      const useCasePath = join(FIXTURES_PATH, 'missing-integrations');
      const findings = await checkIntegrationInheritance(useCasePath);

      expect(findings.length).toBeGreaterThanOrEqual(1);
      // Find the finding about subworkflows (not direct usage)
      const inheritanceFinding = findings.find(f => f.message.includes('subworkflows'));
      expect(inheritanceFinding).toBeDefined();
      expect(inheritanceFinding?.severity).toBe('should');
    });

    it('should report missing integration IDs (openai, supabase) from subworkflows', async () => {
      const useCasePath = join(FIXTURES_PATH, 'missing-integrations');
      const findings = await checkIntegrationInheritance(useCasePath);

      // Should report openai and supabase as missing (from subworkflow)
      const allMessages = findings.map(f => f.message).join(' ');
      expect(allMessages).toMatch(/openai|supabase/);
    });

    it('should report multiple missing integrations from multiple subworkflows', async () => {
      const useCasePath = join(FIXTURES_PATH, 'multiple-subworkflows');
      const findings = await checkIntegrationInheritance(useCasePath);

      expect(findings.length).toBeGreaterThanOrEqual(1);
      const finding = findings[0];
      // Should report both openai and google_calendar_oauth as missing
      expect(finding?.message).toMatch(/openai|google_calendar_oauth/);
    });

    it('should report correct path (config.ts) in the finding', async () => {
      const useCasePath = join(FIXTURES_PATH, 'missing-integrations');
      const findings = await checkIntegrationInheritance(useCasePath);

      const finding = findings[0];
      expect(finding?.path).toContain('config.ts');
    });

    it('should include guideRef in findings', async () => {
      const useCasePath = join(FIXTURES_PATH, 'missing-integrations');
      const findings = await checkIntegrationInheritance(useCasePath);

      const finding = findings[0];
      expect(finding?.guideRef).toBeDefined();
      expect(finding?.guideRef?.path).toBe('specific/integrations.md');
    });

    it('should mention called subworkflows in raw_details', async () => {
      const useCasePath = join(FIXTURES_PATH, 'missing-integrations');
      const findings = await checkIntegrationInheritance(useCasePath);

      const finding = findings[0];
      expect(finding?.raw_details).toContain('sub-helper');
    });
  });

  describe('fix function', () => {
    it('should include a fix function for missing integrations', async () => {
      const useCasePath = join(FIXTURES_PATH, 'missing-integrations');
      const findings = await checkIntegrationInheritance(useCasePath);

      const finding = findings[0];
      expect(finding).toBeDefined();
      expect(finding?.fixable).toBe(true);
      expect(finding?.fix).toBeDefined();
    });

    it('should fix standalone workflow by adding missing integrations to empty array', async () => {
      const useCasePath = join(FIXTURES_PATH, 'missing-own-integrations');
      const findings = await checkIntegrationInheritance(useCasePath);

      const finding = findings.find(f => f.message.includes('standalone'));
      expect(finding?.fix).toBeDefined();

      // Read the original config content
      const configPath = join(useCasePath, 'config.ts');
      const originalContent = readFileSync(configPath, 'utf-8');

      // Apply the fix
      const fixedContent = finding!.fix!.apply(originalContent);

      // Verify the fix added integrations
      expect(fixedContent).toContain('anthropic');
      expect(fixedContent).toContain('gmail_oauth');
    });

    it('should fix inherited integrations from subworkflows', async () => {
      const useCasePath = join(FIXTURES_PATH, 'missing-integrations');
      const findings = await checkIntegrationInheritance(useCasePath);

      // Find the subworkflow inheritance finding
      const inheritanceFinding = findings.find(f => f.message.includes('subworkflows'));
      expect(inheritanceFinding?.fix).toBeDefined();

      // Read the original config content
      const configPath = join(useCasePath, 'config.ts');
      const originalContent = readFileSync(configPath, 'utf-8');

      // Apply the fix
      const fixedContent = inheritanceFinding!.fix!.apply(originalContent);

      // Verify the fix added the missing inherited integrations
      expect(fixedContent).toMatch(/openai|supabase/);
    });
  });

  describe('integration ID extraction', () => {
    it('should correctly extract FLEXCRED integration IDs', async () => {
      const useCasePath = join(FIXTURES_PATH, 'missing-integrations');
      const findings = await checkIntegrationInheritance(useCasePath);

      // The sub-helper uses FLEXCRED_OPENAI and USERCRED_SUPABASE
      const finding = findings[0];
      expect(finding?.message).toContain('openai');
      expect(finding?.message).toContain('supabase');
    });

    it('should correctly handle multi-word integration names (GOOGLE_CALENDAR_OAUTH)', async () => {
      const useCasePath = join(FIXTURES_PATH, 'multiple-subworkflows');
      const findings = await checkIntegrationInheritance(useCasePath);

      const finding = findings[0];
      // google_calendar_oauth should be extracted from USERCRED_GOOGLE_CALENDAR_OAUTH_ID_DERCRESU
      expect(finding?.message).toContain('google_calendar_oauth');
    });
  });

  describe('edge cases', () => {
    it('should handle non-existent use-case path gracefully', async () => {
      const useCasePath = join(FIXTURES_PATH, 'does-not-exist');
      const findings = await checkIntegrationInheritance(useCasePath);

      // Should return empty findings (other rules handle missing config.ts)
      expect(findings).toHaveLength(0);
    });
  });
});
