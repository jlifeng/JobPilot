# Confirmed Brainstorm Decisions

This file preserves the confirmed brainstorm decisions. All items below are reflected in the final `prd.md` and implementation.

## 2026-07-26

### Output Scope

* Use structured coaching plus a complete reference answer.
* The result contains an answer outline, key points, explicit improvements over the user's answer, and a reference answer.
* Persist one successful result per candidate message.
* Do not allow regeneration after success; allow retry after failure.

### Concurrency and Failure Isolation

* Reference-answer generation does not block the ongoing mock interview.
* Loading and error state are scoped by candidate message id.
* A failure appears only in the corresponding evaluation card and can be retried there.
* Generation must not use or overwrite the interview room's global error state.

### Factual Grounding

* Never invent employers, projects, responsibilities, metrics, outcomes, technologies, or other candidate experience.
* Ground the result only in the JD, linked resume, original answer, interviewer question, and available transcript context.
* When evidence is missing, use an explicit coaching placeholder such as `[补充具体指标]` / `[add a concrete metric]` or explain what evidence the user should add.
* Do not present generated content as a standard, perfect, or universally correct answer.
