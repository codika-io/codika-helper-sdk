/**
 * Invalid: Schedule trigger missing timezone, humanReadable, and manualTriggerUrl
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const WORKFLOW_FILES = [join(__dirname, 'workflows/scheduled.json')];

export function getConfiguration() {
  return {
    processId: 'test-process',
    workflows: [
      {
        workflowTemplateId: 'my-scheduler',
        workflowId: 'my-scheduler',
        workflowName: 'My Scheduler',
        triggers: [
          {
            triggerId: 'trigger-1',
            type: 'schedule' as const,
            cronExpression: '*/5 * * * *',
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
