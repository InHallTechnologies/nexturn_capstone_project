// Preserve custom API images. Only the existing seeded photo identifiers
// resolve to local photos or the matching replacement food illustrations.
const photographs = {
  "photo-1546833999-b9f581a1996d": "paneer-bowl-v2",
  "photo-1603894584373-5ac82b2ae398": "butter-chicken",
  "photo-1631515243349-e0cb75fb8d3a": "biryani",
  "photo-1563379091339-03246963d96c": "biryani",
  "photo-1512621776951-a57141f2eefd": "harvest-bowl",
  "photo-1574071318508-1cdbab80d002": "margherita",
  "photo-1606313564200-e75d5e30476c": "brownie-v2",
};

export function localFoodImage(src) {
  if (!src) return src;
  try {
    const url = new URL(src);
    if (url.hostname === "images.unsplash.com") {
      const name = photographs[url.pathname.slice(1)];
      if (name) return `/images/${name}.webp`;
    }
  } catch {
    /* Relative and application-hosted assets are already local. */
  }
  return src;
}

export const cartChanged = () =>
  window.dispatchEvent(new Event("hearth:cart-changed"));
