/**
 * Script: LLM-MODEL-ID
 *
 * Checks that LLM model nodes use current, valid model IDs.
 * Uses an allowlist of known-good models per provider node type.
 * Any model not in the allowlist is flagged as a MUST violation with auto-fix.
 *
 * ## Updating the Allowlist
 *
 * When a provider releases new models or retires old ones, update the
 * ALLOWED_MODELS map below. Each entry maps an n8n node type to the list
 * of currently valid model IDs and a default for auto-fix.
 */

import type { Finding, RuleMetadata } from '../types.js';

export const metadata: RuleMetadata = {
  id: 'LLM-MODEL-ID',
  name: 'llm_model_id',
  severity: 'must',
  description: 'LLM model nodes must use current, non-deprecated model IDs',
  details:
    'Retired or unknown model IDs will fail at runtime with "resource not found" errors. ' +
    'Only use model IDs from the provider allowlist. Run with --fix to auto-replace.',
  fixable: true,
  category: 'ai-nodes',
};

// ---------------------------------------------------------------------------
// Allowed models per provider — UPDATE HERE when models change
// ---------------------------------------------------------------------------

interface ProviderModels {
  /** Currently valid model IDs */
  allowed: string[];
  /** Default model ID used for auto-fix when tier cannot be inferred */
  default: string;
  /** Human-readable provider name for messages */
  providerName: string;
  /**
   * Map of keyword patterns to model IDs for smart auto-fix.
   * When a deprecated model contains a keyword (e.g. "haiku"), the
   * corresponding replacement is used instead of the default.
   */
  tierMap: Record<string, string>;
}

const ALLOWED_MODELS: Record<string, ProviderModels> = {
  '@n8n/n8n-nodes-langchain.lmChatAnthropic': {
    providerName: 'Anthropic',
    allowed: [
      'claude-sonnet-4-20250514',
      'claude-opus-4-20250514',
      'claude-haiku-4-5-20251001',
    ],
    default: 'claude-sonnet-4-20250514',
    tierMap: {
      opus: 'claude-opus-4-20250514',
      haiku: 'claude-haiku-4-5-20251001',
      sonnet: 'claude-sonnet-4-20250514',
    },
  },
  // Add more providers as needed:
  // '@n8n/n8n-nodes-langchain.lmChatOpenAi': {
  //   providerName: 'OpenAI',
  //   allowed: ['gpt-4o', 'gpt-4o-mini', ...],
  //   default: 'gpt-4o',
  //   tierMap: { mini: 'gpt-4o-mini' },
  // },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  parameters?: Record<string, unknown>;
}

interface ModelParam {
  __rl?: boolean;
  value?: string;
  mode?: string;
  cachedResultName?: string;
}

/**
 * Extract the model ID string from a node's parameters.
 * Handles both the __rl resource-list pattern and plain string values.
 */
function extractModelId(node: WorkflowNode): string | null {
  const model = node.parameters?.model;
  if (!model) return null;

  if (typeof model === 'string') return model;

  if (typeof model === 'object') {
    const m = model as ModelParam;
    if (typeof m.value === 'string') return m.value;
  }

  return null;
}

/**
 * Pick the best replacement model based on the deprecated model's name.
 * Falls back to the provider default if no tier keyword matches.
 */
function pickReplacement(deprecatedModelId: string, provider: ProviderModels): string {
  const lower = deprecatedModelId.toLowerCase();
  for (const [keyword, replacement] of Object.entries(provider.tierMap)) {
    if (lower.includes(keyword)) {
      return replacement;
    }
  }
  return provider.default;
}

/**
 * Get a human-readable name for a model ID (e.g. "Claude Sonnet 4").
 */
function getDisplayName(modelId: string, provider: ProviderModels): string {
  for (const [keyword, id] of Object.entries(provider.tierMap)) {
    if (id === modelId) {
      return `${provider.providerName} ${keyword.charAt(0).toUpperCase() + keyword.slice(1)}`;
    }
  }
  return modelId;
}

/**
 * Get approximate line number for a node in the workflow JSON.
 */
function getLineNumberForNode(content: string, nodeId: string): number {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`"id": "${nodeId}"`)) {
      return i + 1;
    }
  }
  return 1;
}

// ---------------------------------------------------------------------------
// Main validation function
// ---------------------------------------------------------------------------

export function checkLlmModelId(content: string, path: string): Finding[] {
  const findings: Finding[] = [];

  let workflow: { nodes?: WorkflowNode[] };
  try {
    workflow = JSON.parse(content);
  } catch {
    return findings;
  }

  if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
    return findings;
  }

  for (const node of workflow.nodes) {
    const provider = ALLOWED_MODELS[node.type];
    if (!provider) continue;

    const modelId = extractModelId(node);
    if (!modelId) continue;

    if (provider.allowed.includes(modelId)) continue;

    // Model is not in the allowlist — flag it
    const replacement = pickReplacement(modelId, provider);
    const displayName = getDisplayName(replacement, provider);
    const lineNumber = getLineNumberForNode(content, node.id);

    findings.push({
      rule: metadata.id,
      severity: metadata.severity,
      path,
      message: `Node "${node.name}" uses unknown or deprecated ${provider.providerName} model "${modelId}". Use "${replacement}" (${displayName}).`,
      raw_details:
        `The model "${modelId}" is not in the current ${provider.providerName} allowlist and may be ` +
        `retired. Replace with "${replacement}".\n\n` +
        `Current allowed models: ${provider.allowed.join(', ')}`,
      nodeId: node.id,
      line: lineNumber,
      guideRef: {
        path: 'integrations/anthropic.md',
        section: 'Available Models',
      },
      fixable: true,
      fix: {
        description: `Replace "${modelId}" with "${replacement}"`,
        apply: (fileContent: string) => {
          const parsed = JSON.parse(fileContent);
          const targetNode = parsed.nodes.find((n: WorkflowNode) => n.id === node.id);
          if (targetNode?.parameters?.model) {
            const m = targetNode.parameters.model;
            if (typeof m === 'string') {
              targetNode.parameters.model = replacement;
            } else if (typeof m === 'object' && m.value) {
              m.value = replacement;
              if (m.cachedResultName) {
                m.cachedResultName = displayName;
              }
            }
          }
          return JSON.stringify(parsed, null, 2);
        },
      },
    });
  }

  return findings;
}
