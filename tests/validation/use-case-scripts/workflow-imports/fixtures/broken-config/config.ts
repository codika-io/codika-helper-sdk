/**
 * Test Case: Invalid TypeScript syntax in config.ts
 * Expected: Validator should report parsing error with "must" severity
 */

export const PROJECT_ID = 'test-broken-12345';

// INTENTIONAL SYNTAX ERROR: Missing closing bracket
export const WORKFLOW_FILES = [
  join(__dirname, 'workflows/main-workflow.json'),
// Missing closing bracket here!

export function getConfiguration() {
  return {
    title: 'Broken Config Test',
  };
}
