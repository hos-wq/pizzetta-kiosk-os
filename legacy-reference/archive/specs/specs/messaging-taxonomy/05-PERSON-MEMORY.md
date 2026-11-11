# PERSON STRUCTURED MEMORY

BR OS remembers meaningful facts, not conversations.

Example Person memory:

Person
- identity
- channel identities
- first contact timestamp
- latest contact timestamp

Signals
- PARKING_REQUIRED
- CAT_OWNER
- DISCOUNT_REQUEST
- VIEWING_INTEREST

Requirements
- move-in date
- intended stay
- occupancy count

Room relationships
- interested BR07
- previously viewed BR07
- former tenant BR05
- current interest BR32

Operational relationships
- viewing
- reservation
- tenancy

Private labels
- GOOD_CONTACT
- PROBLEMATIC
etc.

Documents
- references only

==================================================
KNOWN PERSON CONTEXT

When a known Person returns, automation may use existing structured history.

Examples:

Former BR07 tenant asks about another room.

System knows:
- this is not a completely new stranger
- former tenancy relationship exists
- previous room
- relevant safe historical structured facts

Communication may therefore differ appropriately.

Never expose private Alan labels.

Never tell a customer:
"You are labelled PROBLEMATIC."

==================================================
SIGNAL DEDUPLICATION

Repeated signal:

PARKING_INTEREST
PARKING_INTEREST
PARKING_INTEREST

does not require three identical permanent labels.

Store current structured fact and appropriate timestamps/counters only if operationally useful.

==================================================
REPLACEABLE FACTS

Some facts may change.

Example:

DOG_OWNER

later clarified:

"I don't have a dog, my girlfriend does."

Do not blindly accumulate contradictory permanent truth.

Support correction/supersession where appropriate.

==================================================
MANUAL ALAN LABELS

Alan can manually add/remove private labels at any time.

Private labels are not customer-facing AI context.