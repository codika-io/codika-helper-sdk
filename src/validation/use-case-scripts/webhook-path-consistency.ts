/**
 * WEBHOOK-PATH-CONSISTENCY Validation Script
 *
 * Validates that HTTP trigger URLs in config.ts match the webhook node paths
 * in the corresponding workflow JSON files.
 *
 * Also validates manualTriggerUrl for schedule triggers.
 *
 * Config URL pattern: {{ORGSECRET_N8N_BASE_URL_TERCESORG}}/webhook/<path>
 * Workflow path:      <path> (same as above, without base URL and /webhook/ prefix)
 *
 * @see .guides/specific/http-triggers.md - "URL Path Pattern"
 * @see .guides/specific/schedule-triggers.md - "Important: Path Must Match"
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, basename } from 'path';
import type { Finding, RuleMetadata } from '../types.js';

export const RULE_ID = 'WEBHOOK-PATH-CONSISTENCY';

export const metadata: RuleMetadata & { guideRef: { path: string; section: string } } = {
  id: RULE_ID,
  name: 'webhook_path_consistency',
  severity: 'must', // Critical - mismatched paths/URLs cause workflow execution failures
  description: 'HTTP trigger URLs must have correct structure and match webhook node paths',
  details:
    'Config URLs must start with {{ORGSECRET_N8N_BASE_URL_TERCESORG}}/webhook/ and the path portion must match the workflow webhook node path',
  fixable: false, // Report only - user must manually fix
  category: 'references',
  guideRef: {
    path: 'specific/http-triggers.md',
    section: 'URL Path Pattern',
  },
};

const HTTP_GUIDE_REF = {
  path: 'specific/http-triggers.md',
  section: 'URL Path Pattern',
};

const SCHEDULE_GUIDE_REF = {
  path: 'specific/schedule-triggers.md',
  section: 'Important: Path Must Match',
};

// Expected base URL pattern
const BASE_URL_PATTERN = '{{ORGSECRET_N8N_BASE_URL_TERCESORG}}';
const WEBHOOK_PREFIX = '/webhook/';

/**
 * Information about a trigger URL from config.ts
 */
interface TriggerUrlInfo {
  workflowTemplateId: string;
  triggerId: string;
  url: string;
  isManualTrigger: boolean; // true for manualTriggerUrl from schedule triggers
}

/**
 * Extracts the path portion from a webhook URL
 * Returns null if the URL doesn't have the expected structure
 */
function extractPathFromUrl(url: string): string | null {
  const webhookIndex = url.indexOf(WEBHOOK_PREFIX);
  if (webhookIndex === -1) {
    return null;
  }
  return url.slice(webhookIndex + WEBHOOK_PREFIX.length);
}

/**
 * Validates URL structure
 * Returns an error message if invalid, null if valid
 */
function validateUrlStructure(url: string): string | null {
  // Check for base URL
  if (!url.startsWith(BASE_URL_PATTERN)) {
    return `URL must start with ${BASE_URL_PATTERN}`;
  }

  // Check for /webhook/ prefix after base URL
  const afterBaseUrl = url.slice(BASE_URL_PATTERN.length);
  if (!afterBaseUrl.startsWith(WEBHOOK_PREFIX)) {
    return `URL must include ${WEBHOOK_PREFIX} after the base URL`;
  }

  return null;
}

/**
 * Extracts trigger URLs from config.ts content
 * Returns URLs from HTTP triggers (url field) and schedule triggers (manualTriggerUrl field)
 */
function extractConfigTriggerUrls(configContent: string): TriggerUrlInfo[] {
  const triggerUrls: TriggerUrlInfo[] = [];

  // Find all workflow blocks with workflowTemplateId
  const workflowBlockPattern = /workflowTemplateId:\s*['"]([^'"]+)['"]/g;
  let templateMatch;

  while ((templateMatch = workflowBlockPattern.exec(configContent)) !== null) {
    const templateId = templateMatch[1];
    const templateIdEndPos = templateMatch.index + templateMatch[0].length;

    // Find the end of this workflow block (next workflowTemplateId or end)
    const nextTemplatePattern = /workflowTemplateId:/g;
    nextTemplatePattern.lastIndex = templateIdEndPos;
    const nextMatch = nextTemplatePattern.exec(configContent);
    const blockEnd = nextMatch ? nextMatch.index : configContent.length;

    const workflowBlock = configContent.slice(templateMatch.index, blockEnd);

    // Find triggers array in this block
    const triggersMatch = workflowBlock.match(/triggers:\s*\[([\s\S]*?)\]/);
    if (!triggersMatch) continue;

    const triggersContent = triggersMatch[1];

    // Find HTTP triggers with url field
    // Pattern: type: 'http' ... url: `...`
    const httpTriggerPattern =
      /\{[^{}]*type:\s*['"]http['"][^{}]*triggerId:\s*['"]([^'"]+)['"][^{}]*url:\s*[`'"]([^`'"]+)[`'"][^{}]*\}|\{[^{}]*triggerId:\s*['"]([^'"]+)['"][^{}]*type:\s*['"]http['"][^{}]*url:\s*[`'"]([^`'"]+)[`'"][^{}]*\}|\{[^{}]*url:\s*[`'"]([^`'"]+)[`'"][^{}]*type:\s*['"]http['"][^{}]*triggerId:\s*['"]([^'"]+)['"][^{}]*\}/g;
    let httpMatch;

    while ((httpMatch = httpTriggerPattern.exec(triggersContent)) !== null) {
      const triggerId = httpMatch[1] || httpMatch[3] || httpMatch[6];
      const url = httpMatch[2] || httpMatch[4] || httpMatch[5];
      if (triggerId && url) {
        triggerUrls.push({
          workflowTemplateId: templateId,
          triggerId,
          url,
          isManualTrigger: false,
        });
      }
    }

    // Find schedule triggers with manualTriggerUrl field
    const scheduleTriggerPattern =
      /\{[^{}]*type:\s*['"]schedule['"][^{}]*triggerId:\s*['"]([^'"]+)['"][^{}]*manualTriggerUrl:\s*[`'"]([^`'"]+)[`'"][^{}]*\}|\{[^{}]*triggerId:\s*['"]([^'"]+)['"][^{}]*type:\s*['"]schedule['"][^{}]*manualTriggerUrl:\s*[`'"]([^`'"]+)[`'"][^{}]*\}|\{[^{}]*manualTriggerUrl:\s*[`'"]([^`'"]+)[`'"][^{}]*type:\s*['"]schedule['"][^{}]*triggerId:\s*['"]([^'"]+)['"][^{}]*\}/g;
    let scheduleMatch;

    while ((scheduleMatch = scheduleTriggerPattern.exec(triggersContent)) !== null) {
      const triggerId = scheduleMatch[1] || scheduleMatch[3] || scheduleMatch[6];
      const url = scheduleMatch[2] || scheduleMatch[4] || scheduleMatch[5];
      if (triggerId && url) {
        triggerUrls.push({
          workflowTemplateId: templateId,
          triggerId,
          url,
          isManualTrigger: true,
        });
      }
    }
  }

  return triggerUrls;
}

/**
 * Extracts webhook node paths from a workflow JSON
 */
function extractWebhookPaths(workflowContent: string): string[] {
  const paths: string[] = [];

  try {
    const workflow = JSON.parse(workflowContent);
    for (const node of workflow.nodes || []) {
      if (node.type === 'n8n-nodes-base.webhook' && node.parameters?.path) {
        paths.push(node.parameters.path);
      }
    }
  } catch {
    // Invalid JSON - will be caught by other validators
  }

  return paths;
}

/**
 * Validates webhook path consistency for a use case
 */
export async function checkWebhookPathConsistency(useCasePath: string): Promise<Finding[]> {
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

  // Extract trigger URLs from config
  const triggerUrls = extractConfigTriggerUrls(configContent);

  // No HTTP triggers or schedule triggers with manualTriggerUrl - nothing to validate
  if (triggerUrls.length === 0) {
    return findings;
  }

  // Check workflows folder
  const workflowsPath = join(useCasePath, 'workflows');
  if (!existsSync(workflowsPath)) {
    // No workflows folder - HTTP triggers would be invalid
    for (const trigger of triggerUrls) {
      findings.push({
        rule: RULE_ID,
        severity: 'must',
        path: configPath,
        message: `Trigger "${trigger.triggerId}" in workflow "${trigger.workflowTemplateId}" has URL but no workflows folder exists`,
        raw_details: 'Create a workflows folder with the corresponding workflow JSON file',
        guideRef: trigger.isManualTrigger ? SCHEDULE_GUIDE_REF : HTTP_GUIDE_REF,
      });
    }
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

  // Build a map of workflowTemplateId -> webhook paths
  const workflowWebhookPaths = new Map<string, string[]>();
  for (const workflowFile of workflowFiles) {
    const templateId = basename(workflowFile, '.json');
    let content: string;
    try {
      content = readFileSync(workflowFile, 'utf-8');
    } catch {
      continue; // Skip unreadable files
    }

    const paths = extractWebhookPaths(content);
    workflowWebhookPaths.set(templateId, paths);
  }

  // Validate each trigger URL
  for (const trigger of triggerUrls) {
    const guideRef = trigger.isManualTrigger ? SCHEDULE_GUIDE_REF : HTTP_GUIDE_REF;
    const triggerType = trigger.isManualTrigger ? 'manualTriggerUrl' : 'url';

    // Check 1: URL structure validation
    const structureError = validateUrlStructure(trigger.url);
    if (structureError) {
      findings.push({
        rule: RULE_ID,
        severity: 'must',
        path: configPath,
        message: `Invalid ${triggerType} structure in trigger "${trigger.triggerId}" of workflow "${trigger.workflowTemplateId}": ${structureError}`,
        raw_details:
          `The ${triggerType} must follow the pattern: ${BASE_URL_PATTERN}${WEBHOOK_PREFIX}<path>\n\n` +
          `Current value: ${trigger.url}\n\n` +
          `See documentation for correct pattern:\n` +
          `- .guides/${guideRef.path} > "${guideRef.section}"`,
        guideRef,
      });
      continue; // Skip path check if structure is invalid
    }

    // Check 2: Path consistency
    const expectedPath = extractPathFromUrl(trigger.url);
    if (!expectedPath) {
      // This shouldn't happen if structure validation passed, but handle it
      continue;
    }

    const workflowPaths = workflowWebhookPaths.get(trigger.workflowTemplateId);

    if (!workflowPaths) {
      // Workflow file doesn't exist
      findings.push({
        rule: RULE_ID,
        severity: 'must',
        path: configPath,
        message: `Cannot find workflow file for "${trigger.workflowTemplateId}" to validate webhook path`,
        raw_details:
          `The trigger "${trigger.triggerId}" references workflow "${trigger.workflowTemplateId}" ` +
          `but no workflow file "${trigger.workflowTemplateId}.json" was found in the workflows folder.`,
        guideRef,
      });
      continue;
    }

    if (workflowPaths.length === 0) {
      // Workflow exists but has no webhook nodes
      findings.push({
        rule: RULE_ID,
        severity: 'must',
        path: join(workflowsPath, `${trigger.workflowTemplateId}.json`),
        message: `Workflow "${trigger.workflowTemplateId}" has no webhook node but trigger "${trigger.triggerId}" expects one`,
        raw_details:
          `The trigger "${trigger.triggerId}" has ${triggerType} set but the workflow has no webhook node.\n\n` +
          `Expected webhook path: ${expectedPath}\n\n` +
          `Add a webhook node with the matching path to the workflow, or remove the trigger URL from config.ts.\n\n` +
          `See documentation:\n` +
          `- .guides/${guideRef.path} > "${guideRef.section}"`,
        guideRef,
      });
      continue;
    }

    // Check if any webhook path matches
    if (!workflowPaths.includes(expectedPath)) {
      const actualPathsStr = workflowPaths.map(p => `"${p}"`).join(', ');
      findings.push({
        rule: RULE_ID,
        severity: 'must',
        path: join(workflowsPath, `${trigger.workflowTemplateId}.json`),
        message: `Webhook path mismatch in "${trigger.workflowTemplateId}": config expects "${expectedPath}" but workflow has ${actualPathsStr}`,
        raw_details:
          `The path in the config.ts trigger ${triggerType} must match the webhook node path in the workflow JSON.\n\n` +
          `Config ${triggerType} path: ${expectedPath}\n` +
          `Workflow webhook path(s): ${actualPathsStr}\n\n` +
          `Either update the ${triggerType} in config.ts or the webhook node path in the workflow.\n\n` +
          `See documentation for correct pattern:\n` +
          `- .guides/${guideRef.path} > "${guideRef.section}"`,
        guideRef,
      });
    }
  }

  return findings;
}

export default checkWebhookPathConsistency;
