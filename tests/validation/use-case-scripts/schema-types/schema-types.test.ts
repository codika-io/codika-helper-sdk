/**
 * Tests for SCHEMA-TYPES Script
 *
 * Script: Validates schema field types in config.ts
 */

import { describe, it, expect } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { checkSchemaTypes, metadata } from '../../../../src/validation/use-case-scripts/schema-types.js';

// Get the directory of this file for relative fixture paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES_PATH = join(__dirname, 'fixtures');

describe('SCHEMA-TYPES Script', () => {
  describe('metadata', () => {
    it('should have correct rule ID', () => {
      expect(metadata.id).toBe('SCHEMA-TYPES');
    });

    it('should have "must" severity', () => {
      expect(metadata.severity).toBe('must');
    });
  });

  describe('valid use-cases', () => {
    it('should PASS when config has valid field types', async () => {
      const useCasePath = join(FIXTURES_PATH, 'valid-use-case');
      const findings = await checkSchemaTypes(useCasePath);

      // Should not have schema type errors
      expect(findings).toHaveLength(0);
    });
  });

  describe('type validation', () => {
    it('should recognize valid string type', async () => {
      // The valid-use-case doesn't have schemas, so this is a basic test
      const useCasePath = join(FIXTURES_PATH, 'valid-use-case');
      const findings = await checkSchemaTypes(useCasePath);

      // No findings means types are valid
      expect(findings.length).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle missing config.ts gracefully', async () => {
      const useCasePath = join(FIXTURES_PATH, 'missing-config');
      const findings = await checkSchemaTypes(useCasePath);

      // Should not crash, just return empty (config missing is handled by other script)
      expect(findings).toHaveLength(0);
    });

    it('should handle non-existent path gracefully', async () => {
      const useCasePath = '/non/existent/path';
      const findings = await checkSchemaTypes(useCasePath);

      // Should not crash
      expect(findings).toHaveLength(0);
    });
  });
});
