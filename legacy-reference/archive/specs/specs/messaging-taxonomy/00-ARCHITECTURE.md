# BR MESSAGING INTELLIGENCE — ARCHITECTURE

STATUS: FROZEN V1 SPECIFICATION

## FUNDAMENTAL PRINCIPLE

BR OS is not a conversation archive.

External messaging platforms remain the location of the original conversation.

BR OS processes incoming message content transiently in order to understand it.

BR OS MUST NOT persist:
- incoming message body
- outgoing message body
- conversation transcript
- raw chat history

BR OS MAY persist meaningful structured facts derived from the interaction.

Pipeline:

MESSAGE
→ PERSON RESOLUTION
→ NORMALIZATION
→ LANGUAGE / SLANG NORMALIZATION
→ INTENT DETECTION
→ SIGNAL EXTRACTION
→ NEGATION / CONTEXT CHECK
→ TAXONOMY RESOLUTION
→ STRUCTURED PERSON DATA
→ NOTIFICATION RULES
→ BOT ACTION

Raw message content is discarded after processing.

## PERSON FIRST

Before interpreting a message, resolve the Person.

Determine whether the sender is:
- completely new
- known minimal contact
- previous interested person
- previous viewing
- previous reservation
- current tenant
- former tenant
- previous problematic contact
- otherwise known

Previous structured knowledge may affect how the automation communicates.

Do not create duplicate People simply because the communication channel changes.

## THREE DISTINCT CONCEPTS

Do not confuse:

1. SIGNAL / LABEL
2. DOMAIN EVENT / RELATIONSHIP
3. ATTENTION STATE

Example:

PARKING_INTEREST
= signal

VIEWING_CONFIRMED
= actual Viewing domain record

NEEDS_ALAN
= operational attention state

A single interaction may produce all three.

## NEEDS_ALAN

NEEDS_ALAN DOES NOT mean the bot stops.

It means:

"Something happened that Alan wants to know about."

Default:

BOT ACTIVE
+
NEEDS_ALAN

The bot continues communicating normally.

Alan receives an Attention notification.

Only explicit TAKE OVER changes conversation control.

## HUMAN TAKEOVER

States:

BOT
HUMAN

Additional attention state:

NEEDS_ALAN = true/false

Possible state:

BOT + NEEDS_ALAN

Alan may press:

TAKE OVER

Then:

conversation_control = HUMAN

The bot MUST NOT send customer messages while HUMAN control is active.

Alan communicates using the original external platform.

When finished Alan presses:

RETURN TO BOT

Then:

conversation_control = BOT

No automatic timeout may silently return control to the bot.

BR OS may remind Alan that a conversation has remained under HUMAN control for a configurable period.

## INTERNAL ACTIONS

BR OS may contain private internal actions such as:

TAKE_OVER
RETURN_TO_BOT
FOLLOW_UP
DO_NOT_AUTO_REPLY
NEEDS_ALAN

These are internal BR OS state/actions.

They MUST NEVER be transmitted as customer messages.

## AI INDEPENDENCE

BR OS MUST remain operational when OpenAI/AI MODE is OFF.

Architecture:

Layer 1:
Deterministic normalization, dictionary, taxonomy, fuzzy matching, negation and state rules.

Layer 2:
Optional AI interpretation when AI MODE is ON.

Layer 3:
BR CORE validates and decides what may be persisted and what action may occur.

AI is enhancement.

AI is not source of truth.

AI must not directly write arbitrary database state.

## INSTALLED NLP LIBRARIES

The repository already has:

wink-nlp
fast-fuzzy

They were installed manually by Alan because the Codex execution environment may not have Windows administrator/install permissions.

Do NOT attempt unnecessary package installation.

Evaluate and use these libraries where useful and compatible with the existing Cloudflare Worker architecture.

Do not force them where a small deterministic implementation is safer.