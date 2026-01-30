/**
 * Valid: Multiple HTTP triggers across multiple workflows, all matching
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const PROJECT_ID = 'test-valid-multiple-http';

export const WORKFLOW_FILES = [
  join(__dirname, 'workflows/workflow-a.json'),
  join(__dirname, 'workflows/workflow-b.json'),
];

export function getConfiguration() {
  return {
    processId: 'test-process',
    workflows: [
      {
        workflowTemplateId: 'workflow-a',
        workflowId: 'workflow-a',
        workflowName: 'Workflow A',
        triggers: [
          {
            triggerId: 'trigger-a',
            type: 'http' as const,
            url: `{{ORGSECRET_N8N_BASE_URL_TERCESORG}}/webhook/{{PROCDATA_PROCESS_ID_ATADCORP}}/action-a`,
            method: 'POST' as const,
            title: 'Action A',
          },
        ],
        outputSchema: [],
        n8nWorkflowJsonBase64: '',
        cost: 1,
      },
      {
        workflowTemplateId: 'workflow-b',
        workflowId: 'workflow-b',
        workflowName: 'Workflow B',
        triggers: [
          {
            triggerId: 'trigger-b',
            type: 'http' as const,
            url: `{{ORGSECRET_N8N_BASE_URL_TERCESORG}}/webhook/{{PROCDATA_PROCESS_ID_ATADCORP}}/action-b`,
            method: 'POST' as const,
            title: 'Action B',
          },
        ],
        outputSchema: [],
        n8nWorkflowJsonBase64: '',
        cost: 1,
      },
    ],
  };
}
