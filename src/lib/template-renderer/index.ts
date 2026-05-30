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
import { consultantTemplate } from './templates/consultant';
import { professionalTemplate } from './templates/professional';
import { atsTemplate } from './templates/ats';
import { minimalTemplate } from './templates/minimal';
import { formalTemplate } from './templates/formal';
import { developerTemplate } from './templates/developer';
import { engineerTemplate } from './templates/engineer';
import { euroTemplate } from './templates/euro';
import { nordicTemplate } from './templates/nordic';
import { timelineTemplate } from './templates/timeline';
import { elegantTemplate } from './templates/elegant';
import { executiveTemplate } from './templates/executive';
import { designerTemplate } from './templates/designer';
import { creativeTemplate } from './templates/creative';
import { compactTemplate } from './templates/compact';
import { cleanTemplate } from './templates/clean';
import { corporateTemplate } from './templates/corporate';
import { twoColumnTemplate } from './templates/two-column';
import { sidebarTemplate } from './templates/sidebar';
import { swissTemplate } from './templates/swiss';
import { financeTemplate } from './templates/finance';
import { medicalTemplate } from './templates/medical';
import { teacherTemplate } from './templates/teacher';
import { legalTemplate } from './templates/legal';
import { scientistTemplate } from './templates/scientist';
import { academicTemplate } from './templates/academic';

registerTemplate(classicTemplate);
registerTemplate(modernTemplate);
registerTemplate(modernMinimalTemplate);
registerTemplate(consultantTemplate);
registerTemplate(professionalTemplate);
registerTemplate(atsTemplate);
registerTemplate(minimalTemplate);
registerTemplate(formalTemplate);
registerTemplate(developerTemplate);
registerTemplate(engineerTemplate);
registerTemplate(euroTemplate);
registerTemplate(nordicTemplate);
registerTemplate(timelineTemplate);
registerTemplate(elegantTemplate);
registerTemplate(executiveTemplate);
registerTemplate(designerTemplate);
registerTemplate(creativeTemplate);
registerTemplate(compactTemplate);
registerTemplate(cleanTemplate);
registerTemplate(corporateTemplate);
registerTemplate(twoColumnTemplate);
registerTemplate(sidebarTemplate);
registerTemplate(swissTemplate);
registerTemplate(financeTemplate);
registerTemplate(medicalTemplate);
registerTemplate(teacherTemplate);
registerTemplate(legalTemplate);
registerTemplate(scientistTemplate);
registerTemplate(academicTemplate);
