# N04-01 — MACRO LIGHT AND CONTRAST REVISION

**Status:** DRAFT FOR VISUAL REVIEW  
**Scope:** Replacement draft for the macro visual-look and macro acceptance sections of N04-01. The existing camera profile, crop, focus-plane scope, RGBA requirements, no-vapor rule, recipe authority, and conditional glass-optics clause remain unchanged.

## VISUAL LOOK — MACRO

Create a high-detail commercial macro photograph with rich color depth, appetizing material texture, warm selective reflections, and clear local contrast. Use a directional key from camera-left and slightly above the selected detail. The key reveals leaf edges, veins, folds, pores, and surface relief that are actually present in the selected food. Keep controlled fill sufficient to preserve readable detail inside folds and beneath overlapping surfaces while maintaining dimensional shadow separation.

Render bright, selective warm highlights on naturally reflective, moist, or pale surfaces already present in the selected food. Highlights may approach warm ivory or golden-white locally, with smooth transitions into the surrounding material and texture retained around the brightest points. Do not add wetness, oil, dressing, water droplets, salt crystals, seeds, flowers, or garnish to create reflections or texture. Such details may appear only when authorized by N02.

Preserve strong, ingredient-faithful chromatic depth: greens remain recognizably green, pale leaves remain pale, red or purple ingredients retain their canonical hues, and warm reflections affect only the illuminated surfaces. Do not apply a uniform amber/orange wash or artificial oversaturation.

Use deep, color-rich shadows within folds and contact areas, with visible material detail. Shadows may read as dark green, olive, warm brown, or another hue supported by the ingredient and illumination; do not crush them into featureless black. Keep contrast expressive but transitions physically plausible. Avoid flat HDR, aggressive global S-curves, halos, artificial clarity, brittle edge sharpening, and excessive microcontrast.

## MACRO FOCUS AND TEXTURE GATE

- `MACRO_DETAIL_PLANE`: preserve the current N04-01 moderate optical depth of field. A meaningful contiguous detail region remains crisp; allow restrained natural falloff outside it. Do not impose Hero 15°/35° shallow depth of field or background bokeh on the macro profile.
- `MACRO_TEXTURE_FIDELITY`: render only the texture present in the selected N02 food. Do not manufacture droplets, salt, flowers, seeds, dressing, oil sheen, or surface damage.
- `MACRO_HIGHLIGHT_CONTROL`: warm selective specular highlights may be very bright, but their shape and surrounding surface texture remain legible. No broad clipped white patches.
- `MACRO_CHROMATIC_CONTRAST`: maintain clear color separation and rich local contrast without changing canonical ingredient colors or applying a global orange cast.
- `MACRO_SHADOW_DETAIL`: folds and overlaps remain dimensional and dark, with visible color and texture; no crushed black shadow fields.
- `MACRO_NO_FALSE_DETAIL`: no artificial sharpening, invented microtexture, HDR halos, or digital clarity effect.

## REFERENCE BOUNDARY

The supplied salad photographs are references for macro contrast, directional light, selective warm highlights, chromatic depth, and appetizing surface texture only. They do not authorize adding their specific leaves, ingredients, salt crystals, flowers, dressing, vessels, or background. Keep the existing true-RGBA output, transparent background, crop rules, and no-vapor requirement unchanged.
