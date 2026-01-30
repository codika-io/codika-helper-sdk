/**
 * Invalid use case - parent calls multiple subworkflows with different integrations
 * Parent only declares one integration but subworkflows use more
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const PROJECT_ID = 'test-project';

export const WORKFLOW_FILES = [
  join(__dirname, 'workflows/parent.json'),
  join(__dirname, 'workflows/ai-helper.json'),
  join(__dirname, 'workflows/calendar-helper.json'),
];

export function getConfiguration() {
  return {
    processId: 'test-process',
    workflows: [
      {
        workflowTemplateId: 'parent',
        workflowId: 'parent',
        workflowName: 'Parent Workflow',
        triggers: [],
        integrationUids: ['anthropic'],
        outputSchema: [],
        n8nWorkflowJsonBase64: '',
        cost: 1,
      },
      {
        workflowTemplateId: 'ai-helper',
        workflowId: 'ai-helper',
        workflowName: 'AI Helper',
        triggers: [
          {
            type: 'subworkflow' as const,
            triggerId: 'ai-helper-trigger',
            title: 'AI Helper',
            description: 'AI helper workflow',
            inputSchema: [],
            calledBy: ['parent'],
          },
        ],
        integrationUids: ['openai'],
        outputSchema: [],
        n8nWorkflowJsonBase64: '',
        cost: 0,
      },
      {
        workflowTemplateId: 'calendar-helper',
        workflowId: 'calendar-helper',
        workflowName: 'Calendar Helper',
        triggers: [
          {
            type: 'subworkflow' as const,
            triggerId: 'calendar-helper-trigger',
            title: 'Calendar Helper',
            description: 'Calendar helper workflow',
            inputSchema: [],
            calledBy: ['parent'],
          },
        ],
        integrationUids: ['google_calendar_oauth'],
        outputSchema: [],
        n8nWorkflowJsonBase64: '',
        cost: 0,
      },
    ],
  };
}
