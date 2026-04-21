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
├── bounce_loop.mp4       1.1 MB profile video (H.264 baseline, muted).
├── bounce_loop.jpg       Poster frame shown if autoplay is blocked.
├── css/
│   ├── tokens.css        :root variables — all sizing/color tokens.
│   ├── base.css          Reset, body, nav, glass-card, footer.
│   ├── hero.css          Hero section + CTAs.
│   ├── about.css         About card, photo ring, skills tags.
│   ├── projects.css      Cube, wires, chandelier, heading cube, carousel.
│   ├── contact.css       Contact card + social links.
│   └── responsive.css    @media breakpoint overrides.
└── js/
    ├── scheduler.js      One master RAF + dirty-flag coalescer.
    ├── tokens.js         Reads CSS custom properties into window.UI.tokens.
    ├── forest-palette.js BARK / CANOPY / LEAF_COLORS / FERN_COLORS + utils.
    ├── forest-tree.js    Tree generation + trunk/branch/root drawing.
    ├── forest-undergrowth.js Ferns, bushes, grass, mushrooms undergrowth.
    ├── forest-canopy.js  Canopy blob rendering.
    ├── forest-scene.js   Tree layer instances (far/mid/fg).
    ├── particles.js      Ring-buffer particle pool.
    ├── critters.js       Jaguar sprite + snake + crocodile + big vines.
    ├── canvas-core.js    Canvas setup + scene-cache + render loop.
    ├── cube.js           3D cube carousel + WIRE_CONFIG + attachment points.
    ├── wires.js          Chandelier wire geometry + positioning math.
    └── ui.js             Nav, smooth-scroll, video autoplay, reveals.
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
| **Horizon glows** | `frame._cenGlow`, `_sideGlows` | Warm radial glows |
| **Ground gradient** | `frame._groundGrd` | Yellow-green → dark earth |
| **Ground cache** | `frame._groundCache` | Dirt/rocks/leaves/sticks/roots/etc |
| **Hill cache** | `frame._hillCache` | 3 hill layers + tree line + saplings + river base |
| **River ripples** | `drawRiverRipples` | Animated shimmer |
| **Crocodile** | `drawCroc` | Jaw opens/closes in river |
| **Far trees** | `Forest.farTrees` (45) | Distant tree silhouettes |
| **Mid trees** | `Forest.midTrees` (24) | Middle-ground |
| **Jaguar** | `_jag` + `_jagSprite` | Walking cat, mid-ground layer |
| **Golden glow spots** | inline in frame | 5 pulsing orbs |
| **Mist puffs** | `Forest.mistPuffs` | Low-opacity roamers |
| **Ground fog band** | `frame._fogG` | Horizontal haze |
| **FG trees** | `Forest.fgTrees` (22, last 4 front-left) | Biggest trunks |
| **FG undergrowth** | `_fgUG` | Bushes, grass, sticks, leaves, rocks, flowers |
| **Snake** | `_snake` | Continuous slither |
| **Big vines** | `_bigVines` (6) | Hanging swaying vines |
| **Dense canopy** | 3 passes | Overlapping top blobs |
| **Light rays** | inline | 8 volumetric triangle rays |
| **Color grading** | inline | Warm gold wash |
| **Vignette** | `frame._vig` | Edge darkening |
| **Particles** | `Forest.particles` | Fireflies, spores, leaves, petals, dust |

### Tree anatomy (per tree)

| Name | Data | Description |
|---|---|---|
| **Trunk** | `tree.trunkW`, `tree.taper`, `tree.lean`, `tree.curve`, `tree.curveFreq` | Shape params |
| **Bark stripes** | `tree.stripes[]` | Vertical color bands |
| **Roots** | `tree.roots[]` | Each has dir/spread/height/yOffset/angle/splitAt/splitAngle/splitLen/fibers/fiberSeed |
| **Primary branch** | `tree.branches[i]` | Main bough |
| **Secondary branch** | `sub*` siblings in branches[i] | First fork |
| **Tertiary branch** | `tert*` siblings in branches[i] | Second fork |
| **Tuft** | tertiary-tip ellipse cluster | Big foliage clump at each twig tip |
| **Canopy blobs** | `tree.canopy[]` | Per-tree top-canopy ellipses |
| **Vines** | `tree.vines[]` | Hanging vines from primary branches |

## Knobs cheat sheet

When you say…                          | …I'll change:
---|---
"make the project cube bigger"        | `.cube-viewport { width: clamp(...) }` in `css/projects.css`
"wires too thin"                      | `.chandelier-wire`/`.heading-wire`/`.chandelier-wire-bottom` widths in `css/projects.css`
"top wires: T-point out"              | `WIRE_CONFIG.topWires.tPointSpreadDeg`  (spread UPPER end of each wire)
"top wires: B-point out"              | `WIRE_CONFIG.topWires.bPointSpreadDeg`  (spread LOWER end / corner side)
"mini wires land too far outside"     | `WIRE_CONFIG.miniWires.cornerSpread` in `js/ui.js`
"bottom wires land too far outside"   | `WIRE_CONFIG.bottomWires.cornerSpread`
/* T-point = TOP of the wire (upper end in space, higher on page).
   B-point = BOTTOM of the wire (lower end in space, lower on page). */
"move the project cube down"          | `#projects { margin-top: ... }` in `css/projects.css`
"trees smaller"                       | `genTree` `trunkW` ranges in `js/forest-tree.js`
"fewer trees"                         | Counts in `js/forest-scene.js`
"roots longer/flatter"                | Root `spread`/`height` in `js/forest-tree.js`
"branches sway less"                  | `swayAmpBase` in `js/forest-tree.js` drawTrunk
"bigger leaf tufts"                   | `lclR` in `js/forest-tree.js` tertiary-tip block
"jaguar smaller/faster"               | `_jagSprite` size OR `_jag.vx` in `js/critters.js`
"snake thicker"                       | `bodyW(t)` in `js/critters.js`
"river higher/lower"                  | `rivY` constant in `js/critters.js` drawRiverBase
"about card less transparent"         | `--glass-bg` in `css/tokens.css`
"hero text bigger"                    | `--h1` in `css/tokens.css`

## Conventions

- **Canvas buffer is locked at load.** Never set `canvas.width` or `canvas.height` after init. CSS `object-fit: cover` handles viewport reshape.
- **All sizing uses CSS `clamp()`.** No per-breakpoint magic numbers.
- **One CSS custom properties file** (`css/tokens.css`) drives every color + every fluid size.
- **Single master RAF** coalesces resize/scroll/canvas/cube/wire work.
- **iOS-safe primitives**: `100dvh`/`100lvh`, `env(safe-area-inset-*)`, `overscroll-behavior-y: none`, `-webkit-tap-highlight-color: transparent`, GPU-layered `#bg-canvas`.
- **No backdrop-filter on anything that scrolls over the canvas** — only the nav when scrolled.
