# Trey Barton Portfolio — Developer Guide

## Architecture
Static GitHub Pages site. Vanilla JS, no build tools, no frameworks.

## File Map

### HTML
- `index.html` — All markup. Sections: nav, #hero, #about, #projects, #contact, footer.

### CSS (css/)
- `variables.css` — Design tokens (colors, spacing, typography). ALL sizing uses `clamp()`. Edit HERE to change sizes.
- `base.css` — Reset, body, nav, glass-card, footer, reveal animations.
- `hero.css` — Hero section styles.
- `about.css` — About card, photo ring, skills tags.
- `projects.css` — 3D cube viewport, faces, wires, project cards, nav dots/arrows.
- `contact.css` — Contact card, social links.
- `responsive.css` — Layout-only overrides at 768px breakpoint. NO sizing here (use clamp in variables.css).

### JS — Canvas Forest (js/forest/)
All files use the `window.Forest` namespace.
- `palette.js` — Color arrays (BARK, CANOPY, LEAF_COLORS, etc.) and utilities (mkRng, rgb, mix).
- `tree-gen.js` — Tree/branch/canopy/vine/root generation. Forest.genTree, Forest.genLayer.
- `undergrowth-gen.js` — Ferns, mushrooms, grass, bushes. Forest.undergrowth.
- `draw-trunk.js` — Trunk, bark stripes, branches, vines rendering. Forest.drawTrunk.
- `draw-canopy.js` — Canopy blob rendering. Forest.drawCanopy.
- `draw-undergrowth.js` — Undergrowth rendering. Forest.drawUndergrowth.
- `particles.js` — Fireflies, spores, leaves, petals, dust, stars, mist. Forest.particles, Forest.spawnP.
- `scene.js` — Tree layer instances (far/mid/fg). Forest.farTrees, Forest.midTrees, Forest.fgTrees.
- `forest-main.js` — Canvas init, resize, render loop. Orchestrates all Forest.* modules.

### JS — UI (js/)
- `cube.js` — 3D cube carousel, wire positioning, swipe gestures, dot navigation. Config constants at top.
- `ui.js` — Nav scroll, smooth scrolling, year, video observer, reveal animations.

## Common Tasks
- **Change text sizes**: Edit `clamp()` values in `css/variables.css`
- **Change colors**: Edit color variables in `css/variables.css`
- **Adjust cube geometry**: Edit constants at top of `js/cube.js` (WIRE_CONVERGENCE_RATIO, CUBE_HEIGHT_RATIO, etc.)
- **Adjust wire angles**: Edit WIRE_CONVERGENCE_RATIO in `js/cube.js`
- **Modify forest appearance**: Edit palette arrays in `js/forest/palette.js`
- **Add a project card**: Add a `.cube-face` div in `index.html` inside `#cube-scene`, update dot count
- **Fix mobile layout**: Check `css/responsive.css` for structural issues, `css/variables.css` for sizing

## Key Conventions
- All sizing uses CSS `clamp()` for fluid scaling across all screen sizes. No magic pixel breakpoints for sizing.
- JS namespace: `window.Forest` for canvas code. Cube and UI are self-contained IIFEs.
- Canvas caches static elements (ground, hills, sky gradient) to offscreen canvases, regenerated only on resize.
- Wire positions recalculated on scroll and resize via `positionWires()` in cube.js.
- Cube viewport width is fluid via CSS `clamp(280px, 80vw, 560px)` — JS reads offsetWidth to compute geometry.
