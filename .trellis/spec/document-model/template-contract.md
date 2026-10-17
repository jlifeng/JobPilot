# Template Rendering Contract

> Contract for unified template rendering across preview and export contexts.

---

## Overview

This document defines the contract that all unified templates must follow to ensure consistent rendering in both preview (React) and export (HTML string) contexts.

---

## Template Interface

### Unified Template Definition

Every unified template must implement:

```typescript
interface UnifiedTemplate {
  // Unique template identifier (matches resume.template field)
  id: string;

  // React component for preview
  PreviewComponent: React.FC<TemplateProps>;

  // HTML builder for export
  buildHtml: (resume: CanonicalResume) => string;

  // Optional: template-specific styles
  styles?: TemplateStyles;
}
```

### Template Props

```typescript
interface TemplateProps {
  resume: CanonicalResume;
  context?: TemplateRenderContext;
}
```

---

## Rendering Contract

### 1. Input Contract

Templates MUST:
- Accept a single `resume` prop containing canonical resume data
- Treat zero or missing GitHub star counts as absent metadata; a GitHub star
  badge renders only when `stars > 0`
- Use the provided helper functions for text processing
- Respect theme configuration for colors, fonts, spacing

Templates MUST NOT:
- Access external state or make API calls
- Modify the input resume data
- Use browser-specific APIs directly

### 2. Output Contract

Preview (React):
- Render a single root `<div>` element
- Use Tailwind CSS classes for styling
- Include `data-section` attributes on section containers

Export (HTML):
- Return a complete HTML string
- Use the same Tailwind CSS classes as preview
- Include `data-section` attributes on section containers

### 3. Consistency Contract

Both preview and export MUST produce visually identical output:
- Same HTML structure
- Same CSS classes
- Same text processing (markdown, escaping)
- Same date formatting
- Same section ordering

---

## Helper Functions

### Core Helpers (Required)

All templates must use these helpers for consistency:

| Helper | Purpose | Usage |
|--------|---------|-------|
| `md(text)` | Markdown to HTML | For descriptions, summaries |
| `esc(text)` | HTML escape | For all user-provided text |
| `degreeField(d, f)` | Format degree + field | For education sections |
| `formatDate(start, end, current, lang)` | Format date range | For work, education, projects |

### Section Helpers

| Helper | Purpose |
|--------|---------|
| `isSectionEmpty(section)` | Check if section has content |
| `visibleSections(resume)` | Get ordered, visible sections |
| `getPersonalInfo(resume)` | Extract personal info section |

---

## Template Registration

Templates are registered in a central registry:

```typescript
// src/lib/template-renderer/registry.ts
const templateRegistry: Map<string, UnifiedTemplate> = new Map();

function registerTemplate(template: UnifiedTemplate): void {
  templateRegistry.set(template.id, template);
}

function getTemplate(id: string): UnifiedTemplate | undefined {
  return templateRegistry.get(id);
}
```

---

## Fallback Mechanism

When a unified template is not available:

1. Check unified template registry
2. If not found, fall back to legacy preview component
3. If not found, fall back to legacy export builder
4. If still not found, use default (classic) template

```typescript
function renderPreview(resume: Resume): React.ReactNode {
  const unified = getTemplate(resume.template);
  if (unified) {
    return <unified.PreviewComponent resume={toCanonicalResume(resume)} />;
  }
  // Fallback to legacy
  const LegacyComponent = legacyTemplateMap[resume.template] || ClassicTemplate;
  return <LegacyComponent resume={resume} />;
}
```

---

## CSS Class Conventions

### Layout Classes

| Class | Purpose |
|-------|---------|
| `max-w-[210mm]` | A4 width constraint |
| `bg-white` | Background color |
| `shadow-lg` | Shadow for preview |

### Section Classes

| Class | Purpose |
|-------|---------|
| `data-section` | Section container marker |
| `mb-5`, `mb-6` | Section spacing |

### Typography Classes

| Class | Purpose |
|-------|---------|
| `text-zinc-900` | Primary text |
| `text-zinc-600` | Secondary text |
| `text-zinc-400` | Muted text |
| `font-bold`, `font-semibold` | Emphasis |

---

## Testing Contract

### Parity Tests

Each unified template must pass parity tests:

1. **Structure parity**: Same HTML structure in both contexts
2. **Class parity**: Same CSS classes in both contexts
3. **Content parity**: Same text content in both contexts
4. **Visual parity**: Visually identical rendering

### Test Template

```typescript
const canonical = toCanonicalResume(resume);
const previewHtml = renderToStaticMarkup(
  <template.PreviewComponent resume={canonical} />
);
const exportHtml = template.buildHtml(canonical);

expect(countSections(previewHtml)).toBe(countSections(exportHtml));
expect(previewHtml).toContain('Summary');
expect(exportHtml).toContain('Summary');
```

### GitHub Star Visibility

`normalizeSectionContentForRender('github', content)` removes `language` and
deletes `stars` when it is not a positive number. Both preview and export must
also guard their star UI with `stars > 0`, because legacy builders may receive
non-canonical data directly. Cover every unified template with a fixture that
contains one zero-star repo and one positive-star repo; assert that the repo
content still appears, `0` does not render as a star value, and the positive
value does.

### Markdown Field Contract

Resume Markdown fields (summaries, descriptions, and highlights) use
`renderInlineMarkdown()` / `renderMarkdownBlocks()` from `src/lib/markdown.ts`.
Supported inline syntax is bold, italic, strikethrough, inline code, and
absolute HTTP(S) links. Source HTML is always escaped. Preview and HTML/PDF
export must call the same helper; DOCX uses `parseInlineMarkdownRuns()`. The
editor preview uses `.editor-markdown-preview`, and template output can use
`.resume-markdown`, so formatting remains visible without the Tailwind
Typography plugin. Regression tests must cover raw-marker removal, safe
escaping, list-item formatting, and at least one unified-template export path.

---

## Migration Checklist

When migrating a template to unified implementation:

- [ ] Create unified template file
- [ ] Implement PreviewComponent (React)
- [ ] Implement buildHtml (HTML string)
- [ ] Register in template registry
- [ ] Update preview to use registry with fallback
- [ ] Update export to use registry with fallback
- [ ] Add parity tests
- [ ] Verify visual consistency
- [ ] Remove legacy template files (optional, after validation)
