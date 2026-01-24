/**
 * Tests for CRED-PLACEHOLDER Script
 *
 * This validator checks that credential references use proper placeholders.
 *
 * FOUR credential types are supported:
 * - FLEXCRED (flexible - tries org first, falls back to user) - suffix: DERCXELF
 * - USERCRED (user credentials) - suffix: DERCRESU
 * - ORGCRED (organization credentials) - suffix: DERCGRO
 * - INSTCRED (instance credentials) - suffix: DERCTSNI
 *
 * BOTH `id` and `name` fields must use placeholders:
 * - id field: {{TYPE_CREDNAME_ID_SUFFIX}}
 * - name field: {{TYPE_CREDNAME_NAME_SUFFIX}}
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

/**
 * Helper to create a workflow JSON with credentials
 */
function createWorkflowWithCredentials(credentials: {
  id: string;
  name: string;
}, nodeName = 'Test Node', credType = 'testApi'): string {
  return JSON.stringify({
    nodes: [
      {
        id: '1',
        name: nodeName,
        type: 'n8n-nodes-base.test',
        credentials: {
          [credType]: credentials,
        },
      },
    ],
  });
}

describe('CRED-PLACEHOLDER Script', () => {
  const testPath = 'test-workflow.json';

  // ============================================================================
  // METADATA TESTS
  // ============================================================================
  describe('metadata', () => {
    it('should have correct rule ID', () => {
      expect(metadata.id).toBe('CRED-PLACEHOLDER');
    });

    it('should have "should" severity', () => {
      expect(metadata.severity).toBe('should');
    });

    it('should have a description', () => {
      expect(metadata.description).toBeDefined();
      expect(metadata.description.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // VALID CREDENTIALS - All 4 types with correct _ID_ and _NAME_ patterns
  // ============================================================================
  describe('valid credentials - FLEXCRED type', () => {
    it('should PASS when both id and name use correct FLEXCRED placeholders', () => {
      const content = createWorkflowWithCredentials({
        id: '{{FLEXCRED_ANTHROPIC_ID_DERCXELF}}',
        name: '{{FLEXCRED_ANTHROPIC_NAME_DERCXELF}}',
      });
      const findings = checkCredentialPlaceholders(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for FLEXCRED with complex credential name', () => {
      const content = createWorkflowWithCredentials({
        id: '{{FLEXCRED_GOOGLE_DRIVE_OAUTH_ID_DERCXELF}}',
        name: '{{FLEXCRED_GOOGLE_DRIVE_OAUTH_NAME_DERCXELF}}',
      });
      const findings = checkCredentialPlaceholders(content, testPath);
      expect(findings).toHaveLength(0);
    });
  });

  describe('valid credentials - USERCRED type', () => {
    it('should PASS when both id and name use correct USERCRED placeholders', () => {
      const content = createWorkflowWithCredentials({
        id: '{{USERCRED_GMAIL_ID_DERCRESU}}',
        name: '{{USERCRED_GMAIL_NAME_DERCRESU}}',
      });
      const findings = checkCredentialPlaceholders(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for USERCRED with complex credential name', () => {
      const content = createWorkflowWithCredentials({
        id: '{{USERCRED_GOOGLE_CALENDAR_OAUTH_ID_DERCRESU}}',
        name: '{{USERCRED_GOOGLE_CALENDAR_OAUTH_NAME_DERCRESU}}',
      });
      const findings = checkCredentialPlaceholders(content, testPath);
      expect(findings).toHaveLength(0);
    });
  });

  describe('valid credentials - ORGCRED type', () => {
    it('should PASS when both id and name use correct ORGCRED placeholders', () => {
      const content = createWorkflowWithCredentials({
        id: '{{ORGCRED_SLACK_ID_DERCGRO}}',
        name: '{{ORGCRED_SLACK_NAME_DERCGRO}}',
      });
      const findings = checkCredentialPlaceholders(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for ORGCRED with complex credential name', () => {
      const content = createWorkflowWithCredentials({
        id: '{{ORGCRED_HUBSPOT_API_ID_DERCGRO}}',
        name: '{{ORGCRED_HUBSPOT_API_NAME_DERCGRO}}',
      });
      const findings = checkCredentialPlaceholders(content, testPath);
      expect(findings).toHaveLength(0);
    });
  });

  describe('valid credentials - INSTCRED type', () => {
    it('should PASS when both id and name use correct INSTCRED placeholders', () => {
      const content = createWorkflowWithCredentials({
        id: '{{INSTCRED_DATABASE_ID_DERCTSNI}}',
        name: '{{INSTCRED_DATABASE_NAME_DERCTSNI}}',
      });
      const findings = checkCredentialPlaceholders(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for INSTCRED with complex credential name', () => {
      const content = createWorkflowWithCredentials({
        id: '{{INSTCRED_POSTGRES_MAIN_ID_DERCTSNI}}',
        name: '{{INSTCRED_POSTGRES_MAIN_NAME_DERCTSNI}}',
      });
      const findings = checkCredentialPlaceholders(content, testPath);
      expect(findings).toHaveLength(0);
    });
  });

  describe('valid credentials - multiple nodes', () => {
    it('should PASS when multiple nodes have correct credentials', () => {
      const content = JSON.stringify({
        nodes: [
          {
            id: '1',
            name: 'Anthropic',
            type: 'n8n-nodes-base.anthropic',
            credentials: {
              anthropicApi: {
                id: '{{FLEXCRED_ANTHROPIC_ID_DERCXELF}}',
                name: '{{FLEXCRED_ANTHROPIC_NAME_DERCXELF}}',
              },
            },
          },
          {
            id: '2',
            name: 'Gmail',
            type: 'n8n-nodes-base.gmail',
            credentials: {
              gmailOAuth2: {
                id: '{{USERCRED_GMAIL_ID_DERCRESU}}',
                name: '{{USERCRED_GMAIL_NAME_DERCRESU}}',
              },
            },
          },
          {
            id: '3',
            name: 'Slack',
            type: 'n8n-nodes-base.slack',
            credentials: {
              slackApi: {
                id: '{{ORGCRED_SLACK_ID_DERCGRO}}',
                name: '{{ORGCRED_SLACK_NAME_DERCGRO}}',
              },
            },
          },
          {
            id: '4',
            name: 'Database',
            type: 'n8n-nodes-base.postgres',
            credentials: {
              postgres: {
                id: '{{INSTCRED_POSTGRES_ID_DERCTSNI}}',
                name: '{{INSTCRED_POSTGRES_NAME_DERCTSNI}}',
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
  });

  // ============================================================================
  // INVALID: Hardcoded IDs (no placeholder at all)
  // ============================================================================
  describe('invalid credentials - hardcoded IDs', () => {
    it('should FAIL when credential id has hardcoded UUID', () => {
      const content = createWorkflowWithCredentials({
        id: '12345678-1234-1234-1234-123456789abc',
        name: '{{FLEXCRED_ANTHROPIC_NAME_DERCXELF}}', // Valid name, invalid id
      });
      const findings = checkCredentialPlaceholders(content, testPath);

      expect(findings).toHaveLength(1);
      const finding = expectFindingWithRule(findings, 'CRED-PLACEHOLDER');
      expect(finding.severity).toBe('should');
      expect(finding.message).toContain('id');
    });

    it('should FAIL when credential id has hardcoded numeric ID', () => {
      const content = createWorkflowWithCredentials({
        id: '12345',
        name: '{{FLEXCRED_GMAIL_NAME_DERCXELF}}', // Valid name, invalid id
      });
      const findings = checkCredentialPlaceholders(content, testPath);

      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain('id');
    });

    it('should FAIL when credential id has Firebase-style ID', () => {
      const content = createWorkflowWithCredentials({
        id: 'abc123def456ghi789jkl012mno',
        name: '{{FLEXCRED_APIAUTH_NAME_DERCXELF}}', // Valid name, invalid id
      });
      const findings = checkCredentialPlaceholders(content, testPath);

      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain('id');
    });

    it('should FAIL when credential name has hardcoded value (not placeholder)', () => {
      const content = createWorkflowWithCredentials({
        id: '{{FLEXCRED_ANTHROPIC_ID_DERCXELF}}',
        name: 'My Anthropic Key',  // Hardcoded name!
      });
      const findings = checkCredentialPlaceholders(content, testPath);

      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain('name');
    });

    it('should FAIL for both id and name when both are hardcoded', () => {
      const content = createWorkflowWithCredentials({
        id: '12345678-1234-1234-1234-123456789abc',
        name: 'My Credential',
      });
      const findings = checkCredentialPlaceholders(content, testPath);

      // Should report both issues
      expect(findings.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ============================================================================
  // INVALID: Missing _ID_ or _NAME_ in pattern
  // ============================================================================
  describe('invalid credentials - missing _ID_ or _NAME_ marker', () => {
    it('should FAIL when id placeholder is missing _ID_', () => {
      const content = createWorkflowWithCredentials({
        id: '{{FLEXCRED_ANTHROPIC_DERCXELF}}',  // Missing _ID_
        name: '{{FLEXCRED_ANTHROPIC_NAME_DERCXELF}}',
      });
      const findings = checkCredentialPlaceholders(content, testPath);

      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain('_ID_');
    });

    it('should FAIL when name placeholder is missing _NAME_', () => {
      const content = createWorkflowWithCredentials({
        id: '{{FLEXCRED_ANTHROPIC_ID_DERCXELF}}',
        name: '{{FLEXCRED_ANTHROPIC_DERCXELF}}',  // Missing _NAME_
      });
      const findings = checkCredentialPlaceholders(content, testPath);

      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain('_NAME_');
    });

    it('should FAIL when both are missing markers', () => {
      const content = createWorkflowWithCredentials({
        id: '{{FLEXCRED_ANTHROPIC_DERCXELF}}',   // Missing _ID_
        name: '{{FLEXCRED_ANTHROPIC_DERCXELF}}', // Missing _NAME_
      });
      const findings = checkCredentialPlaceholders(content, testPath);

      expect(findings).toHaveLength(2);
    });
  });

  // ============================================================================
  // INVALID: Wrong suffix for credential type
  // ============================================================================
  describe('invalid credentials - wrong suffix', () => {
    it('should FAIL when FLEXCRED has wrong suffix', () => {
      const content = createWorkflowWithCredentials({
        id: '{{FLEXCRED_ANTHROPIC_ID_WRONG}}',
        name: '{{FLEXCRED_ANTHROPIC_NAME_WRONG}}',
      });
      const findings = checkCredentialPlaceholders(content, testPath);

      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].message).toContain('DERCXELF');
    });

    it('should FAIL when USERCRED has wrong suffix', () => {
      const content = createWorkflowWithCredentials({
        id: '{{USERCRED_GMAIL_ID_DERCXELF}}',  // Wrong! Should be DERCRESU
        name: '{{USERCRED_GMAIL_NAME_DERCXELF}}',
      });
      const findings = checkCredentialPlaceholders(content, testPath);

      expect(findings.length).toBeGreaterThan(0);
    });

    it('should FAIL when ORGCRED has wrong suffix', () => {
      const content = createWorkflowWithCredentials({
        id: '{{ORGCRED_SLACK_ID_DERCRESU}}',  // Wrong! Should be DERCGRO
        name: '{{ORGCRED_SLACK_NAME_DERCRESU}}',
      });
      const findings = checkCredentialPlaceholders(content, testPath);

      expect(findings.length).toBeGreaterThan(0);
    });

    it('should FAIL when INSTCRED has wrong suffix', () => {
      const content = createWorkflowWithCredentials({
        id: '{{INSTCRED_DATABASE_ID_DERCGRO}}',  // Wrong! Should be DERCTSNI
        name: '{{INSTCRED_DATABASE_NAME_DERCGRO}}',
      });
      const findings = checkCredentialPlaceholders(content, testPath);

      expect(findings.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // INVALID: Mismatched types between id and name
  // ============================================================================
  describe('invalid credentials - mismatched credential types', () => {
    it('should FAIL when id uses FLEXCRED but name uses USERCRED', () => {
      const content = createWorkflowWithCredentials({
        id: '{{FLEXCRED_ANTHROPIC_ID_DERCXELF}}',
        name: '{{USERCRED_ANTHROPIC_NAME_DERCRESU}}',  // Mismatched type!
      });
      const findings = checkCredentialPlaceholders(content, testPath);

      expect(findings).toHaveLength(1);
      expect(findings[0].message.toLowerCase()).toContain('mismatch');
    });

    it('should FAIL when id uses ORGCRED but name uses INSTCRED', () => {
      const content = createWorkflowWithCredentials({
        id: '{{ORGCRED_SLACK_ID_DERCGRO}}',
        name: '{{INSTCRED_SLACK_NAME_DERCTSNI}}',  // Mismatched type!
      });
      const findings = checkCredentialPlaceholders(content, testPath);

      expect(findings).toHaveLength(1);
    });
  });

  // ============================================================================
  // INVALID: Unknown credential type prefix
  // ============================================================================
  describe('invalid credentials - unknown credential type', () => {
    it('should FAIL when using unknown credential type: MYCRED', () => {
      const content = createWorkflowWithCredentials({
        id: '{{MYCRED_SOMETHING_ID_WHATEVER}}',
        name: '{{MYCRED_SOMETHING_NAME_WHATEVER}}',
      });
      const findings = checkCredentialPlaceholders(content, testPath);

      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].message.toLowerCase()).toContain('unknown');
    });

    it('should FAIL when using old pattern without type prefix', () => {
      const content = createWorkflowWithCredentials({
        id: '{{ANTHROPIC_ID}}',
        name: '{{ANTHROPIC_NAME}}',
      });
      const findings = checkCredentialPlaceholders(content, testPath);

      expect(findings.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // ERROR MESSAGE QUALITY
  // ============================================================================
  describe('error message quality', () => {
    it('should include node name in finding message', () => {
      const content = createWorkflowWithCredentials(
        { id: '12345', name: 'Cred' },
        'My Special Node'
      );
      const findings = checkCredentialPlaceholders(content, testPath);

      expect(findings[0].message).toContain('My Special Node');
    });

    it('should include credential type in finding message', () => {
      const content = createWorkflowWithCredentials(
        { id: '12345', name: 'Cred' },
        'Node',
        'anthropicApi'
      );
      const findings = checkCredentialPlaceholders(content, testPath);

      expect(findings[0].message).toContain('anthropicApi');
    });

    it('should provide helpful fix instructions mentioning all 4 types', () => {
      const content = createWorkflowWithCredentials({
        id: '12345',
        name: 'Cred',
      });
      const findings = checkCredentialPlaceholders(content, testPath);

      expect(findings[0].raw_details).toContain('FLEXCRED');
      expect(findings[0].raw_details).toContain('USERCRED');
      expect(findings[0].raw_details).toContain('ORGCRED');
      expect(findings[0].raw_details).toContain('INSTCRED');
    });

    it('should mention _ID_ and _NAME_ in fix instructions', () => {
      const content = createWorkflowWithCredentials({
        id: '12345',
        name: 'Cred',
      });
      const findings = checkCredentialPlaceholders(content, testPath);

      // We get separate findings for id and name, each with appropriate marker
      expect(findings.length).toBe(2);
      const idFinding = findings.find(f => f.message.includes('id'));
      const nameFinding = findings.find(f => f.message.includes('name'));
      expect(idFinding?.raw_details).toContain('_ID_');
      expect(nameFinding?.raw_details).toContain('_NAME_');
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================
  describe('edge cases', () => {
    it('should handle invalid JSON gracefully', () => {
      const content = 'not valid json {{{';
      const findings = checkCredentialPlaceholders(content, testPath);

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
              anthropicApi: { name: '{{FLEXCRED_ANTHROPIC_NAME_DERCXELF}}' },
            },
          },
        ],
      });
      const findings = checkCredentialPlaceholders(content, testPath);

      // Missing id should be flagged
      expect(findings.length).toBeGreaterThan(0);
    });

    it('should handle credentials without name field', () => {
      const content = JSON.stringify({
        nodes: [
          {
            id: '1',
            name: 'Node',
            type: 'n8n-nodes-base.anthropic',
            credentials: {
              anthropicApi: { id: '{{FLEXCRED_ANTHROPIC_ID_DERCXELF}}' },
            },
          },
        ],
      });
      const findings = checkCredentialPlaceholders(content, testPath);

      // Missing name should be flagged
      expect(findings.length).toBeGreaterThan(0);
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

    it('should handle empty credentials object', () => {
      const content = JSON.stringify({
        nodes: [
          {
            id: '1',
            name: 'Node',
            type: 'n8n-nodes-base.code',
            credentials: {},
          },
        ],
      });
      const findings = checkCredentialPlaceholders(content, testPath);

      expect(findings).toHaveLength(0);
    });

    it('should handle multiple credential types on same node', () => {
      const content = JSON.stringify({
        nodes: [
          {
            id: '1',
            name: 'Multi-Auth Node',
            type: 'n8n-nodes-base.httpRequest',
            credentials: {
              httpBasicAuth: {
                id: '{{FLEXCRED_BASIC_ID_DERCXELF}}',
                name: '{{FLEXCRED_BASIC_NAME_DERCXELF}}',
              },
              httpHeaderAuth: {
                id: '{{ORGCRED_HEADER_ID_DERCGRO}}',
                name: '{{ORGCRED_HEADER_NAME_DERCGRO}}',
              },
            },
          },
        ],
      });
      const findings = checkCredentialPlaceholders(content, testPath);

      expect(findings).toHaveLength(0);
    });

    it('should detect issues in multiple credential types on same node', () => {
      const content = JSON.stringify({
        nodes: [
          {
            id: '1',
            name: 'Multi-Auth Node',
            type: 'n8n-nodes-base.httpRequest',
            credentials: {
              httpBasicAuth: {
                id: '12345',  // Hardcoded!
                name: 'Basic Auth',
              },
              httpHeaderAuth: {
                id: '67890',  // Hardcoded!
                name: 'Header Auth',
              },
            },
          },
        ],
      });
      const findings = checkCredentialPlaceholders(content, testPath);

      expect(findings.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ============================================================================
  // REAL-WORLD SCENARIOS
  // ============================================================================
  describe('real-world workflow scenarios', () => {
    it('should validate typical Anthropic credential', () => {
      const content = JSON.stringify({
        nodes: [
          {
            id: '1',
            name: 'AI Agent',
            type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
            credentials: {
              anthropicApi: {
                id: '{{FLEXCRED_ANTHROPIC_ID_DERCXELF}}',
                name: '{{FLEXCRED_ANTHROPIC_NAME_DERCXELF}}',
              },
            },
          },
        ],
      });
      const findings = checkCredentialPlaceholders(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should validate typical Gmail OAuth credential', () => {
      const content = JSON.stringify({
        nodes: [
          {
            id: '1',
            name: 'Send Email',
            type: 'n8n-nodes-base.gmail',
            credentials: {
              gmailOAuth2: {
                id: '{{USERCRED_GMAIL_OAUTH_ID_DERCRESU}}',
                name: '{{USERCRED_GMAIL_OAUTH_NAME_DERCRESU}}',
              },
            },
          },
        ],
      });
      const findings = checkCredentialPlaceholders(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should validate typical Slack org credential', () => {
      const content = JSON.stringify({
        nodes: [
          {
            id: '1',
            name: 'Post Message',
            type: 'n8n-nodes-base.slack',
            credentials: {
              slackApi: {
                id: '{{ORGCRED_SLACK_BOT_ID_DERCGRO}}',
                name: '{{ORGCRED_SLACK_BOT_NAME_DERCGRO}}',
              },
            },
          },
        ],
      });
      const findings = checkCredentialPlaceholders(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should validate typical database instance credential', () => {
      const content = JSON.stringify({
        nodes: [
          {
            id: '1',
            name: 'Query Database',
            type: 'n8n-nodes-base.postgres',
            credentials: {
              postgres: {
                id: '{{INSTCRED_POSTGRES_MAIN_ID_DERCTSNI}}',
                name: '{{INSTCRED_POSTGRES_MAIN_NAME_DERCTSNI}}',
              },
            },
          },
        ],
      });
      const findings = checkCredentialPlaceholders(content, testPath);
      expect(findings).toHaveLength(0);
    });
  });

  // ============================================================================
  // FIXTURES
  // ============================================================================
  describe('fixture files', () => {
    it('should PASS for valid-credential-placeholders.json fixture', () => {
      const content = loadFixture('valid-credential-placeholders.json');
      const findings = checkCredentialPlaceholders(content, 'valid-credential-placeholders.json');
      expect(findings).toHaveLength(0);
    });

    it('should FAIL for hardcoded-credentials.json fixture', () => {
      const content = loadFixture('hardcoded-credentials.json');
      const findings = checkCredentialPlaceholders(content, 'hardcoded-credentials.json');

      expect(findings.length).toBeGreaterThan(0);
      expectFindingWithRule(findings, 'CRED-PLACEHOLDER');
    });
  });
});
