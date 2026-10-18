# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`GLOSSARY.md`** at the repo root.
- **`docs/adr/`**: read ADRs that touch the area you're about to work in.

If either does not exist, proceed silently. Do not flag its absence or suggest creating it upfront. The `/domain-modeling` skill creates them lazily when terms or decisions actually get resolved.

## File structure

This is a single-context repository:

```text
/
├── GLOSSARY.md
├── docs/adr/
│   ├── 0001-example-decision.md
│   └── 0002-example-decision.md
└── src/
```

## Use the glossary's vocabulary

When output names a domain concept, use the term as defined in `GLOSSARY.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept isn't in the glossary yet, either reconsider the invented language or note a real gap for `/domain-modeling`.

## Flag ADR conflicts

If output contradicts an existing ADR, surface it explicitly:

> _Contradicts ADR-0007 (example decision), but worth reopening because..._
