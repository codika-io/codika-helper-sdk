/**
 * Valid Use Case Configuration
 */

import { join } from 'path';

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
