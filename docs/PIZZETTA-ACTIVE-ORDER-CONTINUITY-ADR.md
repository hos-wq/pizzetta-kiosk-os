# ADR — Active Order Continuity

## Decision

Active order continuity will use a Worker-issued `HttpOnly`, `Secure`, `SameSite=Lax` cookie scoped to the order-request/tracking paths. The browser must recover the active request after reload without exposing the bearer token to JavaScript storage.

## Rejected shortcut

Do not store order/request access tokens in `localStorage`, `sessionStorage`, IndexedDB, URL parameters or screenshots. These surfaces can leak credentials through injected scripts, history, referrers or support tooling.

## Next implementation slice

1. Worker sets the cookie when a request is created.
2. Worker authenticates request status from the cookie.
3. On staff confirmation, the order reuses the request token hash without returning the token.
4. Customer polling uses same-origin fetch and browser cookie handling.
5. Reset/complete clears the cookie.

## E15 status

`BLOCKED UNTIL COOKIE SLICE` — the current app intentionally does not persist bearer tokens in browser storage.
