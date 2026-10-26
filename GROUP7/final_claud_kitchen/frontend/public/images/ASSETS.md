# Hearth visual assets

Four menu photographs are locally hosted copies of the existing seeded
Unsplash images. Two mismatched images (a thali for paneer bowl and a cake for
brownie) have been replaced with original generated food illustrations matching
the existing descriptions. The frontend maps only those existing photo
identifiers to the corresponding local files; custom menu images continue to
use the API-provided URL. Missing images display a branded, accessible fallback.
Food names, descriptions, availability and prices always come from the API.

| Local file | Original Unsplash photo identifier |
| --- | --- |
| paneer-bowl-v2.webp (generated illustration) | replaces photo-1546833999-b9f581a1996d |
| butter-chicken.webp | photo-1603894584373-5ac82b2ae398 |
| biryani.webp | photo-1631515243349-e0cb75fb8d3a |
| harvest-bowl.webp | photo-1512621776951-a57141f2eefd |
| margherita.webp | photo-1574071318508-1cdbab80d002 |
| brownie-v2.webp (generated illustration) | replaces photo-1606313564200-e75d5e30476c |

These photos are used under the [Unsplash license](https://unsplash.com/license).
Food images are illustrative, rather than photographs of Hearth's actual
prepared dishes. There are no product records or prices embedded in the assets.

`hearth-biryani.webp` is an original AI-generated editorial illustration,
created with the built-in imagegen tool and compressed to an 1100px transparent
WebP (approximately 371 KB). It is used for brand atmosphere, rather than as a
product listing photograph. It is a layered image with pointer parallax, not a
3D model. No WebGL capability is required.

Hero generation prompt:

> Isolated photographic food composition for a luxury Indian food ordering
> website hero, layered over near-black olive with pointer parallax. One
> photorealistic bowl of Hyderabadi chicken biryani in a handmade dark charcoal
> ceramic bowl, three-quarter overhead angle, entire bowl visible, transparent
> background. Ivory and saffron basmati grains, browned chicken, fried onions,
> mint and cilantro; warm studio light from upper left, realistic rim highlights
> and food texture, soft shadow. Restrained loose leaves and grains. No text,
> logos, watermark, people or cutlery.

Paneer illustration prompt:

> Original food illustration for the existing Hearth paneer tikka bowl menu
> item. Premium photorealistic editorial food image, square composition. A
> shallow handmade charcoal ceramic bowl holding smoky grilled paneer tikka
> cubes, fragrant saffron basmati rice, crunchy shredded cabbage and carrot
> slaw, green mint chutney at the side, and fresh cilantro. Clearly vegetarian
> paneer cubes with creamy white interiors and caramelised tandoori orange
> edges; no meat. Three-quarter overhead angle, dark warm olive tabletop,
> directional warm light, realistic appetising detail. No text or watermark.

Brownie illustration prompt:

> Original menu food illustration for Hearth chocolate brownie. Square premium
> editorial food photograph. Two thick square fudgy brownies, dense moist
> centre and a thin shiny crackly top, one resting diagonally on the other on
> a matte charcoal ceramic plate. Clearly brownies, not sponge or layer cake,
> no frosting. Tiny chocolate crumbs on a deep olive brown tabletop. Warm
> directional studio light, rich chocolate texture. No text or watermark.

Manrope Variable and DM Serif Display Italic are hosted under `public/fonts/`.
Their SIL Open Font License notices are included alongside them. Font files were
obtained from the respective Fontsource packages; no font CDN is required.
