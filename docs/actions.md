# Saathi action API, version 1

All endpoints require the existing Sites ChatGPT session and a selected shop/farm demo. Data is scoped to that signed-in user and demo. These are session-authenticated application APIs, not public unauthenticated endpoints or external developer API keys. Sarvam calls them through the server's tool dispatcher; forms call the same action service through REST.

## Endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /api/actions` | Allowed actions, JSON argument schemas, Sarvam function tools and endpoint catalog |
| `GET /api/desk` | Current workspace records, conversation, incomplete inventory draft |
| `GET /api/inventory?q=Maggi` | Filter stock, packaging and prices (shop only) |
| `POST /api/actions` | Validate an action and prepare a review or a missing-field question; never commits records |
| `GET /api/actions/{proposalId}` | Retrieve a prepared review in this workspace |
| `POST /api/actions/{proposalId}` | `{ "decision": "confirm" }` or `{ "decision": "cancel" }` |
| `POST /api/desk` | `{ "op": "chat", "text": "…", "language": "en-IN", "requestId": "unique-request-id" }` |
| `POST /api/voice` | Multipart audio → transcript; JSON text + language → synthesized audio |

The browser supplies its session automatically for same-origin requests. Never put the Sarvam key in a frontend client. For app examples below, use same-origin `fetch` with `Content-Type: application/json`.

## New product: prepare, clarify, confirm

First request to `POST /api/actions`:

```json
{
  "requestId": "receipt-example-001",
  "action": { "type": "inventory", "mode": "add", "item": "Maggi", "quantity": 10, "unit": "cartons" }
}
```

Response contains `status: "needs_input"`, a `reply` asking how many packs/pieces are in a carton, and a server-generated `draftId`. The draft persists across reloads. No stock or packaging has changed.

Answer by sending the actual returned draft ID, without replacing the original receipt quantity:

```json
{
  "requestId": "receipt-example-002",
  "action": {
    "type": "inventory", "mode": "add", "item": "Maggi",
    "draftId": "<returned draftId>", "baseUnit": "packs", "unitsPerPack": 24
  }
}
```

The response is now `status: "pending"`. `proposal.action` is validated structured output:

```json
{
  "type": "inventory", "mode": "add", "item": "Maggi",
  "quantity": 10, "unit": "cartons", "baseUnit": "packs", "unitsPerPack": 24
}
```

`proposal.review` shows current stock 0 packs, 1 carton = 24 packs, and stock after confirmation 240 packs. Selling price is optional. Use the returned `proposal.id` for confirmation. Only that confirmation creates Maggi, adds 240 packs, and remembers the carton size. An unset price blocks billing until a separate `price` action is confirmed.

Next time, 2 cartons automatically resolves to 48 more packs. If KitKat is already tracked as boxes, receiving 5 boxes adds 5 directly; if tracked as pieces, the saved pieces-per-box conversion is used. A new or unknown box size prompts once. Different package sizes for the same product are rejected rather than silently changing the conversion; use a distinct variant name.

## Available actions

- `inventory`: `mode: add | set`, item, quantity, unit; optional baseUnit, unitsPerPack, price. Partial fields are permitted only while preparing inventory. `add` receives a delta; `set` explicitly replaces total stock. API preparation defaults to `add`; clients should always send mode.
- `price`: item, price per saved base unit.
- `credit`: customer, amount, optional note. Adds to outstanding udhaar.
- `payment`: customer, amount. Subtracts from outstanding udhaar; cannot overpay.
- `sale`: item, quantity in the saved base unit, customer. Uses saved price and reduces stock together.
- `task`: title, date (`YYYY-MM-DD`).
- `task_status`: id, done.
- `appointment`: customer, service, date, time (`HH:mm`, India time).

The farmer demo exposes task actions only. GST, invoices, phone calls and live agriculture feeds remain planned features and have no action tools yet.

## Model and confirmation boundaries

Sarvam 105B receives native function definitions generated from `action-registry.ts`. It selects read/prepare tools and returns structured arguments. The server owns workflow IDs, resolves matching drafts, validates Zod schemas, computes conversions, and creates the human review. Models cannot choose SQL, arbitrary URLs, or an execution function. The model never receives a confirm/save tool.

The user can tap Confirm & save or say an explicit phrase such as “confirm”. Spoken confirmation sends the displayed proposal ID; the server recognizes an exact phrase before asking the model. Generic “yes” does not execute anything.

Only one proposal is active at a time. A new proposal supersedes older pending ones. Repeated confirmation is idempotent while that proposal is retained. Optional request IDs (8–100 characters) make duplicate preparations return the original proposal within the retained conversation; reuse an ID only for retries of the same request. The last 100 messages are retained, so clients should not rely on indefinite idempotency or retention of old reviews.

If the relevant stock, price or ledger changes while a review is open, confirmation returns `status: "review_updated"` with new totals and saves nothing. Show the updated review and request confirmation again. Workspace writes use optimistic concurrency checks. Errors leave records unchanged.

An explicit manual task checkbox is a direct user action and remains available through the legacy `task-done` operation. All model-requested changes require a review.

## Testing

- `node --test tests/domain.test.mjs`: conversion, draft merge, units, review invalidation, ownership, duplicate/cancelled actions.
- `node tests/integration.mjs` and `node tests/actions-integration.mjs`: local API/session persistence and confirmation checks; no external model calls.
- `node scripts/test-inventory-with-secret.mjs`: enter the API key at its hidden stdin prompt. Runs the actual Sarvam model against in-memory synthetic Maggi/KitKat/Test Customer fixtures using the same prompt, tool definitions and domain logic. Does not read the workspace database or previous conversations.
- `node tests/live-voice.mjs`: local speech routes; synthesizes and transcribes one synthetic Hindi greeting.

Model output can vary. Domain validation and confirmation remain mandatory even when a model test passes. Microphone permission and browser audio playback must be exercised by the person using the browser; automated speech tests verify the provider routes, not a physical microphone.
