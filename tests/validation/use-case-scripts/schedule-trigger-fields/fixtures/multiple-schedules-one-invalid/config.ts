/**
 * Mixed: One valid schedule trigger, one missing fields — should report only the invalid one
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const WORKFLOW_FILES = [
  join(__dirname, 'workflows/good.json'),
  join(__dirname, 'workflows/bad.json'),
];

export function getConfiguration() {
  const baseUrl = `{{ORGSECRET_N8N_BASE_URL_TERCESORG}}/webhook/{{PROCDATA_PROCESS_ID_ATADCORP}}/{{USERDATA_PROCESS_INSTANCE_UID_ATADRESU}}`;

  return {
    processId: 'test-process',
    workflows: [
      {
        workflowTemplateId: 'good-scheduler',
        workflowId: 'good-scheduler',
        workflowName: 'Good Scheduler',
        triggers: [
          {
            triggerId: 'trigger-1',
            type: 'schedule' as const,
            cronExpression: '0 9 * * 1',
            timezone: 'Europe/London',
            humanReadable: 'Every Monday at 9:00 AM',
            manualTriggerUrl: `${baseUrl}/good-scheduler-manual`,
            title: 'Weekly Report',
          },
        ],
        outputSchema: [],
        n8nWorkflowJsonBase64: '',
        cost: 1,
      },
      {
        workflowTemplateId: 'bad-scheduler',
        workflowId: 'bad-scheduler',
        workflowName: 'Bad Scheduler',
        triggers: [
          {
            triggerId: 'trigger-2',
            type: 'schedule' as const,
            cronExpression: '*/10 * * * *',
            title: 'Periodic Check',
          },
        ],
        outputSchema: [],
        n8nWorkflowJsonBase64: '',
        cost: 1,
      },
    ],
  };
}
