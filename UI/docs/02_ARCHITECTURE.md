# ARC-01 — Standalone Architecture

**Version:** 1.0.0-draft  
**Status:** CANONICAL boundaries; PROPOSED implementation structure

## Technology (CANONICAL)
- React + TypeScript + Vite.
- Tailwind CSS **v4** with CSS-first token strategy (`@theme` / `@theme inline` as appropriate).
- Mobile-first responsive web app intended to feel like an iPhone-native application; PWA readiness without claiming full offline/auth support.
- Component-driven UI, shared tokens, shared behavior. No CSS legacy compatibility layer.

## Isolation (CANONICAL)
Suggested new root: `D:\Boutique rooms\br-os-design-system` (owner may select a different path). Legacy project: `D:\Boutique rooms\boutique-rooms-os`, strictly read-only. Do not configure builds to output into the legacy repository.

## Suggested structure (PROPOSED)
```text
br-os-design-system/
  docs/                       # normative contracts
  src/
    app/                      # preview router, app shell
    design/tokens.css         # single token authority
    components/primitives/    # fields, labels, icons, controls
    components/composites/    # cards, menus, cover, lightbox
    modules/                  # Listing, People, Dashboard, Calendar, Services
    fixtures/                 # explicitly synthetic data
    catalog/                  # component showcase and states
  public/
  tests/
```

## Dependency direction
Tokens → primitives → composites → shell → module compositions. Modules may not define alternate versions of a shared component. No direct module-specific CSS overrides of a primitive without a documented variant.

## Styling invariants
- One token authority; no unexplained raw hex values in feature components.
- Shared control geometry and states, including keyboard and touch.
- No unlayered legacy styles.
- No per-page reinvention of field, card, tab, badge, button or menu.
- Prefer semantic tokens to arbitrary Tailwind colors.

## Preview modes
1. Component catalog: all variants and interaction states.
2. Five-section interactive mobile shell with fixture data.
3. Responsive comparison at narrow phone, large phone and desktop widths.

Preview must work locally without Google OAuth or backend dependencies.
