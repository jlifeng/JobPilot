# Hide zero GitHub star displays

## Goal

When a GitHub repository has no stars, omit the star display from all resume
preview and export surfaces.

## Scope

- Treat zero, missing, empty, and non-numeric star values as "no star display".
- Keep positive star values visible with their existing template styling.
- Apply consistently to shared preview, unified-template HTML/React rendering,
  legacy preview templates, and DOCX output.
- Do not change editor inputs, URL autofill, manual star editing, or GitHub
  refresh behavior.
- Do not hide the repository itself, its URL, language metadata handling, or
  description.

## Acceptance checks

- A zero-star GitHub item renders no star badge, icon, number, or empty layout
  placeholder.
- Positive-star items still render the star count.
- Existing GitHub primary-language cleanup remains intact.
- Type-check, desktop build, relevant tests, and lint boundary checks pass.
