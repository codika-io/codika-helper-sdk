/**
 * Slug utility for generating URL-safe identifiers from display names.
 */

/**
 * Convert a display name to a URL-safe slug.
 * "My Translation Service" → "my-translation-service"
 */
export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
