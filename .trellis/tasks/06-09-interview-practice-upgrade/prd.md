# Interview Practice Upgrade

## Goal

Upgrade the existing mock interview flow from question generation and review into a targeted interview practice loop. The product goal is to help users practice answers against their resume and target JD, receive structured feedback, handle follow-up questions, and get a focused improvement plan.

## What I Already Know

- The project already has mock interview and review features.
- The first layer, generating interview questions from JD and resume context, already exists and should not be rebuilt in this task.
- The desired direction is to evolve JobPilot from a resume tool into a broader job-search preparation tool.
- The likely MVP should build on the existing interview session/question flow instead of introducing a separate interview product surface.

## Assumptions

- Existing interview records, JD context, and role context can be reused as the source of truth.
- The first implementation should prioritize text-based practice reliability before adding voice interview capabilities.
- Voice input can be designed as an extension point unless the user explicitly wants it in the first implementation.

## Requirements

- Reuse the existing interview question generation/session flow.
- Add structured answer evaluation, including STAR-style feedback for behavioral/project answers.
- Add AI follow-up questions based on the user's answer and the current interview context.
- Add a weak-point summary and training plan after an interview or practice round.
- Keep changes scoped so existing mock interview and review flows remain usable.

## Acceptance Criteria

- [x] User can answer an existing/generated interview question and receive structured feedback.
- [x] Feedback includes actionable dimensions such as structure, personal contribution, quantified result, JD relevance, clarity, and risk points.
- [x] AI can provide at least one context-aware follow-up suggestion based on the answer.
- [x] Review output includes weak points and suggested next training items.
- [x] Existing interview question generation remains intact and is not duplicated.

## Open Questions

- None for the current MVP.

## Out of Scope

- Rebuilding JD + resume based question generation.
- Voice interview and speech input/output. This remains a later enhancement after text scoring, follow-up suggestions, and training plans are stable.
- Video interview, face analysis, expression analysis, or long-term audio retention.
- Replacing the existing interview module with a separate new product area.

## Technical Notes

- Branch: `codex/interview-practice-upgrade`
- Task scope is expected to touch desktop frontend and Rust/Tauri interview or AI runtime boundaries if persisted interview feedback is added.
- Relevant specs and exact files will be selected after confirming MVP scope.
