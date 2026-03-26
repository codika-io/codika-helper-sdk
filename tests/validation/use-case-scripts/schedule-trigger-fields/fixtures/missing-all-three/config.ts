/**
 * Invalid: Schedule trigger has cronExpression but missing timezone, humanReadable, manualTriggerUrl
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
        workflowTemplateId: 'daily-report',
        workflowId: 'daily-report',
        workflowName: 'Daily Report',
        triggers: [
          {
            triggerId: 'trigger-1',
            type: 'schedule' as const,
            cronExpression: '0 9 * * *',
            title: 'Morning Report',
          },
        ],
        outputSchema: [],
        n8nWorkflowJsonBase64: '',
        cost: 1,
      },
    ],
  };
}
