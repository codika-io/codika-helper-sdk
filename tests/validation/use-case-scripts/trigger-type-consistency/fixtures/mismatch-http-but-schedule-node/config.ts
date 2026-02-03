/**
 * Invalid: Config declares type 'http' but workflow has a scheduleTrigger node
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const PROJECT_ID = 'test-mismatch-http-schedule';

export const WORKFLOW_FILES = [join(__dirname, 'workflows/main.json')];

export function getConfiguration() {
  return {
    processId: 'test-process',
    workflows: [
      {
        workflowTemplateId: 'main',
        workflowId: 'main',
        workflowName: 'Main Workflow',
        triggers: [
          {
            triggerId: 'wrong-trigger',
            type: 'http' as const,
            url: `{{ORGSECRET_N8N_BASE_URL_TERCESORG}}/webhook/{{PROCDATA_PROCESS_ID_ATADCORP}}/process`,
            method: 'POST' as const,
            title: 'Process',
          },
        ],
        outputSchema: [],
        n8nWorkflowJsonBase64: '',
        cost: 1,
      },
    ],
  };
}
