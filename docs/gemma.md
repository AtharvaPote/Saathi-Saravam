# Optional hosted Gemma reasoning

Status: implemented and checked with local protocol fixtures. **No live Gemma request has been tested: no Gemini API key was supplied.** Sarvam remains the default. A configured-key availability indicator is not a successful connectivity check.

The optional voice-demo reasoning provider uses `gemma-4-26b-a4b-it` through Google's `v1beta/models/...:generateContent` endpoint. `thinkingLevel: high` enables thinking. Sarvam still handles speech transcription and synthesis; Gemma is the text reasoning and tool-selection step.

## Owner setup

1. Obtain a Gemini API key with access to the model from [Google AI Studio](https://aistudio.google.com/).
2. Configure `GEMINI_API_KEY` as a **server-side secret** in the deployed Worker's environment through the deployment platform. For local Wrangler development, use an ignored `.dev.vars` file. Never use a `NEXT_PUBLIC_` variable or put a key in source control, chat, or browser storage.
3. Restart the local server or apply the deployment environment change, then explicitly select Gemma in the voice demo. Configuring a key does not change the Sarvam default.
4. Validate a plain reply, an inventory lookup, a proposed stock change, and cancellation/confirmation against a test account. Check English, Hindi and Marathi and actual response latency before describing the integration as live-tested.

## Behavior and limits

Google function declarations use a supported schema subset. Saathi's domain validation remains authoritative, including strict positive quantities and action permissions. Model-selected changes still pass through the existing review and confirmation flow.

The adapter retains original model parts within the server-side tool loop, including opaque signatures, and returns parallel tool results as one user turn with matching native IDs when supplied. Thought-marked text and calls are excluded from user-facing answers/actions. Raw provider parts are not intended for client responses or persisted chat history.

Blocked, empty, malformed and token-limited results produce a retryable application error rather than a partial action. Requests have a 60-second timeout and a 4096-token output cap; thinking can consume output capacity. Google quota/access failures are sanitized. There is no automatic fallback to another provider. Actual quota, account access, multilingual quality and latency remain unverified.

Run the offline protocol tests with Node 26:

```sh
node --test tests/gemma.test.mjs
```

These tests use fixtures and do not establish model availability, provider billing, or live tool quality.

## Official references

- [Hosted Gemma via Gemini API](https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api): model name, thinking toggle, system instructions and function declarations.
- [Gemini function calling](https://ai.google.dev/gemini-api/docs/function-calling): function-call workflow and schema guidance.
- [Gemini API content and function response reference](https://ai.google.dev/api/caching#FunctionResponse): provider content structures.
- [Thought signatures](https://ai.google.dev/gemini-api/docs/thought-signatures): retain opaque provider context when continuing tool turns.

Documentation checked 11 October 2026. The current general function-calling guide also covers the newer Interactions API; this integration deliberately uses the generateContent endpoint shown in the hosted Gemma guide.
