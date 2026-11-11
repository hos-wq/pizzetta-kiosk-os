# Monique navigation inventory

This inventory describes the destinations that are programmatically reachable in the operational mobile surface at `/v2/mobile/`. It is based on `UI/src/integration/OperationalPages.tsx` and `UI/src/layouts/ThemePageLayout.tsx`, not on the Design System showcase fixtures.

## Verified mobile tree

| ID | Parent | Route/state | Entity | Panel behavior | Status |
| --- | --- | --- | --- | --- | --- |
| `listing` | — | `ThemePageKey=LISTING` | — | Footer destination; renders room cards | verified |
| `listing.room.details` | `listing` | `selectedRoom=<room id>` | room | Opens the selected room card and its nested menu | verified |
| `listing.room.occupancy` | `listing.room.details` | selected room + nested `ROOM → OCCUPANCY` | room | Opens the room card and the occupancy leaf | verified |
| `listing.room.operations` | `listing.room.details` | selected room + nested `ROOM → OPERATIONS` | room | Opens the room card and the operations leaf | verified |
| `people` | — | `ThemePageKey=PEOPLE` | — | Footer destination; renders people data | verified |
| `people.person.details` | `people` | `selectedPerson=<person id>` | person | Opens the person row and relationship/detail path | verified |
| `today` | — | `ThemePageKey=TODAY` | — | Footer destination; renders operational tasks | verified |
| `calendar` | — | `ThemePageKey=CALENDAR` | — | Footer destination; renders calendar | verified |
| `calendar.events` | `calendar` | calendar + `selectedDate=YYYY-MM-DD` | date | Opens the selected date’s event region | verified |
| `services` | — | `ThemePageKey=SERVICES` | — | Footer destination; renders service hierarchy | verified |
| `services.room` | `services` | `selectedRoom=<room id>` | room | Opens the room’s service hierarchy | verified |

## Actual application route

`apps/web/src/v2/V2App.tsx` mounts `OperationalPagesContainer` for mobile. The container loads rooms, people, dashboard tasks, calendar events and service catalog data through existing authenticated GET APIs, then passes them to `UI/src/integration/OperationalPages.tsx`. Monique changes the existing page state and persists only the navigation state in the browser URL query (`nav`, `roomId`, `personId`, or `date`). It does not call a mutation endpoint.

## Uncovered or unavailable destinations

Finance, utilities, documents, contracts, dues and internet are present as domain/API concepts elsewhere in the repository, but no corresponding verified destination or panel exists in the operational mobile page tree above. Monique therefore returns `UNSUPPORTED` for those subsection requests rather than opening an incorrect parent or inventing a route. Office-only screens are not exposed through this mobile controller.

The current mobile room menu contains only `ROOM → OCCUPANCY` and `ROOM → OPERATIONS`; this is why the inventory does not claim room dues, internet or contract panels.

## Verified Office V2 tree

The Office shell in `apps/web/src/v2/V2App.tsx` exposes the following real screens and contextual destinations: `attention`, `rooms`, `rooms.inventory`, `rooms.maintenance`, `tenancies`, `tenancies.people`, `tenancies.leads`, `maintenance`, `maintenance.rooms`, `maintenance.assets`, `leads`, `leads.people`, `calendar`, `calendar.tenancies`, `calendar.rooms`, `documents`, `documents.people`, `documents.tenancies`, `utilities`, `utilities.rooms`, `utilities.tenancies`, `money`, `money.tenancies`, `money.utilities`, `content`, `content.documents`, `messages`, `messages.normalization`, `analytics`, and `settings`.

These are registered as `office.*` IDs in `UI/src/monique/navigation.ts` and route through the existing `go('office', screen, entityId)` controller. Rooms and People accept an existing entity ID. Utilities now accepts a requested room ID and selects it after the authorized room list loads. The other Office screens do not expose a room/person-specific selection state in their current implementation, so Monique opens the verified parent screen rather than pretending a child panel exists.
