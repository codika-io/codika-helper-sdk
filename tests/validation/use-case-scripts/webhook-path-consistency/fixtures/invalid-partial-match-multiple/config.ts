/**
 * Invalid: 3 HTTP triggers - 2 good, 1 bad
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const PROJECT_ID = 'test-invalid-partial';

export const WORKFLOW_FILES = [
  join(__dirname, 'workflows/good-a.json'),
  join(__dirname, 'workflows/good-b.json'),
  join(__dirname, 'workflows/bad-workflow.json'),
];

export function getConfiguration() {
  return {
    processId: 'test-process',
    workflows: [
      {
        workflowTemplateId: 'good-a',
        workflowId: 'good-a',
        workflowName: 'Good Workflow A',
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
        workflowTemplateId: 'good-b',
        workflowId: 'good-b',
        workflowName: 'Good Workflow B',
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
      {
        workflowTemplateId: 'bad-workflow',
        workflowId: 'bad-workflow',
        workflowName: 'Bad Workflow',
        triggers: [
          {
            triggerId: 'trigger-bad',
            type: 'http' as const,
            url: `{{ORGSECRET_N8N_BASE_URL_TERCESORG}}/webhook/{{PROCDATA_PROCESS_ID_ATADCORP}}/action-wrong`,
            method: 'POST' as const,
            title: 'Action Wrong',
          },
        ],
        outputSchema: [],
        n8nWorkflowJsonBase64: '',
        cost: 1,
      },
    ],
  };
}
