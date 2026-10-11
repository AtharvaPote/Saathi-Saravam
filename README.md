# Saathi — everyday voice companion

A private first-draft app for a kirana owner and farmer. Built with React, Vinext, Cloudflare Workers/D1, and Sarvam speech/chat APIs.

## Demo accounts

| Account | Email | Password |
| --- | --- | --- |
| Meena, shop owner | shop@saathi.demo | Saathi@123 |
| Ramesh, farmer | farmer@saathi.demo | Saathi@123 |

Sites ChatGPT sign-in protects the private app. These credentials select demo workspaces, not standalone production identities. Records are scoped by the signed-in user's Sites ID plus demo profile. A profile cookie is a selector, not an authentication boundary. Starting inventory, udhaar and farm tasks are sample data; subsequent changes persist in D1.

## Working flows

- Push-to-talk (up to 25 seconds) → Sarvam transcription → contextual chat → spoken reply. Text entry and replay are also available.
- English, Hindi and Marathi voice and primary navigation.
- Review and confirm each proposed record mutation, including model proposals.
- Inventory receipts with add-versus-set semantics, missing pack-size questions, saved carton/box conversions, optional initial prices and before/after review.
- Shared action APIs and native Sarvam 105B function calling for voice and manual entry; see [the API contract](docs/actions.md).
- Udhaar, payments, simple single-item bills with stock decrement, appointment booking with slot collision checks, and farm tasks.
- Farmer notebook: crop seasons with plot, area, location, sowing date and stage; paid expenses with per-crop totals; dated crop-linked tasks with overdue and completion views. New farmer panels and prompts support English, Hindi and Marathi. All changes, including task completion, are reviewed before saving.
- Farmer voice and text use native tools to prepare crops, expenses and tasks. Saved crop details inform general guidance; read-only farm APIs expose recorded totals. Existing accounts start with empty crop/expense lists, preserving their tasks.
- Saved activity, completion progress, and JSON record export.
- Concurrent writes use version-based compare-and-swap. Confirmations are idempotent for retained proposals; changed records require a fresh review. See the API contract for retention limits.
- Voice/chat processing sends the current conversation and relevant demo records to Sarvam to interpret requests. Provider timeouts and errors are visible. Microphone tracks stop on completion or dismissal. No audio recordings are stored by this app; Sarvam receives the audio for processing. Transcripts and chat are saved.

## Deliberate draft limits

No phone/IVR connection, outbound alerts, real food ordering, live weather or mandi feed, or soil-card file parsing. Soil values may be entered in chat. Farm guidance is general and does not substitute for a local agronomist. Bills are simple demo sale records, not GST-compliant invoices. This is not a production multi-tenant authentication system.

The farmer dashboard uses saved records rather than fictional weather or prices. Expense totals cover recorded payments only, not complete production cost or profit. Tasks stay in the app and do not send reminders. Crop identity (crop, plot, sowing date) is fixed after creation so linked costs remain attached to the same season; add a new record for the next season. Stage, area, location and variety can be updated after review.

## Coming up

Invoice management, GST billing and tax summaries, plus incoming and outgoing phone calls. These are visibly marked as planned features on both dashboards and in Help. Current speech works within the app; no telephone calls are placed or received.

## Development

- Node >=22.13.
- Install via the Sites plugin `install-dependencies.mjs` helper, then `npm run dev`.
- Local sign-in: `/signin-with-chatgpt?return_to=/` (starter's loopback-only mock; omitted from production).
- `node --test tests/*.test.mjs` verifies stock, ledger, crop/expense/task integrity and the Gemma protocol.
- `node tests/farm-integration.mjs` checks farmer APIs, profile isolation, reviews and persistence against the local preview with synthetic records.
- `node scripts/test-farm-with-secret.mjs` accepts a Sarvam key through hidden stdin and tests five native-tool conversations against synthetic in-memory farmer records; it does not use the workspace database.
- `npx tsc --noEmit` checks TypeScript.
- `npm run db:generate` after schema changes; apply generated migrations locally using the starter's Wrangler command. Sites applies hosted migrations during publication.
- Build with the Sites `build-site.mjs` helper. Keep its `sites()` Vite integration.

`SARVAM_API_KEY` is a hosted runtime secret. No key belongs in this source, browser bundle, manifest, or source archive. The supplied key should be rotated before broader sharing because it was pasted into the chat.

## API references

- https://docs.sarvam.ai/api-reference/speech-to-text/transcribe
- https://docs.sarvam.ai/api-reference/chat/chat-completions-v1
- https://docs.sarvam.ai/api-reference/text-to-speech/convert

## Five ready-made voice demos

Open **Open voice demos** from the shop overview. Each sample has **Try as text** and **Try as voice** paths, a downloadable real Bulbul recording, the recognized words, and a structured action review. The voice path uploads the WAV to the same speech-to-text endpoint used by microphone input. Confirmations affect only that isolated test case. Re-running a case resets its synthetic fixture; normal shop records stay unchanged.

Samples cover a new Maggi carton receipt, a pack-size follow-up, more existing KitKat boxes, Hindi Tea receipt, and a stock-total correction. Audio provenance is in `public/voice-samples/manifest.json`; latest automated results are in `public/voice-samples/results.json`. Run `node tests/voice-samples.mjs` against the local secret-enabled preview. Test results demonstrate these fixtures, not general production accuracy.

Hosted **Gemma 4** reasoning is prepared as an optional comparison backend; see [setup and verification limits](docs/gemma.md). It requires a separate server-side `GEMINI_API_KEY`. Sarvam remains the working default and handles speech for either backend. No live Gemma call has been made without that key.
