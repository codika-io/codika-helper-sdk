/**
 * Skill Template Generators
 *
 * Generate SKILL.md files for the init command.
 * Each skill follows the Claude Agent Skills format:
 * - YAML frontmatter with name, description, workflowTemplateId
 * - Concise markdown body (under 500 lines)
 * - Third-person descriptions
 *
 * See: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview
 */

export interface SkillTemplateParams {
  slug: string;
  name: string;
}

/**
 * Generate the SKILL.md for the HTTP-triggered main workflow.
 */
export function generateMainWorkflowSkill(params: SkillTemplateParams): string {
  const { slug, name } = params;
  return `---
name: ${slug}-process-text
description: Submits text for AI processing via the main-workflow HTTP endpoint of the ${name} use case. Returns processed text with a timestamp.
workflowTemplateId: main-workflow
---

# Process Text

Receives text input via HTTP POST and processes it using AI (OpenAI). Calls the text-processor sub-workflow internally.

## How to trigger

\`\`\`bash
codika trigger main-workflow --payload-file - <<'EOF'
{
  "text_input": "Your text to process",
  "processing_mode": "summarize"
}
EOF
\`\`\`

## Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| text_input | string | yes | The text to process (max 5000 chars) |
| processing_mode | select | yes | One of: "summarize", "analyze", "translate" |

## Output

\`\`\`json
{
  "result": "Processed text output",
  "processedAt": "2025-01-01T00:00:00.000Z"
}
\`\`\`

| Field | Type | Description |
|-------|------|-------------|
| result | string | The processed text output |
| processedAt | string | ISO 8601 timestamp of when processing completed |

## Notes

- Cost: 1 credit per execution
- Uses OpenAI for text processing (via Flex Credentials)
`;
}

/**
 * Generate the SKILL.md for the scheduled report workflow.
 */
export function generateScheduledReportSkill(params: SkillTemplateParams): string {
  const { slug, name } = params;
  return `---
name: ${slug}-scheduled-report
description: Generates a weekly report automatically every Monday at 9 AM for the ${name} use case. Can be manually triggered for testing via codika trigger.
workflowTemplateId: scheduled-report
---

# Scheduled Report

Runs automatically on a schedule (every Monday at 9:00 AM Brussels time). No user input required for automatic execution.

## Automatic execution

This workflow is triggered automatically by n8n's schedule trigger. Results are stored and viewable in the Codika dashboard.

## Manual trigger (for testing)

To trigger the report manually (bypasses the schedule):

\`\`\`bash
codika trigger scheduled-report
\`\`\`

No payload is required. The manual trigger webhook converges with the schedule trigger inside the workflow.

## Output

| Field | Type | Description |
|-------|------|-------------|
| title | string | Report title |
| summary | string | Report summary text |
| generatedAt | string | ISO 8601 timestamp |

\`\`\`json
{
  "title": "Weekly Report - 2025-03-15",
  "summary": "Summary of activity for the past week...",
  "generatedAt": "2025-03-15T09:00:00.000Z"
}
\`\`\`

## Notes

- Cost: 1 credit per execution (automatic or manual)
- Schedule: Every Monday at 9:00 AM (Europe/Brussels)
- No input parameters needed
`;
}
