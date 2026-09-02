# OrcaRouter API integration research

## Sources

- Chat Completions API: <https://docs.orcarouter.ai/api-reference/chat/%E5%88%9B%E5%BB%BA%E4%B8%80%E6%AC%A1-chat-completion>
- API key setup: <https://docs.orcarouter.ai/getting-started/get-api-key>
- Model catalog: <https://docs.orcarouter.ai/getting-started/models>
- Free models: <https://docs.orcarouter.ai/routing/free-models>
- User-provided referral URL: <https://www.orcarouter.ai/ref/ref_77fed7ef35745efad2f0>

## Findings

- OrcaRouter exposes an OpenAI-compatible API at `https://api.orcarouter.ai/v1`.
- Chat completions use `POST /chat/completions`, bearer authentication, SSE streaming, tool calls, and structured output.
- API keys begin with `sk-orca-` and are sent as `Authorization: Bearer ...`.
- Available models are returned by `GET /v1/models` in the standard `{ "data": [{ "id": ... }] }` shape already handled by JobPilot's OpenAI-compatible model loader.
- Free model IDs end in `-free`; the built-in `orcarouter/free` router chooses among available free models without falling back to paid models.
- Free-tier `429` responses may include `Retry-After` for a rate-window limit; a `429` without it may mean the request exceeds the free-tier prompt-size cap. The existing UI can surface the provider error for the MVP; automatic delayed retry is out of scope.

## Repository fit

- Treat `orcarouter` as a distinct provider identity so its key and defaults are stored independently under `provider.orcarouter.api_key`.
- Reuse the existing OpenAI-compatible request, streaming, tool-calling, model-list, and connectivity implementations.
- Default OrcaRouter configuration should use base URL `https://api.orcarouter.ai/v1` and model `orcarouter/free`.
- Add provider-specific onboarding copy in the desktop settings screen that opens the supplied referral URL.
- Keep OpenAI as the default provider for existing and new installations unless the user explicitly requests a product-wide default change.

