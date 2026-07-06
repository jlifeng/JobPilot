# brainstorm: skill system implementation plan

## Goal

Clarify and converge the JobPilot Skill system implementation plan before coding, so the project can add installable, selectable, and user-editable AI capability packages while preserving existing AI behavior by default.

## What I already know

* The user pointed to `docs/skill-system-implementation-plan.md` and requested the `trellis-brainstorm` workflow.
* The plan targets a generic Skill system for AI scenarios such as resume editing, interview simulation, cover letters, translation, JD analysis, grammar check, and resume generation.
* The core compatibility principle is: when no Skill is selected or installed, existing app behavior must remain unchanged.
* Skill import, capability splitting, matching, reference loading, and prompt assembly are intended to be rule-driven, not AI-driven.
* The plan proposes `.skill` zip packages containing `SKILL.md` and optional `references/`.
* The plan proposes Rust-side import/export parsing and SQLite storage, plus frontend runtime matching and UI selectors.
* The plan is phased: core infrastructure, AI Chat integration, interview integration, management UI, remaining scenarios, importer/recommended Skill polish.

## Assumptions (temporary)

* The immediate goal is requirement discovery and plan refinement, not direct implementation.
* The existing plan may need scope tightening into an MVP and clearer phase boundaries before code changes.
* The repository already contains AI chat, interview, storage, Tauri invoke, and i18n patterns that should constrain the final design.

## Open Questions

* What should the first implementation milestone include: infrastructure only, infrastructure plus AI Chat, or infrastructure plus interview persona support?

## Requirements (evolving)

* Preserve all existing AI behavior when no Skill is selected.
* Support user-selected Skill capabilities per AI scenario.
* Keep Skill parsing deterministic and offline-capable.
* Store Skill definitions and settings in the desktop app data layer.
* Keep the system generic rather than hard-coding logic for specific community Skills.

## Acceptance Criteria (evolving)

* [ ] Existing AI flows still work without any Skill selection.
* [ ] A Skill can be represented with capabilities, references, variables, and matching metadata.
* [ ] A scenario can resolve either the default prompt or a selected Skill capability prompt.
* [ ] The final MVP scope is explicit, with out-of-scope items listed.
* [ ] Implementation phases are small enough to verify independently.

## Definition of Done (team quality bar)

* Tests added/updated where appropriate.
* Lint / typecheck / relevant build commands pass.
* Docs/notes updated if behavior changes.
* Rollout/rollback considered if risky.

## Out of Scope (explicit)

* Automatic AI-based intent matching, unless later explicitly selected for MVP.
* Community rating, marketplace, or online Skill discovery.
* Rewriting existing prompts before compatibility has been proven.

## Technical Notes

* Source plan: `docs/skill-system-implementation-plan.md`.
* Task created by `trellis-brainstorm`: `.trellis/tasks/07-04-skill-system-implementation-plan`.
* Need repo inspection before asking implementation-detail questions.


## Repo Inspection Notes

* `desktop/src/components/ai/ai-chat-panel.tsx` already builds and passes a frontend `systemPrompt` to `startAiPromptStream`, so AI Chat is the lowest-risk first integration surface.
* `desktop/src/types/interview.ts` already has `InterviewerConfig.systemPrompt`, but the preset interviewers currently set it to an empty string.
* `desktop/src/lib/desktop-api.ts` currently does not pass an interview `systemPrompt` through `startInterviewTurnStream()`.
* `desktop/src-tauri/src/ai.rs` currently builds interview turn system prompts inside Rust via `build_interview_system_prompt()`.
* `desktop/src-tauri/src/storage.rs` centralizes SQLite schema creation in `bootstrap_schema()`.
* `desktop/src-tauri/Cargo.toml` already has `rusqlite` and `tauri-plugin-dialog`; `zip` is not currently present.
* Desktop routing is manual via `desktop/src/router.tsx` and `rootRoute.addChildren([...])`.
* Desktop stores use Zustand under `desktop/src/stores/`.
* Relevant spec indexes found: `.trellis/spec/desktop/frontend/index.md`, `.trellis/spec/backend/index.md`, `.trellis/spec/guides/index.md`.
* Likely additional specs for implementation phase: `.trellis/spec/guides/desktop-runtime-boundary.md`, `.trellis/spec/guides/cross-layer-thinking-guide.md`, `.trellis/spec/desktop/frontend/type-safety.md`, `.trellis/spec/desktop/frontend/state-management.md`, `.trellis/spec/desktop/frontend/component-guidelines.md`, `.trellis/spec/desktop/frontend/quality-guidelines.md`.
* Planning correction: Phase 3 should distinguish between the existing `InterviewerConfig.systemPrompt` frontend field and the missing Rust input/stream usage path.
