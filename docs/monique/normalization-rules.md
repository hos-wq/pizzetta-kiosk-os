# Monique normalization rules

- Unicode is normalized, accents are removed, case is folded, punctuation and repeated whitespace are tolerated.
- English and Italian navigation vocabulary is supported for the verified pages: `open/show/go`, `apri/mostra/vai`, listing/rooms, people/contacts, today/dashboard, calendar/events, and services/maintenance/housekeeping.
- Room references are matched against the loaded room ID, display ID, physical unit and unit without the `U-` prefix. Thus `BR08`, `BR-08`, `BR·08`, `BR•08`, `1008`, and `U-1008` can resolve to the same loaded room. `2704B` resolves only if the loaded data identifies it.
- Person resolution accepts a unique full name or unique sufficiently distinctive name token. Multiple matches return `AMBIGUOUS`; no result is guessed.
- A date in `YYYY-MM-DD` with calendar/event language selects the calendar event destination.
- Requests containing mutation verbs such as change, edit, create, delete, send, pay, save, schedule, or their supported Italian equivalents return `UNSUPPORTED`. No mutation is attempted.
- Finance, utilities, dues, internet, contracts and documents are not treated as mobile destinations until a verified handler exists. They return `UNSUPPORTED` even when a room or person is identifiable.
- Empty or unmatched requests return `NOT_FOUND`.
