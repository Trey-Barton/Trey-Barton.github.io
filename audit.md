# Site Audit: Trey Barton Portfolio

**Date:** 2026-05-29
**URL:** https://trey-barton.clodhost.com/
**Method:** Source code analysis (Chrome DevTools MCP unavailable — all findings derived from reading every file in the repo)

---

## First Impression

This site communicates "creative technologist with ambition and taste." The first three things the eye is drawn to: (1) the WebGL forest background — immediately distinctive and not template-derived, (2) the hero name "Trey Barton" in Playfair Display at a confident scale, and (3) the teal glass cards that float over the scene. If I had to describe it in one word: **atmospheric**.

The forest is the site's strongest asset and its biggest risk. It signals craft and technical depth — but it also means 90% of the engineering effort is in a background animation most visitors will scroll past in 2 seconds. The 3D CSS cube carousel for projects is a bold choice that reinforces the "I build immersive things" narrative, though it trades discoverability for novelty (a visitor has to click arrows to see all 4 projects).

The site does NOT look AI-generated. No purple gradients, no 3-icon feature grids, no "Welcome to my portfolio" copy, no Inter-only typography, no decorative blobs. Playfair Display + Inter is a real type pairing. The teal glass palette is specific and intentional. The forest background is clearly hand-crafted WebGL, not a template effect.

---

## Headline Scores

| Category | Grade | Rationale |
|----------|-------|-----------|
| **Design** | B | Distinctive palette, strong hero, good type pairing. Loses points for touch targets and contrast failures. |
| **Information Architecture** | C+ | Missing `<main>` and `<header>` landmarks. 4 duplicate H2s. Cube hides 3 of 4 projects. No keyboard nav on dots. |
| **AI Slop** | A | Nothing here reads as template or generated. The forest, the cube, the type choices — all intentional. |
| **Performance** | C | 7 scripts load in a sequential waterfall. No minification on 51KB forest-gl.js. No Cache-Control headers. No CDN fallback. |

---

## INFORMATION ARCHITECTURE Findings

### [HIGH] Missing `<main>` landmark
`#content-wrap` (line 132) is a `<div>`, not `<main>`. Screen readers cannot jump to primary content. The skip-nav link at line 128 points to `#content-wrap` but the target isn't natively focusable — needs `tabindex="-1"` or should be a `<main>` element.
**Fix:** Change `<div id="content-wrap">` to `<main id="content-wrap">`.

### [HIGH] Missing `<header>` landmark
The `<nav>` (line 133) is not wrapped in a `<header>`. Assistive tech cannot identify the page banner region.
**Fix:** Wrap the `<nav>` in `<header>`.

### [HIGH] 4 duplicate "Projects" H2 headings
Each cube face (`.pf-front`, `.pf-right`, `.pf-back`, `.pf-left`) contains an identical `<h2>Projects</h2>`. Screen readers announce four identical headings in the heading list. Only the visible face's heading should be exposed.
**Fix:** Add `aria-hidden="true"` to the three non-front face headings, or use a single H2 outside the cube and make the face headings decorative.

### [MEDIUM] Sections lack `aria-label` / `aria-labelledby`
`<section id="hero">`, `#about`, `#projects`, `#contact` — none have `aria-label` or `aria-labelledby`. They are anonymous regions to assistive tech.
**Fix:** Add `aria-labelledby` pointing to each section's heading. Hero needs `aria-label="Introduction"` since H1 is just a name.

### [MEDIUM] Cube dots not keyboard accessible
`.cube-dot` elements (lines 267-270) are `<div>` elements with click handlers but no `role="button"`, no `tabindex`, no `aria-label`. Keyboard users cannot reach or activate them.
**Fix:** Change to `<button>` elements with `aria-label="Project 1 of 4"` etc.

### [MEDIUM] No `target="_blank"` disclosure
None of the 6 external links indicate they open a new tab. WCAG 3.2.5 recommends informing users.
**Fix:** Add visually hidden `(opens in new tab)` text or an icon.

### [MEDIUM] Cube face tab order exposes hidden content
All four cube faces and their links remain in tab order regardless of which face is visible. Hidden faces' `.project-link` anchors should be `tabindex="-1"` or `inert` when not active.

### [LOW] Profile video should be `aria-hidden`
The `<video>` (line 185) is decorative (autoplay, muted, no controls). It has a poster but no text alternative. Should have `aria-hidden="true"` since it conveys no information beyond the visual.

### [LOW] SVG icons should be `aria-hidden`
The three social link SVGs lack `aria-hidden="true"`. The parent `<a>` tags have `aria-label`, so this is a best-practice refinement to prevent double-announcement.

---

## DESIGN Findings

### [HIGH] Cube navigation dots are 10x10px
`.cube-dot` is `width:10px; height:10px` — 77% below the WCAG 2.5.8 minimum of 44x44px. On mobile, these are nearly impossible to tap accurately.
**Fix:** Increase to at least 44x44px, or add a 44px transparent hit area around each dot.

### [HIGH] Footer text fails WCAG AA contrast
`.footer` uses `--color-text-muted: rgba(255,255,255,0.5)` at `0.78rem`. Effective contrast ratio ~3.5:1 against `--bg-primary: #1e2a19`. AA requires 4.5:1 for text this small.
**Fix:** Increase to `rgba(255,255,255,0.7)` minimum.

### [HIGH] Skill tag text fails WCAG AA contrast
`.skill-tag` uses `color: rgba(255,255,255,0.7)` at `0.78rem` on a composited glass background. Effective contrast ~4.0:1 — fails AA for small text.
**Fix:** Increase to `rgba(255,255,255,0.85)` or bump font size above 18px (where AA threshold drops to 3:1).

### [MEDIUM] Social link touch targets 40x40px
`.social-link` is `width:40px; height:40px` — 4px short of the 44px minimum on each axis.
**Fix:** Increase to 44px.

### [MEDIUM] Cube arrow touch targets fail on mobile
`.cube-arrow` uses `clamp(36px, 5vw, 44px)` — passes at desktop but drops to 36px on mobile, exactly where touch targets matter most.
**Fix:** Set `min-width:44px; min-height:44px`.

### [MEDIUM] Contact paragraph text borderline contrast
`.contact-card p` uses `--color-text-dim: rgba(255,255,255,0.65)` on the glass card. Approximate contrast ~4.2:1 — borderline for small text.
**Fix:** Increase to `rgba(255,255,255,0.75)`.

### [LOW] Spacing system is ad-hoc
Colors and fonts are fully tokenized in `tokens.css`. Spacing is not — raw values like `6px 16px`, `gap:8px`, `margin-top:24px` appear throughout. Not broken, but inconsistent compared to the rest of the design system.

### [LOW] Nav link hit areas are text-only
`.nav-links a` has no explicit minimum dimensions. The text itself is the tap target. Consider adding `padding` to ensure 44px touch area.

---

## PERFORMANCE Findings

### [HIGH] Google Analytics placeholder
Line 117: `G-XXXXXXXXXX` — zero data is being collected. Either add a real measurement ID or remove the script (it's loading gtag.js from Google for nothing).
**Fix:** Replace with actual GA4 measurement ID, or remove entirely.

### [HIGH] Sequential JS waterfall
The `loadNext()` chain (lines 63-79) loads 7 scripts one at a time. Each waits for the previous to finish downloading AND executing. Total: ~67KB across 7 files, but latency is multiplied ~7x vs parallel loading.
**Fix:** Use `defer` attributes on parallel `<script>` tags, or bundle into a single file.

### [HIGH] No Cache-Control headers
Neither `.htaccess` nor `_headers` set any cache directives. All assets rely on server/browser defaults. For a static site, CSS/JS/images should have aggressive caching.
**Fix:** Add `Cache-Control: public, max-age=31536000, immutable` for versioned assets; `max-age=3600` for HTML.

### [MEDIUM] No Three.js CDN fallback
If `cdn.jsdelivr.net` is down or blocked (common in China, some corporate networks), the entire background fails silently. No local fallback.
**Fix:** Add an `onerror` handler that loads a local copy, or accept the graceful degradation (static gradient fallback already exists).

### [MEDIUM] forest-gl.js is unminified (51KB)
1,309 lines with comments and blank lines. `ui.js` IS minified. Inconsistent.
**Fix:** Minify to save ~30-40%.

### [MEDIUM] 6 CSS files loaded as separate requests
19,734 bytes total across 6 files. Each is a separate HTTP/2 request. Not catastrophic on HTTP/2 but still suboptimal.
**Fix:** Bundle into one file, or inline critical CSS for above-the-fold content.

### [LOW] Three.js version comment is stale (not a bug)
`forest-gl.js` header says "Requires Three.js r128" but the CDN loads `three@0.175.0`. Code analysis confirms the code uses r175+ API patterns (`vertexColors: true` boolean, modern `BufferGeometry`). **The code is compatible with 0.175.0 — just update the comment.**

### [LOW] bounce_loop.mp4 missing from repo
Referenced via `data-src="bounce_loop.mp4?v=3"` but the file doesn't exist in the repo. May be deployed separately or via LFS. Verify it's accessible at the deployed URL.

---

## Top 5 Priorities (fix these first)

1. **Add `<main>` and `<header>` landmarks** — Two-line HTML change. Biggest accessibility win for the least effort. Change `<div id="content-wrap">` to `<main>`, wrap `<nav>` in `<header>`.

2. **Fix contrast failures** — Footer text (`0.5` → `0.7`), skill tags (`0.7` → `0.85`), contact body (`0.65` → `0.75`). Three token edits in `tokens.css`.

3. **Fix touch targets** — Cube dots (10px → 44px hit area), social links (40px → 44px), cube arrows (min 44px). These are the difference between "usable on mobile" and "frustrating on mobile."

4. **Replace GA4 placeholder or remove** — `G-XXXXXXXXXX` is actively loading a script from Google for zero benefit. Either wire up real analytics or delete the two script tags.

5. **Fix JS loading waterfall** — The sequential `loadNext()` chain adds unnecessary latency. Switch to parallel `<script defer>` tags or a single bundled file.

---

## What's Already Great (don't touch this)

- **The WebGL forest** — Original, well-engineered (zero per-frame allocations, quality tiers, visibility pause, reduced-motion support). This is the site's signature.
- **CSS design token architecture** — `tokens.css` with `clamp()` fluid sizing is clean and maintainable. Every color, font, and size is tokenized.
- **Type pairing** — Playfair Display + Inter is specific and intentional. Not a default.
- **The glass card aesthetic** — Teal-on-forest is a distinctive palette. Not generic dark mode.
- **Video lazy-loading** — IntersectionObserver with `data-src`, 400px rootMargin, iOS autoplay fallback with multiple retry strategies. Production-grade.
- **Security headers** — Both Apache and Cloudflare formats. HSTS, X-Frame-Options, Permissions-Policy, Referrer-Policy, X-Content-Type-Options. Comprehensive.
- **SEO fundamentals** — OG, Twitter Card, JSON-LD, canonical, robots.txt, sitemap. All present and well-formed.
- **prefers-reduced-motion** — Forest-gl.js respects it (static trees, no sway, no particles). Genuine accessibility consideration.
- **Non-AI aesthetic** — Nothing about this site reads as generated. The craft is visible.
