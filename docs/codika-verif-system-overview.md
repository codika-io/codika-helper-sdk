# Codika Workflow Verification Rules

This document describes all validation rules used by the Codika Helper SDK to verify workflow and use-case configurations.

## Overview

The validation system has **14 validators** organized into 3 categories:

| Category | Count | Purpose |
|----------|-------|---------|
| **Flowlint Rules** | 3 | Graph-based workflow structure validation |
| **Workflow Scripts** | 7 | JSON content validation for individual workflows |
| **Use-Case Scripts** | 4 | Project-level configuration validation |

### Severity Levels

- **must** - Critical errors that will cause deployment or runtime failures
- **should** - Best practices and recommendations

---

## Flowlint Rules

These rules use graph analysis to validate workflow structure.

### CODIKA-INIT

| Property | Value |
|----------|-------|
| **Rule ID** | `CODIKA-INIT` |
| **Severity** | `must` |
| **Fixable** | No |
| **Category** | Codika Nodes |

**Description:** Parent workflows must have Codika Init as the second node (after trigger).

**What It Checks:**
- Finds the trigger node (webhook, schedule, manual trigger, etc.)
- Verifies the next node is a Codika node with `initWorkflow` or `initDataIngestion` operation
- Sub-workflows (starting with Execute Workflow Trigger) are exempt

**Valid Example:**
```
[Webhook Trigger] → [Codika Init] → [Other Nodes] → [Codika Submit Result]
```

**Invalid Example:**
```
[Webhook Trigger] → [HTTP Request] → [Codika Init] → ...  ❌ Init not second
```

---

### CODIKA-SUBMIT

| Property | Value |
|----------|-------|
| **Rule ID** | `CODIKA-SUBMIT` |
| **Severity** | `must` |
| **Fixable** | No |
| **Category** | Codika Nodes |

**Description:** Parent workflows must end with Codika Submit Result or Report Error.

**What It Checks:**
- Finds all terminal nodes (nodes with no outgoing edges)
- Verifies each terminal is a Codika node with `submitResult` or `reportError` operation
- Sub-workflows are exempt (they return data to parent workflow)

**Valid Terminal Nodes:**
- Codika Submit Result (`submitResult`)
- Codika Report Error (`reportError`)

**Invalid Terminal Nodes:**
- Respond to Webhook
- Stop and Output
- No Operation
- Any other node type

---

### SUBWKFL-MIN-PARAMS

| Property | Value |
|----------|-------|
| **Rule ID** | `SUBWKFL-MIN-PARAMS` |
| **Severity** | `must` |
| **Fixable** | No |
| **Category** | Sub-workflows |

**Description:** Sub-workflows must have at least 1 input parameter.

**Why:** n8n enforces `minRequiredFields: 1` on Execute Workflow nodes. A sub-workflow without parameters will fail at runtime.

**What It Checks:**
- Finds Execute Workflow Trigger node
- Counts input parameters in `workflowInputs.values` array
- Reports error if count is 0

---

## Workflow Scripts

These scripts validate the JSON content of individual workflow files.

### CRED-PLACEHOLDER

| Property | Value |
|----------|-------|
| **Rule ID** | `CRED-PLACEHOLDER` |
| **Severity** | `should` |
| **Fixable** | No |
| **Category** | Credentials |

**Description:** Credential references should use proper placeholders, not hardcoded IDs.

**Valid Credential Types:**

| Type | ID Pattern | NAME Pattern | Use Case |
|------|------------|--------------|----------|
| FLEXCRED | `{{FLEXCRED_NAME_ID_DERCXELF}}` | `{{FLEXCRED_NAME_NAME_DERCXELF}}` | Flexible (org first, fallback to user) |
| USERCRED | `{{USERCRED_NAME_ID_DERCRESU}}` | `{{USERCRED_NAME_NAME_DERCRESU}}` | User-specific credentials |
| ORGCRED | `{{ORGCRED_NAME_ID_DERCGRO}}` | `{{ORGCRED_NAME_NAME_DERCGRO}}` | Organization-wide credentials |
| INSTCRED | `{{INSTCRED_NAME_ID_DERCTSNI}}` | `{{INSTCRED_NAME_NAME_DERCTSNI}}` | Instance-level credentials |

**What It Checks:**
- Both `id` and `name` fields must use placeholders
- ID field must contain `_ID_` marker
- NAME field must contain `_NAME_` marker
- Suffix must match the credential type
- Types must match between id and name

**Valid Example:**
```json
"credentials": {
  "anthropicApi": {
    "id": "{{FLEXCRED_ANTHROPIC_ID_DERCXELF}}",
    "name": "{{FLEXCRED_ANTHROPIC_NAME_DERCXELF}}"
  }
}
```

**Invalid Examples:**
```json
// Hardcoded ID
"id": "12345-abcde-67890"  ❌

// Missing _ID_ marker
"id": "{{FLEXCRED_ANTHROPIC_DERCXELF}}"  ❌

// Wrong suffix
"id": "{{FLEXCRED_ANTHROPIC_ID_DERCRESU}}"  ❌

// Mismatched types
"id": "{{FLEXCRED_ANTHROPIC_ID_DERCXELF}}",
"name": "{{USERCRED_ANTHROPIC_NAME_DERCRESU}}"  ❌
```

---

### INSTPARM-QUOTE

| Property | Value |
|----------|-------|
| **Rule ID** | `INSTPARM-QUOTE` |
| **Severity** | `must` |
| **Fixable** | Yes |
| **Category** | Placeholders |

**Description:** INSTPARM placeholders should not be wrapped in quotes.

**Why:** Quoted placeholders become string literals instead of being replaced with actual values at runtime.

**What It Checks:**
- Searches for patterns like `'{{INSTPARM_..._MRAPTSNI}}'` or `"{{INSTPARM_..._MRAPTSNI}}"`
- Reports error for each quoted placeholder found

**Valid:**
```json
"value": {{INSTPARM_MY_PARAM_MRAPTSNI}}
```

**Invalid:**
```json
"value": "{{INSTPARM_MY_PARAM_MRAPTSNI}}"  ❌
```

**Auto-Fix:** Removes the surrounding quotes automatically.

---

### PLACEHOLDER-SYNTAX

| Property | Value |
|----------|-------|
| **Rule ID** | `PLACEHOLDER-SYNTAX` |
| **Severity** | `must` |
| **Fixable** | Yes (for known types) |
| **Category** | Placeholders |

**Description:** Placeholders must use correct suffix format.

**Known Placeholder Types:**

| Prefix | Required Suffix | Purpose |
|--------|-----------------|---------|
| `ORGSECRET` | `TERCESORG` | Organization secrets |
| `PROCDATA` | `ATADCORP` | Process data |
| `USERDATA` | `ATADRESU` | User data |
| `MEMSECRT` | `TRCESMEM` | Member secrets |
| `FLEXCRED` | `DERCXELF` | Flexible credentials |
| `USERCRED` | `DERCRESU` | User credentials |
| `ORGCRED` | `DERCGRO` | Organization credentials |
| `INSTCRED` | `DERCTSNI` | Instance credentials |
| `SUBWKFL` | `LFKWBUS` | Sub-workflow references |
| `INSTPARM` | `MRAPTSNI` | Instance parameters |

**What It Checks:**
1. **Known placeholders with wrong suffix** → `must` severity
2. **Unknown/unrecognized placeholders** → `should` severity (warning)

**Valid:**
```
{{ORGSECRET_ERROR_WORKFLOW_ID_TERCESORG}}
{{PROCDATA_PROCESS_ID_ATADCORP}}
{{USERDATA_USER_EMAIL_ATADRESU}}
```

**Invalid:**
```
{{ORGSECRET_KEY_GROESCRET}}  ❌ Wrong suffix
{{CUSTOM_PLACEHOLDER}}  ❌ Unknown type
```

**Auto-Fix:** Corrects suffix for known placeholder types.

---

### WORKFLOW-SANITIZATION

| Property | Value |
|----------|-------|
| **Rule ID** | `WORKFLOW-SANITIZATION` |
| **Severity** | `must` |
| **Fixable** | Yes |
| **Category** | Sanitization |

**Description:** Workflows must not contain n8n-generated properties.

**Forbidden Properties:**

| Property | Why Remove |
|----------|------------|
| `id` | Assigned by n8n when saved - varies per environment |
| `versionId` | Updated on every save - varies per environment |
| `meta` | n8n metadata with instanceId - varies per environment |
| `active` | Activation status - should be set through deployment |
| `tags` | n8n tags - environment-specific |
| `pinData` | Pinned execution data - development/debug only |

**Valid Workflow (sanitized):**
```json
{
  "name": "My Workflow",
  "nodes": [...],
  "connections": {...},
  "settings": {...}
}
```

**Invalid (unsanitized from n8n export):**
```json
{
  "id": "abc123",           ❌
  "versionId": "v1.2.3",    ❌
  "name": "My Workflow",
  "meta": {...},            ❌
  "active": true,           ❌
  "tags": [...],            ❌
  "pinData": {...},         ❌
  "nodes": [...],
  "connections": {...},
  "settings": {...}
}
```

**Auto-Fix:** Removes all forbidden properties automatically.

---

### WORKFLOW-SETTINGS

| Property | Value |
|----------|-------|
| **Rule ID** | `WORKFLOW-SETTINGS` |
| **Severity** | `must` |
| **Fixable** | Yes |
| **Category** | Settings |

**Description:** Workflows must have required settings.

**Required Settings:**

| Setting | Required Value | Purpose |
|---------|---------------|---------|
| `errorWorkflow` | `{{ORGSECRET_ERROR_WORKFLOW_ID_TERCESORG}}` | Routes errors to global error handler |
| `executionOrder` | `v1` | Ensures consistent depth-first execution |

**Valid:**
```json
"settings": {
  "errorWorkflow": "{{ORGSECRET_ERROR_WORKFLOW_ID_TERCESORG}}",
  "executionOrder": "v1"
}
```

**Invalid:**
```json
"settings": {
  "executionOrder": "v1"
  // Missing errorWorkflow  ❌
}
```

```json
"settings": {
  "errorWorkflow": "my-error-workflow",  // Wrong value  ❌
  "executionOrder": "v1"
}
```

**Auto-Fix:** Adds or corrects both required settings.

---

### LLM-OUTPUT-ACCESS

| Property | Value |
|----------|-------|
| **Rule ID** | `LLM-OUTPUT-ACCESS` |
| **Severity** | `must` |
| **Fixable** | Yes |
| **Category** | AI Nodes |

**Description:** LLM chain outputs must be accessed via `.output` property when using structured output parser.

**Why:** When `chainLlm` is used with `outputParserStructured`, the result is wrapped in an `output` property. Accessing fields directly without `.output` will fail at runtime.

**What It Checks:**
- Finds `chainLlm` nodes with `hasOutputParser: true`
- Checks downstream nodes for direct `$json.fieldName` access (should be `$json.output.fieldName`)
- Checks all nodes for named references like `$('LLM Node').first().json.fieldName` (should include `.output`)

**Valid Examples:**
```javascript
// Direct access in connected node
$json.output.translated_text

// Named reference from any node
$('Translate').first().json.output.translated_text
$('Classify').item.json.output.confidence
```

**Invalid Examples:**
```javascript
// Missing .output prefix
$json.translated_text  ❌

// Named reference missing .output
$('Translate').first().json.translated_text  ❌
$('Classify').item.json.confidence  ❌
```

**Exceptions:**
- Agent nodes (`@n8n/n8n-nodes-langchain.agent`) - they don't wrap output
- `chainLlm` without `hasOutputParser: true` - no wrapper expected
- Defensive patterns like `$json.output?.field || $json.field` - acceptable fallback

**Auto-Fix:** Inserts `.output` after `$json.` or `.json.` where missing.

---

### WEBHOOK-ID

| Property | Value |
|----------|-------|
| **Rule ID** | `WEBHOOK-ID` |
| **Severity** | `must` |
| **Fixable** | Yes |
| **Category** | Webhook |

**Description:** Webhook nodes must have a `webhookId` property for production webhook registration.

**Why:** Without `webhookId`, the webhook path is never registered in production even when the workflow is active, causing 404 errors at runtime.

**What It Checks:**
- Finds all `n8n-nodes-base.webhook` nodes
- Verifies each has a `webhookId` string property at the node level (sibling to `name`, `type`, `parameters`)

**Valid:**
```json
{
  "name": "HTTP Trigger",
  "type": "n8n-nodes-base.webhook",
  "typeVersion": 2,
  "webhookId": "http-trigger",
  "parameters": { "path": "my-webhook" }
}
```

**Invalid:**
```json
{
  "name": "HTTP Trigger",
  "type": "n8n-nodes-base.webhook",
  "typeVersion": 2,
  "parameters": { "path": "my-webhook" }
  // Missing webhookId  ❌
}
```

**Auto-Fix:** Generates a `webhookId` by slugifying the node name (e.g., `"HTTP Trigger"` → `"http-trigger"`).

---

## Use-Case Scripts

These scripts validate project-level configuration across the entire use-case folder.

### CONFIG-EXPORTS

| Property | Value |
|----------|-------|
| **Rule ID** | `CONFIG-EXPORTS` |
| **Severity** | `must` |
| **Fixable** | No |
| **Category** | Configuration |

**Description:** config.ts must export required members.

**Required Exports:**

| Export | Type | Purpose |
|--------|------|---------|
| `PROJECT_ID` | `string` | Unique identifier for the project |
| `WORKFLOW_FILES` | `string[]` | Array of workflow file paths |
| `getConfiguration` | `function` | Returns configuration object |

**Valid config.ts:**
```typescript
export const PROJECT_ID = 'my-project-id';

export const WORKFLOW_FILES = [
  join(__dirname, 'workflows/main.json'),
  join(__dirname, 'workflows/helper.json'),
];

export function getConfiguration() {
  return {
    title: 'My Project',
    // ...
  };
}
```

---

### CONFIG-WORKFLOWS

| Property | Value |
|----------|-------|
| **Rule ID** | `CONFIG-WORKFLOWS` |
| **Severity** | `must` |
| **Fixable** | No |
| **Category** | Configuration |

**Description:** WORKFLOW_FILES must match actual workflow files.

**What It Checks:**
1. `workflows/` folder exists
2. All JSON files in `workflows/` are valid JSON
3. All files in `WORKFLOW_FILES` exist on disk
4. All files in `workflows/` are listed in `WORKFLOW_FILES`

**Common Errors:**
- File in WORKFLOW_FILES doesn't exist → Remove from array or create file
- File in workflows/ not listed → Add to WORKFLOW_FILES or delete file

---

### SCHEMA-TYPES

| Property | Value |
|----------|-------|
| **Rule ID** | `SCHEMA-TYPES` |
| **Severity** | `must` |
| **Fixable** | No |
| **Category** | Schema |

**Description:** Schema field types must be valid.

**Valid Field Types:**

| Category | Types |
|----------|-------|
| Basic | `string`, `text`, `number`, `boolean`, `date` |
| Selection | `select`, `multiselect`, `radio` |
| Complex | `file`, `array`, `object`, `objectArray` |
| Layout | `section` |

**Valid:**
```typescript
inputSchema: [
  { name: 'email', type: 'string', required: true },
  { name: 'count', type: 'number' },
  { name: 'options', type: 'select', options: [...] },
]
```

**Invalid:**
```typescript
inputSchema: [
  { name: 'data', type: 'unknown_type' }  ❌
]
```

---

### SUBWKFL-REFERENCES

| Property | Value |
|----------|-------|
| **Rule ID** | `SUBWKFL-REFERENCES` |
| **Severity** | `must` |
| **Fixable** | No |
| **Category** | References |

**Description:** SUBWKFL placeholders must reference existing template IDs.

**What It Checks:**
- Extracts all `workflowTemplateId` values from config.ts
- Finds all `{{SUBWKFL_<ID>_LFKWBUS}}` placeholders in workflow files
- Verifies each ID exists in config.ts

**Valid:**
```typescript
// config.ts
workflows: [
  { workflowTemplateId: 'helper-workflow', ... }
]
```
```json
// workflow.json
"workflowId": "{{SUBWKFL_HELPER_WORKFLOW_LFKWBUS}}"
```

**Invalid:**
```json
// workflow.json - references non-existent template
"workflowId": "{{SUBWKFL_NONEXISTENT_LFKWBUS}}"  ❌
```

---

## Quick Reference

### By Severity

**Must (Critical - 13 rules):**
- CODIKA-INIT, CODIKA-SUBMIT, SUBWKFL-MIN-PARAMS
- INSTPARM-QUOTE, PLACEHOLDER-SYNTAX, WORKFLOW-SANITIZATION, WORKFLOW-SETTINGS
- LLM-OUTPUT-ACCESS, WEBHOOK-ID
- CONFIG-EXPORTS, CONFIG-WORKFLOWS, SCHEMA-TYPES, SUBWKFL-REFERENCES

**Should (Recommended - 1 rule):**
- CRED-PLACEHOLDER

### By Auto-Fix Capability

**Fixable (6 rules):**
- INSTPARM-QUOTE - Removes quotes around placeholders
- PLACEHOLDER-SYNTAX - Corrects suffix for known types
- WORKFLOW-SANITIZATION - Removes forbidden properties
- WORKFLOW-SETTINGS - Adds/corrects required settings
- LLM-OUTPUT-ACCESS - Adds .output prefix for LLM chain outputs
- WEBHOOK-ID - Adds webhookId derived from node name

**Not Fixable (8 rules):**
- CODIKA-INIT, CODIKA-SUBMIT, SUBWKFL-MIN-PARAMS
- CRED-PLACEHOLDER
- CONFIG-EXPORTS, CONFIG-WORKFLOWS, SCHEMA-TYPES, SUBWKFL-REFERENCES

### Test Coverage

Total: **365 tests** across 14 test files

| Validator | Tests |
|-----------|-------|
| PLACEHOLDER-SYNTAX | 123 |
| CRED-PLACEHOLDER | 47 |
| WEBHOOK-ID | 32 |
| WORKFLOW-SANITIZATION | 27 |
| WORKFLOW-SETTINGS | 26 |
| LLM-OUTPUT-ACCESS | 23 |
| CODIKA-INIT | 18 |
| CODIKA-SUBMIT | 13 |
| CONFIG-WORKFLOWS | 9 |
| CONFIG-EXPORTS | 10 |
| SUBWKFL-REFERENCES | 14 |
| SUBWKFL-MIN-PARAMS | 8 |
| INSTPARM-QUOTE | ~10 |
| SCHEMA-TYPES | ~5 |
