# OrcaRouter AI provider integration

## Goal

Add OrcaRouter as a first-class AI provider in JobPilot's Tauri desktop application so users can register through the supplied referral link, save an OrcaRouter API key locally, discover models, test connectivity, and use OrcaRouter across existing AI workflows with the free router preconfigured.

## What I already know

- The desktop app currently supports OpenAI, Anthropic, and Gemini provider identities.
- OrcaRouter is OpenAI-compatible and supports the streaming and tool-call behavior used by JobPilot.
- The OrcaRouter production base URL is `https://api.orcarouter.ai/v1`.
- The built-in free router model is `orcarouter/free`.
- Provider secrets are stored separately through the existing OS keyring/fallback contract.
- The user supplied referral URL is `https://www.orcarouter.ai/ref/ref_77fed7ef35745efad2f0`.

## Confirmed Product Decisions

- OrcaRouter is selectable but does not replace OpenAI as the global default for all users.
- The referral link appears as provider-specific onboarding in AI settings and opens in the external browser.
- The MVP reuses existing OpenAI-compatible runtime code rather than adding OrcaRouter-specific request headers or paid fallback routing.

## Open Questions

- None.

## Requirements (evolving)

- Add `orcarouter` to Rust and TypeScript provider contracts.
- Persist independent base URL, model, and API key settings for OrcaRouter.
- Default OrcaRouter to `https://api.orcarouter.ai/v1` and `orcarouter/free`.
- Route all supported desktop AI workflows through the existing OpenAI-compatible implementation when OrcaRouter is selected.
- Support model discovery and connectivity testing through OrcaRouter's OpenAI-compatible endpoints.
- Show a localized referral/onboarding action in settings when OrcaRouter is selected.
- Add OrcaRouter to the free API key guide with the supplied referral URL.

## Acceptance Criteria (evolving)

- [x] OrcaRouter appears in the desktop AI provider selector.
- [x] Selecting OrcaRouter pre-fills its base URL and free router model, including for users with an older settings document.
- [x] Saving the provider stores its key under `provider.orcarouter.api_key` without exposing plaintext in inventory responses.
- [x] Model fetching calls OrcaRouter `/models` and populates the existing picker.
- [x] Connectivity testing calls OrcaRouter `/chat/completions` with bearer authentication.
- [x] Chat, resume generation/import, translation, grammar/JD/cover-letter flows, and mock-interview AI paths accept `orcarouter` wherever OpenAI-compatible transport is supported.
- [x] The referral action opens `https://www.orcarouter.ai/ref/ref_77fed7ef35745efad2f0`.
- [x] Chinese and English UI copy is present.
- [x] Desktop frontend build/lint and Rust checks pass.

## Definition of Done

- Tests are added or updated for provider normalization/defaults where practical.
- TypeScript build, targeted lint, Rust formatting, and Cargo checks pass.
- User-facing documentation is updated.
- Existing providers and existing settings remain backward compatible.

## Out of Scope (explicit)

- Changing the default provider for existing users.
- Automatic retry scheduling for free-tier rate limits.
- OrcaRouter billing, balance, referral attribution analytics, OAuth/PKCE, or account management inside JobPilot.
- OrcaRouter-specific paid model fallback chains or custom router configuration.
- Retrofitting the archived/reference Next.js web app unless required by a shared contract.

## Technical Approach

Model OrcaRouter as a separate provider identity while delegating its network behavior to the existing OpenAI-compatible code paths. Add defaults at both the Rust settings contract and renderer fallback boundary, and use a small frontend provider-default map so older settings documents receive valid OrcaRouter values immediately when the user selects it.

## Decision (ADR-lite)

**Context**: OrcaRouter is protocol-compatible with OpenAI but needs its own API key, defaults, provider label, and referral onboarding.

**Decision**: Add a first-class `orcarouter` provider and reuse OpenAI-compatible runtime adapters.

**Consequences**: The runtime stays simple and all existing OpenAI-compatible features work consistently. Provider dispatch matches must explicitly include OrcaRouter, and duplicated boundary defaults in Rust and TypeScript must remain synchronized.

## Technical Notes

- Primary files: `desktop/src-tauri/src/ai.rs`, `desktop/src-tauri/src/settings.rs`, `desktop/src-tauri/src/domain.rs`, `desktop/src/lib/desktop-api.ts`, `desktop/src/components/editor/settings-dialog.tsx`, `messages/en.json`, `messages/zh.json`, and `docs/free-api-key-guide.md`.
- Research: [`research/orcarouter-api.md`](research/orcarouter-api.md).
- Relevant contract: `.trellis/spec/guides/desktop-runtime-boundary.md`.
