# BASE-VIS — Foundational Visual Language & Token Contract

**Version:** 1.0.0-draft  
**Status:** CANONICAL color/visual language; typography metrics PROPOSED

## Canonical color values
| Semantic role | Value | Usage |
|---|---|---|
| Canvas | `#F7F5F1` | Primary app canvas |
| Surface | `#FFFFFF` | Cards, fields, Lightbox |
| Primary text / Charcoal | `#292622` | Text and inactive glyphs |
| Active text | `#FAF8F3` | Text on active surfaces |
| Ancient Brass | `#A98552` | Selected/active controls |
| Mocha | `#765744` | Room identity labels |
| Sage | `#8F9A7A` | Square icon backgrounds with white glyph |
| Amaranto | `#8B1830` | Calendar workload and date/time labels |
| Mustard | `#D1A72C` | TODAY, selected footer, attention badge |
| Muted text | `#81796F` | Secondary labels |
| Pending yellow | `#F4C430` | Pending state |
| Urgent/failed red | `#D92D3F` | Urgent or failed state |
| Confirmed green | `#168B60` | Confirmed/OK state |

## Canonical appearance
- Flat, compact, high-information-density, professional UI.
- **No gradients, shadows, pill controls, decorative borders** by default.
- Small-radius rounded-square surfaces and controls where rounding is necessary.
- Uppercase, bold, compact labels/values/actions in the shared component grammar.
- Icons carry navigation and action meaning; avoid oversized page titles and ornamental subtitles.
- Color is semantic; do not use arbitrary colors as decoration.

## Typography (PROPOSED; must be reviewed)
Use a modern system-first sans-serif stack initially; confirm exact font family, scale, weight and tracking from approved mockups before freezing. Never claim a canonical font has been specified when it has not.

## Token engineering (ACCEPTANCE)
- Publish CSS variables and Tailwind v4 theme mappings.
- Provide token gallery with swatches, semantic names and example uses.
- Contrast and focus visibility checked for all control states.
- Changing a token updates all components consistently.
- No conflicting duplicated semantic declarations.
