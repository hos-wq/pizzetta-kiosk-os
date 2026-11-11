# RC conversation flow — 2026-10-08

## Owner conversation policy

- Mirror greeting-only messages, including returning contacts. Respond with the customer's greeting, apartment availability in Poblacion/Makati, then ask whether they are interested in renting.
- Ask one useful question per turn. Use native Messenger quick replies for finite choices. Custom dates and viewing times require typed answers; Messenger does not provide native editable date fields in this implementation.
- Remember structured facts and the last delivered question; do not archive bodies in conversation-state audits. Never ask for a fact already known unless the customer changes it.
- Acknowledge answers plainly. Answer side questions and resume the relevant question. Respect declines and thank-you messages. Clarify unknown input instead of repeating a generic introduction.
- Keep the conversation on its originating channel. The business WhatsApp number remains +63 905 547 4651.
- Proposals are not confirmed appointments. Viewing proposals generate structured lead events and Attention; only the existing owner-confirmed Viewing operation creates the authoritative appointment/calendar record. Viewing dates must not overwrite move-in dates.
- NEEDS_ALAN permits bot continuation. HUMAN and DO_NOT_AUTO_REPLY suppress sending.

## Defects corrected

Messenger discarded message.quick_reply.payload and interpreted only the displayed title. The grouped selection regex also assigned the wrong capture group to duration/date/occupancy values. Returning leads bypassed the owner greeting. Native selections could falsely generate LOW_CONFIDENCE, halt qualification and fall through to generic text. The shared engine now validates and consumes the actual selection, persists canonical facts, and resumes from the next missing fact.

## Evidence

24 integration cases in tests/messenger-journeys.test.ts use all RC migrations and actual SQLite relationships. Only Graph transport is mocked. They cover new/returning greetings, all move-in precision choices, duration/occupancy/viewing, typed answers, custom dates, side questions, corrections, multiple facts, declines, acknowledgements, unknown input, occupancy exceptions, HUMAN/DNR suppression, concurrent duplicates, send failure, split viewing date/time, invalid dates/choices and transcript-free state. Existing tests separately cover signatures, postbacks, sending and Messenger/WhatsApp regressions.

Quality gate: 41 test files / 230 tests passed; typecheck, lint, frontend build and RC Worker dry-run passed. Real Messenger device acceptance remains external; these tests do not claim a physical client or live Graph acceptance pass.

No migrations, production writes, customer test sends, new AI dependency, or replacement business domains were introduced.
