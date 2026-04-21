/**
 * Forest main orchestrator -- canvas setup, resize, render loop
 */


try {
(function () {
  'use strict';

  // On mobile: render one static frame then stop (no animation loop)
  // Canvas animates on all devices — performance managed via DPR cap and particle limits

  var canvas = document.getElementById('bg-canvas');
  var ctx = canvas.getContext('2d', { alpha: false });
  var time = 0, lastTs = null;

  // Canvas buffer matches the viewport aspect at load. Live resize during
  // a drag stretches via CSS (cheap + flash-free); after the drag settles
  // (300 ms of no resize events) we regenerate the buffer + all scene
  // caches at the new viewport size so the forest reads as full, not
  // squeezed. The debounce window is what prevents the old blue/green
  // mid-drag flash.
  function resize() {
    Forest.isMobile = window.innerWidth <= 768;
    Forest.MAX_PARTICLES = Forest.isMobile ? 150 : 400;
    var dpr = 1; // Background art; 1× is sharp enough.
    var w = window.innerWidth;
    var h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    // Invalidate every offscreen cache — they're keyed on W/H and will
    // be rebuilt on the next requestAnimationFrame.
    ['_sceneCache', '_groundCache', '_hillCache',
     '_skyGrad', '_horizonCache', '_hazeG', '_midGlow', '_fogG', '_vig',
     '_fgUG'
    ].forEach(function (key) { if (frame[key] != null) frame[key] = null; });
  }
  resize();

  var _resizeTimer = null;
  window.addEventListener('resize', function () {
    // Fast path: update spawn bucket immediately.
    Forest.isMobile = window.innerWidth <= 768;
    Forest.MAX_PARTICLES = Forest.isMobile ? 150 : 400;
    // Slow path: debounce the full canvas regen.
    if (_resizeTimer) clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(function () {
      _resizeTimer = null;
      resize();
    }, 300);
  });

  var windPhase = 0;

  /* ═══════════ WILDLIFE + RIVER — OPTIMIZED ═══════════
   *
   * Strategy: every static asset (jaguar body + rosettes, snake scale shading,
   * river base) is pre-rendered ONCE to a tiny offscreen canvas and blitted
   * per-frame via drawImage. Per-frame cost is only the positional transform,
   * a few legs/jaw lines, and the snake's wave math.
   */

  // ─── Jaguar sprite (drawn once, reused forever) ─────────────────────────
  var _jagSprite = (function () {
    var jw = 130, jh = 64;
    var c = document.createElement('canvas');
    c.width = jw; c.height = jh;
    var g = c.getContext('2d');
    var cx = jw * 0.48, cy = jh * 0.6;

    var COAT       = '#c8852f';
    var COAT_DARK  = '#a06820';
    var COAT_LIGHT = '#e6b06a';
    var BELLY      = '#f0d4a0';
    var INK        = 'rgba(20,12,6,0.92)';

    // Shadow under feet.
    g.beginPath();
    g.ellipse(cx, cy + 18, jw * 0.42, 4, 0, 0, 6.28);
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fill();

    // Tail — curves up and back. Drawn first so body covers its base.
    g.beginPath();
    g.moveTo(cx - jw * 0.35, cy - 2);
    g.quadraticCurveTo(cx - jw * 0.55, cy - 6, cx - jw * 0.6, cy - 14);
    g.quadraticCurveTo(cx - jw * 0.62, cy - 22, cx - jw * 0.5, cy - 26);
    g.lineWidth = 6;
    g.lineCap = 'round';
    g.strokeStyle = COAT;
    g.stroke();
    // Tail tip — black tuft.
    g.beginPath();
    g.arc(cx - jw * 0.5, cy - 26, 3.5, 0, 6.28);
    g.fillStyle = INK;
    g.fill();

    // Hindquarters — large rounded haunch.
    g.beginPath();
    g.ellipse(cx - jw * 0.22, cy - 2, jw * 0.18, jh * 0.22, 0, 0, 6.28);
    g.fillStyle = COAT;
    g.fill();

    // Main body — long muscular trunk.
    g.beginPath();
    g.ellipse(cx + 4, cy - 2, jw * 0.34, jh * 0.21, 0, 0, 6.28);
    g.fillStyle = COAT;
    g.fill();

    // Shoulder/chest bulge.
    g.beginPath();
    g.ellipse(cx + jw * 0.22, cy - 4, jw * 0.16, jh * 0.2, 0, 0, 6.28);
    g.fillStyle = COAT;
    g.fill();

    // Belly + chest highlight.
    g.beginPath();
    g.ellipse(cx - 2, cy + 6, jw * 0.30, jh * 0.10, 0, 0, 6.28);
    g.fillStyle = BELLY;
    g.fill();

    // Top-of-back highlight.
    g.beginPath();
    g.ellipse(cx, cy - jh * 0.15, jw * 0.30, jh * 0.06, 0, 0, 6.28);
    g.fillStyle = 'rgba(245,210,155,0.45)';
    g.fill();

    // Neck.
    g.beginPath();
    g.ellipse(cx + jw * 0.32, cy - 6, jw * 0.08, jh * 0.13, 0.3, 0, 6.28);
    g.fillStyle = COAT;
    g.fill();

    // Head — rounder, more cat-like.
    var hx = cx + jw * 0.39;
    var hy = cy - jh * 0.18;
    g.beginPath();
    g.ellipse(hx, hy, jh * 0.18, jh * 0.16, 0, 0, 6.28);
    g.fillStyle = COAT;
    g.fill();
    // Cheek bulge (jaguars have powerful jaws).
    g.beginPath();
    g.arc(hx - 2, hy + 4, jh * 0.11, 0, 6.28);
    g.fillStyle = COAT;
    g.fill();
    // Forehead cap (slightly darker).
    g.beginPath();
    g.ellipse(hx - 1, hy - 3, jh * 0.13, jh * 0.07, 0, 0, 6.28);
    g.fillStyle = COAT_DARK;
    g.fill();
    // Muzzle (lighter pad around nose).
    g.beginPath();
    g.ellipse(hx + 7, hy + 4, 7, 4, 0, 0, 6.28);
    g.fillStyle = BELLY;
    g.fill();
    // Nose.
    g.beginPath();
    g.moveTo(hx + 12, hy + 2);
    g.lineTo(hx + 13, hy + 4.5);
    g.lineTo(hx + 11, hy + 4.5);
    g.closePath();
    g.fillStyle = '#2a160c';
    g.fill();
    // Mouth line.
    g.beginPath();
    g.moveTo(hx + 12, hy + 5);
    g.lineTo(hx + 7, hy + 6.5);
    g.lineWidth = 0.8;
    g.strokeStyle = '#3a1a10';
    g.stroke();
    // Eye — almond shape.
    g.beginPath();
    g.ellipse(hx + 3, hy - 1, 2.2, 1.5, 0, 0, 6.28);
    g.fillStyle = '#f0d860';
    g.fill();
    // Pupil.
    g.beginPath();
    g.arc(hx + 3.5, hy - 1, 0.9, 0, 6.28);
    g.fillStyle = '#0a0805';
    g.fill();
    // Eye shine.
    g.beginPath();
    g.arc(hx + 4.0, hy - 1.6, 0.4, 0, 6.28);
    g.fillStyle = '#ffffe0';
    g.fill();
    // Ears — rounded triangles with dark inner.
    g.beginPath();
    g.moveTo(hx - 5, hy - 8);
    g.quadraticCurveTo(hx - 8, hy - 14, hx - 2, hy - 12);
    g.quadraticCurveTo(hx + 1, hy - 9, hx - 5, hy - 8);
    g.fillStyle = COAT;
    g.fill();
    g.beginPath();
    g.moveTo(hx - 4, hy - 9);
    g.quadraticCurveTo(hx - 5, hy - 12, hx - 2, hy - 11);
    g.fillStyle = '#3a1a10';
    g.fill();
    g.beginPath();
    g.moveTo(hx + 5, hy - 8);
    g.quadraticCurveTo(hx + 8, hy - 14, hx + 11, hy - 9);
    g.quadraticCurveTo(hx + 9, hy - 6, hx + 5, hy - 8);
    g.fillStyle = COAT;
    g.fill();
    g.beginPath();
    g.moveTo(hx + 6, hy - 9);
    g.quadraticCurveTo(hx + 8, hy - 12, hx + 9, hy - 9);
    g.fillStyle = '#3a1a10';
    g.fill();
    // Whiskers.
    g.lineWidth = 0.4;
    g.strokeStyle = 'rgba(245,235,200,0.7)';
    for (var w = 0; w < 3; w++) {
      g.beginPath();
      g.moveTo(hx + 8, hy + 4 + w);
      g.lineTo(hx + 16 + w, hy + 3 + w * 1.5);
      g.stroke();
    }

    // Rosettes — proper jaguar pattern: black ring with a small dark
    // center spot, distributed across body + haunches + neck.
    var rng = (function(s){return function(){s=(s+0x6d2b79f5)>>>0;var t=Math.imul(s^s>>>15,1|s);t=(t+Math.imul(t^t>>>7,61|t))^t;return((t^t>>>14)>>>0)/4294967296;};})(8472);
    var bodyRegions = [
      { cx: cx + 4,            cy: cy - 4, rx: jw * 0.34, ry: jh * 0.18 },  // main body
      { cx: cx - jw * 0.22,    cy: cy - 4, rx: jw * 0.16, ry: jh * 0.20 },  // hindquarters
      { cx: cx + jw * 0.22,    cy: cy - 6, rx: jw * 0.14, ry: jh * 0.18 },  // shoulder
    ];
    for (var ri = 0; ri < 38; ri++) {
      var region = bodyRegions[Math.floor(rng() * bodyRegions.length)];
      var rx = region.cx + (rng() - 0.5) * region.rx * 1.5;
      var ry = region.cy + (rng() - 0.5) * region.ry * 1.4;
      // Reject if below belly line (would draw on belly, looks wrong).
      if (ry > cy + 3) continue;
      var rr = 1.6 + rng() * 1.6;
      // Open ring (3-arc cluster) for an authentic jaguar rosette feel.
      g.lineWidth = 0.9;
      g.strokeStyle = INK;
      // Two crescent arcs to suggest a broken ring.
      g.beginPath();
      g.arc(rx, ry, rr, 0.3, Math.PI - 0.3);
      g.stroke();
      g.beginPath();
      g.arc(rx, ry, rr, Math.PI + 0.3, Math.PI * 2 - 0.3);
      g.stroke();
      // Small center dot.
      if (rng() > 0.3) {
        g.beginPath();
        g.arc(rx + (rng() - 0.5) * 0.6, ry + (rng() - 0.5) * 0.6, rr * 0.3, 0, 6.28);
        g.fillStyle = INK;
        g.fill();
      }
    }
    // A few solid spots on the head + legs zone.
    for (var hi = 0; hi < 6; hi++) {
      g.beginPath();
      g.arc(hx + (rng() - 0.5) * 14, hy + (rng() - 0.3) * 6 - 2, 0.7 + rng() * 0.6, 0, 6.28);
      g.fillStyle = INK;
      g.fill();
    }

    return { canvas: c, w: jw, h: jh };
  })();

  // Jaguar state — position + walk phase + direction. Mid-ground layer.
  var _jag = { x: -200, y: 0, vx: 28, phase: 0, dir: 1 };

  function drawJaguar(ctx, W, H, time, dt) {
    // Initialize y on first draw.
    if (!_jag._init) { _jag._init = true; _jag.y = H * 0.67; _jag.x = -150; }
    _jag.x += _jag.vx * dt * _jag.dir;
    _jag.phase += dt * 6;  // leg cadence
    // Wrap.
    if (_jag.dir > 0 && _jag.x > W + 160) { _jag.x = -160; _jag.y = H * (0.64 + Math.random() * 0.06); }
    if (_jag.dir < 0 && _jag.x < -160) { _jag.x = W + 160; }

    var bob = Math.sin(_jag.phase * 2) * 0.8;  // subtle vertical bob
    ctx.save();
    ctx.translate(Math.round(_jag.x), Math.round(_jag.y + bob));
    if (_jag.dir < 0) ctx.scale(-1, 1);
    // Body sprite.
    ctx.drawImage(_jagSprite.canvas, -_jagSprite.w * 0.5, -_jagSprite.h * 0.5);
    // Legs — 4 simple strokes (front pair + back pair) with phase offsets
    // for a natural diagonal walk gait. Bigger sprite → wider stance.
    var legY = _jagSprite.h * 0.14;
    var legLen = 14;
    var legXs = [-_jagSprite.w * 0.30, -_jagSprite.w * 0.18, _jagSprite.w * 0.10, _jagSprite.w * 0.28];
    // Diagonal gait: front-left + back-right move together, opposite for the
    // other pair (mod 2 phase offset of π).
    var legPhases = [0, Math.PI, Math.PI, 0];
    ctx.lineCap = 'round';
    for (var i = 0; i < 4; i++) {
      var ph = _jag.phase + legPhases[i];
      var swing = Math.sin(ph) * 5;
      var lift = Math.max(0, Math.cos(ph)) * 2; // leg lifts when stepping
      // Upper leg (darker).
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#9c6420';
      ctx.beginPath();
      ctx.moveTo(legXs[i], legY);
      ctx.lineTo(legXs[i] + swing * 0.5, legY + legLen * 0.55 - lift);
      ctx.stroke();
      // Lower leg / paw (slightly thinner).
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#7a4f18';
      ctx.beginPath();
      ctx.moveTo(legXs[i] + swing * 0.5, legY + legLen * 0.55 - lift);
      ctx.lineTo(legXs[i] + swing, legY + legLen - lift);
      ctx.stroke();
      // Paw dot.
      ctx.beginPath();
      ctx.arc(legXs[i] + swing, legY + legLen - lift, 1.6, 0, 6.28);
      ctx.fillStyle = '#2b1a10';
      ctx.fill();
    }
    ctx.restore();
  }

  // ─── Snake (foreground weaving) — continuous body via stroked path ──────
  // Sample 64 points along the snake, build a smooth path, stroke it with a
  // tapering width by drawing the path multiple times at decreasing widths.
  // Y-amplitude is much larger so it weaves between fg trees on screen.
  var _snake = { x: 0, y: 0, phase: 0, vx: 22 };

  function drawSnake(ctx, W, H, time, dt) {
    if (!_snake._init) { _snake._init = true; _snake.x = -80; _snake.y = H * 0.92; }
    _snake.x += _snake.vx * dt;
    _snake.phase += dt * 2.6;
    if (_snake.x > W + 260) _snake.x = -260;

    var SEG = 64;
    var totalLen = 230;     // body length in px
    var pts = [];
    // Build sampled centerline. Head at i=0 (rightmost when moving right).
    for (var i = 0; i < SEG; i++) {
      var t = i / (SEG - 1);
      var sx = _snake.x - t * totalLen;
      // Two stacked sin waves give a more snake-like S-curve.
      var wavePhase = _snake.phase - t * 4.2;
      var amp = 22 * (1 - t * 0.15);          // bigger amplitude at head end
      var sy = _snake.y + Math.sin(wavePhase) * amp + Math.sin(wavePhase * 0.4 + 0.7) * 6;
      pts.push({ x: sx, y: sy, t: t });
    }

    // Helper: stroke a smooth (quadratic) path through the points.
    function strokeSnake(widthFn, fillStyle) {
      // Layered stroke — outer dark, then mid, then highlight — creates the
      // illusion of a thick continuous body without polygon math.
      // We segment the path so per-segment lineWidth is honored.
      for (var s = 0; s < SEG - 1; s++) {
        var p0 = pts[s], p1 = pts[s + 1];
        var w = widthFn(p0.t);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineWidth = w;
        ctx.strokeStyle = fillStyle;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    }

    // Body width taper: head ~12 → tail ~2.
    function bodyW(t) { return 12 * (1 - t * 0.84) + 2; }

    // Outer dark outline — slightly wider.
    strokeSnake(function (t) { return bodyW(t) + 1.5; }, 'rgba(20,32,14,0.85)');
    // Main body fill.
    strokeSnake(bodyW, 'rgba(60,92,38,0.96)');
    // Top-of-coil highlight (offset stroke at smaller width).
    for (var s = 0; s < SEG - 1; s++) {
      var p0 = pts[s], p1 = pts[s + 1];
      var w0 = bodyW(p0.t), wH = w0 * 0.45;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y - w0 * 0.25);
      ctx.lineTo(p1.x, p1.y - bodyW(p1.t) * 0.25);
      ctx.lineWidth = wH;
      ctx.strokeStyle = 'rgba(120,150,72,0.55)';
      ctx.stroke();
    }
    // Subtle dark scale bands every 6 segments.
    for (var s = 0; s < SEG; s += 6) {
      var p = pts[s];
      var w = bodyW(p.t);
      ctx.beginPath();
      ctx.arc(p.x, p.y, w * 0.42, 0, 6.28);
      ctx.fillStyle = 'rgba(20,30,10,0.45)';
      ctx.fill();
    }

    // Head — at pts[0]. Slightly bigger oval, eye + tongue.
    var head = pts[0];
    // Direction to estimate head orientation.
    var hd = Math.atan2(head.y - pts[1].y, head.x - pts[1].x);
    ctx.save();
    ctx.translate(head.x, head.y);
    ctx.rotate(hd);
    // Head dome.
    ctx.beginPath();
    ctx.ellipse(2, 0, 11, 7, 0, 0, 6.28);
    ctx.fillStyle = 'rgba(70,100,42,0.97)';
    ctx.fill();
    // Eye + iris.
    ctx.beginPath();
    ctx.arc(4, -2.5, 1.6, 0, 6.28);
    ctx.fillStyle = '#e8c260';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(4.2, -2.5, 0.7, 0, 6.28);
    ctx.fillStyle = '#111';
    ctx.fill();
    // Tongue flicks.
    if (Math.sin(_snake.phase * 2.4) > 0.55) {
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(20, -1.5);
      ctx.moveTo(12, 0);
      ctx.lineTo(20, 1.5);
      ctx.lineWidth = 0.9;
      ctx.strokeStyle = '#b23030';
      ctx.stroke();
    }
    ctx.restore();
  }

  // ─── River + crocodile (distant) ────────────────────────────────────────
  // River shape: horizontal band with slight sinuous curvature at y ~gY.
  // Baked into hillCache; ripples + croc draw per-frame.
  function drawRiverBase(hctx, W, H, gY) {
    var rivY = gY - H * 0.012;
    var rivH = H * 0.025;
    // Base water gradient.
    var rgrad = hctx.createLinearGradient(0, rivY, 0, rivY + rivH);
    rgrad.addColorStop(0,    'rgba(45,70,88,0.92)');
    rgrad.addColorStop(0.5,  'rgba(60,95,108,0.92)');
    rgrad.addColorStop(1,    'rgba(35,55,70,0.95)');
    hctx.beginPath();
    hctx.moveTo(0, rivY);
    for (var x = 0; x <= W; x += 20) {
      hctx.lineTo(x, rivY + Math.sin(x * 0.012) * 2);
    }
    hctx.lineTo(W, rivY + rivH);
    for (var x = W; x >= 0; x -= 20) {
      hctx.lineTo(x, rivY + rivH + Math.sin(x * 0.011 + 1.3) * 2);
    }
    hctx.closePath();
    hctx.fillStyle = rgrad;
    hctx.fill();
    // Far bank shadow edge.
    hctx.beginPath();
    for (var x = 0; x <= W; x += 20) {
      hctx.lineTo(x, rivY + Math.sin(x * 0.012) * 2);
    }
    hctx.lineWidth = 1.2;
    hctx.strokeStyle = 'rgba(20,28,32,0.55)';
    hctx.stroke();
    // Reflection highlight (thin bright streak).
    hctx.beginPath();
    for (var x = 0; x <= W; x += 15) {
      hctx.lineTo(x, rivY + rivH * 0.3 + Math.sin(x * 0.025) * 1.5);
    }
    hctx.lineWidth = 0.8;
    hctx.strokeStyle = 'rgba(180,200,220,0.35)';
    hctx.stroke();
  }

  // Pre-generated ripple positions so per-frame is just phase math.
  var _ripples = [];
  function ensureRipples(W, H) {
    if (_ripples.length && _ripples[0].W === W) return;
    _ripples.length = 0;
    for (var i = 0; i < 16; i++) {
      _ripples.push({ W: W, x: Math.random() * W, y: 0, phase: Math.random() * 6.28, speed: 0.5 + Math.random() * 1.2 });
    }
  }

  function drawRiverRipples(ctx, W, H, gY, time) {
    ensureRipples(W, H);
    var rivY = gY - H * 0.012;
    var rivH = H * 0.025;
    ctx.save();
    for (var i = 0; i < _ripples.length; i++) {
      var r = _ripples[i];
      var p = (r.phase + time * r.speed) % 6.28;
      var a = Math.max(0, Math.sin(p)) * 0.5;
      var rad = 3 + p * 2;
      ctx.beginPath();
      ctx.ellipse(r.x, rivY + rivH * (0.3 + (i % 5) * 0.12), rad, rad * 0.3, 0, 0, 6.28);
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = 'rgba(200,215,230,' + a.toFixed(3) + ')';
      ctx.stroke();
    }
    ctx.restore();
  }

  // Crocodile — tiny silhouette in the river, jaw opens/closes on a cycle.
  function drawCroc(ctx, W, H, gY, time) {
    var cx = W * 0.35;
    var cy = gY - H * 0.006;
    var size = Math.max(H * 0.028, 22);
    // Jaw cycle: smooth open 0 → 1 → 0 every ~4s.
    var jawRaw = (Math.sin(time * 0.8) + 1) * 0.5;
    var jaw = Math.pow(Math.max(0, jawRaw - 0.35) / 0.65, 0.9);  // closed most of the time, opens fully
    // Body (partially submerged — upper half visible).
    ctx.beginPath();
    ctx.ellipse(cx, cy, size, size * 0.22, 0, Math.PI, 0);
    ctx.fillStyle = 'rgba(45,62,32,0.95)';
    ctx.fill();
    // Scales texture along back.
    for (var s = -4; s <= 4; s++) {
      ctx.beginPath();
      ctx.ellipse(cx + s * size * 0.18, cy - size * 0.18, size * 0.08, size * 0.05, 0, 0, 6.28);
      ctx.fillStyle = 'rgba(25,38,18,0.7)';
      ctx.fill();
    }
    // Snout (extends to the right).
    var sx = cx + size * 0.9, sy = cy;
    ctx.beginPath();
    ctx.moveTo(sx - size * 0.2, sy);
    ctx.lineTo(sx + size * 0.3, sy);
    ctx.lineTo(sx + size * 0.25, sy - size * 0.13);
    ctx.lineTo(sx - size * 0.2, sy - size * 0.13);
    ctx.closePath();
    ctx.fillStyle = 'rgba(45,62,32,0.95)';
    ctx.fill();
    // Upper jaw (opens upward with jaw cycle).
    ctx.save();
    ctx.translate(sx - size * 0.2, sy - size * 0.13);
    ctx.rotate(-jaw * 0.55);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size * 0.5, 0);
    ctx.lineTo(size * 0.45, -size * 0.08);
    ctx.lineTo(0, -size * 0.06);
    ctx.closePath();
    ctx.fillStyle = 'rgba(55,75,38,0.95)';
    ctx.fill();
    // Teeth on upper jaw.
    for (var t = 0; t < 4; t++) {
      ctx.beginPath();
      ctx.moveTo(size * 0.1 + t * size * 0.1, 0);
      ctx.lineTo(size * 0.1 + t * size * 0.1 + 1, size * 0.05);
      ctx.lineTo(size * 0.1 + t * size * 0.1 + 2, 0);
      ctx.closePath();
      ctx.fillStyle = '#eee';
      ctx.fill();
    }
    ctx.restore();
    // Eye — small bump above water on the back.
    ctx.beginPath();
    ctx.arc(cx + size * 0.35, cy - size * 0.25, size * 0.07, 0, 6.28);
    ctx.fillStyle = 'rgba(60,78,40,0.95)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + size * 0.36, cy - size * 0.27, size * 0.03, 0, 6.28);
    ctx.fillStyle = '#d6c030';
    ctx.fill();
  }

  // ─── Extra decorative hanging vines (in front of canopy) ────────────────
  // Pre-generated; animated sway is cheap sin per-segment.
  var _bigVines = [];
  function ensureBigVines(W, H) {
    if (_bigVines.length && _bigVines[0].W === W) return;
    _bigVines.length = 0;
    for (var i = 0; i < 6; i++) {
      _bigVines.push({
        W: W,
        x: (0.05 + i * 0.17 + (Math.random()-0.5)*0.05) * W,
        len: H * (0.22 + Math.random() * 0.18),
        phase: Math.random() * 6.28,
        speed: 0.25 + Math.random() * 0.3,
        amp: 4 + Math.random() * 6,
        leafN: 4 + Math.floor(Math.random() * 5),
      });
    }
  }
  function drawBigVines(ctx, W, H, time) {
    ensureBigVines(W, H);
    for (var i = 0; i < _bigVines.length; i++) {
      var v = _bigVines[i];
      var segs = 18;
      ctx.beginPath();
      for (var s = 0; s <= segs; s++) {
        var t = s / segs;
        var wave = Math.sin(time * v.speed + v.phase + t * 3) * v.amp * t;
        ctx.lineTo(v.x + wave, t * v.len);
      }
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = 'rgba(45,80,40,0.65)';
      ctx.stroke();
      // Leaves at a few points.
      for (var lf = 1; lf <= v.leafN; lf++) {
        var lt = lf / v.leafN;
        var lwave = Math.sin(time * v.speed + v.phase + lt * 3) * v.amp * lt;
        var lx = v.x + lwave;
        var ly = lt * v.len;
        ctx.beginPath();
        ctx.ellipse(lx + 3, ly, 3.5, 1.4, 0.3, 0, 6.28);
        ctx.fillStyle = 'rgba(55,100,45,0.65)';
        ctx.fill();
      }
    }
  }

  function frame(ts) {
    if (!window._isPageVisible) { lastTs = null; requestAnimationFrame(frame); return; }
    // (Removed: the scroll-past-1.5vh frame-skip that blanked the canvas —
    // on Safari/Chrome the paused frame would read as body bg (blue/green)
    // until the user scrolled back to the top. position:fixed keeps the
    // canvas in view at every scroll depth, so it must keep rendering.)
    if (lastTs === null) lastTs = ts;
    var dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;
    time += dt;
    windPhase += dt * 0.15;

    var dpr = 1; // Canvas doesn't need Retina — 1x is sharp enough for background art
    var W = canvas.width / dpr, H = canvas.height / dpr;
    var wind = Math.sin(windPhase) * 0.5 + Math.sin(windPhase * 2.3) * 0.2;

    // ═══ FULL SCENE CACHE: render everything except particles once ═══
    // Rebuild the scene cache every ~300 ms so branch sway actually shows on
    // screen (trees draw inside the cache; if we never refreshed, sway would
    // be frozen in a single frame). ~3 fps of tree redraw is plenty for
    // natural motion without burning the mobile GPU.
    var _sceneStale = !frame._sceneT || (time - frame._sceneT) > 0.3;
    if (!frame._sceneCache || frame._sceneW !== W || frame._sceneH !== H || _sceneStale) {
      frame._sceneT = time;
      var sc = frame._sceneCache || document.createElement('canvas');
      sc.width = W; sc.height = H;
      var sctx = sc.getContext('2d');

    // Sky gradient (cached on resize)
    if (!frame._skyGrad || frame._skyW !== W || frame._skyH !== H) {
      frame._skyGrad = sctx.createLinearGradient(0, 0, 0, H * 0.72);
      frame._skyGrad.addColorStop(0,    'rgb(28,48,68)');
      frame._skyGrad.addColorStop(0.2,  'rgb(38,68,75)');
      frame._skyGrad.addColorStop(0.4,  'rgb(65,100,68)');
      frame._skyGrad.addColorStop(0.6,  'rgb(120,140,60)');
      frame._skyGrad.addColorStop(0.8,  'rgb(175,170,70)');
      frame._skyGrad.addColorStop(1,    'rgb(215,200,85)');
      frame._skyW = W; frame._skyH = H;
    }
    sctx.fillStyle = frame._skyGrad;
    sctx.fillRect(0, 0, W, H);

    // Stars (subtle)
    for (var i = 0; i < Forest.stars.length; i++) {
      var s = Forest.stars[i];
      sctx.beginPath();
      sctx.arc(s.nx*W, s.ny*H, s.sz, 0, 6.28);
      sctx.fillStyle = 'rgba(210,225,255,'+(0.12+Math.sin(time*0.5+s.ph)*0.08).toFixed(3)+')';
      sctx.fill();
    }

    // Multiple horizon glows (cached on resize)
    if (!frame._horizonCache || frame._hcW !== W || frame._hcH !== H) {
      frame._cenGlow = sctx.createRadialGradient(W*0.5, H*0.44, 0, W*0.5, H*0.44, H*0.55);
      frame._cenGlow.addColorStop(0, 'rgba(250,220,85,0.3)');
      frame._cenGlow.addColorStop(0.25, 'rgba(240,210,75,0.15)');
      frame._cenGlow.addColorStop(0.5, 'rgba(220,195,65,0.06)');
      frame._cenGlow.addColorStop(1, 'rgba(180,150,50,0)');
      frame._sideGlows = [];
      for (var gi = 0; gi < 4; gi++) {
        var gx = W * (0.15 + gi * 0.23);
        var sg = sctx.createRadialGradient(gx, H*0.47, 0, gx, H*0.47, H*0.4);
        sg.addColorStop(0, 'rgba(245,215,80,0.18)');
        sg.addColorStop(0.3, 'rgba(225,200,65,0.07)');
        sg.addColorStop(1, 'rgba(180,150,50,0)');
        frame._sideGlows.push(sg);
      }
      frame._hBand = sctx.createLinearGradient(0, H * 0.38, 0, H * 0.58);
      frame._hBand.addColorStop(0, 'rgba(230,210,80,0)');
      frame._hBand.addColorStop(0.4, 'rgba(235,215,85,0.08)');
      frame._hBand.addColorStop(0.6, 'rgba(230,210,80,0.06)');
      frame._hBand.addColorStop(1, 'rgba(220,200,75,0)');
      frame._groundGrd = sctx.createLinearGradient(0, H * 0.58, 0, H);
      frame._groundGrd.addColorStop(0,   'rgb(165,160,65)');
      frame._groundGrd.addColorStop(0.15,'rgb(130,135,50)');
      frame._groundGrd.addColorStop(0.35,'rgb(80,95,42)');
      frame._groundGrd.addColorStop(0.6, 'rgb(50,65,35)');
      frame._groundGrd.addColorStop(1,   'rgb(30,42,25)');
      frame._horizonCache = true; frame._hcW = W; frame._hcH = H;
    }
    sctx.fillStyle = frame._cenGlow;
    sctx.fillRect(0, 0, W, H);
    for (var gi = 0; gi < 4; gi++) {
      sctx.fillStyle = frame._sideGlows[gi];
      sctx.fillRect(0, 0, W, H);
    }
    sctx.fillStyle = frame._hBand;
    sctx.fillRect(0, H * 0.38, W, H * 0.2);

    // Ground
    var gY = H * 0.58;
    sctx.fillStyle = frame._groundGrd;
    sctx.fillRect(0, gY, W, H - gY);

    // Golden ground light patches
    for (var gi = 0; gi < 10; gi++) {
      var gx = W * (0.04 + gi * 0.1);
      var gy = gY + H * 0.01 + Math.sin(gi * 2.3) * H * 0.02;
      var gpulse = 0.14 + Math.sin(time * 0.25 + gi * 1.8) * 0.05;
      var gRadius = H * (0.05 + Math.sin(gi * 1.1) * 0.02);
      sctx.beginPath();
      sctx.arc(gx, gy, gRadius * 0.5, 0, 6.28);
      sctx.fillStyle = 'rgba(220,210,95,' + (gpulse * 0.7).toFixed(3) + ')';
      sctx.fill();
      sctx.beginPath();
      sctx.arc(gx, gy, gRadius, 0, 6.28);
      sctx.fillStyle = 'rgba(210,200,85,' + (gpulse * 0.2).toFixed(3) + ')';
      sctx.fill();
    }

    // Ground texture (static parts cached to offscreen canvas)
    var gRng = Forest.mkRng(999);
    var gBottom = H;
    var gDepth = gBottom - gY;
    var earthR = 95, earthG = 78, earthB = 45;

    if (!frame._groundCache || frame._gcW !== W || frame._gcH !== H || frame._gcGY !== Math.round(gY)) {
      var gc = document.createElement('canvas');
      gc.width = W; gc.height = H;
      var gctx = gc.getContext('2d');
      frame._groundCache = gc;
      frame._gcW = W; frame._gcH = H; frame._gcGY = Math.round(gY);
      var _gRng = Forest.mkRng(999);

      // Base ground color variation — doubled count for richer mottling.
      for (var ep = 0; ep < 50; ep++) {
        var epx = _gRng() * W;
        var epy = gY + _gRng() * gDepth;
        var epsz = H * (0.025 + _gRng() * 0.07);
        var ejr = earthR + (_gRng() - 0.5) * 30;
        var ejg = earthG + (_gRng() - 0.5) * 24;
        var ejb = earthB + (_gRng() - 0.5) * 20;
        gctx.beginPath();
        gctx.ellipse(epx, epy, epsz, epsz * (0.35 + _gRng() * 0.35), _gRng() * 3.14, 0, 6.28);
        gctx.fillStyle = 'rgba(' + Math.round(ejr) + ',' + Math.round(ejg) + ',' + Math.round(ejb) + ',' + (0.12 + _gRng() * 0.15).toFixed(3) + ')';
        gctx.fill();
      }

      // Darker shadow blotches — break up uniformity.
      for (var sbi = 0; sbi < 18; sbi++) {
        var sbx = _gRng() * W;
        var sby = gY + _gRng() * gDepth;
        var sbsz = H * (0.02 + _gRng() * 0.05);
        gctx.beginPath();
        gctx.ellipse(sbx, sby, sbsz, sbsz * 0.5, _gRng() * 3.14, 0, 6.28);
        gctx.fillStyle = 'rgba(35,28,18,' + (0.18 + _gRng() * 0.15).toFixed(3) + ')';
        gctx.fill();
      }

      // Cow paths
      for (var cp = 0; cp < 5; cp++) {
        var cpx0 = _gRng() * W;
        var cpy0 = gY + gDepth * (0.2 + _gRng() * 0.6);
        gctx.beginPath();
        gctx.moveTo(cpx0, cpy0);
        for (var cps = 0; cps < 4; cps++) {
          cpx0 += (_gRng() - 0.3) * W * 0.15;
          cpy0 += (_gRng() - 0.5) * gDepth * 0.1;
          gctx.lineTo(cpx0, cpy0);
        }
        gctx.lineWidth = 3 + _gRng() * 5;
        gctx.strokeStyle = 'rgba(100,82,48,' + (0.6 + _gRng() * 0.2).toFixed(3) + ')';
        gctx.stroke();
        gctx.lineWidth = 1 + _gRng() * 2;
        gctx.strokeStyle = 'rgba(85,70,40,' + (0.3 + _gRng() * 0.15).toFixed(3) + ')';
        gctx.stroke();
      }

      // Dirt patches
      for (var dp = 0; dp < 20; dp++) {
        var dpx = _gRng() * W;
        var dpy = gY + _gRng() * gDepth;
        var dps = 3 + _gRng() * 8;
        gctx.beginPath();
        gctx.arc(dpx, dpy, dps, 0, 6.28);
        gctx.fillStyle = 'rgba(90,72,42,' + (0.2 + _gRng() * 0.15).toFixed(3) + ')';
        gctx.fill();
      }

      // Sticks/twigs — bumped count + length variance for denser debris.
      for (var si = 0; si < 75; si++) {
        var sx = _gRng() * W;
        var sy = gY + _gRng() * gDepth;
        var sl = 8 + _gRng() * 18;
        var sa = _gRng() * 3.14;
        gctx.beginPath();
        gctx.moveTo(sx, sy);
        gctx.lineTo(sx + Math.cos(sa) * sl, sy + Math.sin(sa) * sl);
        gctx.lineWidth = 0.5 + _gRng() * 1.5;
        gctx.strokeStyle = 'rgba(90,70,40,' + (0.3 + _gRng() * 0.25).toFixed(3) + ')';
        gctx.stroke();
        if (_gRng() < 0.4) {
          var bfrac = 0.3 + _gRng() * 0.4;
          var bx = sx + Math.cos(sa) * sl * bfrac;
          var by = sy + Math.sin(sa) * sl * bfrac;
          var ba = sa + (_gRng() < 0.5 ? 0.5 : -0.5) + (_gRng() - 0.5) * 0.3;
          var blen = sl * (0.3 + _gRng() * 0.3);
          gctx.beginPath();
          gctx.moveTo(bx, by);
          gctx.lineTo(bx + Math.cos(ba) * blen, by + Math.sin(ba) * blen);
          gctx.stroke();
        }
      }

      // Rocks/pebbles — larger count + occasional lichen dab on top.
      for (var ri = 0; ri < 55; ri++) {
        var rx = _gRng() * W;
        var ry = gY + _gRng() * gDepth;
        var rsz = 2 + _gRng() * 5;
        var rg = 80 + Math.floor(_gRng() * 60);
        gctx.beginPath();
        gctx.ellipse(rx, ry, rsz, rsz * (0.5 + _gRng() * 0.3), _gRng() * 3.14, 0, 6.28);
        gctx.fillStyle = 'rgba(' + rg + ',' + (rg - 5) + ',' + (rg - 15) + ',' + (0.4 + _gRng() * 0.25).toFixed(3) + ')';
        gctx.fill();
        // Highlight on upper-left — gives rocks a lit face.
        gctx.beginPath();
        gctx.arc(rx - rsz * 0.3, ry - rsz * 0.2, rsz * 0.4, 0, 6.28);
        gctx.fillStyle = 'rgba(' + (rg + 35) + ',' + (rg + 28) + ',' + (rg + 18) + ',0.35)';
        gctx.fill();
        // ~25% chance of lichen dab.
        if (_gRng() < 0.25) {
          var lc = _gRng() < 0.5 ? 'rgba(130,150,80,0.55)' : 'rgba(175,165,100,0.5)';
          gctx.beginPath();
          gctx.ellipse(rx + (_gRng()-0.5)*rsz, ry + (_gRng()-0.5)*rsz*0.6, rsz * 0.4, rsz * 0.25, _gRng()*3.14, 0, 6.28);
          gctx.fillStyle = lc;
          gctx.fill();
        }
      }

      // Moss patches — more varied sizes + occasional brighter moss highlights.
      for (var msi = 0; msi < 32; msi++) {
        var msx = _gRng() * W;
        var msy = gY + _gRng() * gDepth;
        var msz = 3 + _gRng() * 14;
        gctx.beginPath();
        gctx.ellipse(msx, msy, msz, msz * (0.3 + _gRng() * 0.2), _gRng() * 3.14, 0, 6.28);
        gctx.fillStyle = 'rgba(' + (35 + Math.round(_gRng()*25)) + ',' + (80 + Math.round(_gRng()*30)) + ',' + (25 + Math.round(_gRng()*20)) + ',' + (0.2 + _gRng() * 0.18).toFixed(3) + ')';
        gctx.fill();
        // A few brighter flecks on top of the moss patch.
        if (msz > 7) {
          for (var mf = 0; mf < 3; mf++) {
            gctx.beginPath();
            gctx.arc(msx + (_gRng()-0.5)*msz*1.5, msy + (_gRng()-0.5)*msz*0.6, 1 + _gRng()*1.5, 0, 6.28);
            gctx.fillStyle = 'rgba(80,130,55,0.4)';
            gctx.fill();
          }
        }
      }

      // Leaf litter — scattered small colored ellipses in fall tones.
      var LITTER_COLS = [
        [155, 80, 30],  [180, 110, 45], [120, 60, 25],
        [95, 55, 28],   [165, 130, 55], [140, 100, 45],
        [75, 90, 40],   [105, 75, 30]
      ];
      for (var lli = 0; lli < 90; lli++) {
        var llx = _gRng() * W;
        var lly = gY + _gRng() * gDepth;
        var llsz = 2 + _gRng() * 4;
        var llc = LITTER_COLS[Math.floor(_gRng() * LITTER_COLS.length)];
        gctx.save();
        gctx.translate(llx, lly);
        gctx.rotate(_gRng() * 3.14);
        gctx.beginPath();
        gctx.ellipse(0, 0, llsz, llsz * 0.45, 0, 0, 6.28);
        gctx.fillStyle = 'rgba(' + llc[0] + ',' + llc[1] + ',' + llc[2] + ',' + (0.55 + _gRng() * 0.25).toFixed(3) + ')';
        gctx.fill();
        gctx.restore();
      }

      // Pine needles — tiny thin lines in brown-green, clustered in drifts.
      for (var pni = 0; pni < 12; pni++) {
        var pnCX = _gRng() * W;
        var pnCY = gY + _gRng() * gDepth;
        var pnCount = 8 + Math.floor(_gRng() * 10);
        for (var pn = 0; pn < pnCount; pn++) {
          var pnx = pnCX + (_gRng() - 0.5) * 40;
          var pny = pnCY + (_gRng() - 0.5) * 18;
          var pnLen = 4 + _gRng() * 8;
          var pnAng = _gRng() * 3.14;
          gctx.beginPath();
          gctx.moveTo(pnx, pny);
          gctx.lineTo(pnx + Math.cos(pnAng) * pnLen, pny + Math.sin(pnAng) * pnLen * 0.2);
          gctx.lineWidth = 0.5;
          gctx.strokeStyle = 'rgba(' + (75 + Math.round(_gRng()*20)) + ',' + (55 + Math.round(_gRng()*15)) + ',' + (30 + Math.round(_gRng()*10)) + ',0.55)';
          gctx.stroke();
        }
      }

      // Bark chips — small dark flakes scattered with clusters near tree lines.
      for (var bki = 0; bki < 40; bki++) {
        var bkx = _gRng() * W;
        var bky = gY + _gRng() * gDepth;
        var bksz = 1.5 + _gRng() * 3;
        gctx.save();
        gctx.translate(bkx, bky);
        gctx.rotate(_gRng() * 3.14);
        gctx.beginPath();
        gctx.rect(-bksz * 0.5, -bksz * 0.25, bksz, bksz * 0.5);
        gctx.fillStyle = 'rgba(' + (55 + Math.round(_gRng()*25)) + ',' + (38 + Math.round(_gRng()*15)) + ',' + (22 + Math.round(_gRng()*10)) + ',0.6)';
        gctx.fill();
        gctx.restore();
      }

      // Exposed roots crossing the ground — sinuous brown lines.
      for (var rti = 0; rti < 10; rti++) {
        var rtSX = _gRng() * W;
        var rtSY = gY + gDepth * (0.1 + _gRng() * 0.75);
        var rtLen = 40 + _gRng() * 90;
        var rtAng = (_gRng() - 0.5) * 1.2;
        gctx.beginPath();
        gctx.moveTo(rtSX, rtSY);
        var rtSteps = 6;
        for (var rts = 1; rts <= rtSteps; rts++) {
          var rtT = rts / rtSteps;
          var rtX = rtSX + Math.cos(rtAng) * rtLen * rtT + Math.sin(rtT * 6) * 6;
          var rtY = rtSY + Math.sin(rtAng) * rtLen * rtT * 0.3 + Math.cos(rtT * 4) * 3;
          gctx.lineTo(rtX, rtY);
        }
        gctx.lineWidth = 2.5 + _gRng() * 2;
        gctx.strokeStyle = 'rgba(' + (65 + Math.round(_gRng()*20)) + ',' + (42 + Math.round(_gRng()*12)) + ',' + (22 + Math.round(_gRng()*8)) + ',0.55)';
        gctx.stroke();
        // Highlight on top.
        gctx.lineWidth = 0.8;
        gctx.strokeStyle = 'rgba(155,125,85,0.35)';
        gctx.stroke();
      }

      // Acorns / seeds — tiny dark ovals with cap dot.
      for (var aci = 0; aci < 18; aci++) {
        var acx = _gRng() * W;
        var acy = gY + _gRng() * gDepth;
        var acsz = 1.2 + _gRng() * 1.2;
        gctx.beginPath();
        gctx.ellipse(acx, acy, acsz, acsz * 1.3, 0, 0, 6.28);
        gctx.fillStyle = 'rgba(88,58,28,0.75)';
        gctx.fill();
        gctx.beginPath();
        gctx.arc(acx, acy - acsz * 1.1, acsz * 0.6, 0, 6.28);
        gctx.fillStyle = 'rgba(55,35,18,0.85)';
        gctx.fill();
      }

      // Flowers
      for (var fi = 0; fi < 15; fi++) {
        var flx = _gRng() * W;
        var fly = gY + _gRng() * gDepth * 0.7;
        var flSz = 2.5 + _gRng() * 3.5;
        gctx.beginPath();
        gctx.moveTo(flx, fly);
        gctx.lineTo(flx + (_gRng() - 0.5) * 4, fly - flSz * 4);
        gctx.lineWidth = 0.8;
        gctx.strokeStyle = 'rgba(55,95,35,0.5)';
        gctx.stroke();
        var petalC = _gRng() < 0.3 ? [220,200,120] : (_gRng() < 0.5 ? [200,175,215] : [215,175,155]);
        var fpy = fly - flSz * 4;
        for (var fp = 0; fp < 5; fp++) {
          var pa = fp * 1.256;
          gctx.beginPath();
          gctx.arc(flx + Math.cos(pa) * flSz * 0.6, fpy + Math.sin(pa) * flSz * 0.6, flSz * 0.5, 0, 6.28);
          gctx.fillStyle = 'rgba(' + petalC[0] + ',' + petalC[1] + ',' + petalC[2] + ',' + (0.35 + _gRng() * 0.2).toFixed(3) + ')';
          gctx.fill();
        }
        gctx.beginPath();
        gctx.arc(flx, fpy, flSz * 0.35, 0, 6.28);
        gctx.fillStyle = 'rgba(235,225,100,0.45)';
        gctx.fill();
      }
    }
    // Draw cached static ground
    sctx.drawImage(frame._groundCache, 0, 0);

    // gRng skip loop eliminated -- ground is cached to offscreen canvas

    // Animated grass tufts
    for (var gti = 0; gti < 70; gti++) {
      var gtx = gRng() * W;
      var gty = gY + gRng() * gDepth;
      var gtH = 8 + gRng() * 20;
      var gtBl = 4 + Math.floor(gRng() * 5);
      var gtSw = Math.sin(time * 0.6 + gti * 1.3) * 1.0;
      var gtC = Forest.FERN_COLORS[Math.floor(gRng() * Forest.FERN_COLORS.length)];
      for (var gb = 0; gb < gtBl; gb++) {
        var gbx = gtx + (gb - gtBl / 2) * 2.5;
        var gba = (gb - gtBl / 2) * 0.14 + gtSw * 0.06;
        sctx.beginPath();
        sctx.moveTo(gbx, gty);
        sctx.quadraticCurveTo(gbx + gba * 4, gty - gtH * 0.6, gbx + Math.sin(gba) * gtH * 0.45, gty - gtH);
        sctx.lineWidth = 1.2;
        sctx.strokeStyle = Forest.rgb(gtC, 0.55 + gRng() * 0.2);
        sctx.stroke();
      }
    }

    // Distant hills / rolling terrain silhouettes (cached on resize)
    if (!frame._hillCache || frame._hillW !== W || frame._hillH !== H) {
      var hc = document.createElement('canvas');
      hc.width = W; hc.height = H;
      var hctx = hc.getContext('2d');
      var hillRng = Forest.mkRng(7777);
      // Layer 1: furthest hills
      hctx.beginPath();
      hctx.moveTo(0, gY + 2);
      for (var hx = 0; hx <= W; hx += 8) {
        var hy = gY - H * 0.04 - Math.sin(hx * 0.003 + 1.2) * H * 0.025 - Math.sin(hx * 0.008 + 0.5) * H * 0.012;
        hctx.lineTo(hx, hy);
      }
      hctx.lineTo(W, gY + 2);
      hctx.closePath();
      hctx.fillStyle = 'rgba(65,85,50,0.35)';
      hctx.fill();
      // Layer 2: mid-far hills
      hctx.beginPath();
      hctx.moveTo(0, gY + 2);
      for (var hx = 0; hx <= W; hx += 6) {
        var hy = gY - H * 0.015 - Math.sin(hx * 0.005 + 3.8) * H * 0.018 - Math.sin(hx * 0.012 + 1.1) * H * 0.008;
        hctx.lineTo(hx, hy);
      }
      hctx.lineTo(W, gY + 2);
      hctx.closePath();
      hctx.fillStyle = 'rgba(80,100,55,0.3)';
      hctx.fill();
      // Third hill layer — even farther back, hazier.
      hctx.beginPath();
      hctx.moveTo(0, gY + 2);
      for (var hx = 0; hx <= W; hx += 10) {
        var hy = gY - H * 0.07 - Math.sin(hx * 0.002 + 2.1) * H * 0.03 - Math.sin(hx * 0.006 + 1.7) * H * 0.015;
        hctx.lineTo(hx, hy);
      }
      hctx.lineTo(W, gY + 2);
      hctx.closePath();
      hctx.fillStyle = 'rgba(55,75,50,0.28)';
      hctx.fill();

      // Distant tree line silhouette — denser crowd.
      for (var dti = 0; dti < 200; dti++) {
        var dtx = hillRng() * W;
        var dty = gY - H * 0.01 - hillRng() * H * 0.045;
        var dth = H * (0.012 + hillRng() * 0.035);
        var dtw = H * (0.003 + hillRng() * 0.007);
        hctx.fillStyle = 'rgba(50,40,30,' + (0.12 + hillRng() * 0.18).toFixed(3) + ')';
        hctx.fillRect(dtx - dtw * 0.3, dty, dtw * 0.6, dth);
        var dcr = dtw * (1.5 + hillRng() * 2.2);
        hctx.beginPath();
        hctx.arc(dtx, dty - dcr * 0.3, dcr, 0, 6.28);
        var dtcol = Forest.CANOPY[Math.floor(hillRng() * Forest.CANOPY.length)];
        hctx.fillStyle = Forest.rgb(Forest.mix(dtcol, [50, 70, 40], 0.5), 0.22 + hillRng() * 0.18);
        hctx.fill();
      }

      // Tiny background "saplings" — thin strokes of bright foliage spots.
      for (var sdi = 0; sdi < 80; sdi++) {
        var sdx = hillRng() * W;
        var sdy = gY + hillRng() * H * 0.025;
        var sdh = H * (0.01 + hillRng() * 0.02);
        hctx.beginPath();
        hctx.moveTo(sdx, sdy);
        hctx.lineTo(sdx + (hillRng()-0.5)*2, sdy - sdh);
        hctx.lineWidth = 0.6;
        hctx.strokeStyle = 'rgba(58,74,40,0.45)';
        hctx.stroke();
        var sdcol = Forest.CANOPY[Math.floor(hillRng() * Forest.CANOPY.length)];
        hctx.beginPath();
        hctx.arc(sdx, sdy - sdh, sdh * 0.55, 0, 6.28);
        hctx.fillStyle = Forest.rgb(Forest.mix(sdcol, [80, 105, 55], 0.35), 0.45);
        hctx.fill();
      }

      // Scattered distant bushes — more variety.
      for (var dbi = 0; dbi < 70; dbi++) {
        var dbx = hillRng() * W;
        var dby = gY + hillRng() * H * 0.035;
        var dbr = H * (0.004 + hillRng() * 0.013);
        hctx.beginPath();
        hctx.ellipse(dbx, dby, dbr * 1.8, dbr, 0, 0, 6.28);
        var dbcol = Forest.CANOPY[Math.floor(hillRng() * Forest.CANOPY.length)];
        hctx.fillStyle = Forest.rgb(Forest.mix(dbcol, [60, 80, 45], 0.4), 0.2 + hillRng() * 0.18);
        hctx.fill();
      }
      // River — baked into the hill cache so the water surface is free per frame.
      drawRiverBase(hctx, W, H, gY);
      frame._hillCache = hc;
      frame._hillW = W; frame._hillH = H;
    }
    sctx.drawImage(frame._hillCache, 0, 0);
    // (ripples + croc + jaguar + snake + big vines draw on the MAIN ctx
    // after the scene cache blits — they're animated, so they can't live
    // inside the cache.)

    // Camera pan removed (was shifting the scene 15% rightward which read as
    // "zoomed in on the right" — trees got clipped at the right edge). save()
    // kept as a paired no-op so the matching restore() later is harmless.
    sctx.save();

    // FAR undergrowth + trees — drawn directly into the scene cache.
    // (Was: dedicated _farCache offscreen canvas then blitted. Dead level
    // of indirection — this block only executes when the scene cache is
    // being rebuilt, same cadence, so the intermediate canvas was never
    // re-used.)
    Forest.drawUndergrowth(sctx, W, H, time, 'far');
    var _farPos = [];
    for (var i = 0; i < Forest.farTrees.length; i++) {
      var t = Forest.farTrees[i];
      var tx = ((t.nx * 1.5 - 0.25) * W + W * 3) % (W * 1.5) - W * 0.25;
      if (tx < W * 0.33 && (i % 3 === 0)) { _farPos.push(null); continue; }
      _farPos.push(tx);
      Forest.drawTrunk(sctx, t, tx, W, H, time);
    }
    for (var i = 0; i < Forest.farTrees.length; i++) {
      if (_farPos[i] === null) continue;
      Forest.drawCanopy(sctx, Forest.farTrees[i], _farPos[i], W, H, time, 0.88);
    }

    // Atmospheric haze (cached on resize)
    if (!frame._hazeG || frame._hazeW !== W || frame._hazeH !== H) {
      frame._hazeG = sctx.createLinearGradient(0, H * 0.15, 0, H * 0.7);
      // Lighter haze so back layers stay more visible.
      frame._hazeG.addColorStop(0, 'rgba(90,110,60,0.03)');
      frame._hazeG.addColorStop(0.3, 'rgba(140,140,60,0.045)');
      frame._hazeG.addColorStop(0.5, 'rgba(170,160,65,0.04)');
      frame._hazeG.addColorStop(0.7, 'rgba(130,130,55,0.03)');
      frame._hazeG.addColorStop(1, 'rgba(90,100,50,0.015)');
      frame._hazeW = W; frame._hazeH = H;
    }
    sctx.fillStyle = frame._hazeG;
    sctx.fillRect(0, 0, W, H);

    // Golden glow spots between far and mid layers
    for (var gli = 0; gli < 5; gli++) {
      var glx = W * (0.1 + gli * 0.2);
      var gly = H * (0.4 + Math.sin(time * 0.1 + gli * 1.5) * 0.03);
      var glr = H * 0.12;
      var glAlpha = 0.06 + Math.sin(time * 0.2 + gli * 2) * 0.02;
      sctx.beginPath();
      sctx.arc(glx, gly, glr * 0.5, 0, 6.28);
      sctx.fillStyle = 'rgba(220,200,80,' + (glAlpha * 0.7).toFixed(3) + ')';
      sctx.fill();
      sctx.beginPath();
      sctx.arc(glx, gly, glr, 0, 6.28);
      sctx.fillStyle = 'rgba(200,185,70,' + (glAlpha * 0.2).toFixed(3) + ')';
      sctx.fill();
    }

    // MID undergrowth + trees — drawn directly into the scene cache.
    Forest.drawUndergrowth(sctx, W, H, time, 'mid');
    var _midPos = [];
    for (var i = 0; i < Forest.midTrees.length; i++) {
      var t = Forest.midTrees[i];
      var tx = ((t.nx * 1.4 - 0.2) * W + W * 3) % (W * 1.4) - W * 0.2;
      if (tx < W * 0.33 && (i % 3 === 0)) { _midPos.push(null); continue; }
      _midPos.push(tx);
      Forest.drawTrunk(sctx, t, tx, W, H, time);
    }
    for (var i = 0; i < Forest.midTrees.length; i++) {
      if (_midPos[i] === null) continue;
      Forest.drawCanopy(sctx, Forest.midTrees[i], _midPos[i], W, H, time, 0.82);
    }

    // Golden atmosphere between mid and fg (cached on resize)
    if (!frame._midGlow || frame._mgW !== W || frame._mgH !== H) {
      frame._midGlow = sctx.createLinearGradient(0, H * 0.35, 0, H * 0.65);
      frame._midGlow.addColorStop(0, 'rgba(180,170,60,0)');
      frame._midGlow.addColorStop(0.3, 'rgba(200,185,65,0.04)');
      frame._midGlow.addColorStop(0.5, 'rgba(210,195,70,0.06)');
      frame._midGlow.addColorStop(0.7, 'rgba(200,185,65,0.03)');
      frame._midGlow.addColorStop(1, 'rgba(180,170,60,0)');
      frame._mgW = W; frame._mgH = H;
    }
    sctx.save();
    sctx.globalCompositeOperation = 'screen';
    sctx.fillStyle = frame._midGlow;
    sctx.fillRect(0, H * 0.35, W, H * 0.3);
    sctx.restore();

    // Mist puffs
    for (var mi = 0; mi < Forest.mistPuffs.length; mi++) {
      var mp = Forest.mistPuffs[mi];
      var mx = ((mp.nx + time * mp.speed) % 1.8 - 0.2) * W;
      var my = mp.ny * H + Math.sin(time * 0.2 + mp.phase) * 10;
      var mr = mp.r * H * 1.2;
      var mAlpha = mp.alpha * (0.75 + Math.sin(time * 0.12 + mp.phase) * 0.25);
      sctx.beginPath();
      sctx.arc(mx, my, mr * 0.4, 0, 6.28);
      sctx.fillStyle = 'rgba(185,180,85,' + (mAlpha * 0.7).toFixed(3) + ')';
      sctx.fill();
      sctx.beginPath();
      sctx.arc(mx, my, mr * 0.7, 0, 6.28);
      sctx.fillStyle = 'rgba(170,165,75,' + (mAlpha * 0.25).toFixed(3) + ')';
      sctx.fill();
      sctx.beginPath();
      sctx.arc(mx, my, mr, 0, 6.28);
      sctx.fillStyle = 'rgba(155,150,65,' + (mAlpha * 0.08).toFixed(3) + ')';
      sctx.fill();
    }

    // Ground fog band (cached on resize)
    if (!frame._fogG || frame._fogW !== W || frame._fogH !== H) {
      frame._fogG = sctx.createLinearGradient(0, gY - 50, 0, gY + 70);
      frame._fogG.addColorStop(0, 'rgba(175,170,72,0)');
      frame._fogG.addColorStop(0.2, 'rgba(180,175,75,0.06)');
      frame._fogG.addColorStop(0.4, 'rgba(185,180,78,0.14)');
      frame._fogG.addColorStop(0.6, 'rgba(170,168,70,0.1)');
      frame._fogG.addColorStop(0.8, 'rgba(160,158,65,0.05)');
      frame._fogG.addColorStop(1, 'rgba(150,148,60,0)');
      frame._fogW = W; frame._fogH = H;
    }
    sctx.fillStyle = frame._fogG;
    sctx.fillRect(0, gY - 50, W, 120);

    // Moving fog wisps
    for (var fi = 0; fi < 6; fi++) {
      var fx = ((fi * 0.18 + time * 0.008 * (1 + fi * 0.3)) % 1.4 - 0.2) * W;
      var fy = gY + H * 0.01;
      var fr = H * (0.04 + fi * 0.01);
      sctx.beginPath();
      sctx.arc(fx, fy, fr, 0, 6.28);
      sctx.fillStyle = 'rgba(185,180,80,0.04)';
      sctx.fill();
    }

    // FG layer: undergrowth + depth-sorted scene + trees. Drawn directly
    // into the scene cache (used to go through a dead _fgCache offscreen).

    // FG undergrowth
    Forest.drawUndergrowth(sctx, W, H, time, 'fg');

    // Depth-sorted FG scene: trees + undergrowth
    if (!frame._fgUG || frame._fgUGW !== W || frame._fgUGH !== H) {
      frame._fgUG = [];
      var fgU = Forest.mkRng(8888);
      var ugZoneTop = H * 0.85;
      var ugRange = H - ugZoneTop;

      // Bushes
      for (var ubi = 0; ubi < 8; ubi++) {
        var uby = ugZoneTop + fgU() * ugRange;
        var depthT = (uby - ugZoneTop) / ugRange;
        frame._fgUG.push({ type: 'bush', x: fgU() * W, y: uby, depth: depthT,
          sz: H * (0.012 + depthT * 0.03 + fgU() * 0.015),
          col: Forest.CANOPY[Math.floor(fgU() * Forest.CANOPY.length)], seed: fgU() * 9999 });
      }
      // Grass tufts
      for (var ugi = 0; ugi < 74; ugi++) {
        var ugy = ugZoneTop + fgU() * ugRange;
        var depthT = (ugy - ugZoneTop) / ugRange;
        frame._fgUG.push({ type: 'grass', x: fgU() * W, y: ugy, depth: depthT,
          h: (6 + depthT * 18 + fgU() * 8), blades: 3 + Math.floor(fgU() * 4 + depthT * 2),
          col: Forest.FERN_COLORS[Math.floor(fgU() * Forest.FERN_COLORS.length)], idx: ugi });
      }
      // Sticks
      for (var usi = 0; usi < 25; usi++) {
        var usy = ugZoneTop + fgU() * ugRange;
        var depthT = (usy - ugZoneTop) / ugRange;
        frame._fgUG.push({ type: 'stick', x: fgU() * W, y: usy, depth: depthT,
          len: (8 + depthT * 25 + fgU() * 12), angle: fgU() * 3.14,
          lw: 0.8 + depthT * 2 + fgU() * 1, fork: fgU() < 0.4, fAngle: (fgU() - 0.5) * 1.5 });
      }
      // Fallen leaves
      for (var uli = 0; uli < 35; uli++) {
        var uly = ugZoneTop + fgU() * ugRange;
        var depthT = (uly - ugZoneTop) / ugRange;
        frame._fgUG.push({ type: 'leaf', x: fgU() * W, y: uly, depth: depthT,
          sz: (2 + depthT * 6 + fgU() * 4), rot: fgU() * 6.28,
          col: Forest.LEAF_COLORS[Math.floor(fgU() * Forest.LEAF_COLORS.length)] });
      }
      // Rocks
      for (var uri = 0; uri < 15; uri++) {
        var ury = ugZoneTop + fgU() * ugRange;
        var depthT = (ury - ugZoneTop) / ugRange;
        frame._fgUG.push({ type: 'rock', x: fgU() * W, y: ury, depth: depthT,
          sz: (2 + depthT * 7 + fgU() * 4), aspect: 0.45 + fgU() * 0.3, rot: fgU() * 0.8 });
      }
      // Flowers
      for (var ufi = 0; ufi < 10; ufi++) {
        var ufy = ugZoneTop + fgU() * ugRange * 0.8;
        var depthT = (ufy - ugZoneTop) / ugRange;
        var pC = fgU() < 0.3 ? [225,205,125] : (fgU() < 0.5 ? [205,180,218] : [218,178,158]);
        frame._fgUG.push({ type: 'flower', x: fgU() * W, y: ufy, depth: depthT,
          sz: (2 + depthT * 3 + fgU() * 2), petalCol: pC });
      }
      frame._fgUG.sort(function(a, b) { return a.y - b.y; });
      frame._fgUGW = W; frame._fgUGH = H;
    }

    // Collect FG tree positions
    var _fgTreeItems = [];
    for (var i = 0; i < Forest.fgTrees.length; i++) {
      var t = Forest.fgTrees[i];
      var tx = ((t.nx * 1.6 - 0.3) * W + W * 3) % (W * 1.6) - W * 0.3;
      if (tx < W * 0.33 && (i % 3 === 0)) continue;
      _fgTreeItems.push({ tree: t, tx: tx, y: gY + t.nx * H * 0.03 });
    }
    _fgTreeItems.sort(function(a, b) { return a.y - b.y; });

    var fgUG = frame._fgUG;

    // Draw undergrowth in depth order
    for (var fi = 0; fi < fgUG.length; fi++) {
      var item = fgUG[fi];

      if (item.type === 'bush') {
        var bR2 = Forest.mkRng(Math.floor(item.seed));
        var bDark = Forest.mix(item.col, [18, 30, 15], 0.45);
        for (var bc = 0; bc < 3 + Math.floor(bR2() * 4); bc++) {
          var bcx = item.x + (bR2() - 0.5) * item.sz * 2.8;
          var bcy = item.y + (bR2() - 0.5) * item.sz * 0.6 - item.sz * 0.4;
          var bcr = item.sz * (0.45 + bR2() * 0.55);
          sctx.beginPath();
          sctx.arc(bcx, bcy, bcr, 0, 6.28);
          sctx.fillStyle = Forest.rgb(Forest.mix(bDark, item.col, bR2() * 0.5), 0.55 + item.depth * 0.25);
          sctx.fill();
        }

      } else if (item.type === 'grass') {
        var gSw = Math.sin(time * 0.55 + item.idx * 1.2) * 1.2;
        for (var gb = 0; gb < item.blades; gb++) {
          var gbx = item.x + (gb - item.blades / 2) * (2 + item.depth * 1.5);
          var gba = (gb - item.blades / 2) * 0.15 + gSw * 0.07;
          sctx.beginPath();
          sctx.moveTo(gbx, item.y);
          sctx.quadraticCurveTo(gbx + gba * 4, item.y - item.h * 0.6, gbx + Math.sin(gba) * item.h * 0.5, item.y - item.h);
          sctx.lineWidth = 0.8 + item.depth * 0.8;
          sctx.strokeStyle = Forest.rgb(item.col, 0.5 + item.depth * 0.25);
          sctx.stroke();
        }

      } else if (item.type === 'stick') {
        var stEx = item.x + Math.cos(item.angle) * item.len;
        var stEy = item.y + Math.sin(item.angle) * item.len * 0.2;
        sctx.beginPath();
        sctx.moveTo(item.x, item.y);
        sctx.lineTo(stEx, stEy);
        sctx.lineWidth = item.lw;
        sctx.strokeStyle = 'rgba(75,58,32,' + (0.3 + item.depth * 0.3).toFixed(3) + ')';
        sctx.stroke();
        if (item.fork) {
          var fkx = item.x + (stEx - item.x) * 0.55;
          var fky = item.y + (stEy - item.y) * 0.55;
          sctx.beginPath();
          sctx.moveTo(fkx, fky);
          sctx.lineTo(fkx + Math.cos(item.fAngle + item.angle) * item.len * 0.4, fky + Math.sin(item.fAngle + item.angle) * item.len * 0.1);
          sctx.lineWidth = item.lw * 0.6;
          sctx.strokeStyle = 'rgba(68,52,30,' + (0.25 + item.depth * 0.25).toFixed(3) + ')';
          sctx.stroke();
        }

      } else if (item.type === 'leaf') {
        sctx.save();
        sctx.translate(item.x, item.y);
        sctx.rotate(item.rot);
        sctx.beginPath();
        sctx.ellipse(0, 0, item.sz, item.sz * 0.4, 0, 0, 6.28);
        sctx.fillStyle = Forest.rgb(Forest.mix(item.col, [35, 45, 22], 0.2), 0.4 + item.depth * 0.25);
        sctx.fill();
        sctx.restore();

      } else if (item.type === 'rock') {
        sctx.beginPath();
        sctx.ellipse(item.x, item.y, item.sz, item.sz * item.aspect, item.rot, 0, 6.28);
        sctx.fillStyle = 'rgba(80,74,52,' + (0.3 + item.depth * 0.3).toFixed(3) + ')';
        sctx.fill();
        sctx.beginPath();
        sctx.arc(item.x - item.sz * 0.2, item.y - item.sz * 0.2, item.sz * 0.3, 0, 6.28);
        sctx.fillStyle = 'rgba(125,118,88,0.15)';
        sctx.fill();

      } else if (item.type === 'flower') {
        sctx.beginPath();
        sctx.moveTo(item.x, item.y);
        sctx.lineTo(item.x, item.y - item.sz * 4);
        sctx.lineWidth = 0.6 + item.depth * 0.4;
        sctx.strokeStyle = 'rgba(50,90,30,0.5)';
        sctx.stroke();
        var fpy = item.y - item.sz * 4;
        for (var fp = 0; fp < 5; fp++) {
          var pa = fp * 1.256;
          sctx.beginPath();
          sctx.arc(item.x + Math.cos(pa) * item.sz * 0.6, fpy + Math.sin(pa) * item.sz * 0.6, item.sz * 0.5, 0, 6.28);
          sctx.fillStyle = 'rgba(' + item.petalCol[0] + ',' + item.petalCol[1] + ',' + item.petalCol[2] + ',' + (0.35 + item.depth * 0.25).toFixed(3) + ')';
          sctx.fill();
        }
        sctx.beginPath();
        sctx.arc(item.x, fpy, item.sz * 0.35, 0, 6.28);
        sctx.fillStyle = 'rgba(240,230,105,0.45)';
        sctx.fill();
      }
    }

    // Draw FG trees on top of undergrowth
    for (var fi = 0; fi < _fgTreeItems.length; fi++) {
      var ti = _fgTreeItems[fi];
      Forest.drawTrunk(sctx, ti.tree, ti.tx, W, H, time);
      Forest.drawCanopy(sctx, ti.tree, ti.tx, W, H, time, 1.0);
    }

    // (end fg layer — directly rendered into sctx, no intermediate cache)

    // Dense canopy fill + hanging drips — drawn directly into scene cache.
    {
      var cR = Forest.mkRng(333);
      for (var ci = 0; ci < 30; ci++) {
        var cx = cR() * W * 1.3 - W * 0.15;
        var cy = cR() * H * 0.18 - H * 0.04;
        var cr = H * (0.06 + cR() * 0.09);
        var col = Forest.CANOPY[Math.floor(cR() * Forest.CANOPY.length)];
        col = Forest.mix(col, [35, 60, 35], 0.2);
        var sway = Math.sin(time * 0.25 + ci * 0.9) * 1.2 + wind * 1.5;
        sctx.beginPath();
        sctx.ellipse(cx + sway, cy, cr * (1.0 + cR() * 0.4), cr * (0.6 + cR() * 0.3), (cR()-0.5)*0.4, 0, 6.28);
        sctx.fillStyle = Forest.rgb(col, 0.92);
        sctx.fill();
      }
      cR = Forest.mkRng(444);
      for (var ci = 0; ci < 50; ci++) {
        var cx = cR() * W * 1.3 - W * 0.15;
        var cy = cR() * H * 0.22 - H * 0.02;
        var cr = H * (0.03 + cR() * 0.06);
        var col = Forest.CANOPY[Math.floor(cR() * Forest.CANOPY.length)];
        var isAcc = cR() < 0.07;
        if (isAcc) col = Forest.CANOPY_ACCENT[Math.floor(cR() * Forest.CANOPY_ACCENT.length)];
        var sway = Math.sin(time * 0.3 + ci * 0.7) * 1.8 + wind * 2;
        sctx.beginPath();
        sctx.ellipse(cx + sway, cy, cr * (0.85 + cR() * 0.35), cr * (0.55 + cR() * 0.35), (cR()-0.5)*0.5, 0, 6.28);
        sctx.fillStyle = Forest.rgb(col, 0.88);
        sctx.fill();
        sctx.beginPath();
        sctx.arc(cx + sway - cr * 0.18, cy - cr * 0.12, cr * 0.42, 0, 6.28);
        sctx.fillStyle = Forest.rgb(Forest.mix(col, [155,200,115], 0.22), 0.38);
        sctx.fill();
        sctx.beginPath();
        sctx.arc(cx + sway + cr * 0.12, cy + cr * 0.14, cr * 0.38, 0, 6.28);
        sctx.fillStyle = Forest.rgb(Forest.mix(col, [18, 30, 15], 0.35), 0.28);
        sctx.fill();
      }
      cR = Forest.mkRng(555);
      for (var ci = 0; ci < 35; ci++) {
        var cx = cR() * W * 1.2 - W * 0.1;
        var cy = cR() * H * 0.12 - H * 0.01;
        var cr = H * (0.015 + cR() * 0.035);
        var col = Forest.CANOPY[Math.floor(cR() * Forest.CANOPY.length)];
        var sway = Math.sin(time * 0.35 + ci * 1.1) * 1.2 + wind * 1.5;
        sctx.beginPath();
        sctx.arc(cx + sway, cy, cr, 0, 6.28);
        sctx.fillStyle = Forest.rgb(Forest.mix(col, [120, 170, 90], 0.15), 0.85);
        sctx.fill();
      }
      cR = Forest.mkRng(666);
      for (var di = 0; di < 20; di++) {
        var dx = cR() * W;
        var dy = H * (0.12 + cR() * 0.15);
        var dLen = H * (0.02 + cR() * 0.05);
        var col = Forest.CANOPY[Math.floor(cR() * Forest.CANOPY.length)];
        var sway = Math.sin(time * 0.4 + di * 1.3) * 1.5 + wind;
        sctx.beginPath();
        sctx.moveTo(dx + sway - 4, dy);
        sctx.quadraticCurveTo(dx + sway, dy + dLen, dx + sway + 4, dy);
        sctx.fillStyle = Forest.rgb(col, 0.7);
        sctx.fill();
      }
    }
    // (end canopy passes — directly in sctx)

    // Volumetric light rays
    sctx.save();
    sctx.globalCompositeOperation = 'screen';
    for (var ri = 0; ri < 8; ri++) {
      var rx = W * (0.05 + ri * 0.13);
      var rPulse = Math.sin(time * 0.15 + ri * 2.1);
      var ra = 0.02 + rPulse * 0.015;
      if (ra < 0.005) continue;
      var rayW = W * (0.025 + Math.abs(rPulse) * 0.015);
      sctx.beginPath();
      sctx.moveTo(rx - rayW * 0.3, 0);
      sctx.lineTo(rx + rayW * 0.3, H * 0.25);
      sctx.lineTo(rx - rayW * 0.5, H * 0.25);
      sctx.closePath();
      sctx.fillStyle = 'rgba(255,240,130,' + ra.toFixed(3) + ')';
      sctx.fill();
      sctx.beginPath();
      sctx.moveTo(rx - rayW * 0.5, H * 0.25);
      sctx.lineTo(rx + rayW * 1.5, H * 0.7);
      sctx.lineTo(rx - rayW * 0.8, H * 0.7);
      sctx.closePath();
      sctx.fillStyle = 'rgba(255,230,100,' + (ra * 0.3).toFixed(3) + ')';
      sctx.fill();
    }
    sctx.restore();

    // Warm color grading
    sctx.save();
    sctx.globalCompositeOperation = 'overlay';
    sctx.fillStyle = 'rgba(180,160,60,0.03)';
    sctx.fillRect(0, 0, W, H);
    sctx.restore();

    // Close camera pan (scene shift). Vignette below covers full viewport.
    sctx.restore();

    // Vignette (cached on resize)
    if (!frame._vig || frame._vigW !== W || frame._vigH !== H) {
      frame._vig = sctx.createRadialGradient(W/2, H*0.38, H*0.12, W/2, H*0.38, H*0.95);
      frame._vig.addColorStop(0, 'rgba(0,0,0,0)');
      frame._vig.addColorStop(0.6, 'rgba(8,18,12,0.08)');
      frame._vig.addColorStop(0.8, 'rgba(10,20,15,0.18)');
      frame._vig.addColorStop(1, 'rgba(8,16,10,0.35)');
      frame._vigW = W; frame._vigH = H;
    }
    sctx.fillStyle = frame._vig;
    sctx.fillRect(0, 0, W, H);

      frame._sceneCache = sc; frame._sceneW = W; frame._sceneH = H;
    }
    // Draw cached scene (one drawImage instead of ~300 draw calls)
    ctx.drawImage(frame._sceneCache, 0, 0);

    // Animated critters + decorations — drawn on the main ctx AFTER the
    // scene cache blits so they actually animate (they'd freeze in cache).
    // Approximate layering:
    //  • River ripples + crocodile sit atop the cached water surface.
    //  • Jaguar prowls mid-ground, above trees but under the dense canopy.
    //  • Snake slithers in the foreground dirt zone.
    //  • Extra hanging vines drift in front of everything.
    drawRiverRipples(ctx, W, H, H * 0.58, time);
    drawCroc(ctx, W, H, H * 0.58, time);
    drawJaguar(ctx, W, H, time, dt);
    drawSnake(ctx, W, H, time, dt);
    drawBigVines(ctx, W, H, time);

    // Particles -- spawn rates scaled for mobile
    if (Math.random() < 0.05) Forest.spawnP('firefly', W, H);
    if (Math.random() < 0.10) Forest.spawnP('spore', W, H);
    if (Math.random() < 0.18) Forest.spawnP('leaf', W, H);
    if (Math.random() < 0.12) Forest.spawnP('leaf', W, H);
    if (Math.random() < 0.04) Forest.spawnP('petal', W, H);
    if (Math.random() < 0.08) Forest.spawnP('dust', W, H);

    for (var i = Forest.particles.length - 1; i >= 0; i--) {
      var p = Forest.particles[i];
      p.life--;
      if (p.life <= 0) {
        // Dead — swap-remove + return slot to the pool so spawnP reuses it.
        Forest.particles[i] = Forest.particles[Forest.particles.length - 1];
        Forest.particles.pop();
        Forest._recycleParticle(p);
        continue;
      }
      var lr = p.life / p.ml;
      var a = lr < 0.15 ? lr/0.15 : (lr > 0.85 ? (1-lr)/0.15 : 1);

      if (p.type === 'firefly') {
        p.ph += p.fs;
        p.vx += (Math.random()-0.5)*0.012 + wind * 0.003;
        p.vy += (Math.random()-0.5)*0.008;
        p.x += p.vx; p.y += p.vy;
        var fl = 0.25+Math.sin(p.ph)*0.6;
        if (!Forest.isMobile) {
          ctx.save();
          ctx.shadowColor = 'rgba(200,255,100,' + (a*fl*0.6).toFixed(3) + ')';
          ctx.shadowBlur = p.r * 12;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.5, 0, 6.28);
          ctx.fillStyle = 'rgba(200,255,100,' + (a*fl*0.5).toFixed(3) + ')';
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.restore();
        } else {
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3, 0, 6.28);
          ctx.fillStyle = 'rgba(200,255,100,' + (a*fl*0.15).toFixed(3) + ')';
          ctx.fill();
        }
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r*0.8,0,6.28);
        ctx.fillStyle = 'rgba(240,255,180,'+(a*fl*0.9).toFixed(3)+')'; ctx.fill();
      } else if (p.type === 'spore') {
        p.x += p.vx+Math.sin(time*0.8+p.ph)*0.3 + wind * 0.2;
        p.y += p.vy;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,6.28);
        ctx.fillStyle = 'rgba(225,225,180,'+(a*0.35).toFixed(3)+')'; ctx.fill();
      } else if (p.type === 'leaf') {
        p.vx += wind * 0.008;
        p.x += p.vx + Math.sin(time * p.flutterSpeed + p.ph) * p.flutter;
        p.y += p.vy + Math.sin(time * 0.3 + p.ph * 2) * 0.15;
        p.rot += p.rs + Math.cos(time * p.flutterSpeed + p.ph) * 0.02;
        if (p.y > H + 20) p.life = 0;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        if (p.leafType === 0) {
          ctx.beginPath();
          ctx.ellipse(0, 0, p.sz, p.sz * 0.4, 0, 0, 6.28);
          ctx.fillStyle = Forest.rgb(p.c, a * 0.75);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(-p.sz * 0.7, 0);
          ctx.lineTo(p.sz * 0.7, 0);
          ctx.lineWidth = 0.5;
          ctx.strokeStyle = Forest.rgb(Forest.mix(p.c, [255,255,200], 0.3), a * 0.3);
          ctx.stroke();
        } else if (p.leafType === 1) {
          ctx.beginPath();
          ctx.moveTo(-p.sz, 0);
          ctx.quadraticCurveTo(-p.sz * 0.3, -p.sz * 0.45, p.sz, 0);
          ctx.quadraticCurveTo(-p.sz * 0.3, p.sz * 0.45, -p.sz, 0);
          ctx.fillStyle = Forest.rgb(p.c, a * 0.75);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.sz * 0.5, 0, 6.28);
          ctx.fillStyle = Forest.rgb(p.c, a * 0.7);
          ctx.fill();
        }
        ctx.restore();
      } else if (p.type === 'petal') {
        p.x += p.vx + Math.sin(time * 0.4 + p.ph) * 0.8 + wind * 0.3;
        p.y += p.vy;
        p.rot += p.rs;
        if (p.y > H + 10) p.life = 0;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, p.sz, p.sz * 0.55, 0, 0, 6.28);
        ctx.fillStyle = Forest.rgb(p.c, a * 0.45);
        ctx.fill();
        ctx.restore();
      } else if (p.type === 'dust') {
        p.x += p.vx + Math.sin(time * 0.3 + p.ph) * 0.15 + wind * 0.1;
        p.y += p.vy + Math.sin(time * 0.25 + p.ph * 1.3) * 0.1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.28);
        ctx.fillStyle = 'rgba(220,210,150,' + (a * 0.2).toFixed(3) + ')';
        ctx.fill();
      }
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
} catch(e) { console.warn('Canvas animation error:', e); }
