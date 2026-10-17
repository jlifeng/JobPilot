# Markdown editor for resume highlights

## Goal

Make each highlight entry use the same Markdown editing capability as the
project description, including bold, italic, inline code, and links. Ensure
Markdown formatting renders with a visibly different treatment in both the
editor preview and resume output.

## Scope

- Use a reusable Markdown list editor for highlights in projects, work
  experience, and education.
- Preserve add, remove, drag reorder, and index-stable editing behavior.
- Support bold, italic, inline code, strikethrough, links, and bullet-list
  continuation in the lightweight resume Markdown renderer.
- Add explicit Markdown typography styles to the editor preview instead of
  relying on the unavailable Typography plugin.
- Keep stored highlight values as plain Markdown strings; no schema migration.
- Keep the existing project description editor behavior unchanged.

## Acceptance checks

- Project, work, and education highlights each expose a Markdown toolbar and
  preview toggle per entry.
- Bold, italic, inline code, strikethrough, and links visibly render in the
  editor preview.
- Resume preview and PDF/HTML/DOCX exports preserve supported inline Markdown
  formatting inside highlights.
- Add/remove/reorder still updates the correct highlight entries.
- Type-check, desktop build, tests, lint boundary, and migration verification
  pass.
