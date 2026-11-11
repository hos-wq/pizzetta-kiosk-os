# QUA-01 — Acceptance Gates & Evidence

**Version:** 1.0.0-draft  
**Status:** CANONICAL signoff protocol

## Gate 0 — Isolation
Standalone directory, no legacy UI import, no production access, clean start commands, contract index reviewed. **Evidence:** file tree, dependency report, git diff/status.

## Gate 1 — Tokens & catalog
Canonical palette, Tailwind v4 token mapping, typography proposal, icon grammar, spacing and radius demonstrated in a browser. **Evidence:** interactive catalog URL, screenshots at phone widths, token audit. **Owner approval required.**

## Gate 2 — Components
All mandatory primitives and composites shown in catalog with states and behavior. **Evidence:** tests + touch/keyboard demonstration + owner visual review. **Owner approval required.**

## Gate 3 — Shell
No legacy header; correct icon-only footer; five distinct covers and menus; responsive widths and safe areas. **Evidence:** screenshots/video or live preview on real phone. **Owner approval required.**

## Gate 4 — Module compositions
Five modules use only approved components, shared fixture state, Lightbox and responsive grids. **Evidence:** interaction checklist and visual diff against approved mockups. **Owner approval required.**

## Gate 5 — Integration readiness
Documented UI-to-domain action matrix, no backend calls yet. **Evidence:** API mapping draft and risk list. **Separate authorization before implementation.**

## Required test matrix
- Viewports: 320 / 375 / 390 / 430 / 768 / 1280 CSS px.
- iOS Safari (real iPhone if available), desktop Chromium/Firefox where available.
- Keyboard focus, reduced motion, safe areas, scroll lock, software keyboard, overflow.
- Empty/loading/error/selected/disabled states.
- No unwanted page horizontal scrolling.
- Component styles remain identical across modules.

## Verdicts
**PASS** only with evidence and owner approval. **FAIL** if observed behavior differs from canon. **BLOCKED** if evidence cannot be obtained. **NOT TESTED** if no attempt was made. Build/typecheck/test pass alone never imply visual acceptance.
