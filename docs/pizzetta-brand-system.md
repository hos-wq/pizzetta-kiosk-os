# PIZZETTA Brand System — Working Contract

This document records the current BrandVault contract supplied for the PIZZETTA product UI.

## Voice

**Serious about pizza. Playful about everything else.**

Product copy should be short, warm, confident, and lightly playful. Use clear operational language for order status, timing, payment, and pickup instructions. Keep the personality in headlines, microcopy, category names, and illustration rather than making operational instructions ambiguous.

## Approved colors

| Token | Value | Use |
| --- | --- | --- |
| Paper | `#FEF7E0` | Primary light canvas |
| Charcoal | `#24221F` | Main text, controls, axes |
| Orange | `#E15603` | Primary action, key number, brand accent |
| Yellow | `#FDC500` | Secondary accent, loyalty/promo emphasis |
| Dough Cream | `#E8C99F` | Surfaces, separators, material fields |
| Salad Green | `#26734A` | Salad category and positive operational states |
| Ragù Red | `#963D2C` | Lasagna category and warning emphasis |
| Tropical Tea | `#A94F21` | Iced tea category |

## Color behavior

- Paper is the primary light canvas.
- Charcoal is used for all text on light backgrounds.
- Paper is used for all text on dark backgrounds.
- Orange and Yellow are the active accent surfaces and accent colors.
- Salad Green belongs to the salad category and is paired with Dough Cream and Paper.
- Ragù Red belongs to lasagna and is paired with Paper and Orange.
- Pasta uses Yellow, Paper, and Dough Cream.
- Tropical Tea belongs to iced tea and is paired with Yellow and Paper.
- Dough Cream remains an available BrandVault token, but is not used as a primary interface background. PIZZETTA uses Paper for quiet space and reserves Dough Cream for future narrowly defined inactive or supporting states only.

Orange is for large text and graphic emphasis where contrast permits. Yellow is not used for small text directly on Paper. Category accents stay tied to their categories and are not assigned arbitrarily.

## Typography

- Main titles: Fraunces Super Soft Black Italic 900.
- Secondary titles and numbers: Nunito ExtraBold 800.
- Body and information: Poppins.
- Promotional badges, prices, and playful slogans: Sour Gummy Heavy Italic.

The web implementation loads these Google Fonts with local fallbacks. The logo and approved tagline artwork remain SVG assets under `apps/web/public/brand`.

## Composition

Use compact titles, tight optical tracking, and an overall signature slant around 7 degrees. Approved lockup directions are Interlocked Stack and Offset Overlay. The ordering prototype currently uses the supplied logo SVG and selects tagline 1 for customer/totem surfaces and tagline 2 for restaurant operations.

## Color identity

- Paper means silence: breathing room, clean canvas, and visual pause.
- Charcoal means structure: text, navigation, boundaries, and operational clarity.
- Orange means appetite and action: primary order actions, active selections, and key food emphasis.
- Yellow means warmth and energy: playful highlights, loyalty moments, and secondary attention.
- Green, Ragù Red, and Tropical Tea identify their named food categories and should not become generic status colors.

## Surface rule

The interface is flat, minimal, and clean. Do not use drop shadows, glassmorphism, floating elevation, or ornamental gradients as a default. Playfulness comes from color blocks, typography, category illustration, controlled curves, and occasional 1970–1980 visual references.
