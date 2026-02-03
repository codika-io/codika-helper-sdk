/**
 * Valid: Schedule trigger with non-empty triggers array
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const PROJECT_ID = 'test-valid-schedule';

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
            cronExpression: '0 9 * * 1',
            timezone: 'Europe/London',
            humanReadable: 'Every Monday at 9:00 AM',
            title: 'Weekly Report',
          },
        ],
        outputSchema: [],
        n8nWorkflowJsonBase64: '',
        cost: 1,
      },
    ],
  };
}
