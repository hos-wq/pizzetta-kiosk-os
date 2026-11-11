# Person messaging memory — RC delivery

- Canonical Person retains identity; channel metadata extends `person_external_identities` (RC migration 0030). No transcripts or raw message bodies added.
- Messenger enrichment retrieves `id,first_name,last_name,profile_pic`; fills empty Person/Lead names without overwriting owner edits. Phone/email are saved only when explicitly shared, never guessed from the profile.
- Conversation links are provider-returned, participant-matched HTTPS links on approved Meta domains, not fabricated from PSIDs. Permission/network failures are recoverable from Person → Messages → Refresh Messenger profile; bot delivery is independent.
- Full dossier now loads before relationship panels render. Messages panel presents consolidated active signal memory, source channels, occurrences, current qualification/score, open Attention, private manual labels, and conversation navigation.
- Existing score weights/vocabulary are used. A scoring concept is promoted once with an atomic D1 batch for event, score and audit. Qualification advances NEW only, never overwrites later lifecycle states. Viewing proposals remain Attention, not Calendar appointments.
- Scoped synthetic-contact correction preserves old records as RETRACTED/RESOLVED, restores ASAP and score 2, and records owner correction audit. No duration or appointment invented.
- Tests include signal consolidation, retry/concurrent score promotion, posting failure rollback, profile permission failure, owner-edit preservation, link injection, contact sharing, advanced-state preservation, and rendered dossier navigation/retry.
- Live local-credential metadata refresh stopped at credential validation; no credential was changed or exposed. Actual profile/link retrieval with the deployed Worker's Page credential must be verified using its authenticated refresh action or next inbound turn. Do not equate mocked metadata tests with real Meta acceptance.
- Production Worker/D1 untouched. Build size warning remains pre-existing post-RC debt.
