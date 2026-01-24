/**
 * Valid Use Case Configuration
 */

import { join } from 'path';

export const PROJECT_ID = 'test-project-id-12345';

export const WORKFLOW_FILES = [
  join(__dirname, 'workflows/main-workflow.json'),
];

export function getConfiguration() {
  return {
    title: 'Test Use Case',
    subtitle: 'A test use case for validation',
    description: 'This is a test use case',
    tags: ['test'],
    workflows: [],
  };
}
