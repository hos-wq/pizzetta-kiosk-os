# LANGUAGE AND SLANG POLICY

The engine is intended for real conversations in Makati/Poblacion.

Do not assume grammatically correct English.

Expected communication includes:

English
Filipino/Tagalog
Taglish
code-switching
Gen-Z slang
Millennial slang
gay/queer slang
internet slang
SMS abbreviations
typos
phonetic spelling
emoji
very short messages

==================================================
PRINCIPLE

We are NOT attempting to build a universal Filipino language model.

We are building a strong domain-specific normalization system for apartment rental conversations.

Prioritize vocabulary related to:

availability
price
negotiation
move-in
length of stay
viewing
reservation
contract
payment
deposit
PDC
utilities
internet
parking
pets
occupancy
visitors
smoking
laundry
washing machine
gym
pool
security
room features
location
trust/scam concerns
special requests

==================================================
SLANG DICTIONARY

The normalization dictionary must be versioned and extensible.

Each canonical concept may have:

English aliases
Tagalog aliases
Taglish aliases
abbreviations
common misspellings
slang
emoji/contextual aliases where safe

Alan must eventually be able to extend aliases without source-code modification.

==================================================
SAFETY

Slang normalization is semantic assistance.

Do not infer:
nationality
ethnicity
sexual orientation
gender identity
income
character
trustworthiness

from language/slang alone.

Private quality labels require Alan input or explicitly defined behavioral rules.

Using gay/queer slang does NOT imply any identity classification.