# Trey Barton Portfolio — Developer Guide

Static GitHub Pages site. Vanilla HTML/CSS/JS, no framework, no build step.
`index.html` is markup only; styles live in `css/`, scripts in `js/`.

The background is a hand-built **Canvas 2D** forest scene (no Three.js, no WebGL).
`js/canvas-core.js` is the renderer — it is beautified/readable, so read it
directly when you need the ground truth on draw order or per-frame logic.

> Note: `ARCHITECTURE.md` exists but is partly stale (it references a
> jaguar/snake/river that are no longer in the code). Treat **this file** as
> the accurate map until ARCHITECTURE.md is rewritten.

## Orientation

- `index.html` — Markup only. Loads **6 CSS files** and **11 JS files** in a
  fixed order via `<link>` and `<script defer>` (no CDN scripts). `defer`
  preserves order but doesn't block parsing. Order matters: tokens CSS first;
  for JS, scheduler → palette → generators → drawers → particles → scene →
  core → ui (each later file depends on globals the earlier ones define on
  `window.Forest` / `window.UI`).
- `bounce_loop.mp4` — Profile video loop in the About photo-ring.
- `bounce_loop.jpg` — Poster frame if autoplay is blocked (iOS cold starts).

### `css/` (6 files, loaded in this order)
`tokens.css` (design tokens in `:root`), `base.css` (reset, nav, glass-card,
footer), `hero.css`, `about.css`, `projects.css` (cube, wires, chandelier),
`contact.css`. There is no `responsive.css`; responsive rules live as
`@media` blocks inside the relevant module files.

### `js/` (11 files, loaded in this `<script defer>` order)
1. `scheduler.js` — defines `UI.scheduler`: a single master RAF + dirty-flag
   coalescer (`register` / `markDirty` / `onScroll` / `onResize`). Used by
   `ui.js`. The canvas renderer does **not** use it (it owns its own RAF).
2. `forest-palette.js` — color arrays `Forest.BARK`, `Forest.CANOPY`,
   `Forest.CANOPY_ACCENT`, `Forest.LEAF_COLORS`, `Forest.FERN_COLORS`, plus the
   utilities `Forest.mkRng(seed)` (seeded PRNG), `Forest.rgb(arr, alpha?)`, and
   `Forest.mix(a, b, t)`.
3. `forest-tree-gen.js` — procedural tree generation: `Forest.genTree(rng, layer)`
   (returns a tree with `trunkW`, `baseY`, `topY`, `stripes`, `branches`,
   `canopy`, `vines`, `roots`) and `Forest.genLayer(count, layer, seed)`.
4. `forest-undergrowth-gen.js` — builds `Forest.undergrowth`, a depth-sorted
   array of ferns / mushrooms / grass / bushes scattered across far/mid/fg.
5. `forest-draw-trunk.js` — `Forest.drawTrunk(ctx, tree, tx, W, H, t)`.
6. `forest-draw-canopy.js` — `Forest.drawCanopy(ctx, tree, tx, W, H, t, depth)`.
7. `forest-draw-undergrowth.js` — `Forest.drawUndergrowth(ctx, W, H, t, layer)`.
8. `forest-particles.js` — particle pool: `Forest.spawnP(type, W, H)`,
   `Forest.particles`, `Forest._recycleParticle`, the pre-generated
   `Forest.stars` and `Forest.mistPuffs` arrays, `Forest.MAX_PARTICLES`
   (150 mobile / 400 desktop), `Forest.isMobile` (`<= 768`). Also wires up the
   tab-visibility pause via `window._isPageVisible` + a `visibilitychange`
   listener (consumed by the render loop in `canvas-core.js`).
9. `forest-scene.js` — instantiates the tree layers at boot:
   `Forest.farTrees`, `Forest.midTrees`, `Forest.fgTrees` (counts are smaller
   on mobile), via `Forest.genLayer` / `Forest.genTree`.
10. `canvas-core.js` — the **Canvas 2D renderer** (see below).
11. `ui.js` — nav scroll state, smooth-scroll, footer year, profile-video
    autoplay fallback, reveal animations, the project cube carousel, and the
    chandelier-/heading-wire positioning math (coordinated through
    `UI.scheduler`).

## The renderer (`js/canvas-core.js`)

The whole file is one IIFE wrapped in `try/catch` (a render error logs
`"Canvas animation error:"` and stops, rather than throwing). It grabs
`#bg-canvas` and a `getContext("2d", { alpha: false })` context — **plain
Canvas 2D, no WebGL, no Three.js**. Structure:

- **Sizing / resize** — the local `l()` (resize) function sets the canvas
  backing-store size (on mobile it widens to at least 1024px and scales height
  to match), recomputes `Forest.isMobile` / `Forest.MAX_PARTICLES`, and nulls
  out the cached offscreen layers (`_sceneCache`, `_groundCache`, `_hillCache`,
  `_skyGrad`, `_horizonCache`, `_hazeG`, `_midGlow`, `_fogG`, `_vig`, `_fgUG`,
  …) so they rebuild. `window.resize` is **debounced ~300ms** before calling `l()`.
- **Cached static scene** — the per-frame loop builds the scene **once** into
  an offscreen canvas (`_sceneCache`) and only rebuilds it when the viewport
  size changes. Cached, back → front: sky linear gradient (`_skyGrad`) with
  twinkling `Forest.stars`, sun/horizon glow gradients (`_horizonCache`,
  `_cenGlow`, `_sideGlows`, `_hBand`), the ground gradient (`_groundGrd`), a
  heavy ground-detail scatter baked into `_groundCache` (clumps, roots,
  pebbles, twigs, leaf litter, debris, small plants/flowers, grass tufts),
  layered hill silhouettes with tree-line texture baked into `_hillCache`
  (uses `Forest.CANOPY` + `Forest.mix`), atmospheric
  haze/fog/mid-glow gradients, the far/mid/fg tree layers
  (`Forest.drawTrunk` + `Forest.drawCanopy`), the foreground undergrowth set
  (`_fgUG`: bushes/grass/sticks/leaves/rocks/flowers/jungle-grass, y-sorted),
  overhanging top-canopy blobs, an `overlay` color wash, and finally the
  vignette radial gradient (`_vig`) — **drawn in-canvas, there is no
  `#bg-vignette` DOM element**.
- **Animated overlays** — `Forest.drawUndergrowth`, grass-tuft sway, and the
  overhanging canopy blobs read a per-frame wind
  value `f` (`0.5*sin(i) + 0.2*sin(2.3*i)`). The cached scene is then composited
  each frame and overlaid with animated-only elements: foreground fireflies,
  drifting light dots, light shafts (`screen` blend), `Forest.mistPuffs`,
  a small foreground leaf flourish, and the particle
  system.
- **Particles** — each frame randomly calls `Forest.spawnP("firefly"|"spore"|
  "leaf"|"petal"|"dust", W, H)`, then iterates `Forest.particles` backward,
  updating per-type physics, decrementing `life`, and recycling dead particles
  via `Forest._recycleParticle`.
- **RAF loop** — the loop is the local function `v(timestamp)`, scheduled with
  `requestAnimationFrame`. If `window._isPageVisible` is false (tab hidden) it
  resets its delta and re-schedules without drawing. Frame delta `o` is clamped
  to `0.05s`; `t` is the master animation clock.

## Common tasks

Edits are grep → edit in the relevant `css/` or `js/` file.

- **Change a color** — palette arrays in `js/forest-palette.js`. The sky/ground/
  glow/haze/fog/vignette tints are inline `createLinearGradient` /
  `createRadialGradient` color stops inside the scene-build block of the `v()`
  loop in `js/canvas-core.js` (search the cache key, e.g. `_skyGrad`,
  `_groundGrd`, `_vig`).
- **Change text sizes** — `clamp()` token values in `css/tokens.css`.
- **Adjust the project cube / wires** — cube auto-spin and dot/arrow logic are
  in `js/ui.js` (cube carousel section, `.cube-dot` / `#cube-prev` /
  `#cube-next`). Wire endpoints are computed from the `.chandelier-wire`,
  `.heading-wire`, and `.chandelier-wire-bottom` elements by the positioning
  routine registered as `"wires"` (and `"wires-scroll"`) via
  `UI.scheduler.onResize` / `register` in `js/ui.js`. (There is no
  `WIRE_CONFIG` constant.)
- **Add a project card** — add another `<div class="cube-face" data-face="…">…
  </div>` in `#cube-scene` in `index.html` and add a matching `.cube-dot`
  button in `.cube-dots`.
- **Tune sway / branch / canopy density** — per-tree structure (branch count,
  canopy blob count, stripes, etc.) is generated in `js/forest-tree-gen.js`;
  layer tree counts are in `js/forest-scene.js`. Per-frame sway amplitude lives
  in `Forest.drawCanopy` (`js/forest-draw-canopy.js`) and in the overhanging-
  canopy / wind code of the `v()` loop in `js/canvas-core.js`.
- **Adjust particle behavior** — spawn probabilities and per-type update
  physics are in the `v()` loop in `js/canvas-core.js`; spawn parameters
  (velocity, size, lifetime) and the max count are in `Forest.spawnP` /
  `Forest.MAX_PARTICLES` in `js/forest-particles.js`.
- **Resize behavior** — the `l()` resize function in `js/canvas-core.js`
  resizes the backing store and nulls the cached offscreen layers so they
  rebuild on the next frame. Debounced ~300ms.

## Key conventions

- **Canvas 2D renderer.** No Three.js, no WebGL, no `#bg-vignette`. `#bg-canvas`
  is the only canvas; the vignette is a per-frame radial-gradient fill.
- **Render loop never skips frames based on scroll position.** It only pauses
  when the tab is hidden (`window._isPageVisible`, set by the `visibilitychange`
  listener in `js/forest-particles.js`).
- **Cache the static scene, animate only overlays.** The sky/ground/hills/
  undergrowth scatter are built into offscreen canvases once and reused; rebuild
  only on viewport resize. Avoid moving per-frame work into the cached block.
- **Reuse the particle pool.** Dead particles go back to the free list via
  `Forest._recycleParticle` and are reinitialized in `Forest.spawnP` — avoid
  allocating new particle objects per frame.
- All sizing uses CSS `clamp()`. No per-breakpoint magic numbers in JS layout.
- One tokens file (`css/tokens.css`) drives every color and fluid size.
- iOS-safe primitives: `100dvh` hero with `100vh` fallback, `100lvh` canvas,
  `env(safe-area-inset-*)` on nav/footer, `overscroll-behavior-y: none`,
  `-webkit-tap-highlight-color: transparent`, `touch-action: manipulation`
  on interactives.
- `#bg-canvas` is promoted to a GPU compositor layer (`transform: translateZ(0)`
  + `backface-visibility: hidden`) so `position: fixed` doesn't "fall off"
  mid-scroll on mobile browsers.
- No `backdrop-filter` on anything that scrolls over the canvas — only the
  nav when scrolled.
- Profile video: `autoplay muted loop playsinline preload="metadata"` with a
  JS fallback in `js/ui.js` that swaps in the real `src` and re-attempts
  `play()` on readiness events + user interaction (iOS blocks cold autoplay).
- `prefers-reduced-motion` is honored only by the projects-heading cube
  auto-spin in `js/ui.js` (it freezes the cube). The Canvas 2D background does
  **not** currently check it.
- The hero `#biome-label` ("Ancient Forest") is static markup/CSS, not
  JS-driven.
- Wire positions recalculate on scroll and resize via the positioning routine
  in `js/ui.js`, coordinated by `UI.scheduler` (`js/scheduler.js`).
