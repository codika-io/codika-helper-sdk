/**
 * Valid: No schedule triggers at all — only HTTP trigger, should pass
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const WORKFLOW_FILES = [join(__dirname, 'workflows/http.json')];

export function getConfiguration() {
  return {
    processId: 'test-process',
    workflows: [
      {
        workflowTemplateId: 'http-endpoint',
        workflowId: 'http-endpoint',
        workflowName: 'HTTP Endpoint',
        triggers: [
          {
            triggerId: 'trigger-1',
            type: 'http' as const,
            url: 'https://example.com/webhook',
            method: 'POST' as const,
            title: 'Webhook',
          },
        ],
        outputSchema: [],
        n8nWorkflowJsonBase64: '',
        cost: 1,
      },
    ],
  };
}
