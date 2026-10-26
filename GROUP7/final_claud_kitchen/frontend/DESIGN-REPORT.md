# Hearth frontend redesign

Implemented in the existing React/Vite application. Backend files, database,
authentication rules and order business logic were not modified.

## What changed

- `src/Landing.jsx`, `Motion.jsx`: cinematic editorial hero, original local
  biryani cutout, spring-based pointer depth, atmospheric particles that pause
  outside the viewport, scroll reveals, API-fed featured dishes, brand story,
  ordering guide and closing menu CTA. This is layered imagery, not a 3D model;
  it works without WebGL.
- `src/FoodCard.jsx`, `MenuRefinements.jsx`, `Customer.jsx`: responsive menu
  cards, live-data filters, accessible mobile filter drawer, cart animations,
  confirmed quantity indicators, checkout styling and real order timestamps.
- `src/App.jsx`, `shared.jsx`: lighter sticky navigation, real server cart
  count, focus-managed mobile navigation, refined authentication, notifications,
  page fades, native dialogs and stable content during resource refreshes.
- `src/Operations.jsx`, `Admin.jsx`: shared premium styling, status filters,
  animated queue changes and refined real-data analytics. Existing permitted
  actions, assignment and OTP handling are retained.
- `src/styles.css`, `foundation.css`, `storefront.css`, `workspace.css`: shared
  tokens and styles divided by responsibility. Responsive layouts, visible
  focus, image fallbacks and reduced-motion handling are included.
- `public/images/`, `public/fonts/`, `index.html`: optimized local WebP food
  assets, self-hosted brand fonts with license notices and a Hearth favicon.
- `vite.config.js`: separate vendor/motion bundles and lazy-loaded operational
  portals. Existing API proxy settings are unchanged.

## Dependencies

Added `framer-motion` (14.6.0). No Three.js, GSAP, replacement router,
authentication context or additional API client was introduced. Sharp and
Prettier were used temporarily from npm for asset optimization and formatting;
they are not project dependencies. Fontsource packages supplied local font
files; they are not runtime dependencies.

## Verification

- Production build: `npm run build` passed without warnings. Final JavaScript chunks are all below 260 KB before gzip.
- All seven final food images decoded successfully, and each is included in `dist/images/`. The 1100px hero preserves its transparent alpha channel.
- Development server: `npm run dev -- --host 127.0.0.1` started successfully.
- Read-only HTTP checks passed for the public and protected SPA entry paths,
  transformed frontend modules, hero image, sampled menu images, fonts and
  favicon. A returned SPA document does not verify protected role access.
- All 24 existing direct API call method/argument contracts matched the original
  source in an AST comparison. `src/api.js` remained byte-for-byte unchanged.
- Backend file hashes matched the audit baseline (12 files, zero changes).
- React rendering checks passed for unavailable/busy dish controls, dietary
  labels, server-provided prices, confirmed cart quantities, local image
  mapping, custom image preservation and accessible missing-image fallback.
- React rendering checks passed for the existing kitchen, delivery and admin
  state-specific action rules, including assignment acceptance before pickup,
  OTP verification after pickup and no mutation actions on delivered orders.

## Verification limits

The local backend was unreachable on port 5000. Live authentication, refresh,
checkout, cart writes, order polling, OTP delivery and analytics integration
could not be exercised. No database mutations were performed for this redesign.

The computer-use tool reported no available browser, and an attempt to open
the in-app preview browser returned “Browser is not available”. Desktop, tablet,
mobile, keyboard and reduced-motion behavior therefore remain unverified in a
real browser. Responsive and reduced-motion rules were inspected in source;
they are not claimed as visually tested. WebGL fallback testing is unnecessary
because the implementation does not use WebGL.

Food imagery is illustrative. The original generated hero and the two corrected
menu illustrations, source references and generation briefs are documented in
`public/images/ASSETS.md`. Custom dish images supplied by the API still require
their own URLs to be reachable.
