# Trey Barton Portfolio — Developer Guide

## Architecture
Static GitHub Pages site. Vanilla JS, no build tools, no frameworks. **Everything — HTML, CSS, JS — lives inline in `index.html`**. There is no external stylesheet or script file.

## File Map
- `index.html` — All markup, styles, and scripts. Only local file the browser loads.
  - `<style>` block: reset, design tokens (`:root`), nav, hero, about, projects, cube, contact, footer, responsive tweaks.
  - First `<script>` block (around lines ~712–2429): Canvas forest — palette, RNG, tree generation, branch/root drawing, canopy, undergrowth, particles, main render loop.
  - Second `<script>` block (around lines ~2431–end): Nav scroll state, smooth scrolling, year, profile-video autoplay, reveal animations, cube carousel, chandelier wire positioning.
- `bounce_loop.mp4` — Profile video loop (~1.1 MB, H.264 baseline, 900 px tall, 30 fps, no audio).
- `.gitignore` — excludes `bounce.mov` / `bounce.mp4` (raw source videos) and `.gstack/`.

## Common Tasks
All edits are grep → edit in `index.html`.

- **Change a color**: search the palette arrays (`BARK`, `CANOPY`, `CANOPY_ACCENT`, `LEAF_COLORS`, `FERN_COLORS`) or the sky gradient `addColorStop` calls.
- **Change text sizes**: edit the `clamp()` values in the `:root` block near the top of `<style>`.
- **Adjust cube geometry / wires**: the cube carousel + wire system lives in the second `<script>` block. `WIRE_CONFIG` at the top of that block controls attachment points (`bc` / `tc` / etc — `t/m/b` × `l/c/r`).
- **Add a project card**: add another `<div class="cube-face">…</div>` inside `#cube-scene` and bump the dot count.
- **Tune the sway / branch density**: `genTree` and `drawTrunk` in the first `<script>` block. Layer-aware sway amplitude is set from `tree.layer` (`fg`/`mid`/`far`). Recursive `growBranch` produces the fractal branch tree; right-leaning branches (angle > 0) get +1 child fork.

## Key Conventions
- All sizing uses CSS `clamp()` for fluid scaling. No per-breakpoint sizing hacks.
- Canvas buffer is **locked at init** — window resize never touches `canvas.width` / `canvas.height` (that wipe caused the blue/green flash mid-scroll / mid-resize). CSS `object-fit: cover` handles display reshape.
- Canvas frame loop **never** skips frames based on scroll position (that caused the same flash on scroll).
- iOS-safe: `100dvh` hero with `100vh` fallback, `100lvh` canvas, `env(safe-area-inset-*)` on nav/footer, `overscroll-behavior-y: none`, `-webkit-tap-highlight-color: transparent`, `touch-action: manipulation` on interactives.
- `#bg-canvas` is promoted to a GPU compositor layer (`transform: translateZ(0)` + `backface-visibility: hidden`) so position:fixed doesn't "fall off" mid-scroll on mobile browsers.
- Profile video: `muted playsinline autoplay preload="auto"` with a JS fallback that re-attempts `play()` on every readiness event + user interaction (iOS blocks cold autoplay more often than you'd think).
- Wire positions recalculate on scroll and resize via `positionTopWires` / `positionBottomWires` / `positionHeadingWires`.
