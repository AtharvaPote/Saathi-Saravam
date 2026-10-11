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
- Inventory, udhaar, payments, simple single-item bills with stock decrement, appointment booking with slot collision checks, and farm tasks.
- Saved activity, completion progress, and JSON record export.
- Concurrent writes use version-based compare-and-swap. Confirmations are idempotent.
- Provider timeouts and errors are visible. Microphone tracks stop on completion or dismissal. No audio recordings are stored by this app; Sarvam receives the audio for processing. Transcripts and chat are saved.

## Deliberate draft limits

No phone/IVR connection, outbound alerts, real food ordering, live weather or mandi feed, or soil-card file parsing. Market/weather examples are visibly illustrative. Soil values may be entered in chat. Farm guidance is general and does not substitute for a local agronomist. Bills are simple demo sale records, not GST-compliant invoices. This is not a production multi-tenant authentication system.

## Development

- Node >=22.13.
- Install via the Sites plugin `install-dependencies.mjs` helper, then `npm run dev`.
- Local sign-in: `/signin-with-chatgpt?return_to=/` (starter's loopback-only mock; omitted from production).
- `node --test tests/domain.test.mjs` verifies stock, ledger and booking integrity.
- `npx tsc --noEmit` checks TypeScript.
- `npm run db:generate` after schema changes; apply generated migrations locally using the starter's Wrangler command. Sites applies hosted migrations during publication.
- Build with the Sites `build-site.mjs` helper. Keep its `sites()` Vite integration.

`SARVAM_API_KEY` is a hosted runtime secret. No key belongs in this source, browser bundle, manifest, or source archive. The supplied key should be rotated before broader sharing because it was pasted into the chat.

## API references

- https://docs.sarvam.ai/api-reference/speech-to-text/transcribe
- https://docs.sarvam.ai/api-reference/chat/chat-completions-v1
- https://docs.sarvam.ai/api-reference/text-to-speech/convert
