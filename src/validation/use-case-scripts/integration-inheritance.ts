/**
 * INTEGRATION-INHERITANCE Validation Script
 *
 * Validates that workflows declare all integration IDs they use in their integrationUids config.
 *
 * Two checks are performed:
 * 1. Each workflow's integrationUids must include all integrations used directly in its JSON
 *    (detected via credential placeholders like FLEXCRED_ANTHROPIC_ID_DERCXELF)
 * 2. Parent workflows must also include all integrations used by their subworkflows
 *
 * Credential placeholder pattern: {{TYPE_INTEGRATION_NAME_(ID|NAME)_SUFFIX}}
 * - FLEXCRED_*_DERCXELF
 * - USERCRED_*_DERCRESU
 * - ORGCRED_*_DERCGRO
 * - INSTCRED_*_DERCTSNI
 *
 * The INTEGRATION_NAME in CONSTANT_CASE becomes the integrationUid in snake_case.
 * Example: FLEXCRED_GOOGLE_DRIVE_OAUTH_ID_DERCXELF -> google_drive_oauth
 *
 * @see .guides/specific/integrations.md - "Integration Declaration"
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, basename } from 'path';
import type { Finding, RuleMetadata } from '../types.js';

export const RULE_ID = 'INTEGRATION-INHERITANCE';

export const metadata: RuleMetadata & { guideRef: { path: string; section: string } } = {
  id: RULE_ID,
  name: 'integration_inheritance',
  severity: 'should',
  description: 'Workflows must declare all integrations they use (directly or via subworkflows)',
  details:
    "Each workflow's integrationUids must include all integration IDs from its credential placeholders, plus all integrations from called subworkflows",
  fixable: true,
  category: 'references',
  guideRef: {
    path: 'specific/integrations.md',
    section: 'Integration Declaration',
  },
};

// Regex to find SUBWKFL placeholders
const SUBWKFL_PATTERN = /\{\{SUBWKFL_([a-zA-Z0-9_-]+)_LFKWBUS\}\}/g;

// Regex to find credential placeholders and extract integration name
// Matches: {{FLEXCRED_INTEGRATION_NAME_ID_DERCXELF}}, {{USERCRED_INTEGRATION_NAME_NAME_DERCRESU}}, etc.
const CREDENTIAL_PATTERN =
  /\{\{(FLEXCRED|USERCRED|ORGCRED|INSTCRED)_([A-Z0-9_]+)_(ID|NAME)_(DERCXELF|DERCRESU|DERCGRO|DERCTSNI)\}\}/g;

/**
 * Converts CONSTANT_CASE to snake_case
 * Example: GOOGLE_DRIVE_OAUTH -> google_drive_oauth
 */
function toSnakeCase(constantCase: string): string {
  return constantCase.toLowerCase();
}

/**
 * Extracts all SUBWKFL_ references from workflow content
 */
function extractSubworkflowCalls(content: string): string[] {
  const references: string[] = [];
  let match;

  // Reset regex state
  SUBWKFL_PATTERN.lastIndex = 0;

  while ((match = SUBWKFL_PATTERN.exec(content)) !== null) {
    if (!references.includes(match[1])) {
      references.push(match[1]);
    }
  }

  return references;
}

/**
 * Extracts all integration IDs from credential placeholders in workflow content
 * Returns snake_case integration IDs
 */
function extractIntegrationIds(content: string): string[] {
  const integrations: string[] = [];
  let match;

  // Reset regex state
  CREDENTIAL_PATTERN.lastIndex = 0;

  while ((match = CREDENTIAL_PATTERN.exec(content)) !== null) {
    const integrationName = match[2]; // e.g., "ANTHROPIC" or "GOOGLE_DRIVE_OAUTH"
    const integrationId = toSnakeCase(integrationName);

    if (!integrations.includes(integrationId)) {
      integrations.push(integrationId);
    }
  }

  return integrations;
}

/**
 * Extracts integrationUids from config.ts for each workflow
 * Returns a map of templateId -> integrationUids[]
 */
function extractConfigIntegrations(configContent: string): Map<string, string[]> {
  const mappings = new Map<string, string[]>();

  // Find each workflowTemplateId
  const templateIdPattern = /workflowTemplateId:\s*['"]([^'"]+)['"]/g;
  let templateMatch;

  while ((templateMatch = templateIdPattern.exec(configContent)) !== null) {
    const templateId = templateMatch[1];
    const templateIdEndPos = templateMatch.index + templateMatch[0].length;

    // Look for the next workflow block or end of content
    const nextTemplateMatch = /workflowTemplateId:/g;
    nextTemplateMatch.lastIndex = templateIdEndPos;
    const nextMatch = nextTemplateMatch.exec(configContent);
    const blockEnd = nextMatch ? nextMatch.index : configContent.length;

    // Extract the block for this workflow
    const workflowBlock = configContent.slice(templateMatch.index, blockEnd);

    // Extract integrationUids array
    const integrationUidsMatch = workflowBlock.match(/integrationUids:\s*\[([^\]]*)\]/);

    if (integrationUidsMatch) {
      const integrationUidsContent = integrationUidsMatch[1];
      const integrations: string[] = [];

      // Match quoted strings in the array
      const idPattern = /['"]([^'"]+)['"]/g;
      let idMatch;
      while ((idMatch = idPattern.exec(integrationUidsContent)) !== null) {
        integrations.push(idMatch[1]);
      }

      mappings.set(templateId, integrations);
    } else {
      // No integrationUids field - empty array
      mappings.set(templateId, []);
    }
  }

  return mappings;
}

/**
 * Gets the workflow template ID from a workflow JSON filename
 */
function getTemplateIdFromFilename(workflowFile: string): string {
  return basename(workflowFile, '.json');
}

/**
 * Creates a fix function that adds missing integrations to a workflow's integrationUids array
 */
function createFixFunction(
  workflowId: string,
  missingIntegrations: string[],
  hasIntegrationUidsField: boolean,
): (content: string) => string {
  return (content: string): string => {
    // Find the workflow block for this workflow
    const templateIdPattern = new RegExp(
      `(workflowTemplateId:\\s*['"]${workflowId}['"])`,
      'g',
    );

    let match = templateIdPattern.exec(content);
    if (!match) {
      return content;
    }

    const templateIdEndPos = match.index + match[0].length;

    // Find the end of this workflow block (next workflowTemplateId or end)
    const nextTemplateMatch = /workflowTemplateId:/g;
    nextTemplateMatch.lastIndex = templateIdEndPos;
    const nextMatch = nextTemplateMatch.exec(content);
    const blockEnd = nextMatch ? nextMatch.index : content.length;

    const workflowBlock = content.slice(match.index, blockEnd);

    if (hasIntegrationUidsField) {
      // Add to existing integrationUids array
      const integrationUidsPattern = /(integrationUids:\s*\[)([^\]]*)\]/;
      const integrationUidsMatch = workflowBlock.match(integrationUidsPattern);

      if (integrationUidsMatch) {
        const existingContent = integrationUidsMatch[2].trim();
        const newIntegrations = missingIntegrations.map(i => `'${i}'`).join(', ');

        let newContent: string;
        if (existingContent === '') {
          newContent = newIntegrations;
        } else {
          newContent = `${existingContent}, ${newIntegrations}`;
        }

        const updatedBlock = workflowBlock.replace(
          integrationUidsPattern,
          `$1${newContent}]`,
        );

        return content.slice(0, match.index) + updatedBlock + content.slice(blockEnd);
      }
    } else {
      // Add integrationUids field after workflowName or triggers
      // Look for a good insertion point
      const insertionPatterns = [
        /(triggers:\s*\[[^\]]*\],?)/,
        /(workflowName:\s*['"][^'"]*['"],?)/,
      ];

      for (const pattern of insertionPatterns) {
        const insertMatch = workflowBlock.match(pattern);
        if (insertMatch) {
          const insertPos = insertMatch.index! + insertMatch[0].length;
          const newIntegrations = missingIntegrations.map(i => `'${i}'`).join(', ');
          const needsComma = !insertMatch[0].trim().endsWith(',');

          const updatedBlock =
            workflowBlock.slice(0, insertPos) +
            (needsComma ? ',' : '') +
            `\n        integrationUids: [${newIntegrations}],` +
            workflowBlock.slice(insertPos);

          return content.slice(0, match.index) + updatedBlock + content.slice(blockEnd);
        }
      }
    }

    return content;
  };
}

/**
 * Checks if a workflow has an integrationUids field in config.ts
 */
function hasIntegrationUidsInConfig(configContent: string, workflowId: string): boolean {
  const templateIdIndex = configContent.indexOf(`workflowTemplateId: '${workflowId}'`);
  if (templateIdIndex === -1) {
    // Try double quotes
    const templateIdIndexDQ = configContent.indexOf(`workflowTemplateId: "${workflowId}"`);
    if (templateIdIndexDQ === -1) {
      return false;
    }
    const nextTemplateIndex = configContent.indexOf('workflowTemplateId:', templateIdIndexDQ + 1);
    const blockEnd = nextTemplateIndex === -1 ? configContent.length : nextTemplateIndex;
    const block = configContent.slice(templateIdIndexDQ, blockEnd);
    return block.includes('integrationUids:');
  }
  const nextTemplateIndex = configContent.indexOf('workflowTemplateId:', templateIdIndex + 1);
  const blockEnd = nextTemplateIndex === -1 ? configContent.length : nextTemplateIndex;
  const block = configContent.slice(templateIdIndex, blockEnd);
  return block.includes('integrationUids:');
}

/**
 * Validates that workflows declare all integrations they use (directly or via subworkflows)
 */
export async function checkIntegrationInheritance(useCasePath: string): Promise<Finding[]> {
  const findings: Finding[] = [];

  // Check if config.ts exists
  const configPath = join(useCasePath, 'config.ts');
  if (!existsSync(configPath)) {
    // Cannot validate without config.ts - this is handled by other rules
    return findings;
  }

  // Read config.ts
  let configContent: string;
  try {
    configContent = readFileSync(configPath, 'utf-8');
  } catch {
    // Cannot read config.ts - this is handled by other rules
    return findings;
  }

  // Extract integrationUids from config for each workflow
  const configIntegrations = extractConfigIntegrations(configContent);

  // Check workflows folder
  const workflowsPath = join(useCasePath, 'workflows');
  if (!existsSync(workflowsPath)) {
    // No workflows folder - nothing to validate
    return findings;
  }

  // Get all workflow JSON files
  let workflowFiles: string[];
  try {
    workflowFiles = readdirSync(workflowsPath)
      .filter(f => f.endsWith('.json'))
      .map(f => join(workflowsPath, f));
  } catch {
    // Cannot read workflows folder - this is handled by other rules
    return findings;
  }

  // Build maps:
  // 1. workflowId -> integrations it uses directly (from credential placeholders)
  // 2. workflowId -> subworkflows it calls
  const workflowIntegrations = new Map<string, string[]>();
  const workflowSubworkflowCalls = new Map<string, string[]>();

  for (const workflowFile of workflowFiles) {
    let content: string;
    try {
      content = readFileSync(workflowFile, 'utf-8');
    } catch {
      continue; // Skip unreadable files
    }

    const templateId = getTemplateIdFromFilename(workflowFile);

    // Extract integrations from credential placeholders
    const integrations = extractIntegrationIds(content);
    workflowIntegrations.set(templateId, integrations);

    // Extract subworkflow calls
    const subworkflowCalls = extractSubworkflowCalls(content);
    workflowSubworkflowCalls.set(templateId, subworkflowCalls);
  }

  // CHECK 1: Verify each workflow declares its own direct integrations
  for (const [workflowId, directIntegrations] of workflowIntegrations) {
    if (directIntegrations.length === 0) {
      continue; // No integrations used directly
    }

    const declaredIntegrations = configIntegrations.get(workflowId) || [];
    const hasField = hasIntegrationUidsInConfig(configContent, workflowId);

    // Find missing direct integrations
    const missingDirect: string[] = [];
    for (const integration of directIntegrations) {
      if (!declaredIntegrations.includes(integration)) {
        missingDirect.push(integration);
      }
    }

    if (missingDirect.length > 0) {
      findings.push({
        rule: RULE_ID,
        severity: 'should',
        path: configPath,
        message: `Workflow "${workflowId}" uses integrations not declared in its integrationUids: ${missingDirect.join(', ')}`,
        raw_details:
          `Add the following integrations to the integrationUids array for workflow '${workflowId}' in config.ts: ${missingDirect.map(i => `'${i}'`).join(', ')}. ` +
          `These integrations are detected from credential placeholders in the workflow JSON.`,
        guideRef: metadata.guideRef,
        fixable: true,
        fix: {
          description: `Add missing integrations to '${workflowId}': ${missingDirect.join(', ')}`,
          apply: createFixFunction(workflowId, missingDirect, hasField),
        },
      });
    }
  }

  // CHECK 2: Verify parent workflows include all subworkflow integrations
  for (const [parentId, subworkflowIds] of workflowSubworkflowCalls) {
    if (subworkflowIds.length === 0) {
      continue; // No subworkflow calls
    }

    // Collect all integrations from subworkflows
    const subworkflowRequiredIntegrations = new Set<string>();

    for (const subworkflowId of subworkflowIds) {
      const subIntegrations = workflowIntegrations.get(subworkflowId) || [];
      for (const integration of subIntegrations) {
        subworkflowRequiredIntegrations.add(integration);
      }
    }

    if (subworkflowRequiredIntegrations.size === 0) {
      continue; // No integrations required from subworkflows
    }

    // Get parent's declared integrations from config
    const parentDeclaredIntegrations = configIntegrations.get(parentId) || [];
    const hasField = hasIntegrationUidsInConfig(configContent, parentId);

    // Find missing inherited integrations (exclude those already reported in CHECK 1)
    const parentDirectIntegrations = workflowIntegrations.get(parentId) || [];
    const missingInherited: string[] = [];
    for (const required of subworkflowRequiredIntegrations) {
      // Only report if not already declared AND not a direct integration (already reported)
      if (!parentDeclaredIntegrations.includes(required) && !parentDirectIntegrations.includes(required)) {
        missingInherited.push(required);
      }
    }

    if (missingInherited.length > 0) {
      findings.push({
        rule: RULE_ID,
        severity: 'should',
        path: configPath,
        message: `Workflow "${parentId}" calls subworkflows that use integrations not declared in its integrationUids: ${missingInherited.join(', ')}`,
        raw_details:
          `Add the following integrations to the integrationUids array for workflow '${parentId}' in config.ts: ${missingInherited.map(i => `'${i}'`).join(', ')}. ` +
          `These integrations are used by called subworkflows: ${subworkflowIds.join(', ')}`,
        guideRef: metadata.guideRef,
        fixable: true,
        fix: {
          description: `Add inherited integrations to '${parentId}': ${missingInherited.join(', ')}`,
          apply: createFixFunction(parentId, missingInherited, hasField),
        },
      });
    }
  }

  return findings;
}

export default checkIntegrationInheritance;
