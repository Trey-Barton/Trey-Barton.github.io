# Portfolio Architecture

This is the single source of truth for how the site is structured and what
every moving piece is called. Read this before making edits — it'll save
you from searching for things by eye.

## File layout

```
portfolio/
├── index.html            Markup only; <link>/<script> references below.
├── ARCHITECTURE.md       This file.
├── CLAUDE.md             Quick dev guide (common tasks).
├── bounce_loop.mp4       ~4.5 MB profile video (muted, lazy-loaded).
├── bounce_loop.jpg       Poster frame shown if autoplay is blocked.
├── css/
│   ├── tokens.css        :root variables — all sizing/color tokens.
│   ├── base.css          Reset, body, nav, glass-card, footer.
│   ├── hero.css          Hero section + CTAs.
│   ├── about.css         About card, photo ring, skills tags.
│   ├── projects.css      Cube, wires, chandelier, heading cube, carousel.
│   └── contact.css       Contact card + social links.
└── js/
    ├── scheduler.js                  UI.scheduler: dirty-flag RAF coalescer (used by ui.js only).
    ├── forest-palette.js             BARK / CANOPY / LEAF_COLORS / FERN_COLORS + utils.
    ├── forest-tree-gen.js            Tree generation (trunk/branch/root/canopy params).
    ├── forest-undergrowth-gen.js     Undergrowth generation (ferns, bushes, grass, mushrooms).
    ├── forest-draw-trunk.js          Trunk + branch + root rendering; sway math.
    ├── forest-draw-canopy.js         Canopy blob rendering.
    ├── forest-draw-undergrowth.js    Undergrowth rendering.
    ├── forest-particles.js           Recycling particle pool + stars + mistPuffs; spawnP/MAX_PARTICLES.
    ├── forest-scene.js               Tree layer instances (far/mid/fg).
    ├── canvas-core.js                Canvas setup + scene cache + render loop.
    │                                 Also hosts light rays, golden glow spots,
    │                                 mist, fog band, color grading, and vignette.
    └── ui.js                         Nav, smooth-scroll, footer year, video autoplay, reveals.
                                      Also hosts the cube carousel and the
                                      chandelier/heading wire positioning math.
```

All modules hang off the `window.UI` and `window.Forest` namespaces. No
bundler, no build step — plain `<script defer>` tags.

## Shared vocabulary

### Layout elements (top → bottom)

| Name | Selector | Description |
|---|---|---|
| **Nav bar** | `.nav` | Fixed top strip |
| **Hero** | `#hero` | First viewport |
| **Hero name** | `.hero-name` | "Trey Barton" headline |
| **View-My-Work CTA** | `.hero-cta` #1 | First pill button |
| **About-Me CTA** | `.hero-cta` #2 | Second pill button |
| **About section** | `#about` | |
| **About card** | `.about-card` | Translucent panel around About text |
| **Profile ring** | `.photo-ring` | Circular frame around face video |
| **Profile video** | `.profile-video` | Looping face video |
| **Skill tags** | `.skill-tag` | Pill chips |
| **Projects section** | `#projects` | |
| **Project cube** | `.cube-viewport` + `.cube-scene` | Big 3D rotating box |
| **Project faces** | `.cube-face[data-face]` | 4 rotating project cards |
| **Project heading-cube** | `.heading-viewport` + `.projects-heading-scene` | Small "Projects" 3D box |
| **Heading faces** | `.projects-heading-face[data-face]` | 4 pill panels |
| **Top wires** | `.heading-wire` | About card bottom → Mini chandelier corners (was "heading wires") |
| **Mini wires** | `.chandelier-wire` | Project cube TOP corners → Mini chandelier (conceptually up-going) (was "top wires") |
| **Bottom wires** | `.chandelier-wire-bottom` | Project cube bottom corners → contact card |
| **Contact section** | `#contact` | "Let's Talk" |
| **Contact card** | `.contact-card` | Translucent panel in Contact |
| **Social links** | `.social-link` | GitHub / LinkedIn / Instagram circles |
| **Footer** | `.footer` | Bottom strip |

### Canvas elements (draw order, back → front)

| Name | Where | Notes |
|---|---|---|
| **Sky gradient** | `frame._skyGrad` | Dark navy → teal → green → gold |
| **Stars** | `Forest.stars` | Tiny flickering dots |
| **Horizon glows** | `frame._cenGlow`, `_sideGlows`, `_hBand` | Warm radial glows + horizon band |
| **Ground gradient** | `frame._groundGrd` | Yellow-green → dark earth |
| **Floor glow spots** | inline in frame | 10 warm pulsing arcs along the horizon |
| **Ground cache** | `frame._groundCache` | Dirt/rocks/leaves/sticks/roots/mushrooms/flowers/grass |
| **Grass tufts** | `frame._grassTufts` | Swaying foreground grass blades |
| **Hill cache** | `frame._hillCache` | 4 hill silhouette layers + tree line + saplings |
| **Far undergrowth** | `Forest.drawUndergrowth(..,"far")` | Distant ferns/grass/bushes |
| **Far trees** | `Forest.farTrees` (45 desktop / 18 mobile) | Distant tree silhouettes |
| **Atmospheric haze** | `frame._hazeG` | Mid-depth warm haze gradient |
| **Mid undergrowth** | `Forest.drawUndergrowth(..,"mid")` | Middle-ground undergrowth |
| **Mid trees** | `Forest.midTrees` (24 desktop / 10 mobile) | Middle-ground |
| **Mid glow** | `frame._midGlow` | Screen-blended golden mid-band glow |
| **Ground fog band** | `frame._fogG` | Horizontal haze near the horizon |
| **FG undergrowth (layer)** | `Forest.drawUndergrowth(..,"fg")` | Foreground undergrowth layer |
| **FG scatter** | `frame._fgUG` | Bushes, grass, sticks, leaves, rocks, flowers, jungle-grass (y-sorted) |
| **FG trees** | `Forest.fgTrees` (12 + 2 front-left = 14 desktop / 5+2 mobile) | Biggest trunks |
| **Dense canopy** | 4 passes (seeds 333/444/555/666) | Overlapping top blobs (last pass = hanging clumps) |
| **Mist puffs** | `Forest.mistPuffs` | Low-opacity roamers (drawn to the live ctx) |
| **Light rays** | inline | 8 volumetric triangle rays (screen blend) |
| **Color grading** | inline | Warm gold overlay wash |
| **Vignette** | `frame._vig` | Edge darkening |
| **Particles** | `Forest.particles` | Fireflies, spores, leaves, petals, dust |

### Tree anatomy (per tree)

| Name | Data | Description |
|---|---|---|
| **Trunk** | `tree.trunkW`, `tree.taper`, `tree.lean`, `tree.curve`, `tree.curveFreq`, `tree.baseY`, `tree.topY` | Shape params |
| **Bark stripes** | `tree.stripes[]` | Each has pos/w/ci/phase/amp/freq/alpha |
| **Roots** | `tree.roots[]` | Each has dir/spread/length/width/taper/ci/snakePhase/snakeFreq + `subRoots[]` (tFrac/dir/len/width/snakePhase) |
| **Primary branch** | `tree.branches[i]` | Main bough (yFrac/dir/angle/len/w/stripeCI/subCount) |
| **Secondary branch** | `sub*` arrays in `branches[i]` (subAngles/subLens/subDirs/subStripes) | First fork |
| **Tertiary branch** | `tert*` arrays in `branches[i]` (tertAngles/tertLens/tertDirs/tertStripes) | Second fork |
| **Canopy blobs** | `tree.canopy[]` | Per-tree top ellipses (ox/oy/r/ci/isAccent/swayPhase/swayAmp/squash/rot/depth) |
| **Vines** | `tree.vines[]` | Hanging vines from branches (branchIdx/tFrac/len/swayPhase/swayAmp/thickness/segments) |

## Knobs cheat sheet

When you say…                          | …I'll change:
---|---
"make the project cube bigger"        | `.cube-viewport` `width` in `css/projects.css`
"wires too thin"                      | `.chandelier-wire`/`.heading-wire`/`.chandelier-wire-bottom` widths in `css/projects.css`
"wire corners land too far out"       | `cornerSpread` on the wire config objects in `js/ui.js` (positioning routine)
"wire corners sit too high/low"       | `cornerYShift`/`bCornerDropPx` on the wire config objects in `js/ui.js`
"move the project cube down"          | `#projects` `margin-top` in `css/projects.css`
"trees smaller"                       | `trunkW` ranges in `Forest.genTree` in `js/forest-tree-gen.js`
"fewer trees"                         | Layer counts in `js/forest-scene.js`
"roots longer/flatter"                | Root params in `Forest.genTree` in `js/forest-tree-gen.js`
"branches sway less"                  | Sway math in `Forest.drawTrunk` in `js/forest-draw-trunk.js`
"more/fewer particles"                | `Forest.MAX_PARTICLES` (`js/forest-particles.js`); spawn rates in the `v()` loop in `js/canvas-core.js`
"light rays brighter/more"            | The 8-ray `for` loop (screen blend) in the `v()` loop in `js/canvas-core.js`
"glass cards less transparent"        | The `glass` background tokens in `css/tokens.css`
"hero text bigger"                    | Hero `clamp()` size tokens in `css/tokens.css`

## Conventions

- **Canvas backing store resizes on (debounced) resize.** The `l()` resize handler in `js/canvas-core.js` resets `canvas.width`/`height` ~300ms after a resize (and widens to ≥1024px on mobile), then nulls every cached layer so the scene rebuilds. `object-fit: cover` on `#bg-canvas` handles the in-between reshape.
- **Two independent RAF loops.** The canvas renderer owns its own loop (the `v()` function in `js/canvas-core.js`); `UI.scheduler` (in `js/scheduler.js`) is a separate dirty-flag RAF coalescer used only by `js/ui.js` for cube/wire/scroll/resize work. The renderer does **not** use the scheduler.
- **All sizing uses CSS `clamp()`.** No per-breakpoint magic numbers.
- **One CSS custom properties file** (`css/tokens.css`) drives every color + every fluid size.
- **iOS-safe primitives**: `100dvh`/`100vh` fallback, `env(safe-area-inset-*)`, `overscroll-behavior-y: none`, `-webkit-tap-highlight-color: transparent`, GPU-layered `#bg-canvas` (`translateZ(0)` + `backface-visibility: hidden`).
- **No backdrop-filter on anything that scrolls over the canvas** — only the nav when scrolled.
