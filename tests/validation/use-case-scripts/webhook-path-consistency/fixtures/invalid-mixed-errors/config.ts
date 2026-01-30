/**
 * Invalid: Multiple workflows with different errors
 * - One with path mismatch
 * - One with missing base URL
 * - One correct (should not trigger finding)
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const PROJECT_ID = 'test-invalid-mixed';

export const WORKFLOW_FILES = [
  join(__dirname, 'workflows/mismatch.json'),
  join(__dirname, 'workflows/correct.json'),
];

export function getConfiguration() {
  return {
    processId: 'test-process',
    workflows: [
      {
        workflowTemplateId: 'mismatch',
        workflowId: 'mismatch',
        workflowName: 'Mismatch Workflow',
        triggers: [
          {
            triggerId: 'trigger-mismatch',
            type: 'http' as const,
            url: `{{ORGSECRET_N8N_BASE_URL_TERCESORG}}/webhook/{{PROCDATA_PROCESS_ID_ATADCORP}}/expected-path`,
            method: 'POST' as const,
            title: 'Mismatch',
          },
        ],
        outputSchema: [],
        n8nWorkflowJsonBase64: '',
        cost: 1,
      },
      {
        workflowTemplateId: 'correct',
        workflowId: 'correct',
        workflowName: 'Correct Workflow',
        triggers: [
          {
            triggerId: 'trigger-correct',
            type: 'http' as const,
            url: `{{ORGSECRET_N8N_BASE_URL_TERCESORG}}/webhook/{{PROCDATA_PROCESS_ID_ATADCORP}}/correct-path`,
            method: 'POST' as const,
            title: 'Correct',
          },
        ],
        outputSchema: [],
        n8nWorkflowJsonBase64: '',
        cost: 1,
      },
      {
        workflowTemplateId: 'no-base',
        workflowId: 'no-base',
        workflowName: 'No Base URL Workflow',
        triggers: [
          {
            triggerId: 'trigger-no-base',
            type: 'http' as const,
            url: `/webhook/{{PROCDATA_PROCESS_ID_ATADCORP}}/some-path`,
            method: 'POST' as const,
            title: 'No Base',
          },
        ],
        outputSchema: [],
        n8nWorkflowJsonBase64: '',
        cost: 1,
      },
    ],
  };
}
