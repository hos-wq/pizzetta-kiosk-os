# BR SIGNAL TAXONOMY V1

STATUS: INITIAL CANONICAL TAXONOMY

Signals represent meaningful business information extracted from interactions.

A signal definition may contain:

ID
CATEGORY
PERSIST
NEEDS_ALAN
PRIORITY
BOT_CAN_CONTINUE
LIFECYCLE
NOTES

Priority:

LOW
NORMAL
INTERESTING
HIGH
URGENT

Lifecycle:

STICKY
REPLACEABLE
TRANSIENT
DOMAIN_EVENT

==================================================
ROOM / INVENTORY INTEREST
==================================================

ROOM_INTEREST
Persist: YES
Needs Alan: NO
Priority: NORMAL
Lifecycle: REPLACEABLE/MULTI
Value: BR room ID(s)

ROOM_SIZE_INTEREST
Persist: YES
Needs Alan: NO

BALCONY_INTEREST
Persist: YES
Needs Alan: NO

VIEW_INTEREST
Persist: YES
Needs Alan: NO

PANORAMIC_VIEW_INTEREST
Persist: YES
Needs Alan: NO

QUIET_ROOM_INTEREST
Persist: YES
Needs Alan: NO

BRIGHT_ROOM_INTEREST
Persist: YES
Needs Alan: NO

WORKSPACE_INTEREST
Persist: YES
Needs Alan: NO

FURNISHED_INTEREST
Persist: YES
Needs Alan: NO

KITCHEN_INTEREST
Persist: YES
Needs Alan: NO

MICROWAVE_INTEREST
Persist: YES
Needs Alan: NO

INDUCTION_COOKER_INTEREST
Persist: YES
Needs Alan: NO

REFRIGERATOR_INTEREST
Persist: YES
Needs Alan: NO

AIRCON_INTEREST
Persist: YES
Needs Alan: NO

TV_INTEREST
Persist: YES
Needs Alan: NO

==================================================
BUILDING / AMENITIES
==================================================

PARKING_INTEREST
Persist: YES
Needs Alan: NO
Priority: NORMAL

PARKING_REQUIRED
Persist: YES
Needs Alan: NO
Priority: INTERESTING

NO_PARKING_REQUIRED
Persist: YES
Lifecycle: REPLACEABLE

WIFI_INTEREST
Persist: YES

INTERNET_SPEED_INTEREST
Persist: YES

LAUNDRY_INTEREST
Persist: YES

WASHING_MACHINE_INTEREST
Persist: YES

POOL_INTEREST
Persist: YES

GYM_INTEREST
Persist: YES

SECURITY_INTEREST
Persist: YES

CCTV_INTEREST
Persist: YES

ELEVATOR_INTEREST
Persist: YES

RECEPTION_INTEREST
Persist: YES

==================================================
PETS / LIVING
==================================================

PETS_INTEREST
Persist: YES

CAT_OWNER
Persist: YES
Lifecycle: REPLACEABLE

DOG_OWNER
Persist: YES
Lifecycle: REPLACEABLE
Needs Alan: YES
Priority: INTERESTING

OTHER_PET
Persist: YES
Needs Alan: YES
Priority: INTERESTING

SMOKING_INTEREST
Persist: YES

VAPING_INTEREST
Persist: YES

VISITOR_POLICY_INTEREST
Persist: YES

OCCUPANCY_QUERY
Persist: YES

OCCUPANCY_COUNT
Persist: YES
Value: integer

CHILDREN_OR_FAMILY_QUERY
Persist: YES

==================================================
COMMERCIAL
==================================================

PRICE_QUERY
Persist: YES
Needs Alan: NO

DISCOUNT_REQUEST
Persist: YES
Needs Alan: YES
Priority: INTERESTING

LOW_OFFER
Persist: YES
Needs Alan: YES
Priority: INTERESTING

MINIMUM_STAY_QUERY
Persist: YES

SHORT_STAY_REQUEST
Persist: YES
Needs Alan: YES
Priority: INTERESTING

LONG_STAY
Persist: YES
Priority: INTERESTING

DEPOSIT_QUERY
Persist: YES

ADVANCE_QUERY
Persist: YES

PDC_QUERY
Persist: YES

PAYMENT_METHOD_QUERY
Persist: YES

BANK_TRANSFER_REQUEST
Persist: YES
Needs Alan: YES

GCASH_QUERY
Persist: YES

RESERVATION_FEE_QUERY
Persist: YES

UTILITIES_QUERY
Persist: YES

ELECTRICITY_QUERY
Persist: YES

WATER_QUERY
Persist: YES

ASSOCIATION_DUES_QUERY
Persist: YES

==================================================
TIMING / MOVE-IN
==================================================

AVAILABILITY_QUERY
Persist: YES

MOVE_IN_DATE
Persist: YES
Priority: INTERESTING
Lifecycle: REPLACEABLE
Value: normalized date/date range

STAY_DURATION
Persist: YES
Priority: INTERESTING
Lifecycle: REPLACEABLE
Value: normalized duration

MOVE_IN_READY
Persist: YES
Needs Alan: YES
Priority: HIGH

URGENT_MOVE_IN
Persist: YES
Needs Alan: YES
Priority: HIGH

==================================================
VIEWING
==================================================

VIEWING_INTEREST
Persist: YES
Needs Alan: YES
Priority: HIGH
Bot Can Continue: YES

VIEWING_DATE_PROPOSED
Persist: YES
Needs Alan: YES
Priority: HIGH
Value: normalized proposed date/time

VIEWING_SCHEDULING
Persist: YES
Needs Alan: YES
Priority: HIGH

VIEWING_CONFIRMED
Persist: YES
Needs Alan: YES
Priority: HIGH
Lifecycle: DOMAIN_EVENT

When confirmed, create/use the authoritative Viewing record.

Do NOT represent a confirmed viewing only as a label.

VIEWING_RESCHEDULE_REQUEST
Persist: YES
Needs Alan: YES
Priority: HIGH

VIEWING_CANCEL_REQUEST
Persist: YES
Needs Alan: YES
Priority: HIGH

VIEWING_NO_SHOW
Persist: YES
Needs Alan: YES
Priority: HIGH
Lifecycle: DOMAIN_EVENT

==================================================
RESERVATION / CONVERSION
==================================================

RESERVATION_INTEREST
Persist: YES
Needs Alan: YES
Priority: HIGH

READY_TO_RESERVE
Persist: YES
Needs Alan: YES
Priority: HIGH

RESERVATION_CONFIRMED
Persist: YES
Needs Alan: YES
Priority: HIGH
Lifecycle: DOMAIN_EVENT

CONTRACT_INTEREST
Persist: YES
Needs Alan: YES
Priority: HIGH

READY_TO_MOVE_IN
Persist: YES
Needs Alan: YES
Priority: HIGH

==================================================
OBJECTIONS
==================================================

TOO_EXPENSIVE
Persist: YES
Needs Alan: YES
Priority: INTERESTING

TOO_SMALL
Persist: YES
Needs Alan: NO

TOO_DARK
Persist: YES
Needs Alan: NO

NO_VIEW_OBJECTION
Persist: YES
Needs Alan: NO

LOCATION_OBJECTION
Persist: YES

BUILDING_AGE_CONCERN
Persist: YES

NO_POOL_OBJECTION
Persist: YES

NO_GYM_OBJECTION
Persist: YES

NO_WASHING_MACHINE_OBJECTION
Persist: YES

==================================================
TRUST / LEGITIMACY
==================================================

SCAM_CONCERN
Persist: YES
Needs Alan: YES
Priority: HIGH

LEGITIMACY_QUERY
Persist: YES
Needs Alan: YES
Priority: HIGH

OWNER_VERIFICATION_QUERY
Persist: YES
Needs Alan: YES
Priority: HIGH

PAYMENT_SAFETY_CONCERN
Persist: YES
Needs Alan: YES
Priority: HIGH

==================================================
SPECIAL_KID
==================================================

GHOSTS
Persist: YES
Needs Alan: NO
Priority: NORMAL

HAUNTED_QUERY
Persist: YES
Needs Alan: NO

WEIRD_REQUEST
Persist: YES
Needs Alan: YES
Priority: INTERESTING

SPECIAL_CASE
Persist: YES
Needs Alan: YES
Priority: INTERESTING

==================================================
CONTACT QUALITY — PRIVATE
==================================================

These are private Alan-only classifications.

They MUST NEVER be customer-visible.

GOOD_CONTACT
INTERESTING_CONTACT
HIGH_INTENT
USELESS
TIME_WASTER
PROBLEMATIC
IDIOT
SHITTY_CONTACT
PIECE_OF_SHIT

These should generally NOT be inferred from a single harmless message.

HM? alone MUST NOT automatically mean IDIOT.

Alan may manually assign any private quality label.

Deterministic rules may suggest a classification only where explicitly configured.

==================================================
NOISE / DO NOT PERSIST
==================================================

Examples:

HM
HELLO
HI
HEY
GOOD_MORNING
GOOD_AFTERNOON
GOOD_EVENING
THANK_YOU
OK
OKAY
LOL
HAHA
REACTION_ONLY
EMOJI_ONLY
GENERIC_ACKNOWLEDGEMENT

Default:

Persist: NO
Needs Alan: NO

The bot may respond appropriately without creating Person memory.

A minimal Person/channel identity may still exist for routing and identity resolution.