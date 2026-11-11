# SIGNAL ENGINE REGRESSION CORPUS V1

Every deterministic-engine change must run against a regression corpus.

These are starter cases.

==================================================

INPUT:
hm?

EXPECTED:
PRICE_QUERY may be recognized for response routing
NO persistent business signal required
NEEDS_ALAN = false

==================================================

INPUT:
hm po

EXPECTED:
same as hm?

==================================================

INPUT:
avail pa?

EXPECTED:
AVAILABILITY_QUERY

==================================================

INPUT:
may available pa po?

EXPECTED:
AVAILABILITY_QUERY

==================================================

INPUT:
may parking ba?

EXPECTED:
PARKING_INTEREST

==================================================

INPUT:
I need parking

EXPECTED:
PARKING_REQUIRED

==================================================

INPUT:
I don't need parking

EXPECTED:
NO_PARKING_REQUIRED
MUST NOT produce PARKING_REQUIRED

==================================================

INPUT:
wala akong car

EXPECTED:
NO_PARKING_REQUIRED

==================================================

INPUT:
pwede pet? may pusa ako

EXPECTED:
PETS_INTEREST
CAT_OWNER

==================================================

INPUT:
I have a dog

EXPECTED:
DOG_OWNER
NEEDS_ALAN = true
priority = INTERESTING

==================================================

INPUT:
may washing machine?

EXPECTED:
WASHING_MACHINE_INTEREST

==================================================

INPUT:
where can I do laundry?

EXPECTED:
LAUNDRY_INTEREST
MUST NOT automatically produce WASHING_MACHINE_INTEREST

==================================================

INPUT:
may gym?

EXPECTED:
GYM_INTEREST

==================================================

INPUT:
pool?

EXPECTED:
POOL_INTEREST

==================================================

INPUT:
20k kaya?

EXPECTED:
LOW_OFFER or DISCOUNT_REQUEST
NEEDS_ALAN = true

==================================================

INPUT:
nego pa?

EXPECTED:
DISCOUNT_REQUEST
NEEDS_ALAN = true

==================================================

INPUT:
can view?

EXPECTED:
VIEWING_INTEREST
NEEDS_ALAN = true
priority = HIGH

==================================================

INPUT:
pwede makita bukas?

EXPECTED:
VIEWING_INTEREST
VIEWING_DATE_PROPOSED = tomorrow
NEEDS_ALAN = true
priority = HIGH

==================================================

INPUT:
can view tom around 3?

EXPECTED:
VIEWING_INTEREST
VIEWING_DATE_PROPOSED = tomorrow ~15:00
NEEDS_ALAN = true

==================================================

INPUT:
actually Saturday na lang

PRECONDITION:
active viewing scheduling context

EXPECTED:
replace/update proposed viewing date appropriately

==================================================

INPUT:
I want BR07

EXPECTED:
ROOM_INTEREST = BR07

==================================================

INPUT:
07 available?

EXPECTED:
ROOM_INTEREST = BR07
AVAILABILITY_QUERY

==================================================

INPUT:
need quiet room

EXPECTED:
QUIET_ROOM_INTEREST

==================================================

INPUT:
I don't care about the view

EXPECTED:
MUST NOT produce VIEW_INTEREST

==================================================

INPUT:
need a nice view

EXPECTED:
VIEW_INTEREST

==================================================

INPUT:
can move asap

EXPECTED:
MOVE_IN_READY
URGENT_MOVE_IN
NEEDS_ALAN = true

==================================================

INPUT:
3 months

PRECONDITION:
duration question/context

EXPECTED:
STAY_DURATION = 3 months

==================================================

INPUT:
only one month

EXPECTED:
SHORT_STAY_REQUEST
STAY_DURATION = 1 month
NEEDS_ALAN = true

==================================================

INPUT:
is this legit?

EXPECTED:
LEGITIMACY_QUERY
NEEDS_ALAN = true
priority = HIGH

==================================================

INPUT:
scam ba to?

EXPECTED:
SCAM_CONCERN
NEEDS_ALAN = true
priority = HIGH

==================================================

INPUT:
do I need to pay before viewing?

EXPECTED:
PAYMENT_SAFETY_CONCERN
VIEWING-related context
NEEDS_ALAN = true

==================================================

INPUT:
may multo ba jan 😂

EXPECTED:
SPECIAL_KID:GHOSTS
NEEDS_ALAN = false

==================================================

INPUT:
haunted ba building?

EXPECTED:
SPECIAL_KID:HAUNTED_QUERY

==================================================

INPUT:
thanks

EXPECTED:
NO persistent signal

==================================================

INPUT:
ok po

EXPECTED:
NO persistent signal

==================================================

INPUT:
😂😂😂

EXPECTED:
NO persistent signal

==================================================

INPUT:
parking parking parking

EXPECTED:
one PARKING_INTEREST concept
not three duplicate labels

==================================================

INPUT:
do you have parking? actually I don't have a car

EXPECTED:
final structured state should not claim PARKING_REQUIRED
NO_PARKING_REQUIRED should supersede requirement interpretation

==================================================

INPUT:
hm?
avail?
can view tom?

EXPECTED ACROSS SHORT-LIVED TRANSIENT CONTEXT:
PRICE response routing
AVAILABILITY_QUERY
VIEWING_INTEREST
VIEWING_DATE_PROPOSED
NEEDS_ALAN = true

Raw transcript MUST NOT become persistent conversation storage.