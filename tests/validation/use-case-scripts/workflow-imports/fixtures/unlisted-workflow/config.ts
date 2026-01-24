/**
 * Test Case: Workflow file exists but is NOT in WORKFLOW_FILES
 * Expected: Validator should FAIL with "must" severity
 */

import { join } from 'path';

export const PROJECT_ID = 'test-unlisted-12345';

// Only lists main-workflow.json, but extra-workflow.json also exists
export const WORKFLOW_FILES = [
  join(__dirname, 'workflows/main-workflow.json'),
];

export function getConfiguration() {
  return {
    title: 'Unlisted Workflow Test',
    subtitle: 'Test case for unlisted workflow detection',
    description: 'This use case has an extra workflow not in WORKFLOW_FILES',
    tags: ['test'],
    workflows: [],
  };
}
