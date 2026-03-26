/**
 * Valid: Schedule trigger with all required fields present
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const WORKFLOW_FILES = [join(__dirname, 'workflows/scheduled.json')];

export function getConfiguration() {
  const baseUrl = `{{ORGSECRET_N8N_BASE_URL_TERCESORG}}/webhook/{{PROCDATA_PROCESS_ID_ATADCORP}}/{{USERDATA_PROCESS_INSTANCE_UID_ATADRESU}}`;

  return {
    processId: 'test-process',
    workflows: [
      {
        workflowTemplateId: 'scheduled-check',
        workflowId: 'scheduled-check',
        workflowName: 'Scheduled Check',
        triggers: [
          {
            triggerId: 'trigger-1',
            type: 'schedule' as const,
            cronExpression: '*/5 * * * *',
            timezone: 'Europe/Brussels',
            humanReadable: 'Every 5 minutes',
            manualTriggerUrl: `${baseUrl}/scheduled-check-manual`,
            title: 'Status Check',
          },
        ],
        outputSchema: [],
        n8nWorkflowJsonBase64: '',
        cost: 1,
      },
    ],
  };
}
