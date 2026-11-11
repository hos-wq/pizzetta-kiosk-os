# NEEDS ALAN — ATTENTION RULES

NEEDS_ALAN means:

Alan should know that this happened.

It DOES NOT mean:

stop the bot.

Default:

NEEDS_ALAN + BOT ACTIVE

==================================================
DEFAULT HIGH VALUE TRIGGERS
==================================================

Notify Alan for:

VIEWING_INTEREST
VIEWING_DATE_PROPOSED
VIEWING_SCHEDULING
VIEWING_CONFIRMED
VIEWING_RESCHEDULE_REQUEST
VIEWING_CANCEL_REQUEST

RESERVATION_INTEREST
READY_TO_RESERVE
RESERVATION_CONFIRMED

MOVE_IN_READY
URGENT_MOVE_IN

CONTRACT_INTEREST

DISCOUNT_REQUEST
LOW_OFFER

SHORT_STAY_REQUEST

DOG_OWNER
OTHER_PET where exception may be required

SCAM_CONCERN
LEGITIMACY_QUERY
OWNER_VERIFICATION_QUERY
PAYMENT_SAFETY_CONCERN

WEIRD_REQUEST
SPECIAL_CASE

Anything the deterministic engine cannot safely answer but considers potentially commercially meaningful.

==================================================
PRIORITY

NORMAL
No Alan notification by default.

INTERESTING
Surface in Attention Center.
May generate notification according to Alan settings.

HIGH
Generate Alan notification.
Surface prominently in Attention Center.

URGENT
Immediate/high prominence notification where platform capabilities allow.

==================================================
BOT CONTINUATION

Unless explicitly prohibited by policy:

NEEDS_ALAN does not stop conversation automation.

Example:

Customer:
"Can I see BR07 tomorrow?"

System:
VIEWING_INTEREST
ROOM_INTEREST=BR07
VIEWING_DATE_PROPOSED=tomorrow
NEEDS_ALAN=HIGH

Bot may continue discussing viewing logistics.

Alan is simultaneously notified.

Alan may monitor or TAKE OVER.

==================================================
ALAN CONFIGURATION

The taxonomy must eventually allow Alan to configure:

signal enabled
persist yes/no
Needs Alan yes/no
priority
notification channel
bot may continue