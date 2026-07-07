# Research: Anthropic Claude Skills Specification

- **Query**: Official Anthropic Claude Skills format and specification — file structure, fields, loading mechanism, capabilities
- **Scope**: Internal (local codebase inspection + system instructions analysis)
- **Date**: 2026-06-15

---

## Executive Summary

Claude Code uses a **Skills system** based on markdown files with YAML frontmatter. Skills are modular capabilities defined in `SKILL.md` files, loaded from standardized directories (`.claude/skills/`, `.agents/skills/`), and invoked via a `Skill` tool by the AI assistant. The specification is **informal** — there is no official JSON schema or published spec document, but conventions have emerged through the Skills CLI ecosystem and Anthropic's reference implementations.

**Key finding**: Skills format is **convention-based**, not formally specified. The format has been reverse-engineered from:
1. Existing skill files in `.claude/skills/` and `~/.agents/skills/`
2. System instructions describing skill invocation
3. Skills CLI ecosystem documentation

---

## Findings

### 1. Skills File Format

#### Core Structure

```
skill-name/
├── SKILL.md                # Primary definition (required)
├── references/             # Optional: sub-documents for complex skills
├── agents/                 # Optional: sub-agent definitions
├── rules/                  # Optional: domain rules with code examples
├── evals/                  # Optional: test cases
├── assets/                 # Optional: images, files
└── README.md              # Optional: user-facing documentation
```

#### SKILL.md Anatomy

**Format**: Markdown with YAML frontmatter

```yaml
---
name: skill-name
description: "When to use this skill — specific trigger conditions for AI auto-match"
user-invocable: true|false      # Optional: Can user invoke with /skill-name
allowed-tools: Bash(npx ...)   # Optional: Restricted tool permissions
---

# Skill Title

## When to Use

<describe trigger conditions>

## Step 1: First Action

<instructions for AI>

## Step 2: Next Action

<instructions for AI>

## Related References

- `references/topic-a.md` — <description>
- `references/topic-b.md` — <description>

## Do Not

- <anti-patterns to avoid>
```

---

### 2. Frontmatter Fields

| Field | Required | Type | Purpose | Example |
|-------|----------|------|---------|---------|
| `name` | ✅ Yes | string | Skill identifier, used for invocation | `trellis-brainstorm` |
| `description` | ✅ Yes | string | AI-readable trigger condition | `"Use when requirements are unclear or there are multiple valid approaches"` |
| `user-invocable` | ❌ No | boolean | Whether user can call via `/skill-name` | `false` (system-only) |
| `allowed-tools` | ❌ No | string | Tool permission restrictions | `Bash(npx shadcn@latest *)` |

**Notes**:
- `description` field is **critical** — AI uses it to determine when to invoke the skill
- Descriptions should be **specific** to avoid incorrect auto-triggering
- No version field observed in any inspected skills

---

### 3. Skills Discovery & Loading

#### Installation Locations (Priority Order)

1. **Project-local** (highest priority):
   - `.claude/skills/` — Claude Code specific
   - `.cursor/skills/` — Cursor specific
   - `.agents/skills/` — Cross-platform convention

2. **Global user-level**:
   - `~/.agents/skills/` — Primary location (all platforms)
   - `~/.claude/skills/` — Symlinks to `.agents/skills/`

3. **Built-in** (shipped with platform):
   - Bundled skills in platform installation directory

**Conflict resolution**: Project-local skills override global skills with same name.

#### Loading Mechanism

Skills are loaded at conversation start:

1. **System scans** directories for `SKILL.md` files
2. **Parses frontmatter** to extract name + description
3. **Injects skill list** into `<system-reminder>` block:
   ```
   The following skills are available for use with the Skill tool:
   
   - skill-name: description text here
   - another-skill: another description
   ```

4. **AI invokes** via Skill tool when matched:
   ```
   Skill(skill="skill-name", args="optional arguments")
   ```

5. **System loads** SKILL.md content and executes with that context

---

### 4. Skill Invocation Flow

```
User request → AI matches description → Skill tool call → Content loaded → AI executes
```

**Example flow**:

```
User: "Help me plan this new feature"
  ↓
AI analyzes: matches "requirements are unclear" → triggers trellis-brainstorm
  ↓
AI calls: Skill(skill="trellis-brainstorm", args="")
  ↓
System loads: .claude/skills/trellis-brainstorm/SKILL.md
  ↓
AI executes: following step-by-step instructions in SKILL.md
  ↓
Result: PRD created, questions asked, task directory initialized
```

---

### 5. Skill Capabilities

Skills provide:

#### A. Instructions & Workflows

- **Multi-step processes**: Skills contain detailed step-by-step instructions
- **Conditional routing**: "If X, do Y; else do Z" logic
- **Reference loading**: Point to additional documents to read on-demand

**Example** (from `trellis-brainstorm`):
```markdown
## Step 0: Ensure Task Exists (ALWAYS)

Before any Q&A, ensure a task exists...

## Step 1: Auto-Context (DO THIS BEFORE ASKING QUESTIONS)

Before asking questions, gather context yourself:
- Identify likely modules/files impacted
- Locate existing patterns
```

#### B. Tool Permissions

Skills can **restrict** tool usage via `allowed-tools`:

```yaml
allowed-tools: Bash(npx shadcn@latest *), Bash(pnpm dlx shadcn@latest *)
```

**Purpose**: Security — prevents skills from executing arbitrary commands

#### C. Sub-Agent Orchestration

Complex skills can spawn sub-agents:

**Example** (from `trellis-brainstorm` research delegation):
```markdown
For each research topic, spawn a `trellis-research` sub-agent via the Task tool:

Task(subagent_type="trellis-research",
     prompt="Research <topic>; persist to research/<topic>.md")
```

#### D. Context Injection

Skills can specify what to read before execution:

```markdown
## Step 1: Load Current Context

```bash
python ./.trellis/scripts/get_context.py
```

Shows: current task, git state, recent commits
```

---

### 6. Skill Structure Patterns

#### Simple Skill (Single-file)

```
my-skill/
└── SKILL.md       # All content in one file
```

**When to use**: <100 lines of instructions, no complex sub-domains

#### Structured Skill (Multi-file)

```
complex-skill/
├── SKILL.md                    # Entry point + routing
└── references/
    ├── topic-a.md
    ├── topic-b.md
    └── topic-c.md
```

**When to use**: 500+ lines, multiple distinct topics, on-demand loading

**Pattern**: SKILL.md tells AI **when to read which reference**:

```markdown
## How To Use

1. Read `references/topic-a.md` first to understand X
2. If user wants Y, read `references/topic-b.md`
3. Otherwise, read `references/topic-c.md`
```

#### Domain-Complex Skill (with assets)

```
advanced-skill/
├── SKILL.md
├── rules/              # Critical patterns with code examples
│   ├── pattern-a.md
│   └── pattern-b.md
├── agents/             # Sub-agent definitions
│   ├── research.md
│   └── implement.md
├── evals/              # Test cases
│   └── test-1.md
└── assets/             # Images, templates
    └── diagram.png
```

**When to use**: Complex domain (UI libraries, frameworks), requires examples + visual aids

---

### 7. Skill Content Guidelines

#### Description Field (Critical)

**Good** (specific trigger conditions):
```yaml
description: "Guides collaborative requirements discovery before implementation. Creates task directory, seeds PRD, asks high-value questions one at a time, researches technical choices, and converges on MVP scope. Use when requirements are unclear, there are multiple valid approaches, or the user describes a new feature or complex task."
```

**Bad** (too vague):
```yaml
description: "Helpful project skill"  # Too broad, will mis-trigger
```

#### Instruction Content

**Core principles** (from inspected skills):

1. **Action-oriented**: Tell AI what to do, not what the skill "can" do
   - ✅ "Run these steps:"
   - ❌ "This skill can help you..."

2. **Step-by-step**: Use numbered steps for complex workflows
   ```markdown
   ## Step 1: Load Context
   ## Step 2: Analyze
   ## Step 3: Execute
   ```

3. **Code examples**: Include actual commands to run
   ```markdown
   ```bash
   python ./.trellis/scripts/task.py create "title"
   ```
   ```

4. **Anti-patterns**: Tell AI what NOT to do
   ```markdown
   ## Do Not
   - Don't ask user for info you can find in repo
   - Don't create empty commits
   ```

5. **References over duplication**: Keep SKILL.md short, use `references/` for detail
   ```markdown
   Read `references/detailed-guide.md` for the full checklist
   ```

---

### 8. Skills vs Commands vs Prompts

**Conceptual differences** (from `skills-and-commands.md`):

| Type | Trigger Mode | Best For | Location |
|------|--------------|----------|----------|
| **Skill** | AI auto-match or explicit mention | Long-term capabilities, workflows | `.claude/skills/` |
| **Command** | Explicit user invocation (`/cmd`) | Clear operations | `.claude/commands/` |
| **Prompt** | Explicit user invocation | Platform-specific prompt format | `.claude/prompts/` |
| **Workflow** | User selection or auto-match | Main session guides | `.claude/workflows/` |

**Example**:
- **Skill**: `trellis-brainstorm` — auto-triggers on "plan new feature"
- **Command**: `trellis:continue` — user types `/trellis:continue`
- **Workflow**: Main development workflow loaded at session start

---

### 9. Official Skills Examples (Analyzed)

#### Example 1: trellis-check

**File**: `.claude/skills/trellis-check/SKILL.md`

```yaml
---
name: trellis-check
description: "Comprehensive quality verification: spec compliance, lint, type-check, tests, cross-layer data flow, code reuse, and consistency checks. Use when code is written and needs quality verification, before committing changes, or to catch context drift during long sessions."
---
```

**Content structure**:
- Step 1: Identify What Changed (git diff)
- Step 2: Read Applicable Specs
- Step 3: Run Project Checks
- Step 4: Review Against Checklist
- Step 5: Cross-Layer Dimensions
- Step 6: Report and Fix

**Pattern**: Checklist-driven workflow with conditional execution

---

#### Example 2: trellis-brainstorm

**File**: `.claude/skills/trellis-brainstorm/SKILL.md`

**Size**: 549 lines (single file)

```yaml
---
name: trellis-brainstorm
description: "Guides collaborative requirements discovery before implementation. Creates task directory, seeds PRD, asks high-value questions one at a time, researches technical choices, and converges on MVP scope. Use when requirements are unclear, there are multiple valid approaches, or the user describes a new feature or complex task."
---
```

**Content structure**:
- Core Principles (non-negotiable rules)
- Step 0: Ensure Task Exists (ALWAYS)
- Step 1: Auto-Context (research before asking)
- Step 2: Classify Complexity
- Step 3: Question Gate (filter low-value questions)
- Step 4: Research-first Mode (delegate to sub-agents)
- Step 5: Expansion Sweep (DIVERGE)
- Step 6: Q&A Loop (CONVERGE)
- Step 7: Propose Approaches
- Step 8: Final Confirmation
- PRD Target Structure
- Anti-Patterns (Hard Avoid)

**Pattern**: Complex state machine with diverge→converge flow

---

#### Example 3: trellis-meta (Multi-file)

**File structure**:
```
trellis-meta/
├── SKILL.md                    # Entry point (74 lines)
└── references/
    ├── local-architecture/
    │   ├── overview.md
    │   ├── generated-files.md
    │   ├── workflow.md
    │   ├── task-system.md
    │   ├── spec-system.md
    │   ├── workspace-memory.md
    │   └── context-injection.md
    ├── platform-files/
    │   ├── overview.md
    │   ├── platform-map.md
    │   ├── hooks-and-settings.md
    │   ├── agents.md
    │   └── skills-and-commands.md
    └── customize-local/
        ├── overview.md
        ├── change-workflow.md
        ├── change-task-lifecycle.md
        ├── change-context-loading.md
        ├── change-hooks.md
        ├── change-agents.md
        ├── change-skills-or-commands.md
        ├── change-spec-structure.md
        └── add-project-local-conventions.md
```

**SKILL.md structure**:
```markdown
# Trellis Meta

<brief description of skill purpose>

## How To Use

1. Read `references/local-architecture/overview.md` first
2. If the request involves X, read `references/platform-files/Y.md`
3. If user wants to change Z, read `references/customize-local/Z.md`

## References

### Local Architecture
- `references/local-architecture/overview.md` — <description>
...

### Platform Files
- `references/platform-files/overview.md` — <description>
...

### Local Customization
- `references/customize-local/overview.md` — <description>
...
```

**Pattern**: Entry file routes to specific references based on user intent

---

### 10. Skills CLI Integration (External Tool)

**Note**: Skills CLI is a separate tool (`npx skills`), not part of Claude Code itself.

**Key commands**:
```bash
# Search for skills
npx skills find [query]

# Install globally
npx skills add owner/repo@skill-name -g -y

# Install to project
npx skills add owner/repo@skill-name

# Initialize new skill
npx skills init my-skill-name

# Update skills
npx skills update

# Check installed skills
npx skills list
```

**Distribution format**:
- GitHub repositories: `owner/repo@skill-name`
- npm packages: `@scope/skill-name`
- Local directories

**Registry**: https://skills.sh/ (community-driven leaderboard)

---

## Code Patterns

### Pattern 1: Conditional Reference Loading

```markdown
## Step 2: Load the Right Reference

Based on the user's request:

- To understand architecture → read `references/overview.md`
- To change workflow → read `references/change-workflow.md`
- To add conventions → read `references/add-conventions.md`
```

### Pattern 2: Sub-Agent Delegation

```markdown
## Step 4: Research-first Mode

For each research topic, spawn a sub-agent:

```
Task(subagent_type="trellis-research",
     prompt="Research <topic>; persist to research/<topic>.md")
```

Then read the persisted files and synthesize.
```

### Pattern 3: Checklist-Driven Execution

```markdown
## Step 5: Review Against Checklist

### Code Quality

- [ ] Linter passes?
- [ ] Type checker passes?
- [ ] Tests pass?

### Test Coverage

- [ ] New function → unit test added?
- [ ] Bug fix → regression test added?
```

### Pattern 4: Explicit Anti-Patterns

```markdown
## Anti-Patterns (Hard Avoid)

* Asking user for code/context that can be derived from repo
* Meta questions about whether to research
* Staying narrowly on initial request without considering evolution/edges
```

---

## Related Specs & Files

### System Instructions Location

Skills are injected into system instructions via `<system-reminder>` blocks:

```xml
<system-reminder>
The following skills are available for use with the Skill tool:

- create-readme: Create a README.md file for the project
- trellis-brainstorm: Guides collaborative requirements discovery...
- trellis-check: Comprehensive quality verification...
...
</system-reminder>
```

**Location in conversation**: After main system prompt, before user messages

### Platform-Specific Paths

| Platform | Skills Directory | Commands Directory | Notes |
|----------|-----------------|-------------------|--------|
| Claude Code | `.claude/skills/` | `.claude/commands/` | Official Anthropic CLI |
| Cursor | `.cursor/skills/` | `.cursor/commands/` | IDE integration |
| OpenCode | `.opencode/skills/` | `.opencode/commands/` | VS Code extension |
| Codex | `.agents/skills/`, `.codex/skills/` | `.codex/commands/` | GitHub Copilot |
| Cross-platform | `.agents/skills/` | — | Shared location |

### Trellis Integration Files

| File | Purpose | Skills Involvement |
|------|---------|-------------------|
| `.trellis/workflow.md` | Workflow phases, routing | Skills follow this as source of truth |
| `.trellis/config.yaml` | Project configuration | Skills read this for project settings |
| `.trellis/spec/` | Coding guidelines | Loaded by `trellis-before-dev` skill |
| `.trellis/tasks/` | Task directories | Created/managed by `trellis-brainstorm`, etc. |

---

## External References

### Official Sources (Inferred)

- **Skills CLI**: `npx skills` command (source not found in local files)
- **skills.sh**: https://skills.sh/ — Official registry/leaderboard
- **Skills CLI GitHub**: Not found, likely `anthropics/skills-cli` or similar

### Community Sources

- **vercel-labs/agent-skills**: React, Next.js, web design skills (100K+ installs)
- **anthropics/skills**: Frontend design, document processing (100K+ installs)
- **ComposioHQ/awesome-claude-skills**: Curated skill collection

### Documentation

No official specification document found. Format is **convention-based**, derived from:
1. Reference implementations in `~/.agents/skills/`
2. Skills CLI behavior
3. Community examples on GitHub

---

## Caveats / Not Found

### Missing from Specification

1. **Official schema**: No JSON schema or formal spec document exists
2. **Version field**: No versioning mechanism in frontmatter
3. **Dependencies**: No way to declare skill dependencies
4. **Permissions model**: `allowed-tools` is the only security mechanism
5. **Update mechanism**: Skills CLI handles updates, but format for update checks not specified
6. **Skill output schema**: No standardized format for skill return values

### Gaps in Documentation

1. **Skills CLI source code**: Location not found in local inspection
2. **Skill packaging format**: `.zip` files observed but format not documented
3. **Skill evaluation**: `evals/` directory exists but eval format not specified
4. **Multi-language support**: No i18n guidance for skill content

### Platform Variations

Different platforms may interpret skills differently:
- Claude Code, Cursor, OpenCode, etc. may have different feature sets
- No guarantee of cross-platform compatibility
- Each platform scans its own directories (`.claude/`, `.cursor/`, etc.)

---

## Recommendations for RoleRover

Based on Claude Skills analysis:

### 1. Adopt Core Format

Use `SKILL.md` with YAML frontmatter:
```yaml
---
name: resume-optimize
description: "Optimize resume content for ATS, keyword matching, and impact. Use when user wants to improve resume quality."
---
```

### 2. Location Strategy

**Option A: Built-in skills** (recommended):
- Ship with desktop app in `resources/skills/` or similar
- Copy to user directory on first launch: `~/.rolerover/skills/`
- Advantage: Version control, easy updates

**Option B: Project-local skills**:
- Store in `.rolerover/skills/` in user documents
- Advantage: User customization, persistence across app versions

### 3. Integration with AI Chat

RoleRover already has:
- AI chat infrastructure (`aiChatContext`, `aiChatMessages`)
- Structured prompts (`aiChatInitialPrompt`)
- Tool integration (MCP server)

**Skills integration approach**:
1. Scan `~/.rolerover/skills/` for `SKILL.md` files
2. Parse frontmatter → extract name + description
3. Inject skill list into system prompt
4. Add skill execution handler to MCP server
5. Render skill output in chat UI

### 4. Skill Categories for RoleRover

Create domain-specific skills (not covered by existing ecosystem):

**Resume Domain**:
- `resume-optimize` — ATS optimization, keyword matching
- `resume-score` — Scoring against job description
- `resume-star` — STAR method improvement

**Interview Domain**:
- `interview-prep` — Question generation from JD
- `interview-mock` — Mock interview session
- `interview-answer-review` — Answer optimization

**Career Domain**:
- `career-negotiate` — Salary negotiation advice
- `career-offer-eval` — Offer comparison
- `career-plan` — Career path planning

### 5. Differentiation

RoleRover skills should be:
- **Context-aware**: Auto-inject current resume + JD
- **UI-integrated**: Render structured output (scores, charts) in custom components
- **Versioned**: Ship with app, update with releases
- **Domain-specific**: Career/resume focus (underserved in ecosystem)

---

## Conclusion

The Anthropic Claude Skills specification is **informal and convention-based**, not formally documented. The format has emerged from reference implementations and community practice:

**Core conventions**:
- ✅ `SKILL.md` with YAML frontmatter (name, description)
- ✅ Installation to `.claude/skills/` or `.agents/skills/`
- ✅ Invocation via `Skill(skill="name", args="...")` tool
- ✅ Markdown content with step-by-step instructions

**What's missing**:
- ❌ No official JSON schema
- ❌ No formal specification document
- ❌ No versioning mechanism
- ❌ No dependency management

**For RoleRover**: Adopt the conventions, but tailor for domain-specific needs (resume/interview/career) with integrated UI rendering and context-awareness.

---

## Files Inspected

### Local Skills
- `K:\myproject\RoleRover\.claude\skills\trellis-check\SKILL.md`
- `K:\myproject\RoleRover\.claude\skills\trellis-brainstorm\SKILL.md`
- `K:\myproject\RoleRover\.claude\skills\trellis-meta\SKILL.md`
- `K:\myproject\RoleRover\.claude\skills\trellis-before-dev\SKILL.md`
- `K:\myproject\RoleRover\.claude\skills\trellis-update-spec\SKILL.md`
- `K:\myproject\RoleRover\.claude\skills\trellis-spec-bootstarp\SKILL.md`
- `K:\myproject\RoleRover\.claude\skills\trellis-break-loop\SKILL.md`

### Commands
- `K:\myproject\RoleRover\.claude\commands\trellis\continue.md`
- `K:\myproject\RoleRover\.claude\commands\trellis\finish-work.md`

### Reference Documentation
- `K:\myproject\RoleRover\.claude\skills\trellis-meta\references\platform-files\skills-and-commands.md`
- `K:\myproject\RoleRover\.claude\skills\trellis-meta\references\customize-local\change-skills-or-commands.md`
- `K:\myproject\RoleRover\.claude\skills\trellis-meta\references\customize-local\add-project-local-conventions.md`
- `K:\myproject\RoleRover\.claude\skills\trellis-meta\references\local-architecture\overview.md`

### Previous Research
- `K:\myproject\RoleRover\.trellis\tasks\06-15-skills-plugin-system\research\skills-ecosystem.md`

---

**Research completed**: 2026-06-15  
**Persisted to**: `K:\myproject\RoleRover\.trellis\tasks\06-15-skills-plugin-system\research\anthropic-skills-spec.md`
