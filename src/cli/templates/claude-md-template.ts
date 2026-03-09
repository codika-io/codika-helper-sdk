/**
 * CLAUDE.md Template
 *
 * Generates a CLAUDE.md file for use case folders so AI agents
 * immediately understand the Codika context, patterns, and available tooling.
 */

export interface ClaudeMdTemplateParams {
  name: string;
  slug: string;
}

export function generateClaudeMd(params: ClaudeMdTemplateParams): string {
  return `# ${params.name} — Codika Use Case

This folder is a **Codika use case**: a set of n8n workflow templates and deployment configuration managed by the \`codika\` CLI (\`@codika-io/helper-sdk\`). Codika is a multi-tenant SaaS platform that orchestrates n8n workflows — you design workflow templates with placeholders, deploy them, and the platform creates personalized copies for each user with their own credentials and parameters.

## Folder Structure

| File / Folder | Purpose |
|---|---|
| \`config.ts\` | Deployment configuration. Exports \`WORKFLOW_FILES\` (array of workflow paths) and \`getConfiguration()\` (metadata, workflow definitions, triggers, input/output schemas, integrations, tags). |
| \`workflows/\` | n8n workflow JSON files. Each file is one workflow template with placeholder tokens. |
| \`data-ingestion/\` | *(Optional)* Embedding pipeline workflow for RAG-enabled processes. |
| \`version.json\` | Local semantic version (\`X.Y.Z\`). Automatically incremented on each deploy. |
| \`project.json\` | Links this use case to a Codika project (\`projectId\`, \`organizationId\`, and \`deployments\` map after first deploy). |

## Mandatory Workflow Pattern

Every **parent workflow** (not sub-workflows) must follow this exact node sequence:

\`\`\`
Trigger → Codika Init → [Business Logic] → IF (success?)
                                              ├─ Yes → Codika Submit Result
                                              └─ No  → Codika Report Error
\`\`\`

**Sub-workflows** start with \`Execute Workflow Trigger\` and do NOT include Codika Init, Submit Result, or Report Error nodes. They must have at least 1 input parameter.

**Critical rules:**
- Never place a Merge node before a terminal Codika node (Submit Result / Report Error) — it stalls the execution.
- The Codika Init node must be the first node after the trigger, with no other nodes in between.

## Codika Nodes

Six custom nodes from the \`n8n-nodes-codika\` package:

| Node | Resource | Purpose |
|---|---|---|
| **Codika Init** | \`initializeExecution\` | Registers the execution with the platform, provides resolved credentials and parameters. |
| **Codika Submit Result** | \`workflowOutputs\` | Reports successful completion with result data. |
| **Codika Report Error** | \`errorHandling\` | Reports failure with an error message and type (\`node_failure\`, \`validation_error\`, \`external_api_error\`, \`timeout\`). |
| **Codika Upload File** | — | Uploads a file to Codika storage, returns a \`documentId\`. |
| **Codika Init Data Ingestion** | — | Initializes RAG document embedding workflows. |
| **Codika Ingestion Callback** | — | Reports RAG ingestion status (success/skipped/failed). |

## Placeholder System

Workflow JSON files use placeholder tokens that are replaced at deployment time with real values specific to each user/organization. Format: \`{{TYPE_KEY_REVERSEDSUFFIX}}\` where the suffix is the type name reversed.

| Type | Suffix | Purpose | Example |
|---|---|---|---|
| \`USERDATA\` | \`ATADRESU\` | Per-user runtime values (instance ID, user ID) | \`{{USERDATA_PROCESS_INSTANCE_UID_ATADRESU}}\` |
| \`PROCDATA\` | \`ATADCORP\` | Process-level values (namespace, process ID) | \`{{PROCDATA_NAMESPACE_ATADCORP}}\` |
| \`USERCRED\` | \`DERCRESU\` | User OAuth credentials (Gmail, Calendar, etc.) | \`{{USERCRED_GMAIL_ID_DERCRESU}}\` |
| \`SYSCREDS\` | \`SDERCSYS\` | System-level AI credentials | \`{{SYSCREDS_ANTHROPIC_ID_SDERCSYS}}\` |
| \`ORGCRED\` | \`DERCGRO\` | Organization-level credentials | \`{{ORGCRED_SLACK_ID_DERCGRO}}\` |
| \`ORGSECRET\` | \`TERCESORG\` | Organization secrets (API URLs, keys) | \`{{ORGSECRET_N8N_BASE_URL_TERCESORG}}\` |
| \`FLEXCRED\` | \`DERCXELF\` | AI provider credentials with Codika fallback | \`{{FLEXCRED_OPENAI_ID_DERCXELF}}\` |
| \`MEMSECRT\` | \`TRCESMEM\` | Member-level secrets | \`{{MEMSECRT_EXECUTION_AUTH_TRCESMEM}}\` |
| \`INSTPARM\` | \`MRAPTSNI\` | User-provided deployment parameters | \`{{INSTPARM_COMPANY_NAME_MRAPTSNI}}\` |
| \`INSTCRED\` | \`DERCTSNI\` | Per-instance database credentials | \`{{INSTCRED_SUPABASE_ID_DERCTSNI}}\` |
| \`SUBWKFL\` | \`LFKWBUS\` | Sub-workflow n8n IDs (resolved during deploy) | \`{{SUBWKFL_text-processor_LFKWBUS}}\` |

Do not invent new placeholder types. Use existing types and follow the naming convention exactly.

## Trigger Types

| Type | Description | Config type |
|---|---|---|
| **HTTP** | User-initiated via form submission in the dashboard | \`HttpTrigger\` |
| **Schedule** | Cron-based automation (runs on a timer) | \`ScheduleTrigger\` |
| **Service Event** | External webhook (Gmail, Calendly, WhatsApp, Slack, etc.) | \`ServiceEventTrigger\` |
| **Sub-workflow** | Called by other workflows within this use case (cost: 0) | \`SubworkflowTrigger\` |
| **Data Ingestion** | RAG document embedding pipeline | \`DataIngestionTrigger\` |

## Platform Entities & Deployment Model

The Codika backend manages 4 core Firestore entities:

| Entity | What it is |
|---|---|
| **Process** | Public listing and metadata for the use case. Its ID equals the \`projectId\` from \`project.json\`. |
| **ProcessDeploymentTemplate** | An immutable version snapshot containing the config and all workflow JSON files. Created on each deploy. |
| **ProcessInstance** | A user's installation of the process. Each user gets their own instance (dev or prod environment). |
| **ProcessDeploymentInstance** | The actual running copy with real n8n workflow IDs and resolved credentials/parameters. |

### Deploy flow

1. \`codika deploy use-case .\` validates the use case, base64-encodes workflows, and uploads everything to the platform.
2. The platform creates a new **ProcessDeploymentTemplate** (status: \`inactive\`).
3. On **first deploy**: also creates the Process, a **dev** ProcessInstance, and a dev ProcessDeploymentInstance — then deploys the workflows to n8n.
4. On **subsequent deploys**: creates a new template version and updates the dev instance with new n8n workflows.

### Publish flow

1. Publishing sets the template status from \`inactive\` to \`published\` and deprecates previous templates.
2. Creates a **prod** ProcessInstance and ProcessDeploymentInstance for the owner, deploying prod n8n workflows.
3. **Auto-toggle**: the dev instance is deactivated, the prod instance becomes active.
4. Other users who installed the process get \`hasUpdate: true\` on their instance — they auto-update on their next visit.

### Dev / Prod environments

- **Dev** instance is for testing (created automatically on deploy). Only the process owner has one.
- **Prod** instance is the live version (created on publish). All users get prod instances.
- Only one environment is active at a time for the process owner (auto-toggle between dev and prod).
- When you redeploy after publishing, dev is re-activated and prod is deactivated, so you can test changes before publishing again.

### project.json after deployments

After deploying and publishing, \`project.json\` grows to include a \`deployments\` map:

\`\`\`json
{
  "projectId": "abc123-def456",
  "organizationId": "org_789",
  "deployments": {
    "1.0": { "templateId": "tmpl_...", "deployedAt": "2025-01-15T10:30:00Z" },
    "1.1": { "templateId": "tmpl_...", "deployedAt": "2025-02-01T14:00:00Z" }
  }
}
\`\`\`

The \`deployments\` map tracks every version deployed. The \`templateId\` values are needed when publishing a specific version.

## Development Workflow

1. **Edit** workflow JSON files in \`workflows/\` and update \`config.ts\` to match (triggers, schemas, workflow references).
2. **Validate**: \`codika verify use-case .\` — checks mandatory nodes, placeholder syntax, credential patterns, sub-workflow references. Use \`--fix\` for auto-fixable issues.
3. **Deploy to dev**: \`codika deploy use-case .\` — deploys to the platform, creates/updates dev n8n workflows, increments \`version.json\`.
4. **Test** the dev instance by triggering workflows and checking execution results.
5. **Publish to prod**: promotes the deployed version to production, making it available to users.

## Available CLI Skills

These skills are available when the \`codika\` plugin is installed:

| Skill | What it does |
|---|---|
| \`setup-codika\` | Install the CLI and authenticate with the platform |
| \`create-project\` | Create a new project on the platform (writes \`project.json\`) |
| \`init-use-case\` | Scaffold a new use case folder |
| \`verify-use-case\` | Validate use case structure and rules locally |
| \`deploy-use-case\` | Deploy use case to the platform (dev instance) |
| \`deploy-data-ingestion\` | Deploy data ingestion workflow separately |
| \`deploy-documents\` | Upload stage documentation markdown files |
| \`publish-use-case\` | Promote a deployed version to production |
| \`fetch-use-case\` | Download a deployed use case from the platform |
| \`trigger-workflow\` | Trigger a deployed workflow and optionally poll for results |
| \`get-execution\` | Fetch full execution details for debugging (node-by-node) |
| \`list-executions\` | List recent executions with status overview |

## Documentation

Full platform documentation: https://doc.codika.io
`;
}
