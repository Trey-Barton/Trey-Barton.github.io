# Trey Barton Portfolio — Developer Guide

Static GitHub Pages site. Vanilla HTML/CSS/JS, no framework, no build step.
`index.html` is markup only; styles live in `css/`, scripts in `js/`.

See `ARCHITECTURE.md` for the full file map, element vocabulary, canvas draw
order, and the "knobs cheat sheet" that maps natural-language requests to
specific files and variables.

## Orientation

- `index.html` — Markup only. Loads 7 CSS files and 11 JS files in a fixed
  order via `<link>` and `<script defer>`. Order matters (tokens first;
  scheduler → palette → generators → drawers → scene → core → ui).
- `bounce_loop.mp4` — Profile video loop in the About photo-ring.
- `bounce_loop.jpg` — Poster frame if autoplay is blocked (iOS cold starts).

### `css/`
`tokens.css` (design tokens in `:root`), `base.css` (reset, nav, glass-card,
footer), `hero.css`, `about.css`, `projects.css` (cube, wires, chandelier),
`contact.css`, `responsive.css`.

### `js/`
- `scheduler.js` — single master RAF + dirty-flag coalescer.
- `forest-palette.js` — BARK / CANOPY / LEAF / FERN colors + utils.
- `forest-tree-gen.js`, `forest-undergrowth-gen.js` — procedural generation.
- `forest-draw-trunk.js`, `forest-draw-canopy.js`, `forest-draw-undergrowth.js`
  — rendering.
- `forest-particles.js` — ring-buffer particle pool.
- `forest-scene.js` — instantiates far/mid/fg tree layers.
- `canvas-core.js` — canvas setup, scene caches, sky/ground/hills/river,
  critters (jaguar, snake, crocodile), vines, light rays, grading, vignette,
  master render loop.
- `ui.js` — nav scroll state, smooth-scroll, year, profile-video autoplay
  fallback, reveal animations, cube carousel, `WIRE_CONFIG`, and chandelier-
  wire positioning math.

## Common tasks

Edits are grep → edit in the relevant `css/` or `js/` file. For the full
mapping of "when you say X, change Y," see the knobs cheat sheet in
`ARCHITECTURE.md`.

- **Change a color** — palette arrays in `js/forest-palette.js`, or sky
  gradient `addColorStop` calls in `js/canvas-core.js`.
- **Change text sizes** — `clamp()` values in `css/tokens.css`.
- **Adjust cube / wires** — `WIRE_CONFIG` at the top of `js/ui.js` (wire
  attachment points use `t/m/b` × `l/c/r`).
- **Add a project card** — add another `<div class="cube-face">…</div>` in
  `#cube-scene` in `index.html` and bump the dot count.
- **Tune sway / branch density** — `js/forest-tree-gen.js` (generation) and
  `js/forest-draw-trunk.js` (drawing). Layer-aware sway amplitude is driven
  by `tree.layer` (`fg`/`mid`/`far`).

## Key conventions

- **Canvas buffer is locked at init.** Never set `canvas.width` /
  `canvas.height` after load — CSS `object-fit: cover` handles reshape.
  Writing to those caused a blue/green flash mid-scroll/resize.
- **Render loop never skips frames based on scroll position** (same flash).
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
