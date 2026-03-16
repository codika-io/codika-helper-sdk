/**
 * Skill Parser
 *
 * Reads and validates skill files from use case directories.
 * Skills follow the Claude Agent Skills format: each skill is a directory
 * containing a SKILL.md file with YAML frontmatter.
 *
 * Structure:
 *   skills/
 *   ├── main-workflow/
 *   │   └── SKILL.md
 *   └── scheduled-report/
 *       └── SKILL.md
 *
 * Frontmatter:
 *   ---
 *   name: my-skill-name         # max 64 chars, lowercase+numbers+hyphens
 *   description: Does something  # max 1024 chars, third person
 *   workflowTemplateId: main-workflow
 *   ---
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import type { SkillDocument } from '../types/process-types.js';

// Claude Agent Skills constraints
const MAX_NAME_LENGTH = 64;
const MAX_DESCRIPTION_LENGTH = 1024;
const NAME_PATTERN = /^[a-z0-9-]+$/;
const RESERVED_WORDS = ['anthropic', 'claude'];

/**
 * Parsed YAML frontmatter from a SKILL.md file.
 */
export interface SkillFrontmatter {
  name?: string;
  description?: string;
  workflowTemplateId?: string;
  [key: string]: string | undefined;
}

/**
 * Parse YAML frontmatter from a markdown string.
 * Uses a simple regex-based parser — no external dependency needed.
 * Handles basic key: value pairs (no nested YAML, no multi-line values).
 */
export function parseSkillFrontmatter(content: string): {
  frontmatter: SkillFrontmatter;
  body: string;
} {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const yamlBlock = match[1];
  const body = match[2];
  const frontmatter: SkillFrontmatter = {};

  for (const line of yamlBlock.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      frontmatter[key] = value;
    }
  }

  return { frontmatter, body };
}

/**
 * Read all skill files from a use case's skills/ directory.
 * Scans for skills/{name}/SKILL.md pattern.
 * Returns empty array if skills/ doesn't exist (backward compatible).
 */
export function readSkillFiles(useCasePath: string): SkillDocument[] {
  const skillsPath = join(useCasePath, 'skills');
  if (!existsSync(skillsPath)) {
    return [];
  }

  const entries = readdirSync(skillsPath);
  const skills: SkillDocument[] = [];

  for (const entry of entries) {
    const entryPath = join(skillsPath, entry);

    // Only process directories
    if (!statSync(entryPath).isDirectory()) {
      continue;
    }

    const skillMdPath = join(entryPath, 'SKILL.md');
    if (!existsSync(skillMdPath)) {
      continue;
    }

    const content = readFileSync(skillMdPath, 'utf-8');
    const { frontmatter } = parseSkillFrontmatter(content);

    skills.push({
      name: frontmatter.name || entry,
      description: frontmatter.description || '',
      workflowTemplateId: frontmatter.workflowTemplateId || entry,
      contentMarkdown: content,
      relativePath: `skills/${entry}/SKILL.md`,
    });
  }

  return skills;
}

/**
 * Validate a skill document against Claude Agent Skills constraints.
 * Returns an array of error strings (empty = valid).
 */
export function validateSkill(
  skill: SkillDocument,
  knownWorkflowTemplateIds: string[],
): string[] {
  const errors: string[] = [];
  const loc = skill.relativePath;

  // Name validation (Claude spec)
  if (!skill.name) {
    errors.push(`${loc}: missing 'name' in frontmatter`);
  } else {
    if (skill.name.length > MAX_NAME_LENGTH) {
      errors.push(
        `${loc}: name '${skill.name}' exceeds ${MAX_NAME_LENGTH} characters (has ${skill.name.length})`,
      );
    }
    if (!NAME_PATTERN.test(skill.name)) {
      errors.push(
        `${loc}: name '${skill.name}' must contain only lowercase letters, numbers, and hyphens`,
      );
    }
    for (const reserved of RESERVED_WORDS) {
      if (skill.name.includes(reserved)) {
        errors.push(
          `${loc}: name '${skill.name}' contains reserved word '${reserved}'`,
        );
      }
    }
  }

  // Description validation (Claude spec)
  if (!skill.description) {
    errors.push(`${loc}: missing 'description' in frontmatter`);
  } else if (skill.description.length > MAX_DESCRIPTION_LENGTH) {
    errors.push(
      `${loc}: description exceeds ${MAX_DESCRIPTION_LENGTH} characters (has ${skill.description.length})`,
    );
  }

  // workflowTemplateId validation
  if (!skill.workflowTemplateId) {
    errors.push(`${loc}: missing 'workflowTemplateId' in frontmatter`);
  } else if (
    knownWorkflowTemplateIds.length > 0 &&
    !knownWorkflowTemplateIds.includes(skill.workflowTemplateId)
  ) {
    errors.push(
      `${loc}: workflowTemplateId '${skill.workflowTemplateId}' does not match any workflow (known: ${knownWorkflowTemplateIds.join(', ')})`,
    );
  }

  return errors;
}
