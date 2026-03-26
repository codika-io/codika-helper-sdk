/**
 * SCHEDULE-TRIGGER-FIELDS Validation Script
 *
 * Validates that schedule triggers in config.ts have all required fields:
 * - cronExpression: the cron schedule
 * - timezone: IANA timezone (e.g., 'Europe/Brussels')
 * - humanReadable: plain English schedule description (e.g., 'Every 5 minutes')
 * - manualTriggerUrl: webhook URL for manual/dashboard-triggered runs
 *
 * These fields are required by the deployment API but were not previously
 * validated by the CLI, causing confusing deployment failures after
 * successful verification.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { Finding, RuleMetadata } from '../types.js';

export const RULE_ID = 'SCHEDULE-TRIGGER-FIELDS';

export const metadata: RuleMetadata = {
  id: RULE_ID,
  name: 'schedule_trigger_fields',
  severity: 'must',
  description: 'Schedule triggers must include cronExpression, timezone, humanReadable, and manualTriggerUrl',
  details:
    'The deployment API requires all four fields on every schedule trigger. ' +
    'Missing any of them causes a deployment failure with INVALID_CONFIGURATION.',
  fixable: false,
  category: 'triggers',
};

const REQUIRED_FIELDS = ['cronExpression', 'timezone', 'humanReadable', 'manualTriggerUrl'] as const;

const FIELD_EXAMPLES: Record<string, string> = {
  cronExpression: '"*/5 * * * *"',
  timezone: '"Europe/Brussels"',
  humanReadable: '"Every 5 minutes"',
  manualTriggerUrl: '`{{ORGSECRET_N8N_BASE_URL_TERCESORG}}/webhook/{{PROCDATA_PROCESS_ID_ATADCORP}}/{{USERDATA_PROCESS_INSTANCE_UID_ATADRESU}}/<workflow-slug>-manual`',
};

/**
 * Information about a schedule trigger extracted from config.ts
 */
interface ScheduleTriggerInfo {
  workflowTemplateId: string;
  triggerBlockContent: string;
  triggerStartLine: number;
  presentFields: Set<string>;
}

/**
 * Extracts schedule trigger blocks from config.ts content.
 *
 * Strategy:
 * 1. Find all workflowTemplateId values
 * 2. For each workflow block, find triggers with type: 'schedule'
 * 3. Extract what fields are present in each schedule trigger
 */
function extractScheduleTriggers(configContent: string): ScheduleTriggerInfo[] {
  const results: ScheduleTriggerInfo[] = [];
  const lines = configContent.split('\n');

  // Find all workflow blocks by workflowTemplateId
  const templateIdPattern = /workflowTemplateId:\s*['"]([^'"]+)['"]/g;
  let templateMatch;

  while ((templateMatch = templateIdPattern.exec(configContent)) !== null) {
    const templateId = templateMatch[1];
    const templateIdPos = templateMatch.index;

    // Find end of this workflow block (next workflowTemplateId or end of content)
    const nextPattern = /workflowTemplateId:/g;
    nextPattern.lastIndex = templateIdPos + templateMatch[0].length;
    const nextMatch = nextPattern.exec(configContent);
    const blockEnd = nextMatch ? nextMatch.index : configContent.length;
    const workflowBlock = configContent.slice(templateIdPos, blockEnd);

    // Check if this block contains a schedule trigger
    if (!workflowBlock.includes("type: 'schedule'") && !workflowBlock.includes('type: "schedule"')) {
      continue;
    }

    // Find the line number of the schedule type declaration within the full content
    const scheduleTypeOffset = workflowBlock.search(/type:\s*['"]schedule['"]/);
    const absoluteOffset = templateIdPos + scheduleTypeOffset;
    const triggerStartLine = configContent.slice(0, absoluteOffset).split('\n').length;

    // Check which required fields are present in the trigger block
    // We need to scope to just the trigger object, not the whole workflow block.
    // Find the triggers: [...] content first
    const triggersMatch = workflowBlock.match(/triggers:\s*\[([\s\S]*?)\]\s*,?\s*\n/);
    const triggersContent = triggersMatch ? triggersMatch[1] : workflowBlock;

    const presentFields = new Set<string>();
    for (const field of REQUIRED_FIELDS) {
      // Match field: followed by a value (string, template literal, or variable)
      const fieldPattern = new RegExp(`${field}\\s*:`);
      if (fieldPattern.test(triggersContent)) {
        presentFields.add(field);
      }
    }

    results.push({
      workflowTemplateId: templateId,
      triggerBlockContent: triggersContent,
      triggerStartLine,
      presentFields,
    });
  }

  return results;
}

/**
 * Validates that all schedule triggers have required fields.
 */
export async function checkScheduleTriggerFields(useCasePath: string): Promise<Finding[]> {
  const findings: Finding[] = [];

  const configPath = join(useCasePath, 'config.ts');
  if (!existsSync(configPath)) {
    return findings;
  }

  let configContent: string;
  try {
    configContent = readFileSync(configPath, 'utf-8');
  } catch {
    return findings;
  }

  const scheduleTriggers = extractScheduleTriggers(configContent);

  for (const trigger of scheduleTriggers) {
    const missingFields = REQUIRED_FIELDS.filter(f => !trigger.presentFields.has(f));

    if (missingFields.length === 0) continue;

    const missingList = missingFields
      .map(f => `  - ${f}: ${FIELD_EXAMPLES[f]}`)
      .join('\n');

    findings.push({
      rule: RULE_ID,
      severity: 'must',
      path: configPath,
      line: trigger.triggerStartLine,
      message:
        `Schedule trigger in workflow "${trigger.workflowTemplateId}" is missing required field${missingFields.length > 1 ? 's' : ''}: ${missingFields.join(', ')}. ` +
        `The deployment API will reject this configuration.`,
      raw_details:
        `Schedule triggers require all of these fields:\n` +
        `  - cronExpression: the cron schedule (e.g., "*/5 * * * *")\n` +
        `  - timezone: IANA timezone (e.g., "Europe/Brussels")\n` +
        `  - humanReadable: plain English description (e.g., "Every 5 minutes")\n` +
        `  - manualTriggerUrl: webhook URL for manual runs from the dashboard\n\n` +
        `Missing in "${trigger.workflowTemplateId}":\n${missingList}\n\n` +
        `Example of a complete schedule trigger:\n` +
        `  {\n` +
        `    triggerId: crypto.randomUUID(),\n` +
        `    type: "schedule" as const,\n` +
        `    cronExpression: "*/5 * * * *",\n` +
        `    timezone: "Europe/Brussels",\n` +
        `    humanReadable: "Every 5 minutes",\n` +
        `    manualTriggerUrl: \`\${baseUrl}/my-workflow-manual\`,\n` +
        `    title: "My Scheduled Task",\n` +
        `    description: "Runs every 5 minutes",\n` +
        `  } satisfies ScheduleTrigger`,
    });
  }

  return findings;
}

export default checkScheduleTriggerFields;
