# WhatsApp RC forensic acceptance — 2026-10-07

## Scope and verdict

Audited starting checkpoint `1f4bd6a022fa56b5a74bdc8edd30bb79e523027d` and RC version `10ffeb94-6c5f-4eaf-ac00-da56a3309383`. Corrections are bounded to WhatsApp transport/webhook acceptance; no customer sends, Meta subscription changes, production access, new schema or bot business logic.

**READY FOR ALAN WHATSAPP E2E TEST** means ready for a controlled first text test after Meta configuration. It does not certify live token permissions, phone registration, Business App coexistence, delivery, customer rollout or production readiness. Those have not been observed.

## Blockers found and corrected

1. `webhook.ts:handleMetaEvent` acknowledged 200 before WhatsApp processing/persistence. D1 failures could be swallowed after acknowledgement. WhatsApp now awaits processing and returns 503 on intake/pre-send failures; Messenger handling remains unchanged.
2. `whatsapp.ts:processWhatsAppPayload` claimed a delivery separately from inbound persistence. A failed INSERT left a permanent claim and no message. Claim and inbound now use an atomic D1 batch. Failure rolls back both. Explicit pre-send failures may be conditionally reclaimed once; concurrent same-ID retries cannot both run the engine.
3. After external success, persistence failure was classified as ordinary FAILED. Reply intent and UNCERTAIN delivery state now persist before the external side effect. External message ID/status update follows immediately. Any ambiguous send or post-send failure remains UNCERTAIN and cannot trigger automatic resend. This is at-most-one send attempt, **not** an exactly-once delivery guarantee.
4. Missing configured account IDs widened inbound acceptance. HTTP processing now fails closed with 503 unless both numeric WABA and Phone Number IDs and the dedicated access token are configured.
5. Invalid huge timestamps could throw before error handling. Invalid/missing timestamps and non-phone recipients are rejected safely. Sender/recipient and outbound text length are validated.
6. HUMAN/DO_NOT_AUTO_REPLY suppression was falsely reported SENT. It is now explicitly recorded with AUTO_REPLY_SUPPRESSED, no outbound record and no Graph call. Existing schema represents this as FAILED plus the suppression reason; a dedicated display status can follow later.

## Concrete shared-engine trace

`index.ts` routes GET/POST `/webhook` ahead of auth/SPA. GET uses `handleMetaVerification`. POST uses `handleMetaEvent` -> `verifyMetaSignature` over exact raw bytes -> JSON shape -> `object=whatsapp_business_account` routing -> `parseWhatsAppInbound` (`messages` field, configured entry WABA/metadata phone, text/from/id/timestamp) -> atomic `channel_message_deliveries` + `conversation_messages` inbound -> `ConversationService.handle`.

Inside the same engine used by Messenger: `analyzeMessagingTextWithAliases` -> `createLead` -> `ensurePersonForExternalIdentity` -> canonical Person identity and `person_leads` -> facts/qualification/events -> `persistMessagingSignals` -> `leadOperationalDetail` -> factual reply -> `getMessagingControl/canAutoReply` -> transport sender. WhatsApp sender records reply intent -> `WhatsAppSendAdapter.sendText` -> Graph -> records provider result -> engine RECEIVE/SEND_FAILED audit -> inbound lead/person/status and delivery result.

Literal `hm?` normalizes to `hm`, detects HM and PRICE_QUERY. A new contact receives:

> Standard rent is ₱25,000/month, with a 3-month minimum. What date are you looking to move in?

The additional question is existing qualification behavior, not WhatsApp-specific logic. Both real adapters yield the same answer in the integration test. Private Person labels/control/signals are not interpolated into the customer reply.

## RC signature/configuration evidence

- RC Worker: `boutique-rooms-os-rc`; D1: `5082b4c9-f0f7-43b2-a457-e92c49f7bfc8` (not production `b156b6f1-3871-4113-8f46-476c1f97c02d`). Migration list through 0029 reports no pending migrations.
- Remote secret-name listing confirms META_APP_SECRET, META_VERIFY_TOKEN, META_PAGE_TOKEN and WHATSAPP_ACCESS_TOKEN exist. No values were printed or fetched from Cloudflare.
- `scripts/audit-whatsapp-rc.mjs` signs empty synthetic payloads locally without exposing secrets: WhatsApp signed POST 200; Messenger signed POST 200; correctly signed malformed JSON 400; wrong signature 401; GET challenge correct.
- Same verify token is correct for this shared handler. It is **not** the System User token and is **not** used for signatures. The shared signature secret is META_APP_SECRET, belonging to the app on which the callback is registered.
- Non-mutating Graph subscription read authenticated with the local BR App Secret confirms App ID `1095591632872369` and its active PAGE callback to RC, fields messages/messaging_postbacks/messaging_optins/message_deliveries/message_reads at v26.0. No WhatsApp app subscription is configured yet.
- Register WhatsApp callback on **Boutique Rooms OS, App ID 1095591632872369**, not Pizzy. A different app's signature would correctly fail.
- WABA `2270182723822854` filters inbound account. Phone Number ID `1345732791954154` filters inbound metadata and addresses outbound `/v26.0/1345732791954154/messages`. Dedicated WHATSAPP_ACCESS_TOKEN supplies the Bearer header. Page token remains separate.
- Actual WhatsApp System User token app/scopes/asset grants, phone registration and delivery are UNVERIFIED; existence of a remote secret is not proof that Graph accepts it.

## Original six tests: evidence and limitations

1. Parser test proves shape/account filtering and unsupported media. Original status sample incorrectly used a separate statuses field; new test covers real `messages` field with `statuses[]`.
2. Adapter test proves endpoint/header/payload formation with mocked fetch. It does not validate a real access token or deliver a message.
3. Persistence/dedupe test uses a fake DB and mocked engine. It does not prove Person creation, FK relationships, real normalization, rollback or concurrent behavior.
4. Signed dispatch test uses synthetic secret and mocked engine. It does not prove RC possesses the corresponding app secret.
5. Verification/unsigned test proves GET challenge and missing signature rejection. Its malformed unsigned request proves only 401, not signed malformed JSON handling.
6. Migration uniqueness test applies 0029 over minimal stub tables. It does not prove the full chain or business integration.

Added `whatsapp-integration.test.ts`: 16 cases using full 0001–0029 migrations, real SQLite constraints and real engine/Person/Lead/signals/control/audit; **only Graph is mocked**. Covers concurrent duplicate, canonical inbound/outbound FKs, hm?, shared Messenger reply/multiple identities, signed malformed/wrong/missing secret, actual delivery/read callback shape, Graph 400/401/429/500/503, timeout uncertainty, intake rollback/503/retry, engine pre-send retry, post-send D1 failure with retained reply intent/no resend, HUMAN suppression, invalid timestamps/configuration/recipients and missing outbound provider ID.

Full gate: 40 test files / 201 cases; typecheck, lint, frontend build and RC Worker dry-run. SQLite tests are not a substitute for Workers-runtime/live Meta delivery; remote probes cover the deployed signature/routing boundaries but deliberately contain no messages.

## Failure semantics after correction

- Wrong signature 401; missing app secret 503; valid-signature malformed JSON 400.
- Unsupported media/status/read/delivery or wrong account ignored, acknowledged 200 without engine/send.
- Same inbound ID: one persisted inbound, one engine run, at most one outbound attempt; concurrent retries tested.
- Intake D1 failure: atomic rollback, 503; safe redelivery tested.
- Explicit engine pre-send failure: retained inbound, retryable FAILED marker, 503; conditional retry tested.
- Graph 4xx/5xx: recorded failure, no blind resend, 200 acknowledgement. Graph timeout/missing message ID: UNCERTAIN, no blind resend.
- Post-send D1 failure: pre-persisted reply intent and UNCERTAIN claim retained; redelivery does not send again. Provider ID can still be unavailable if the immediately subsequent D1 write fails; do not treat that as proof of non-delivery.

## Remaining classifications

**IMPORTANT POST-E2E**

- `people.ts:ensurePersonForExternalIdentity` and `domain.ts:createLead`: distinct concurrent first messages for the same new contact can race; unique identity protects the identity association but a losing Person may remain orphaned and lead creation has no channel/contact unique index. Not tested as safe; serialize/atomically resolve first-contact identity/lead before uncontrolled customer rollout. Same-message dedupe is proved, distinct-message concurrency is not.
- A process crash leaving PROCESSING or UNCERTAIN needs authenticated reconciliation; no automatic lease expiry/replay UI exists. Never blindly resend uncertain messages.
- Engine pre-send retries can repeat already-applied lead counters/events if the failure happens after those writes. Shared engine mutations are not one encompassing transaction.
- Messenger uses the shared Person/engine but does not yet populate `conversation_messages`. Do not claim uniform two-channel message persistence or complete Office/Mobile message history.
- Raw text is persisted in `conversation_messages`; this differs from the older signals-only policy. Resolve retention/minimization before customer rollout; do not ingest passports/contracts/chat archives. No transcripts or secret values are logged by this transport.
- 24-hour reply-window handling, structured provider error codes and proactive failure/reconciliation visibility are incomplete. Old queued texts may produce a refused free-form reply; no templates are implemented.
- Existing engine business wording (for example electricity paid directly to Meralco) must be reconciled with current approved business facts before broad use. This tranche adds no WhatsApp-specific facts.
- Current official Meta signature/messages/coexistence documentation could not be retrieved (errors/429). Mark current-doc verification UNVERIFIED rather than relying on third-party reproductions. Do not unregister/migrate/delete the WhatsApp Business App account on this evidence.

**POST-RC1**

- Media/templates/status-state synchronization, BSUID/non-phone identity support, richer delivery UX and dedicated SUPPRESSED display status.
- Worker observability/traces and Workers-native tests can supplement the existing structured aggregate logs/Node SQLite suite.
- Frontend chunk-size build warning; unrelated to this text transport.

## Next Alan action and external prerequisites

Configure WhatsApp callback for BR App `1095591632872369`:

- Callback: `https://boutique-rooms-os-rc.boutiquerooms-makati.workers.dev/webhook`
- Verify token: the existing local META_VERIFY_TOKEN value, entered only into Meta, never chat.
- Object: whatsapp_business_account; field: messages (includes incoming text and statuses).

App field subscription alone is insufficient: the BR app must also be subscribed to WABA `2270182723822854` via `POST /2270182723822854/subscribed_apps` with a properly authorized WhatsApp token. No subscription was changed in this audit. Verify this asset association after the callback action. No unverified current Meta menu path is prescribed.

Official accessible source: Meta's WhatsApp Cloud API collection at https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api?entity=request-13382743-d0e227d1-e520-4b12-a8f6-32657a52d26e confirms WABA subscription and phone-ID send endpoint; it does not prove this number's coexistence or token permissions.

Stop for Alan configuration/controlled manual E2E. Production Worker/D1 and existing real WhatsApp documents/accounts remain untouched.
