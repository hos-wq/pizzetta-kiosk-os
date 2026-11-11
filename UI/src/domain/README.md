# DM-001 Domain Foundation

The domain layer is UI-independent and uses stable internal IDs for relationships. The current adapter is explicitly development-only; it does not claim durable persistence and does not fabricate missing tenancy, contract, payment, utility, building or operation timestamps.

## Entity and relationship inventory

- `Room` → `Tenancy`: one-to-many through `Tenancy.roomId`.
- `Person` ↔ `Tenancy`: many-to-many through `Tenancy.personIds`.
- `Tenancy` → `Contract`: one-to-one or absent, through `Contract.tenancyId`.
- `Contract` → `Payment`: one-to-many through `Payment.contractId`.
- `Room` → `UtilityAccount`: one-to-many through `UtilityAccount.roomId`.
- `UtilityAccount` → `UtilityReading`: one-to-many through `UtilityReading.utilityAccountId`.
- `Room` → `Operation`: one-to-many through `Operation.roomId`.
- Domain records → `CalendarEvent`: derived projections with `sourceId`; standalone events remain optional.

## Migration notes

The ten existing room identifiers remain unchanged. `BR·07` retains `NO VIEW`. Existing people and tasks remain demonstration fixtures. Missing tenants, contracts, financial terms, utility readings, building references and operation timestamps remain unknown rather than being invented. Message fixtures remain UI demonstration records and are not incorrectly converted into maintenance or housekeeping operations.

## Open business decisions

- Authoritative tenancy and contract records are not yet provided.
- Occupancy transition rules for reservations and multiple occupants need owner confirmation.
- Contract/payment commercial fields and overdue grace periods are unresolved.
- Utility units, meter rollover rules and billing ownership are unresolved.
- The active-operation duplicate policy for completed historical work needs owner confirmation.
- Persistence, archival and deletion policy remain unimplemented; the adapter is in-memory only.
