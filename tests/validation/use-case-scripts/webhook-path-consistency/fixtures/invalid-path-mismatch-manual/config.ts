/**
 * Invalid: manualTriggerUrl path doesn't match workflow webhook
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const PROJECT_ID = 'test-invalid-mismatch-manual';

export const WORKFLOW_FILES = [join(__dirname, 'workflows/scheduled.json')];

export function getConfiguration() {
  return {
    processId: 'test-process',
    workflows: [
      {
        workflowTemplateId: 'scheduled',
        workflowId: 'scheduled',
        workflowName: 'Scheduled Workflow',
        triggers: [
          {
            triggerId: 'schedule-trigger',
            type: 'schedule' as const,
            cronExpression: '0 9 * * *',
            timezone: 'UTC',
            humanReadable: 'Every day at 9:00 AM',
            manualTriggerUrl: `{{ORGSECRET_N8N_BASE_URL_TERCESORG}}/webhook/{{PROCDATA_PROCESS_ID_ATADCORP}}/manual-run`,
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
