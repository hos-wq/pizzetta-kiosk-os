# CONVERSATION CONTROL

Conversation control is independent from NEEDS_ALAN.

States:

BOT
HUMAN

==================================================
BOT

Automation may respond according to current policy.

==================================================
HUMAN

Alan has explicitly taken control.

The bot MUST NOT send customer-facing messages.

Incoming messages may still be processed for operational signals if safe, but automation remains silent.

==================================================
TAKE OVER

Alan presses TAKE OVER in BR Mobile or Office.

Persist:

conversation_control = HUMAN
taken_over_at
taken_over_by = ALAN

Audit the action.

Provide direct external channel action where technically supported.

==================================================
RETURN TO BOT

Alan explicitly presses RETURN TO BOT.

Persist:

conversation_control = BOT
returned_at
returned_by = ALAN

Automation may resume from subsequent incoming messages.

Do not generate an unsolicited "I'm back" message.

==================================================
TIMEOUT

Never automatically return HUMAN → BOT solely because time elapsed.

BR OS may generate:

"Conversation has been under Alan control for 6 hours."

Alan decides.

==================================================
DO NOT AUTO REPLY

Support an explicit durable private control:

DO_NOT_AUTO_REPLY

This is stronger than temporary HUMAN takeover.

Useful for sensitive/problematic/special contacts.

Alan must explicitly remove it.

==================================================
CUSTOMER VISIBILITY

TAKE_OVER
RETURN_TO_BOT
DO_NOT_AUTO_REPLY
NEEDS_ALAN
internal notes
private labels

MUST NEVER be transmitted to the customer.