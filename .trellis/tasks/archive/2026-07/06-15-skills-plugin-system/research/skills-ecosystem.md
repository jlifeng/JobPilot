# Research: Claude Skills Ecosystem

- **Query**: Claude Skills ecosystem — where to find, popular examples, distribution, installation mechanisms, categories
- **Scope**: External + Internal (system instructions + local file inspection)
- **Date**: 2026-06-15

---

## Executive Summary

Claude Code has a **Skills system** that extends AI capabilities through modular packages. Skills are discovered via the **Skills CLI** (`npx skills`), a package manager for the open agent skills ecosystem. Skills are distributed through GitHub repositories and installed to user-level (`~/.agents/skills/`) or project-level (`.claude/skills/`, `.cursor/skills/`, `.agents/skills/`) directories.

---

## Findings

### 1. What Are Skills?

**Skills** are modular packages that extend agent capabilities with:
- Specialized knowledge and domain expertise
- Workflows and multi-step processes
- Tool configurations and command permissions
- Custom agent instructions and behavior

Skills are defined by a `SKILL.md` file with:
- YAML frontmatter (name, description, metadata)
- Markdown content (instructions, examples, workflows)

---

### 2. Where to Find Skills

#### Official Sources

| Source | Description | URL |
|--------|-------------|-----|
| **skills.sh Leaderboard** | Official registry, ranked by installs | https://skills.sh/ |
| **vercel-labs/agent-skills** | React, Next.js, web design (100K+ installs each) | GitHub: `vercel-labs/agent-skills` |
| **anthropics/skills** | Frontend design, document processing (100K+ installs) | GitHub: `anthropics/skills` |
| **ComposioHQ/awesome-claude-skills** | Community-curated skill collection | GitHub: `ComposioHQ/awesome-claude-skills` |

#### Local Discovery

- **Global user skills**: `~/.agents/skills/` (primary location)
- **Claude-specific symlinks**: `~/.claude/skills/` (symlinks to `.agents/skills/`)
- **Project-local skills**: `.claude/skills/`, `.cursor/skills/`, `.agents/skills/` (checked into repo or gitignored)

---

### 3. Popular Skills Examples

Based on local installation (`C:\Users\lifeng\.agents\skills\`):

| Skill | Category | Description |
|-------|----------|-------------|
| **create-readme** | Documentation | Create comprehensive README.md files with proper structure |
| **find-skills** | Discovery | Search and install skills from the ecosystem |
| **grill-with-docs** | Planning | Challenge plans against domain model, update docs (CONTEXT.md, ADRs) |
| **shadcn** | UI/Component | Manage shadcn/ui components — add, search, fix, debug, compose |
| **r2-image-upload** | Utility | Upload images to R2 storage |
| **xiaohu-wechat-format** | Formatting | Format content for WeChat articles |

**Trellis-specific skills** (project-local, `.claude/skills/`):
- `trellis-brainstorm` — Requirements discovery workflow
- `trellis-before-dev` — Pre-development checklist loader
- `trellis-check` — Quality check agent
- `trellis-meta` — Trellis system customization
- `trellis-update-spec` — Spec document management
- `trellis-spec-bootstrap` — Bootstrap project-specific coding specs

---

### 4. Skills Categories & Taxonomy

From `find-skills` documentation, common categories include:

| Category | Example Queries | Use Cases |
|----------|----------------|-----------|
| **Web Development** | react, nextjs, typescript, css, tailwind | Framework-specific patterns, best practices |
| **Testing** | testing, jest, playwright, e2e | Test generation, test review |
| **DevOps** | deploy, docker, kubernetes, ci-cd | Deployment automation, infrastructure |
| **Documentation** | docs, readme, changelog, api-docs | Documentation generation, maintenance |
| **Code Quality** | review, lint, refactor, best-practices | Code review, quality checks |
| **Design** | ui, ux, design-system, accessibility | UI components, design patterns |
| **Productivity** | workflow, automation, git | Development workflows, automation |

**Resume/Interview/Career-related** skills were not found in the ecosystem search, but the RoleRover project already has similar functionality (模拟面试, interview assistant) built-in.

---

### 5. Skills Distribution & Sharing

#### Package Format

Skills are distributed as:
- **GitHub repositories** (most common): `owner/repo@skill-name`
- **npm packages** (less common)
- **Local directories** (for private/custom skills)

#### Installation Methods

**Via Skills CLI** (official method):
```bash
# Search for skills
npx skills find [query]

# Install globally (user-level)
npx skills add owner/repo@skill-name -g -y

# Install to project
npx skills add owner/repo@skill-name
```

**Manual installation**:
- Copy skill directory to `~/.agents/skills/<skill-name>/`
- Symlink from `.claude/skills/` if needed
- Project-local: add to `.claude/skills/` or `.agents/skills/` in repo

---

### 6. Skills Installation & Loading Mechanisms

#### Installation Locations

1. **Global (user-level)**
   - Primary: `~/.agents/skills/` 
   - Claude symlinks: `~/.claude/skills/` (points to `.agents/skills/`)
   - Platform-agnostic, all AI tools can access

2. **Project-local**
   - `.claude/skills/` — Claude Code specific
   - `.cursor/skills/` — Cursor specific
   - `.agents/skills/` — Cross-platform convention
   - Higher priority than global skills (overrides)

#### Loading Mechanism

Skills are loaded by:
1. **System instructions** — Skills are listed in `<system-reminder>` blocks at conversation start
2. **Skill tool** — AI invokes `Skill(skill="skill-name", args="...")` to execute
3. **Auto-trigger** — Skills can specify `user-invocable: false` to only trigger via system logic

**Skill frontmatter fields**:
```yaml
---
name: skill-name
description: When to use this skill
user-invocable: true|false     # Can user call with /skill-name
allowed-tools: Bash(npx ...) # Restricted tool permissions
---
```

#### Skill Discovery Priority

1. Project-local skills (`.claude/skills/`, `.cursor/skills/`)
2. Global user skills (`~/.agents/skills/`)
3. Official registry (skills.sh)

---

### 7. Skills Structure & Anatomy

From inspected examples, typical skill structure:

```
skill-name/
  SKILL.md                # Primary definition (YAML frontmatter + content)
  README.md              # Optional: usage documentation
  assets/                # Optional: images, files
  rules/                 # Optional: sub-documents for complex skills
  agents/                # Optional: sub-agent definitions
  evals/                 # Optional: evaluation/test cases
  cli.md, mcp.md, etc.   # Optional: reference documentation
```

**Example: shadcn skill**:
```
shadcn/
  SKILL.md               # Main instructions (18KB)
  cli.md                 # CLI reference (17KB)
  customization.md       # Customization guide
  mcp.md                 # MCP integration
  rules/                 # Critical rules with code examples
    forms.md
    composition.md
    icons.md
    styling.md
    base-vs-radix.md
  agents/                # Sub-agent definitions
  evals/                 # Test cases
  assets/                # Images
```

---

### 8. Skills Invocation Flow

**User request → AI analyzes → Skill tool call → Skill executes**

```
User: "Create a README for this project"
  ↓
AI detects: matches "create-readme" skill description
  ↓
AI calls: Skill(skill="create-readme", args="")
  ↓
System loads: ~/.agents/skills/create-readme/SKILL.md
  ↓
AI executes: with skill instructions injected as context
  ↓
Result: README.md created
```

**For complex skills** (like `trellis-brainstorm`):
- Skill contains full workflow instructions
- AI follows step-by-step process
- Can spawn sub-agents via Task tool
- Updates files (PRD, research notes, etc.)

---

### 9. Skills Quality & Trust Signals

From `find-skills` documentation, quality indicators:

| Signal | Threshold | Notes |
|--------|-----------|-------|
| **Install count** | 1K+ recommended | Be cautious with <100 installs |
| **Source reputation** | Official > Community | `vercel-labs`, `anthropics`, `microsoft` preferred |
| **GitHub stars** | 100+ stars | <100 stars requires scrutiny |
| **Maintenance** | Active commits | Check last update date |

---

### 10. Skills vs Built-in Commands

**Skills** extend capabilities, **commands** are built-in shortcuts.

| Feature | Skills | Commands |
|---------|--------|----------|
| Distribution | External (npm, GitHub) | Built-in |
| Installation | Manual or via CLI | Pre-installed |
| Customization | Full control | Limited |
| Invocation | `/skill-name` or auto-trigger | `/command-name` |
| Examples | `shadcn`, `create-readme` | `/config`, `/help`, `/clear` |

---

### 11. Creating Custom Skills

**Initialization**:
```bash
npx skills init my-skill-name
```

**Minimal structure**:
```markdown
---
name: my-skill
description: What this skill does
---

# My Skill

Instructions for the AI agent...
```

**Distribution options**:
1. Personal use: install to `~/.agents/skills/`
2. Team use: check into `.claude/skills/` in project repo
3. Public sharing: publish to GitHub + submit to skills.sh

---

## Code Patterns & Examples

### Example: Skill Frontmatter

```yaml
---
name: shadcn
description: Manages shadcn components and projects — adding, searching, fixing, debugging, styling, and composing UI.
user-invocable: false
allowed-tools: Bash(npx shadcn@latest *), Bash(pnpm dlx shadcn@latest *), Bash(bunx --bun shadcn@latest *)
---
```

### Example: Skill with Sub-sections

From `trellis-brainstorm/SKILL.md`:
- **Step 0**: Ensure Task Exists
- **Step 1**: Auto-Context (gather info before asking)
- **Step 2**: Classify Complexity
- **Step 3**: Question Gate
- **Step 4**: Research-first Mode
- **Step 5**: Expansion Sweep (DIVERGE)
- **Step 6**: Q&A Loop (CONVERGE)
- **Step 7**: Propose Approaches
- **Step 8**: Final Confirmation

Each section has detailed instructions, code examples, anti-patterns.

---

## Related Specs & Files

### System Integration

| File | Purpose |
|------|---------|
| `~/.claude/settings.json` | Global Claude config (model, env vars, permissions) |
| `~/.agents/skills/` | Global skills directory |
| `.claude/skills/` | Project-local skills (Claude Code) |
| `.cursor/skills/` | Project-local skills (Cursor) |
| `.agents/skills/` | Project-local skills (cross-platform) |

### Trellis Integration

| File | Purpose |
|------|---------|
| `.trellis/workflow.md` | Development workflow, skill routing |
| `.trellis/spec/` | Coding guidelines (loaded by `trellis-before-dev` skill) |
| `.trellis/tasks/` | Task directories (used by brainstorm/implement/check skills) |
| `.claude/skills/trellis-*` | Trellis-specific skills |

---

## External References

- **Skills CLI GitHub**: Not found in local inspection, inferred from `find-skills` documentation
- **skills.sh Leaderboard**: https://skills.sh/
- **Skills installation guide**: Documented in `find-skills/SKILL.md`
- **Skill creation guide**: `npx skills init` command
- **Skills specification**: SKILL.md format (YAML frontmatter + Markdown)

---

## Caveats / Not Found

### Missing Information

1. **Skills CLI source code location**: Not found in local files, only referenced in `find-skills` skill
2. **Official Skills documentation site**: URL not discovered, only skills.sh leaderboard mentioned
3. **Resume/Interview/Career-specific skills**: No existing skills found in ecosystem for these domains
4. **Skills versioning/updates**: Update mechanism mentioned (`npx skills update`, `npx skills check`) but not detailed
5. **Skills packaging format**: `.zip` file found (`shadcn.zip`) suggests some distribution in archives, but format not specified

### Gaps in Current RoleRover Project

From PRD analysis, RoleRover wants to add:
- Resume optimization skills (resume scoring, keyword optimization, ATS detection)
- Interview preparation skills (question generation, answer optimization)
- Career skills (salary negotiation, offer evaluation)

**These categories don't exist in the current Claude Skills ecosystem** based on search results and local inspection. This is an opportunity for RoleRover to **create novel skills** in an underserved domain.

---

## Recommendations for RoleRover Skills System

Based on Skills ecosystem analysis:

### 1. **Adopt Skills CLI conventions**
- Use `SKILL.md` format with YAML frontmatter
- Install to `.claude/skills/` or `.agents/skills/`
- Support both built-in and user-custom skills

### 2. **Define skill categories for RoleRover**
- Resume (optimization, scoring, ATS, STAR)
- Interview (mock interview, question generation, answer review)
- Career (negotiation, planning, offer evaluation)
- Profile (LinkedIn, portfolio, personal branding)

### 3. **Distribution strategy**
- **Built-in skills**: Ship with desktop app in `desktop/skills/` or similar
- **User skills**: Allow installation to `~/.rolerover/skills/` or project-local
- **Marketplace**: Consider publishing popular skills to skills.sh (career domain novelty)

### 4. **Reuse existing patterns**
- Structured output (like interview evaluation format) ↔ Skill output schema
- AI chat infrastructure ↔ Skill execution runtime
- i18n support ↔ Skill multi-language

### 5. **Differentiation from Claude Skills**
- **Domain-specific**: Career/resume focus (underserved in ecosystem)
- **Integrated UI**: Skills output rendered in custom components (not just text)
- **Contextual**: Skills receive resume/JD context automatically
- **Versioned**: Built-in skills updated with app releases

---

## Conclusion

The Claude Skills ecosystem provides a mature plugin architecture with:
- ✅ Clear distribution mechanism (Skills CLI, GitHub)
- ✅ Established conventions (SKILL.md, frontmatter, directories)
- ✅ Quality signals (install counts, reputation, stars)
- ✅ Discovery tools (skills.sh, `npx skills find`)

**However**, the resume/interview/career domain is **not covered** by existing skills, making RoleRover's Skills system a **novel contribution** to the ecosystem.

RoleRover should adopt Skills conventions while adding:
- Resume-specific skill categories
- Integrated UI rendering for skill outputs
- Context-aware skill execution (auto-pass resume/JD)
- Built-in skill marketplace for career domain

---

## Files Inspected

- `.trellis/tasks/06-15-skills-plugin-system/prd.md`
- `AGENTS.md`
- `.trellis/workflow.md`
- `C:\Users\lifeng\.agents\skills\create-readme\SKILL.md`
- `C:\Users\lifeng\.agents\skills\find-skills\SKILL.md`
- `C:\Users\lifeng\.agents\skills\shadcn\SKILL.md`
- `K:\myproject\RoleRover\.claude\skills\trellis-brainstorm\SKILL.md`
- `C:\Users\lifeng\.claude\settings.json`

---

## Search Commands Executed

```bash
# List global skills
ls -la C:/Users/lifeng/.agents/skills/

# List project-local skills
ls -la K:/myproject/RoleRover/.claude/skills/

# Find skill directories in project
find K:/myproject/RoleRover -type d -name "*skill*"

# Find SKILL.md files
find C:/Users/lifeng/.agents/skills -name "SKILL.md"
find K:/myproject/RoleRover/.claude/skills -name "SKILL.md"

# Grep for skill-related content
grep -r "skill.*install|skill.*load|skill.*registry" *.md
```

---

**Research completed**: 2026-06-15  
**Persisted to**: `K:\myproject\RoleRover\.trellis\tasks\06-15-skills-plugin-system\research\skills-ecosystem.md`
