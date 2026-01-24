/**
 * Validation Types
 *
 * Unified types for all validation rules, scripts, and results.
 * Extends the Flowlint Finding type with auto-fix support.
 */

// Re-export core types from flowlint-core
export type {
  Graph,
  RuleRunner,
  RuleContext,
  NodeRef,
  Edge,
  FlowLintConfig,
} from '@replikanti/flowlint-core';

/**
 * Extended Finding type with auto-fix support
 *
 * Compatible with flowlint-core Finding, but adds optional fix capabilities.
 */
export interface Finding {
  /** Rule ID (e.g., "CODIKA-INIT", "CRED-001", "R1") */
  rule: string;

  /** Severity level - determines exit code behavior */
  severity: 'must' | 'should' | 'nit';

  /** File path where the issue was found */
  path: string;

  /** Human-readable description of the issue */
  message: string;

  /** Detailed instructions on how to fix the issue manually */
  raw_details?: string;

  /** Node ID for workflow node-specific issues */
  nodeId?: string;

  /** Line number in the file where the issue was found */
  line?: number;

  /** URL to documentation about this rule */
  documentationUrl?: string;

  /** Reference to the guide section explaining this rule */
  guideRef?: {
    /** Path relative to .guides/ folder (e.g., 'specific/codika-nodes.md') */
    path: string;
    /** Section title within the guide (e.g., 'Critical Workflow Rules') */
    section?: string;
  };

  /** Quick check if an auto-fix is available */
  fixable?: boolean;

  /** Auto-fix function (ESLint-style) */
  fix?: {
    /** Description of what the fix does */
    description: string;
    /** Transform function that applies the fix to file content */
    apply: (content: string) => string;
  };
}

/**
 * Result of applying auto-fixes to a file
 */
export interface FixResult {
  /** Path to the file that was fixed */
  filePath: string;

  /** Number of fixes successfully applied */
  applied: number;

  /** New file content after fixes (empty if dry-run) */
  content: string;

  /** Findings that would be fixed (populated in dry-run mode) */
  wouldFix?: Finding[];
}

/**
 * Summary of validation findings by severity
 */
export interface FindingSummary {
  /** Number of 'must' severity violations (cause exit code 1) */
  must: number;

  /** Number of 'should' severity warnings */
  should: number;

  /** Number of 'nit' severity suggestions */
  nit: number;

  /** Number of issues that can be auto-fixed */
  fixable: number;
}

/**
 * Complete validation result
 */
export interface ValidationResult {
  /** True if no 'must' severity violations (validation passed) */
  valid: boolean;

  /** All findings from all validators */
  findings: Finding[];

  /** Summary counts by severity */
  summary: FindingSummary;

  /** Files that were validated */
  filesValidated: string[];
}

/**
 * Options for workflow validation
 */
export interface WorkflowValidationOptions {
  /** Path to the workflow JSON file */
  path: string;

  /** Treat 'should' severity as 'must' (stricter validation) */
  strict?: boolean;

  /** Apply available auto-fixes */
  fix?: boolean;

  /** Show what would be fixed without applying changes */
  dryRun?: boolean;

  /** Only run specific rules (by rule ID) */
  rules?: string[];
}

/**
 * Options for use-case validation
 */
export interface UseCaseValidationOptions {
  /** Path to the use-case folder */
  path: string;

  /** Treat 'should' severity as 'must' (stricter validation) */
  strict?: boolean;

  /** Skip validation of individual workflow files */
  skipWorkflows?: boolean;

  /** Apply available auto-fixes */
  fix?: boolean;

  /** Show what would be fixed without applying changes */
  dryRun?: boolean;

  /** Only run specific rules (by rule ID) */
  rules?: string[];
}

/**
 * Type for a workflow validation script (non-Flowlint check)
 *
 * Scripts receive the raw file content and path, and return findings.
 * This is different from Flowlint rules which receive a parsed Graph.
 */
export type WorkflowScript = (content: string, path: string) => Finding[];

/**
 * Type for a use-case validation script
 *
 * Scripts receive the use-case folder path and return findings.
 * They can access config.ts, workflows/, and other files as needed.
 */
export type UseCaseScript = (useCasePath: string) => Finding[] | Promise<Finding[]>;

/**
 * Rule/script metadata for documentation and filtering
 */
export interface RuleMetadata {
  /** Unique rule ID (e.g., "CODIKA-INIT") */
  id: string;

  /** Human-readable rule name (e.g., "codika_init_required") */
  name: string;

  /** Default severity */
  severity: 'must' | 'should' | 'nit';

  /** Short description of what the rule checks */
  description: string;

  /** Detailed explanation and fix instructions */
  details: string;

  /** Whether this rule can auto-fix issues */
  fixable?: boolean;

  /** Category for grouping (e.g., "codika", "security", "style") */
  category?: string;
}
