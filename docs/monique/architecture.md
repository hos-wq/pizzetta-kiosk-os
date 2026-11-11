# Monique architecture

Monique is a read-only deterministic navigation pipeline:

`text → normalizer → static destination selection + runtime entity resolution → NavigationInstruction v1 → page-state controller`

The implementation is in `UI/src/monique/navigation.ts`, with application-state integration in `UI/src/integration/OperationalPages.tsx`. The existing `ThemePageLayout` remains the shell entry point; it receives a compact command field and optional disambiguation choices. No chat transcript, LLM, external AI service, browser automation or database write is involved.

The registry contains stable IDs and page/panel mappings for both the mobile operational surface and the Office V2 surface. Room and person values are supplied by authenticated application APIs. The normalizer never contains the current tenant or room list. Room aliases resolve to the loaded canonical ID; person matches must be unique. Ambiguity is rejected safely.

Deep links use the existing `/v2/mobile/...` or `/v2/office/...` document route plus query state. A refresh can restore the page and selected entity when the corresponding query values are present. URL state contains only the canonical internal entity identifier already required by the existing UI state; authorization remains enforced by the API that supplied the data.
