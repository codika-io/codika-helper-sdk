/**
 * Invalid: Two workflows, one with valid triggers and one with empty triggers
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const PROJECT_ID = 'test-multiple-one-empty';

export const WORKFLOW_FILES = [
  join(__dirname, 'workflows/good-workflow.json'),
  join(__dirname, 'workflows/bad-workflow.json'),
];

export function getConfiguration() {
  return {
    processId: 'test-process',
    workflows: [
      {
        workflowTemplateId: 'good-workflow',
        workflowId: 'good-workflow',
        workflowName: 'Good Workflow',
        triggers: [
          {
            triggerId: 'http-trigger',
            type: 'http' as const,
            url: `{{ORGSECRET_N8N_BASE_URL_TERCESORG}}/webhook/{{PROCDATA_PROCESS_ID_ATADCORP}}/process`,
            method: 'POST' as const,
            title: 'Process',
            description: 'Trigger processing',
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
        triggers: [],
        outputSchema: [],
        n8nWorkflowJsonBase64: '',
        cost: 1,
      },
    ],
  };
}
