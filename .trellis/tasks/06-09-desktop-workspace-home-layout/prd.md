# Desktop Workspace Home Layout

## Goal

Make the desktop home experience feel like a real productivity workspace instead of a centered web dashboard. The primary problem is that maximized desktop windows leave too much unused horizontal space.

## Requirements

- Replace the non-editor top-navigation shell with a desktop-style workspace shell.
- Use a persistent left sidebar for primary app navigation: resume library, interview practice, templates, and settings/about access.
- Let non-editor pages use the full available desktop width instead of a `max-w-7xl` centered container.
- Keep the dashboard as the default home surface, but make it read as a workbench with a main content area and right-side tools/status panel.
- Preserve the existing editor full-screen surface behavior.
- Preserve existing dashboard functionality: create, import, AI generate, search, sort, grid/list switch, resume CRUD actions, interview entry, settings/about/update flows.
- Keep the visual style neutral, compact, and coordinated with existing JobPilot productivity screens.
- Support dark mode and responsive collapse behavior for narrower windows.

## Acceptance Criteria

- [ ] `/` still redirects to `/dashboard`.
- [ ] Non-editor pages render inside a full-width workspace shell with a left navigation rail/sidebar.
- [ ] `/dashboard` no longer appears constrained by large side gutters when the app is maximized.
- [ ] Existing dashboard actions and dialogs still work.
- [ ] The editor route remains `h-screen overflow-hidden` and does not inherit the workspace sidebar.
- [ ] `pnpm build:desktop-shell` passes.

## Technical Approach

- Update `desktop/src/routes/root.tsx` to split editor and non-editor layouts.
- For non-editor routes, replace the website-like header/container with a fixed-height desktop workspace shell: left sidebar + top toolbar + fluid content.
- Update `desktop/src/routes/dashboard.tsx` spacing and grid behavior to use the wider shell gracefully.
- Prefer existing translations and buttons; avoid introducing new user-visible copy unless necessary.

## Decision (ADR-lite)

**Context**: Maximized desktop windows currently expose large empty gutters because the app uses a web-style centered `max-w-7xl` container.

**Decision**: Move toward a Linear/file-manager-style workspace shell: persistent left navigation, compact top toolbar, fluid main content, and a right dashboard panel.

**Consequences**: The app feels more desktop-native and makes better use of wide screens. Some non-editor pages may inherit a more spacious shell, so the implementation must keep constraints local where needed rather than restoring a global web container.

## Out of Scope

- Redesigning resume cards or list rows from scratch.
- Adding new dashboard data sources or recent activity persistence.
- Changing editor layout behavior.
- Changing route structure or desktop backend APIs.

## Technical Notes

- Current `/` redirects to `/dashboard` in `desktop/src/routes/home.tsx`.
- Current centered shell is in `desktop/src/routes/root.tsx`.
- Current dashboard content/right panel is in `desktop/src/routes/dashboard.tsx`.
- Relevant specs:
  - `.trellis/spec/frontend/visual-design-guidelines.md`
  - `.trellis/spec/frontend/component-guidelines.md`
  - `.trellis/spec/frontend/quality-guidelines.md`

