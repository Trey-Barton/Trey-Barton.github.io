# Trey Barton Portfolio — Developer Guide

Static GitHub Pages site. Vanilla HTML/CSS/JS, no framework, no build step.
`index.html` is markup only; styles live in `css/`, scripts in `js/`.

See `ARCHITECTURE.md` for the full file map, element vocabulary, canvas draw
order, and the "knobs cheat sheet" that maps natural-language requests to
specific files and variables.

## Orientation

- `index.html` — Markup only. Loads 7 CSS files and 7 JS files + Three.js CDN in a fixed
  order via `<link>` and `<script defer>`. Order matters (tokens first;
  Three.js → scheduler → palette → generators → scene → GL → ui).
- `bounce_loop.mp4` — Profile video loop in the About photo-ring.
- `bounce_loop.jpg` — Poster frame if autoplay is blocked (iOS cold starts).

### `css/`
`tokens.css` (design tokens in `:root`), `base.css` (reset, nav, glass-card,
footer), `hero.css`, `about.css`, `projects.css` (cube, wires, chandelier),
`contact.css`, `responsive.css`.

### `js/`
- `scheduler.js` — single master RAF + dirty-flag coalescer for UI callbacks.
- `forest-palette.js` — BARK / CANOPY / LEAF / FERN colors + mkRng/rgb/mix utils.
- `forest-tree-gen.js`, `forest-undergrowth-gen.js` — procedural generation kept as-is.
- `forest-scene.js` — instantiates far/mid/fg tree layers at boot.
- `forest-gl.js` — Three.js WebGL renderer: sky gradient shader, star points, sun glow,
  hill silhouette meshes, ground plane with gradient, river plane, tree InstancedMesh layers
  (far/mid/fg), undergrowth instances, single Points object for firefly/leaf/spore/petal/dust
  particles, CSS vignette overlay. Owns its own RAF loop (does not use scheduler.js).
  Exposes `Forest.initGL()`, `Forest.render(ts)`, `Forest.resize()`.
- `ui.js` — nav scroll state, smooth-scroll, year, profile-video autoplay
  fallback, reveal animations, cube carousel, `WIRE_CONFIG`, and chandelier-
  wire positioning math.

## Common tasks

Edits are grep → edit in the relevant `css/` or `js/` file. For the full
mapping of "when you say X, change Y," see the knobs cheat sheet in
`ARCHITECTURE.md`.

- **Change a color** — palette arrays in `js/forest-palette.js`, sky gradient
  stops in the sky ShaderMaterial inside `js/forest-gl.js` `_buildSky()`.
- **Change text sizes** — `clamp()` values in `css/tokens.css`.
- **Adjust cube / wires** — `WIRE_CONFIG` at the top of `js/ui.js` (wire
  attachment points use `t/m/b` × `l/c/r`).
- **Add a project card** — add another `<div class="cube-face">…</div>` in
  `#cube-scene` in `index.html` and bump the dot count.
- **Tune sway / branch density** — `js/forest-tree-gen.js` (generation);
  sway amplitude per layer is in `Forest.render()` in `js/forest-gl.js`.
- **Adjust particle behavior** — spawn rates and per-type physics are in
  `Forest.render()` in `js/forest-gl.js`. Max counts are in `Forest.resize()`.
- **Resize behavior** — `Forest.resize()` in `js/forest-gl.js` tears down the
  entire Three.js scene and rebuilds at the new viewport. Debounced at 300ms.

## Key conventions

- **Three.js WebGL renderer** (r128 CDN). No Canvas 2D. `#bg-canvas` is the
  `<canvas>` created by the WebGLRenderer at init. Vignette is a CSS
  `radial-gradient` overlay on `#bg-vignette` — no per-frame gradient draw.
- **Render loop never skips frames based on scroll position** (same flash).
- **Avoid per-frame allocations** in `Forest.render()`. All temp matrices,
  vectors, particle buffers, and quaternions are pre-allocated at init.
- All sizing uses CSS `clamp()`. No per-breakpoint magic numbers.
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
- Profile video: `muted playsinline autoplay preload="auto"` with a JS
  fallback in `js/ui.js` that re-attempts `play()` on readiness events +
  user interaction (iOS blocks cold autoplay).
- Wire positions recalculate on scroll and resize via positioning functions
  in `js/ui.js` (coordinated by `js/scheduler.js`).
