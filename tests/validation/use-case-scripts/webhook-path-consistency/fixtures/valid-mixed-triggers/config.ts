/**
 * Valid: Mixed HTTP and schedule triggers with manual, all matching
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const PROJECT_ID = 'test-valid-mixed';

export const WORKFLOW_FILES = [
  join(__dirname, 'workflows/http-workflow.json'),
  join(__dirname, 'workflows/scheduled-workflow.json'),
];

export function getConfiguration() {
  return {
    processId: 'test-process',
    workflows: [
      {
        workflowTemplateId: 'http-workflow',
        workflowId: 'http-workflow',
        workflowName: 'HTTP Workflow',
        triggers: [
          {
            triggerId: 'http-trigger',
            type: 'http' as const,
            url: `{{ORGSECRET_N8N_BASE_URL_TERCESORG}}/webhook/{{PROCDATA_PROCESS_ID_ATADCORP}}/submit`,
            method: 'POST' as const,
            title: 'Submit',
          },
        ],
        outputSchema: [],
        n8nWorkflowJsonBase64: '',
        cost: 1,
      },
      {
        workflowTemplateId: 'scheduled-workflow',
        workflowId: 'scheduled-workflow',
        workflowName: 'Scheduled Workflow',
        triggers: [
          {
            triggerId: 'schedule-trigger',
            type: 'schedule' as const,
            cronExpression: '0 0 * * *',
            timezone: 'UTC',
            humanReadable: 'Every day at midnight',
            manualTriggerUrl: `{{ORGSECRET_N8N_BASE_URL_TERCESORG}}/webhook/{{PROCDATA_PROCESS_ID_ATADCORP}}/run-now`,
            title: 'Daily Job',
          },
        ],
        outputSchema: [],
        n8nWorkflowJsonBase64: '',
        cost: 1,
      },
    ],
  };
}
