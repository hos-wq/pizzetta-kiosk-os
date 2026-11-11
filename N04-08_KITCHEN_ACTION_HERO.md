# N04-08 — KITCHEN ACTION HERO

**Status:** DRAFT FOR VISUAL REVIEW  
**Purpose:** Commercial action POV for selected pasta, salad, and lasagna products.  
**Authority:** The selected N02 food contract controls food identity, ingredients, preparation, portion, and physical behavior. The selected N03 contract controls the serving vessel. This POV authorizes one unbranded fork as the action utensil; it does not authorize any other new ingredient, garnish, prop, or serving vessel.

## CAMERA

**CAMERA / POV — KITCHEN ACTION HERO.** Full-frame sensor; close three-quarter view, optical axis 30° above the subject support plane; level roll. 100 mm full-frame macro lens; f/2.8; ISO 400 baseline. Compose a high-impact commercial food image around one coherent food action. Keep enough of the selected serving and its N03 vessel visible to identify the product. Tight edge cropping of the vessel is permitted when it strengthens the action; never crop the lifted food, forkful, attached strands, or the food-to-fork connection.

Place the selected food action in the primary focal plane. The lifted forkful and its immediate connection to the dish are critically sharp. Let the remaining food surface fall smoothly out of focus with shallow, natural optical depth of field. Keep sufficient secondary detail to recognize the selected product, but do not render the whole dish uniformly sharp. Use lens-like defocus, not a digital blur mask, focus stacking, artificial tilt-shift, or full-frame sharpening. Freeze the action at a physically plausible instant; no motion smear, suspended fragments, or impossible food structure.

The camera, lens, focus, and crop do not alter recipe identity, ingredient count, preparation, portion size, or food geometry. No steam, vapor, smoke, mist, or atmospheric plume.

## ACTION VARIANT CONTROL

Select exactly one `ACTION_VARIANT_ID` compatible with the selected product and its food morphology. The prompt compiler must choose the ID explicitly. A seeded variation mode may choose among compatible IDs, but it must record the seed and emitted ID so that the assembled prompt remains reproducible. Never combine multiple action variants in one image. Never ask the image model to invent a food action.

### Long pasta

- `LONG_PASTA_TWIRL_LIFT`: the fork winds a compact, coherent portion of the selected long pasta and raises it just above the dish; a small number of attached strands descend naturally toward the serving.
- `LONG_PASTA_DIAGONAL_PRESENTATION`: the fork is held diagonally with a compact wrapped portion presented toward camera; attached strands remain physically connected and gravity-consistent.
- `LONG_PASTA_VERTICAL_LIFT`: the fork is held higher and more upright, showing a compact wrapped portion and a restrained natural strand fall into the dish.

Use these variants only for long pasta that can physically wrap around a fork. Sauce adherence, strand count, visible ingredients, and any stretch or drip must remain consistent with N02. No cheese pull, sauce trail, or dripping is added unless the selected contract supports it.

### Short pasta

- `SHORT_PASTA_FORK_LIFT`: the fork lifts one compact, coherent forkful of the selected short pasta, keeping its shape recognizable.
- `SHORT_PASTA_FORK_PRESENTATION`: the fork presents a single selected bite above or just clear of the serving, with the pasta forms resting naturally on the tines.

Do not wrap short pasta as if it were spaghetti. Do not enlarge, duplicate, fuse, or replace its canonical shapes.

### Salad

- `SALAD_FORKFUL_LIFT`: the fork lifts one coherent bite assembled only from ingredients present in N02; visible leaves and pieces remain attached or supported naturally.
- `SALAD_FORKFUL_ANGLE`: the same coherent forkful is turned slightly toward camera to reveal the selected ingredients and their existing textures, without scattering or adding components.

No airborne leaves, tossed ingredients, invented flowers, salt crystals, seeds, dressing, droplets, or garnish. Dressing sheen or moisture may appear only when supported by N02.

### Lasagna

- `LASAGNA_LAYER_BITE_LIFT`: the fork lifts one physically coherent bite from the selected serving and exposes the actual layers already specified in N02.
- `LASAGNA_CUT_EDGE_PRESENTATION`: the fork presents one bite adjacent to an existing or action-created cut edge, making the canonical layers readable while the remainder retains plausible structure.

Do not stretch or separate layers beyond their physical consistency, invent fillings, add cheese pulls, or deform the remaining portion. Follow the portion and service geometry defined by N02 and N03.

## ACTION AND VARIATION ACCEPTANCE GATE

- `ACTION_SINGLE_STATE`: show one clear, physically plausible instant and one selected variant ID. No collage, sequence, duplicate fork, or simultaneous poses.
- `ACTION_CATEGORY_MATCH`: use only the variant family compatible with the selected N02 product. Long pasta may wrap; short pasta is lifted or presented; salad is lifted as a coherent forkful; lasagna reveals its actual layered structure.
- `ACTION_FOOD_FIDELITY`: all food on the fork must be traceable to the selected serving. No added, missing, duplicated, or transformed ingredients.
- `ACTION_GRAVITY`: strands, leaves, sauce, pasta, and layers follow plausible gravity and attachment. No floating food or unsupported drips.
- `ACTION_FOCUS`: the hero forkful and its food connection are the sharpest region. The surrounding dish softens progressively; no uniform edge-to-edge sharpness.
- `ACTION_CROP`: the action and food-to-fork connection remain fully visible. Vessel-edge crop is intentional; food or fork crop is a failure.
- `ACTION_REPEATABILITY`: emit the selected `ACTION_VARIANT_ID`; if seeded selection is used, emit the seed as well. The contract must not leave the choice to unconstrained model randomness.

## VISUAL LOOK — COMMERCIAL FOOD CAMPAIGN

Use warm, selective reflections, rich but ingredient-faithful color depth, and appetizing surface texture. A directional warm key from camera-left, slightly above the food, creates shaped highlights and dimensional modeling. Restrained near-axis fill keeps food readable while preserving color separation and soft, physically plausible shadows. The image should feel energetic, polished, and immediately legible as a commercial food photograph, without changing the selected food or inventing a scene.

Allow localized warm ivory and golden specular highlights on surfaces that are actually pale, glossy, or reflective. Keep smooth highlight roll-off and retain texture around the brightest points. Use strong color separation and deep chromatic shadows with visible detail; no featureless black shadow mass, flat HDR, global orange wash, artificial oversaturation, crunchy clarity, halos, or hard digital edge sharpening.

Keep the background fully transparent under the N04 RGBA contract. Do not reproduce the reference image's background, cookware, table, hand, steam, or any unselected object. The single fork is the only new action prop authorized by this POV. No lighting effect may be rendered as an opaque or colored background.

## OUTPUT AND FIDELITY

- Deliver true RGBA PNG with alpha zero outside the depicted food, fork, vessel portions that remain in frame, and physically attached soft shadow.
- No opaque, simulated, gradient, blurred, or colored background; no matte fringe.
- No steam, vapor, smoke, mist, fog, or atmospheric plume.
- N02 controls ingredients, quantities, preparation, cooking state, and food identity; N03 controls the vessel and service geometry. This POV controls camera, focus, permitted action, and presentation only.
- Do not add ingredients, garnish, serving ware, hands, props, or decorative elements not authorized above or in N02/N03.
