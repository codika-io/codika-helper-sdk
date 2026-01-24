# Testing Guide

This document describes how to write and run tests for the Codika Helper SDK validation system.

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests with UI (browser-based test explorer)
npm run test:ui
```

## Test Structure

```
tests/
├── fixtures/                         # Sample data for tests
│   ├── workflows/                    # Workflow JSON fixtures
│   │   ├── valid-parent-workflow.json
│   │   ├── missing-codika-init.json
│   │   ├── valid-subworkflow.json
│   │   └── ...
│   └── use-cases/                    # Use-case folder fixtures
│       └── ...
├── helpers/
│   └── test-utils.ts                 # Test utilities and helpers
└── validation/
    ├── rules/                        # Tests for Flowlint custom rules
    │   ├── codika-init-required.test.ts
    │   └── codika-submit-result.test.ts
    └── workflow-scripts/             # Tests for workflow scripts
        ├── instparm-quoting.test.ts
        └── placeholder-syntax.test.ts
```

## TDD Workflow for New Rules/Scripts

### 1. Create Test File First

```typescript
// tests/validation/rules/my-new-rule.test.ts
import { describe, it, expect } from 'vitest';
import { parseN8n } from '@replikanti/flowlint-core';
import { myNewRule, metadata } from '../../../src/validation/rules/my-new-rule.js';
import { createRuleContext } from '../../helpers/test-utils.js';

describe('MY-NEW-RULE', () => {
  const ctx = createRuleContext();

  it('should PASS for valid workflow', () => {
    const workflow = { /* ... */ };
    const graph = parseN8n(JSON.stringify(workflow));
    const findings = myNewRule(graph, ctx);
    expect(findings).toHaveLength(0);
  });

  it('should FAIL for invalid workflow', () => {
    const workflow = { /* ... */ };
    const graph = parseN8n(JSON.stringify(workflow));
    const findings = myNewRule(graph, ctx);
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('MY-NEW-RULE');
  });
});
```

### 2. Run Tests (They Should Fail)

```bash
npm run test:watch -- --grep "MY-NEW-RULE"
```

### 3. Implement the Rule

```typescript
// src/validation/rules/my-new-rule.ts
import type { Graph, Finding, RuleRunner, RuleContext } from '@replikanti/flowlint-core';
import type { RuleMetadata } from '../types.js';

export const metadata: RuleMetadata = {
  id: 'MY-NEW-RULE',
  name: 'my_new_rule',
  severity: 'must',
  description: 'Description of what the rule checks',
  details: 'How to fix violations',
  category: 'codika',
};

export const myNewRule: RuleRunner = (graph: Graph, ctx: RuleContext): Finding[] => {
  const findings: Finding[] = [];
  // Implementation...
  return findings;
};
```

### 4. Register the Rule

```typescript
// src/validation/rules/index.ts
import { myNewRule } from './my-new-rule.js';

export const customRules: RuleRunner[] = [
  codikaInitRequired,
  codikaSubmitResult,
  myNewRule,  // Add here
];
```

### 5. Run Tests Again (They Should Pass)

```bash
npm test
```

## Test Utilities

### `loadWorkflowFixture(filename)`

Load a workflow JSON file from `tests/fixtures/workflows/`:

```typescript
const { content, graph } = loadWorkflowFixture('valid-parent-workflow.json');
```

### `createRuleContext(path?)`

Create a rule context for testing:

```typescript
const ctx = createRuleContext('my-workflow.json');
```

### `createMinimalWorkflow(options)`

Create a minimal workflow JSON for quick tests:

```typescript
const workflowJson = createMinimalWorkflow({
  hasCodikaInit: true,
  hasSubmitResult: false,
  isSubworkflow: false,
});
const graph = parseN8n(workflowJson);
```

### `expectFindingWithRule(findings, ruleId)`

Assert that findings contain a specific rule:

```typescript
const finding = expectFindingWithRule(findings, 'CODIKA-INIT');
expect(finding.severity).toBe('must');
```

### `expectNoFindingWithRule(findings, ruleId)`

Assert that findings do NOT contain a specific rule:

```typescript
expectNoFindingWithRule(findings, 'CODIKA-INIT');
```

## Writing Fixture Workflows

When creating test fixtures:

1. **Keep them minimal** - Only include nodes relevant to the test
2. **Use descriptive names** - `missing-codika-init.json`, not `test1.json`
3. **Document the purpose** - Add comments explaining what the fixture tests

Example minimal workflow:

```json
{
  "name": "Test Workflow",
  "nodes": [
    { "id": "1", "name": "Trigger", "type": "n8n-nodes-base.webhook", "position": [0, 0], "parameters": {} },
    { "id": "2", "name": "Process", "type": "n8n-nodes-base.code", "position": [220, 0], "parameters": {} }
  ],
  "connections": {
    "Trigger": { "main": [[{ "node": "Process", "type": "main", "index": 0 }]] }
  },
  "settings": { "executionOrder": "v1" }
}
```

## Testing Auto-Fix Functionality

For fixable rules/scripts, test both detection and fixing:

```typescript
describe('auto-fix functionality', () => {
  it('should provide a fix function', () => {
    const content = `invalid content`;
    const findings = checkSomething(content, 'test.json');

    expect(findings[0].fixable).toBe(true);
    expect(findings[0].fix).toBeDefined();
  });

  it('should correctly fix the issue', () => {
    const content = `invalid content`;
    const findings = checkSomething(content, 'test.json');

    const fixed = findings[0].fix?.apply(content);
    expect(fixed).toBe(`valid content`);
  });
});
```

## Coverage Goals

- **Rules**: 100% branch coverage for all rule logic
- **Scripts**: 100% coverage for detection + fix functions
- **Edge cases**: Test empty inputs, malformed data, edge conditions
