/**
 * Tests for CONFIG-WORKFLOWS Script
 *
 * Script: Validates workflow file consistency
 */

import { describe, it, expect } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { checkWorkflowImports, metadata } from '../../../../src/validation/use-case-scripts/workflow-imports.js';
import { expectFindingWithRule } from '../../../helpers/test-utils.js';

// Get the directory of this file for relative fixture paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES_PATH = join(__dirname, 'fixtures');

describe('CONFIG-WORKFLOWS Script', () => {
  describe('metadata', () => {
    it('should have correct rule ID', () => {
      expect(metadata.id).toBe('CONFIG-WORKFLOWS');
    });

    it('should have "must" severity', () => {
      expect(metadata.severity).toBe('must');
    });
  });

  describe('valid use-cases', () => {
    it('should PASS when workflows folder exists with valid JSON', async () => {
      const useCasePath = join(FIXTURES_PATH, 'valid-use-case');
      const findings = await checkWorkflowImports(useCasePath);

      // Filter out "should" severity findings (unlisted files)
      const mustFindings = findings.filter(f => f.severity === 'must');
      expect(mustFindings).toHaveLength(0);
    });
  });

  describe('invalid use-cases', () => {
    it('should FAIL when workflows folder is missing', async () => {
      const useCasePath = join(FIXTURES_PATH, 'missing-workflows');
      const findings = await checkWorkflowImports(useCasePath);

      expect(findings).toHaveLength(1);
      const finding = expectFindingWithRule(findings, 'CONFIG-WORKFLOWS');
      expect(finding.message).toContain('Missing workflows/ folder');
    });
  });

  describe('JSON validation', () => {
    it('should validate that workflow files are valid JSON', async () => {
      const useCasePath = join(FIXTURES_PATH, 'valid-use-case');
      const findings = await checkWorkflowImports(useCasePath);

      // Should not have any JSON-VALID errors for valid workflows
      const jsonErrors = findings.filter(f => f.rule === 'JSON-VALID');
      expect(jsonErrors).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle non-existent use-case path', async () => {
      const useCasePath = '/non/existent/path';
      const findings = await checkWorkflowImports(useCasePath);

      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain('Missing workflows/ folder');
    });

    it('should provide helpful fix instructions', async () => {
      const useCasePath = join(FIXTURES_PATH, 'missing-workflows');
      const findings = await checkWorkflowImports(useCasePath);

      expect(findings[0].raw_details).toContain('Create a workflows/ folder');
    });
  });
});
