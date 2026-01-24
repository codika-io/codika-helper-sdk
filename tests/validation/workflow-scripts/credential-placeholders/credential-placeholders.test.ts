/**
 * Tests for CRED-PLACEHOLDER Script
 *
 * Script: Validates that credential references use proper placeholders
 */

import { describe, it, expect } from 'vitest';
import { checkCredentialPlaceholders, metadata } from '../../../../src/validation/workflow-scripts/credential-placeholders.js';
import { expectFindingWithRule } from '../../../helpers/test-utils.js';
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

describe('CRED-PLACEHOLDER Script', () => {
  const testPath = 'test-workflow.json';

  describe('metadata', () => {
    it('should have correct rule ID', () => {
      expect(metadata.id).toBe('CRED-PLACEHOLDER');
    });

    it('should have "should" severity', () => {
      expect(metadata.severity).toBe('should');
    });
  });

  describe('valid workflows', () => {
    it('should PASS when credentials use FLEXCRED placeholder', () => {
      const content = JSON.stringify({
        nodes: [
          {
            id: '1',
            name: 'Anthropic',
            type: 'n8n-nodes-base.anthropic',
            credentials: {
              anthropicApi: {
                id: '{{FLEXCRED_ANTHROPIC_DERCXELF}}',
                name: 'Anthropic',
              },
            },
          },
        ],
      });
      const findings = checkCredentialPlaceholders(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS when credentials use USERCRED placeholder', () => {
      const content = JSON.stringify({
        nodes: [
          {
            id: '1',
            name: 'Gmail',
            type: 'n8n-nodes-base.gmail',
            credentials: {
              gmailOAuth2: {
                id: '{{USERCRED_GMAIL_DERCRESU}}',
                name: 'Gmail OAuth',
              },
            },
          },
        ],
      });
      const findings = checkCredentialPlaceholders(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS when credentials use ORGCRED placeholder', () => {
      const content = JSON.stringify({
        nodes: [
          {
            id: '1',
            name: 'Slack',
            type: 'n8n-nodes-base.slack',
            credentials: {
              slackApi: {
                id: '{{ORGCRED_SLACK_DERCGRO}}',
                name: 'Slack',
              },
            },
          },
        ],
      });
      const findings = checkCredentialPlaceholders(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS when node has no credentials', () => {
      const content = JSON.stringify({
        nodes: [
          {
            id: '1',
            name: 'Code',
            type: 'n8n-nodes-base.code',
            parameters: { jsCode: 'return items;' },
          },
        ],
      });
      const findings = checkCredentialPlaceholders(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for empty workflow', () => {
      const content = JSON.stringify({ nodes: [] });
      const findings = checkCredentialPlaceholders(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for valid-credential-placeholders.json fixture', () => {
      const content = loadFixture('valid-credential-placeholders.json');
      const findings = checkCredentialPlaceholders(content, 'valid-credential-placeholders.json');
      expect(findings).toHaveLength(0);
    });
  });

  describe('invalid workflows', () => {
    it('should FAIL when credential has hardcoded UUID', () => {
      const content = JSON.stringify({
        nodes: [
          {
            id: '1',
            name: 'Anthropic',
            type: 'n8n-nodes-base.anthropic',
            credentials: {
              anthropicApi: {
                id: '12345678-1234-1234-1234-123456789abc',
                name: 'Anthropic',
              },
            },
          },
        ],
      });
      const findings = checkCredentialPlaceholders(content, testPath);

      expect(findings).toHaveLength(1);
      const finding = expectFindingWithRule(findings, 'CRED-PLACEHOLDER');
      expect(finding.severity).toBe('should');
      expect(finding.message).toContain('hardcoded credential ID');
    });

    it('should FAIL when credential has hardcoded numeric ID', () => {
      const content = JSON.stringify({
        nodes: [
          {
            id: '1',
            name: 'Gmail',
            type: 'n8n-nodes-base.gmail',
            credentials: {
              gmailOAuth2: {
                id: '12345',
                name: 'Gmail',
              },
            },
          },
        ],
      });
      const findings = checkCredentialPlaceholders(content, testPath);

      expect(findings).toHaveLength(1);
      expectFindingWithRule(findings, 'CRED-PLACEHOLDER');
    });

    it('should FAIL when credential has Firebase-style ID', () => {
      const content = JSON.stringify({
        nodes: [
          {
            id: '1',
            name: 'API',
            type: 'n8n-nodes-base.httpRequest',
            credentials: {
              httpBasicAuth: {
                id: 'abc123def456ghi789jkl012mno',
                name: 'API Auth',
              },
            },
          },
        ],
      });
      const findings = checkCredentialPlaceholders(content, testPath);

      expect(findings).toHaveLength(1);
    });

    it('should detect multiple hardcoded credentials', () => {
      const content = JSON.stringify({
        nodes: [
          {
            id: '1',
            name: 'Node1',
            type: 'n8n-nodes-base.anthropic',
            credentials: {
              anthropicApi: { id: '11111111-1111-1111-1111-111111111111', name: 'Cred1' },
            },
          },
          {
            id: '2',
            name: 'Node2',
            type: 'n8n-nodes-base.openai',
            credentials: {
              openAiApi: { id: '22222222-2222-2222-2222-222222222222', name: 'Cred2' },
            },
          },
        ],
      });
      const findings = checkCredentialPlaceholders(content, testPath);

      expect(findings).toHaveLength(2);
    });

    it('should include node name in finding message', () => {
      const content = JSON.stringify({
        nodes: [
          {
            id: '1',
            name: 'My Anthropic Node',
            type: 'n8n-nodes-base.anthropic',
            credentials: {
              anthropicApi: { id: '12345678-1234-1234-1234-123456789abc', name: 'Cred' },
            },
          },
        ],
      });
      const findings = checkCredentialPlaceholders(content, testPath);

      expect(findings[0].message).toContain('My Anthropic Node');
    });

    it('should include credential type in finding message', () => {
      const content = JSON.stringify({
        nodes: [
          {
            id: '1',
            name: 'Node',
            type: 'n8n-nodes-base.anthropic',
            credentials: {
              anthropicApi: { id: '12345678-1234-1234-1234-123456789abc', name: 'Cred' },
            },
          },
        ],
      });
      const findings = checkCredentialPlaceholders(content, testPath);

      expect(findings[0].message).toContain('anthropicApi');
    });

    it('should provide helpful fix instructions', () => {
      const content = JSON.stringify({
        nodes: [
          {
            id: '1',
            name: 'Node',
            type: 'n8n-nodes-base.anthropic',
            credentials: {
              anthropicApi: { id: '12345', name: 'Cred' },
            },
          },
        ],
      });
      const findings = checkCredentialPlaceholders(content, testPath);

      expect(findings[0].raw_details).toContain('FLEXCRED');
      expect(findings[0].raw_details).toContain('placeholder');
    });

    it('should FAIL for hardcoded-credentials.json fixture', () => {
      const content = loadFixture('hardcoded-credentials.json');
      const findings = checkCredentialPlaceholders(content, 'hardcoded-credentials.json');

      // The fixture has hardcoded credential IDs
      expect(findings.length).toBeGreaterThan(0);
      expectFindingWithRule(findings, 'CRED-PLACEHOLDER');
    });
  });

  describe('edge cases', () => {
    it('should handle invalid JSON gracefully', () => {
      const content = 'not valid json {{{';
      const findings = checkCredentialPlaceholders(content, testPath);

      // Should not crash, just return empty
      expect(findings).toHaveLength(0);
    });

    it('should handle credentials without id field', () => {
      const content = JSON.stringify({
        nodes: [
          {
            id: '1',
            name: 'Node',
            type: 'n8n-nodes-base.anthropic',
            credentials: {
              anthropicApi: { name: 'Cred' }, // No id field
            },
          },
        ],
      });
      const findings = checkCredentialPlaceholders(content, testPath);

      expect(findings).toHaveLength(0);
    });

    it('should handle null credentials', () => {
      const content = JSON.stringify({
        nodes: [
          {
            id: '1',
            name: 'Node',
            type: 'n8n-nodes-base.code',
            credentials: null,
          },
        ],
      });
      const findings = checkCredentialPlaceholders(content, testPath);

      expect(findings).toHaveLength(0);
    });
  });
});
