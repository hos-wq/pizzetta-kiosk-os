# BR NORMALIZATION ENGINE

Goal:

Understand ordinary rental inquiries, not formal English.

Expected inputs include:

English
Filipino / Tagalog
Taglish
code-switching
Gen-Z slang
Millennial slang
gay/queer slang
text abbreviations
misspellings
missing punctuation
phonetic spelling
very short messages
multiple messages forming one thought

Normalization MUST be domain-aware.

==================================================
GENERAL RULE
==================================================

Never use keyword presence alone as final meaning.

Example:

"I need parking"
→ PARKING_REQUIRED

"Do you have parking?"
→ PARKING_INTEREST

"I don't need parking"
→ NO_PARKING_REQUIRED

"I don't have a car"
→ NO_PARKING_REQUIRED

"Parking is not important"
→ NO_PARKING_REQUIRED

Negation and context matter.

==================================================
COMMON FILIPINO/TAGLISH NORMALIZATION EXAMPLES
==================================================

avail
available?
avail pa?
available pa?
meron pa?
may available?
available pa po?
vacant?
vacant pa?
may unit pa?
→ AVAILABILITY_QUERY

hm
hm?
hm po
how much
how much po
magkano
magkano po
price?
price po
→ PRICE_QUERY
but PRICE_QUERY persistence may be suppressed for low-value price-only contact according to policy.

pwede tawad?
may tawad?
nego?
negotiable?
last price?
best price?
20k?
20k final?
kaya 20?
pwede 20?
→ DISCOUNT_REQUEST / LOW_OFFER according to context

view
viewing
can view?
can i see?
pwede makita?
pwede makita unit?
tingin unit
can check?
can visit?
site viewing
ocular
ocular visit
→ VIEWING_INTEREST

tom
tmrw
tomorrow
bukas
later
mamaya
ngayon
today
weekend
sat
sun
→ date normalization only when context indicates timing/viewing/move-in

lipat
move
move in
move-in
when can move
pwede lipat
lipat agad
move agad
ASAP move
→ MOVE_IN intent/date according to context

parking
car park
parking slot
may parking?
may parking ba?
parking po?
saan parking?
pwede mag park?
meron parking?
→ PARKING interest/requirement according to context

pet
pets
pusa
cat
kitty
aso
dog
puppy
fur baby
furbaby
furparent
→ PETS/CAT/DOG according to context

laba
laundry
washing
washer
washing machine
laundromat
laundry shop
→ distinguish LAUNDRY_INTEREST from WASHING_MACHINE_INTEREST

wifi
wi-fi
internet
net
connection
mbps
speed
5g
→ WIFI / INTERNET_SPEED

pool
swimming pool
swim
→ POOL_INTEREST

gym
fitness
workout
→ GYM_INTEREST

multo
ghost
ghosts
haunted
may multo?
may ghost?
haunted ba?
→ SPECIAL_KID:GHOSTS / HAUNTED_QUERY

==================================================
POLITENESS PARTICLES
==================================================

Words such as:

po
opo
sir
maam
ma'am
boss
bossing
lods
lodicakes
idol
teh
ate
kuya
mamser

may affect tone but generally do not create business signals.

Do not confuse them with identity or intent.

==================================================
TEXT SPEAK / VARIATION
==================================================

Normalization should tolerate examples such as:

u
ur
pls
plz
pde
pwede
pwd
meron
mayron
my
avail
avl
nego
neg
tmrw
tom
bukas
rn
asap
nxt wk
nextweek

Use fuzzy matching carefully.

Fuzzy matching MUST NOT turn unrelated words into business signals.

==================================================
MULTI-MESSAGE CONTEXT

Messaging platforms may deliver:

"hm?"
"avail?"
"can view tom?"

as separate events.

BR OS does not persist transcript bodies.

However, transient short-lived processing context may be used where technically necessary to interpret immediately adjacent messages.

Such transient context MUST have a short TTL and MUST NOT become a conversation archive.

Persist only extracted structured results.