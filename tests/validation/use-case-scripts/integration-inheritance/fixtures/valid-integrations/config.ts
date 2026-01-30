/**
 * Valid use case - parent declares all subworkflow integrations
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const PROJECT_ID = 'test-project';

export const WORKFLOW_FILES = [
  join(__dirname, 'workflows/parent.json'),
  join(__dirname, 'workflows/sub-helper.json'),
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
        integrationUids: ['anthropic', 'openai'],
        outputSchema: [],
        n8nWorkflowJsonBase64: '',
        cost: 1,
      },
      {
        workflowTemplateId: 'sub-helper',
        workflowId: 'sub-helper',
        workflowName: 'Sub Helper',
        triggers: [
          {
            type: 'subworkflow' as const,
            triggerId: 'sub-helper-trigger',
            title: 'Helper',
            description: 'Helper workflow',
            inputSchema: [],
            calledBy: ['parent'],
          },
        ],
        integrationUids: ['openai'],
        outputSchema: [],
        n8nWorkflowJsonBase64: '',
        cost: 0,
      },
    ],
  };
}
