# Pizzetta authentication setup

The Worker now exposes:

- `GET /api/auth/google/start?mode=customer`
- `GET /api/auth/google/start?mode=staff`
- `GET /api/auth/meta/start?mode=customer`
- `GET /api/auth/session`
- `POST /api/auth/logout`

Register these exact redirect URIs in the Pizzetta provider consoles:

```text
https://pizzetta-kiosk-os.<account-subdomain>.workers.dev/api/auth/google/callback
https://pizzetta-kiosk-os.<account-subdomain>.workers.dev/api/auth/meta/callback
http://localhost:8787/api/auth/google/callback
http://localhost:8787/api/auth/meta/callback
```

Worker configuration names:

- `GOOGLE_CLIENT_ID` — public OAuth client ID
- `GOOGLE_CLIENT_SECRET` — secret Worker value
- `META_APP_ID` — public customer OAuth app ID
- `META_APP_SECRET` — secret Worker value
- `META_GRAPH_VERSION` — provider Graph version selected in the Meta app
- `PUBLIC_ORIGIN` — deployed Worker origin, with no trailing slash

Staff accounts are created by inserting a verified Google subject and email into `staff_users`, then adding allowed branch rows to `staff_branch_roles`. The default client button never requests staff scope. A Google account without an active staff row cannot enter `/staff`.

The callback stores only provider subject/email metadata and a hashed opaque session token. Provider access tokens are not stored. The app still needs the owner’s final Google client ID and Meta app credentials before enabling the provider buttons in a deployed environment.
