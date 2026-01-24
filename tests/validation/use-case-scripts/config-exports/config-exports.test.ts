/**
 * Tests for CONFIG-EXPORTS Script
 *
 * Script: Validates that config.ts exports required members
 */

import { describe, it, expect } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { checkConfigExports, metadata } from '../../../../src/validation/use-case-scripts/config-exports.js';
import { expectFindingWithRule } from '../../../helpers/test-utils.js';

// Get the directory of this file for relative fixture paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES_PATH = join(__dirname, 'fixtures');

describe('CONFIG-EXPORTS Script', () => {
  describe('metadata', () => {
    it('should have correct rule ID', () => {
      expect(metadata.id).toBe('CONFIG-EXPORTS');
    });

    it('should have "must" severity', () => {
      expect(metadata.severity).toBe('must');
    });
  });

  describe('valid use-cases', () => {
    it('should PASS when config.ts has all required exports', async () => {
      const useCasePath = join(FIXTURES_PATH, 'valid-use-case');
      const findings = await checkConfigExports(useCasePath);

      expect(findings).toHaveLength(0);
    });
  });

  describe('invalid use-cases', () => {
    it('should FAIL when config.ts is missing', async () => {
      const useCasePath = join(FIXTURES_PATH, 'missing-config');
      const findings = await checkConfigExports(useCasePath);

      expect(findings).toHaveLength(1);
      const finding = expectFindingWithRule(findings, 'CONFIG-EXPORTS');
      expect(finding.message).toContain('Missing config.ts');
    });

    it('should FAIL when PROJECT_ID is missing', async () => {
      const useCasePath = join(FIXTURES_PATH, 'invalid-config');
      const findings = await checkConfigExports(useCasePath);

      const projectIdFinding = findings.find(f => f.message.includes('PROJECT_ID'));
      expect(projectIdFinding).toBeDefined();
    });

    it('should FAIL when WORKFLOW_FILES is missing', async () => {
      const useCasePath = join(FIXTURES_PATH, 'invalid-config');
      const findings = await checkConfigExports(useCasePath);

      const workflowFilesFinding = findings.find(f => f.message.includes('WORKFLOW_FILES'));
      expect(workflowFilesFinding).toBeDefined();
    });

    it('should FAIL when getConfiguration is missing', async () => {
      const useCasePath = join(FIXTURES_PATH, 'invalid-config');
      const findings = await checkConfigExports(useCasePath);

      const getConfigFinding = findings.find(f => f.message.includes('getConfiguration'));
      expect(getConfigFinding).toBeDefined();
    });

    it('should report all missing exports', async () => {
      const useCasePath = join(FIXTURES_PATH, 'invalid-config');
      const findings = await checkConfigExports(useCasePath);

      // Should have 3 findings: PROJECT_ID, WORKFLOW_FILES, getConfiguration
      expect(findings.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('edge cases', () => {
    it('should handle non-existent path', async () => {
      const useCasePath = '/non/existent/path';
      const findings = await checkConfigExports(useCasePath);

      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain('Missing config.ts');
    });

    it('should provide helpful fix instructions', async () => {
      const useCasePath = join(FIXTURES_PATH, 'invalid-config');
      const findings = await checkConfigExports(useCasePath);

      const projectIdFinding = findings.find(f => f.message.includes('PROJECT_ID'));
      expect(projectIdFinding?.raw_details).toContain('export const PROJECT_ID');
    });
  });
});
