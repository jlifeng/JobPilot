/**
 * Unified Template Renderer
 *
 * This module provides a unified template rendering system that works for both
 * preview (React) and export (HTML string) contexts.
 *
 * Key features:
 * - Single source of truth for template definitions
 * - Consistent rendering across preview and export
 * - Fallback to legacy templates for backward compatibility
 *
 * Usage:
 * ```typescript
 * import { getUnifiedTemplate, hasUnifiedTemplate } from '@/lib/template-renderer';
 *
 * if (hasUnifiedTemplate('classic')) {
 *   const template = getUnifiedTemplate('classic');
 *   const html = template.buildHtml(resume); // For export
 *   // <template.PreviewComponent resume={resume} /> // For preview
 * }
 * ```
 */

// Types
export type {
  CanonicalResume,
  CanonicalSection,
  SectionType,
  TemplateRenderContext,
  TemplateHelpers,
  TemplateProps,
  UnifiedTemplate,
  TemplateRegistry,
  RenderMode,
  RenderOptions,
} from './types';

// Utilities
export {
  md,
  esc,
  degreeField,
  formatDate,
  isSectionEmpty,
  visibleSections,
  getPersonalInfo,
  getContactList,
  buildHighlights,
  toCanonicalResume,
} from './template-contract';

// Template registry
import type { UnifiedTemplate, TemplateRegistry } from './types';

const templateRegistry: TemplateRegistry = new Map();

/**
 * Register a unified template.
 */
export function registerTemplate(template: UnifiedTemplate): void {
  templateRegistry.set(template.id, template);
}

/**
 * Get a unified template by ID.
 * Returns undefined if not found.
 */
export function getUnifiedTemplate(id: string): UnifiedTemplate | undefined {
  return templateRegistry.get(id);
}

/**
 * Check if a unified template exists.
 */
export function hasUnifiedTemplate(id: string): boolean {
  return templateRegistry.has(id);
}

/**
 * Get all registered unified template IDs.
 */
export function getUnifiedTemplateIds(): string[] {
  return Array.from(templateRegistry.keys());
}

// Register unified templates
import { classicTemplate } from './templates/classic';
import { modernTemplate } from './templates/modern';
import { modernMinimalTemplate } from './templates/modern-minimal';

registerTemplate(classicTemplate);
registerTemplate(modernTemplate);
registerTemplate(modernMinimalTemplate);
