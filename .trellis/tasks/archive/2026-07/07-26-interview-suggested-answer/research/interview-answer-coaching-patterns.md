# Interview Answer Coaching Patterns

## Research Question

How should JobPilot present an AI-generated reference answer without weakening the value of mock interview practice, and how should that fit the current desktop architecture?

## Comparable Products and Guidance

### Huru

Source: <https://huru.ai/>

* Huru describes feedback as a layered analysis rather than a binary good/bad judgment.
* Its answer coaching combines restructuring guidance with an example of a strong answer, giving users both a method and a concrete blueprint.
* It tailors practice to the target job and emphasizes STAR for behavioral answers.

Implication: a complete example is more useful when paired with structure and specific improvement guidance; "example only" risks becoming something users copy without learning.

### Grow with Google interview guidance

Source: <https://grow.google/certificates/interview-warmup/>

* Google emphasizes practicing answers to build fluency, then using immediate, structured feedback.
* It recommends STAR, specific evidence, measurable outcomes, and role-specific preparation.
* It explicitly warns that preparation should not make answers sound scripted and should preserve authenticity.

Implication: JobPilot should reveal reference content only after the user attempts an answer and should frame the output as an adaptable reference, not a canonical script.

### Final Round AI Interview Copilot

Source: <https://www.finalroundai.com/interview-copilot>

* Final Round AI represents the opposite interaction model: real-time answer suggestions during live interviews.
* It uses resume and JD context to tailor suggested responses.
* Its positioning is live assistance, not primarily deliberate practice.

Implication: providing answers before or during a JobPilot mock answer would shift the product from training toward answer assistance. Resume + JD personalization is valuable, but the timing should remain post-answer.

### Yoodli

Source: <https://yoodli.ai/platform/ai-feedback>

* Yoodli positions immediate, objective, rubric-aligned feedback as a way to drive measurable improvement after practice.
* The focus is feedback attached to a practice attempt rather than inserting coaching into the simulated conversation itself.

Implication: the reference answer belongs with the existing per-answer evaluation card, not as an interviewer message in the transcript.

## Common Conventions

* Preserve an attempt-first learning loop: answer before seeing coaching or examples.
* Combine diagnosis with an actionable model: explain the structure, then show an example.
* Personalize using job and candidate context; generic sample answers have low training value.
* Keep coaching artifacts separate from the canonical interview transcript.
* Make feedback available for later review so the user can compare attempts over time.

## Repository Constraints

* `InterviewRoom` already renders an `AnswerEvaluationCard` immediately after each candidate message.
* Each candidate message owns `InterviewMessageMetadata`; evaluation output and evaluation errors are already persisted there.
* `update_interview_message_metadata` merges JSON objects without requiring a schema migration.
* The normal interview turn command inserts messages, streams an interviewer response, increments question counts, and may complete a round. It is therefore the wrong boundary for reference-answer generation.
* The current evaluation request is automatic and already incurs one model call per submitted answer. It receives JD, interviewer role/focus, question, candidate answer, and interviewer response, but not the linked resume content.
* The main interview flow already has a reusable `build_resume_context` path, so a dedicated generator can include resume evidence without adding frontend document loading.
* A new native command requires a Rust input/output contract, Tauri registration, permission allowlist entry, frontend invoke wrapper, metadata normalization, i18n, and focused tests.

## Feasible Approaches

### Approach A: Dedicated on-demand generator (Recommended)

* Add `generate_interview_suggested_answer` for one candidate message.
* Resolve the session, round, preceding interviewer question, candidate answer, JD, optional resume context, interviewer configuration, and limited transcript context on the Rust side.
* Return structured JSON and persist it under the candidate message metadata before returning the updated message or structured result.
* Render the trigger and result inside the existing evaluation card.

Pros: true on-demand cost, clean state-machine boundary, resumable history, proper personalization, isolated retry behavior.

Cons: adds a new cross-layer command and a second model request when the user opts in.

### Approach B: Extend automatic answer evaluation

* Add structure and example fields to the existing evaluation JSON response.
* Always generate and persist them together with the score.

Pros: minimal command plumbing and one combined model request.

Cons: spends tokens even when never viewed, increases evaluation latency and parse-failure surface, couples an optional learning aid to required scoring, and does not include resume context without further changes.

### Approach C: Add a new interview turn kind

* Reuse the existing streaming turn command and model conversation for a "suggested answer" action.

Pros: reuses streaming UI/events and provider plumbing.

Cons: the existing turn path persists transcript messages, advances counts, and participates in round completion. Guarding every state mutation would make the command harder to reason about than a dedicated query-like generation boundary.

## Recommendation

Use Approach A. Store a single structured result per candidate message:

* `outline`: 3-5 adaptable response steps
* `keyPoints`: important evidence or concepts to cover
* `improvedAnswer`: a concise first-person example grounded only in supplied resume/answer facts
* `improvements`: explicit differences from the user's original answer
* `generatedAtEpochMs`: persistence and debugging metadata

Use "参考回答" / "Reference answer" and include a short authenticity reminder in the result, rather than describing the output as a perfect or standard answer.
