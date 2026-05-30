# Site Audit: Trey Barton Portfolio

**Date:** 2026-05-29
**Scope:** Static GitHub Pages site (vanilla HTML/CSS/JS, no build step). Background is a hand-built **Canvas 2D** forest scene (`js/canvas-core.js`); there is no Three.js/WebGL renderer.
**Method:** Source-code analysis of every file in the repo (HTML, the 6 CSS modules, the 11 JS modules, `_headers`, `.htaccess`, `robots.txt`, `sitemap.xml`).

This report supersedes the previous `audit.md`, which described a since-deleted Three.js renderer, a `three@0.175.0` CDN dependency, a Google Analytics tag, and a sequential `loadNext()` script waterfall — none of which exist in the current codebase.

---

## HIGH

### H1 — Hero text is unreadable over the forest at all widths
The hero headline and supporting copy sit directly over the animated forest canvas. The forest is high-contrast and busy and reads as **foreground**, not background, so the text competes with trunks, canopy, light rays, and particles behind it at every viewport width. There is no scrim, no text backplate, and no canvas dimming behind the hero. The hero is the first thing a visitor sees and it is the hardest thing to read.
**Direction:** Add a dedicated readability treatment behind the hero text (e.g. a localized gradient scrim / vignette or a darkened canvas band behind the headline), independent of the per-frame vignette.

### H2 — Footer text fails contrast (~2.65:1) over the bright sun/horizon band
`.footer` uses `--color-text-muted` (`rgba(255,255,255,0.7)`) at `--footer-font: 0.78rem`. The footer renders low on the page where the canvas sky gradient is at its brightest gold (the sun/horizon band). Against that bright band the effective contrast is roughly **2.65:1**, well below the WCAG AA 4.5:1 minimum for small text.
**Direction:** Give the footer an opaque/darkened backing or move it off the bright band; bumping text opacity alone will not clear 4.5:1 against the gold band.

### H3 — `canvas-core.js` ignores `prefers-reduced-motion`
The renderer in `js/canvas-core.js` runs its own continuous `requestAnimationFrame` loop (sway, drifting particles, light-ray flicker, mist, grass motion) and never checks `prefers-reduced-motion`. `js/ui.js` does query the media feature, but the background animation — the most motion-heavy part of the page — does not respond to it.
**Direction:** Have the render loop honor `prefers-reduced-motion: reduce` (e.g. render a single static frame and suspend per-frame animation / particle spawning).

### H4 — 768px breakpoint dead-zone
Responsive rules split on `@media (max-width:768px)` for mobile and `@media (min-width:769px)` for tablet/desktop (see `base.css`, `about.css`, `projects.css`, `hero.css`, `contact.css`). A viewport width that lands **between** 768px and 769px (fractional widths from browser zoom, high-DPR scaling, or devtools) matches neither block, leaving an unstyled gap.
**Direction:** Make the boundaries meet — use `min-width:768.02px` / `max-width:768px`, or switch the desktop side to `min-width:769px` paired with a `max-width:768.98px` mobile bound, so every width matches exactly one rule.

### H5 — Docs described a deleted renderer (being fixed in this pass)
The project documentation described a Three.js/WebGL renderer (`forest-gl.js`, `three@0.175.0` CDN, a river plane, animal sprites, big vines, etc.) that no longer exists. `CLAUDE.md` has been updated to describe the Canvas 2D renderer, and `ARCHITECTURE.md` is being corrected in this same pass to remove the fictional canvas elements (jaguar, snake, crocodile, river, big vines), the nonexistent `responsive.css`, and the nonexistent `WIRE_CONFIG` API, and to match the actual `js/` and `css/` file maps.
**Direction:** Keep docs in lockstep with the renderer; treat `js/canvas-core.js` as ground truth.

---

## MEDIUM

### M1 — No nav active-state / scroll-spy
The nav links do not reflect which section is currently in view. There is no active/current styling driven by scroll position, so users get no in-page orientation as they scroll through hero → about → projects → contact.

### M2 — `#projects` section has no accessible name
`<section id="projects">` exposes no `aria-label` / `aria-labelledby`, so it is an anonymous region to assistive tech. (The project content lives inside a rotating cube whose visible heading is not wired as the section's name.)

### M3 — No `:focus-visible` styles
There are zero `:focus-visible` rules in the CSS. Keyboard users get only the UA default focus ring (and in places where outlines are otherwise suppressed, potentially none), making keyboard navigation hard to follow on the nav links, CTAs, cube controls, and social links.

### M4 — `_headers` is missing an HTML cache rule
`_headers` sets `Cache-Control: public, max-age=31536000, immutable` for `/css/*`, `/js/*`, `/*.jpg`, and `/*.mp4`, but has **no rule for HTML** (`/` or `/*.html`). The page document falls back to server defaults, with no explicit (typically short) cache policy for the entry point.
**Direction:** Add a short-lived rule for HTML (e.g. `max-age=3600` or `no-cache` with revalidation) so updates to `index.html` propagate while static assets stay long-cached.

### M5 — No Content-Security-Policy
Neither `_headers` nor `index.html` sets a `Content-Security-Policy`. The other security headers are present and good (see L4), but there is no CSP to constrain script/style/connect sources.

### M6 — Duplicate token
`css/tokens.css` defines multiple identical values: `--card-h3`, `--about-h2`, and `--contact-h2` are all `clamp(1.8rem, 1.4rem + 1.5vw, 2.4rem)` (`--heading-h2` already aliases `--card-h3`), and `--color-text-muted` / `--color-text-secondary` differ only by a hairline alpha (`0.7` vs `0.75`). The duplication invites drift.
**Direction:** Collapse the identical heading sizes to one token (alias the rest) and reconcile the two near-identical text-color tokens.

### M7 — Identical nav media-blocks
The nav's responsive treatment is split across multiple `@media` blocks that carry effectively the same rules, rather than being consolidated. This is redundant and a maintenance hazard (edit one, forget the other).

### M8 — Three near-identical wire classes
`.heading-wire`, `.chandelier-wire`, and `.chandelier-wire-bottom` (in `css/projects.css`) share the same geometry and differ only in height and background — the file comment even notes this. They could be unified behind a shared base class with per-class modifiers.

### M9 — Hardcoded `#fff` vs `--color-white`
A literal white is used in place of the existing `--color-white` token, breaking the otherwise-consistent tokenized color system.

### M10 — `og:image` is a video poster frame
`og:image` points at `bounce_loop.jpg` — the profile-video poster frame (declared 1200×630). A poster frame of the looping face video is a weak social-share preview; a purpose-built OG card would represent the page better.

---

## LOW / CLEAN

### L1 — SEO is solid
Open Graph + Twitter Card tags, JSON-LD, canonical URL, `robots.txt`, and `sitemap.xml` are all present and well-formed.

### L2 — Touch targets are fixed
Interactive controls meet the touch-target sizing guidance; this was a prior concern and is now in good shape.

### L3 — No dead JS and no dead CSS selectors
The JS modules are all wired in and used; spot-checking did not surface orphaned CSS selectors with no matching markup.

### L4 — Security headers are good
`_headers` sets `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security: max-age=31536000; includeSubDomains`, and a locked-down `Permissions-Policy` (camera/microphone/geolocation disabled). (See M5 for the one gap: no CSP.)

### L5 — Render-loop allocations have low real-world impact
The per-frame loop in `js/canvas-core.js` does allocate some short-lived objects, but the particle system uses a recycling pool (`Forest._recycleParticle` + a capped `MAX_PARTICLES`) and the heavy scene is cached to an offscreen canvas and only rebuilt on resize. Real-world GC pressure is low.

### L6 — 4.5MB video is correctly lazy-loaded
`bounce_loop.mp4` (~4.5 MB) is lazy-loaded rather than blocking initial render, and has a poster fallback (`bounce_loop.jpg`) for blocked autoplay. The size is large but the loading strategy is correct.

---

## Priority order

1. **H1** — make the hero text readable over the forest (highest-visibility issue).
2. **H2** — fix footer contrast over the bright horizon band.
3. **H3** — honor `prefers-reduced-motion` in the canvas renderer.
4. **H4** — close the 768/769px breakpoint dead-zone.
5. **H5** — finish reconciling the docs with the Canvas 2D renderer (in progress).
6. Then the MEDIUM cluster (nav scroll-spy, section a11y names, `:focus-visible`, HTML cache rule, CSP, and the token/CSS de-duplication).
