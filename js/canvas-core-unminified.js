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

  // ─── Swamp (lower-left water body) ──────────────────────────────────────────
  function drawSwampBase(sctx, W, H, gY, time) {
    var sw = W * 0.48;
    var top = gY + H * 0.015;
    var rng = Forest.mkRng(7777);

    // Clip to organic swamp polygon
    sctx.save();
    sctx.beginPath();
    sctx.moveTo(-2, top + H * 0.19);
    sctx.bezierCurveTo(W * 0.02, top + H * 0.07, W * 0.06, top + H * 0.08, W * 0.10, top + H * 0.07);
    sctx.bezierCurveTo(W * 0.15, top + H * 0.05, W * 0.20, top + H * 0.07, W * 0.26, top + H * 0.06);
    sctx.bezierCurveTo(W * 0.29, top + H * 0.05, sw - W * 0.015, top + H * 0.07, sw, top + H * 0.10);
    sctx.bezierCurveTo(sw + W * 0.01, top + H * 0.14, sw - W * 0.01, H * 0.68, W * 0.30, H * 0.74);
    sctx.bezierCurveTo(W * 0.26, H * 0.80, W * 0.20, H * 0.84, W * 0.12, H * 0.86);
    sctx.lineTo(-2, H * 0.88);
    sctx.closePath();
    sctx.clip();

    // Outer shallows fill
    sctx.fillStyle = 'rgba(35, 62, 56, 0.5)';
    sctx.fillRect(-2, top - H * 0.02, sw + 4, H - top + H * 0.02);

    // Main water gradient — richer green-blue tones
    var wg = sctx.createLinearGradient(0, top, 0, H);
    wg.addColorStop(0,    'rgba(42, 82, 76, 0.82)');
    wg.addColorStop(0.12, 'rgba(48, 95, 86, 0.88)');
    wg.addColorStop(0.30, 'rgba(40, 78, 72, 0.92)');
    wg.addColorStop(0.55, 'rgba(30, 60, 56, 0.95)');
    wg.addColorStop(0.80, 'rgba(24, 48, 44, 0.97)');
    wg.addColorStop(1,    'rgba(20, 36, 34, 0.99)');
    sctx.fillStyle = wg;
    sctx.fillRect(-2, top - H * 0.02, sw + 4, H - top + H * 0.02);

    // Painterly mottling blobs — richer underwater texture
    var mottRng = Forest.mkRng(1111);
    for (var mi = 0; mi < 45; mi++) {
      var mx = mottRng() * sw * 0.95;
      var my = top + H * 0.03 + mottRng() * (H - top - H * 0.05);
      var mrx = W * (0.012 + mottRng() * 0.08);
      var mry = mrx * (0.3 + mottRng() * 0.6);
      var mt = mottRng();
      var mc = mt < 0.20 ? [62, 118, 100] : (mt < 0.40 ? [38, 62, 56] : (mt < 0.60 ? [48, 90, 80] : (mt < 0.78 ? [30, 48, 42] : [70, 130, 105])));
      sctx.beginPath();
      sctx.ellipse(mx, my, mrx, mry, mottRng() * 3.14, 0, 6.28);
      sctx.fillStyle = Forest.rgb(mc, 0.05 + mottRng() * 0.14);
      sctx.fill();
    }
    // Brighter surface highlight swaths — painterly light patches
    for (var hi = 0; hi < 8; hi++) {
      var hx = mottRng() * sw * 0.75;
      var hy = top + H * 0.02 + mottRng() * H * 0.25;
      var hrx = W * (0.025 + mottRng() * 0.06);
      var hry = hrx * (0.2 + mottRng() * 0.3);
      sctx.beginPath();
      sctx.ellipse(hx, hy, hrx, hry, mottRng() * 3.14, 0, 6.28);
      sctx.fillStyle = 'rgba(155, 195, 155, ' + (0.04 + mottRng() * 0.06).toFixed(3) + ')';
      sctx.fill();
    }

    // Horizontal water surface streaks — darker undertones
    for (var wi = 0; wi < 14; wi++) {
      var wy = top + H * 0.05 + rng() * (H * 0.48);
      var wx1 = rng() * sw * 0.3;
      var wx2 = wx1 + sw * (0.15 + rng() * 0.35);
      sctx.beginPath();
      sctx.moveTo(wx1, wy);
      sctx.lineTo(wx2, wy + (rng() - 0.5) * 1.5);
      sctx.lineWidth = 0.5 + rng() * 0.7;
      sctx.strokeStyle = 'rgba(82, 125, 110, ' + (0.08 + rng() * 0.10).toFixed(3) + ')';
      sctx.stroke();
    }

    // Brighter light dapples — sun reflections on water surface
    for (var di = 0; di < 10; di++) {
      var dx = rng() * sw * 0.85;
      var dy = top + H * 0.04 + rng() * H * 0.30;
      sctx.beginPath();
      sctx.ellipse(dx, dy, 1.5 + rng() * 3, 0.6 + rng() * 1.5, rng() * 3.14, 0, 6.28);
      sctx.fillStyle = 'rgba(160, 200, 165, ' + (0.08 + rng() * 0.12).toFixed(3) + ')';
      sctx.fill();
    }

    // Trunk reflections — dark vertical smears
    for (var ri = 0; ri < 4; ri++) {
      var rx = W * (0.06 + rng() * 0.28);
      var ry = top + H * 0.06 + rng() * H * 0.12;
      var rLen = H * (0.10 + rng() * 0.18);
      var rW = W * (0.006 + rng() * 0.012);
      var rg = sctx.createLinearGradient(rx, ry, rx, ry + rLen);
      rg.addColorStop(0, 'rgba(38, 28, 16, 0.22)');
      rg.addColorStop(0.5, 'rgba(42, 32, 20, 0.12)');
      rg.addColorStop(1, 'rgba(30, 22, 12, 0.02)');
      sctx.fillStyle = rg;
      sctx.fillRect(rx - rW / 2, ry, rW, rLen);
      for (var si = 0; si < 3; si++) {
        var sy = ry + rLen * ((si + 1) / 4);
        sctx.beginPath();
        sctx.ellipse(rx + (rng() - 0.5) * rW, sy, rW * 0.7, rLen * 0.04, 0, 0, 6.28);
        sctx.fillStyle = 'rgba(32, 24, 14, 0.06)';
        sctx.fill();
      }
    }

    // Fallen log — partially submerged, angled across the water
    var logX1 = W * 0.12, logY1 = top + H * 0.11;
    var logX2 = W * 0.41, logY2 = top + H * 0.22;
    var logAng = Math.atan2(logY2 - logY1, logX2 - logX1);
    var logLen = Math.sqrt(Math.pow(logX2 - logX1, 2) + Math.pow(logY2 - logY1, 2));
    sctx.save();
    sctx.translate(logX1, logY1);
    sctx.rotate(logAng);
    // Log body — thicker with richer wood tones
    var lg = sctx.createLinearGradient(0, -14, 0, 14);
    lg.addColorStop(0, 'rgba(98, 74, 42, 0.92)');
    lg.addColorStop(0.25, 'rgba(120, 94, 52, 0.86)');
    lg.addColorStop(0.55, 'rgba(88, 64, 36, 0.89)');
    lg.addColorStop(0.78, 'rgba(58, 38, 22, 0.91)');
    lg.addColorStop(1, 'rgba(40, 28, 14, 0.95)');
    sctx.beginPath();
    sctx.ellipse(logLen / 2, 0, logLen / 2, 14, 0, 0, 6.28);
    sctx.fillStyle = lg;
    sctx.fill();
    // Bark texture lines
    for (var bti = 0; bti < 7; bti++) {
      var btx = logLen * (0.1 + bti * 0.13);
      sctx.beginPath();
      sctx.moveTo(btx, -8 + rng() * 3);
      sctx.lineTo(btx + rng() * 10, 7 + rng() * 5);
      sctx.lineWidth = 0.55;
      sctx.strokeStyle = 'rgba(55, 38, 20, ' + (0.12 + rng() * 0.14).toFixed(3) + ')';
      sctx.stroke();
    }
    // Moss patches — richer coverage on thicker log
    for (var mji = 0; mji < 8; mji++) {
      var mjx = logLen * (0.08 + mji * 0.12);
      sctx.beginPath();
      sctx.ellipse(mjx, -6 + rng() * 10, 6 + rng() * 7, 3 + rng() * 3, rng() * 0.5, 0, 6.28);
      sctx.fillStyle = 'rgba(58, 100, 52, ' + (0.25 + rng() * 0.25).toFixed(3) + ')';
      sctx.fill();
      // Second moss clump nearby on some
      if (rng() < 0.4) {
        sctx.beginPath();
        sctx.ellipse(mjx + rng() * 8, -3 + rng() * 8, 4 + rng() * 4, 2 + rng() * 2, rng() * 0.6, 0, 6.28);
        sctx.fillStyle = 'rgba(52, 95, 46, ' + (0.20 + rng() * 0.18).toFixed(3) + ')';
        sctx.fill();
      }
    }
    // Waterline shimmer on log
    sctx.beginPath();
    sctx.moveTo(logLen * 0.08, 5);
    sctx.lineTo(logLen * 0.92, 6);
    sctx.lineWidth = 0.9;
    sctx.strokeStyle = 'rgba(65, 100, 88, 0.42)';
    sctx.stroke();
    // Second fainter waterline
    sctx.beginPath();
    sctx.moveTo(logLen * 0.10, 7.5);
    sctx.lineTo(logLen * 0.90, 8.5);
    sctx.lineWidth = 0.5;
    sctx.strokeStyle = 'rgba(55, 85, 75, 0.25)';
    sctx.stroke();
    sctx.restore();

    // Lily pads (5, with wedge notch)
    var pads = [
      {x: W * 0.08, y: top + H * 0.22, r: 11 + rng() * 4},
      {x: W * 0.26, y: top + H * 0.28, r: 13 + rng() * 4},
      {x: W * 0.14, y: top + H * 0.36, r: 10 + rng() * 4},
      {x: W * 0.33, y: top + H * 0.18, r: 12 + rng() * 3},
      {x: W * 0.05, y: top + H * 0.42, r: 9 + rng() * 4},
    ];
    for (var li = 0; li < pads.length; li++) {
      var lp = pads[li];
      var lpadRot = rng() * 6.28;
      sctx.save();
      sctx.translate(lp.x, lp.y);
      sctx.rotate(lpadRot);
      sctx.beginPath();
      sctx.moveTo(0, 0);
      sctx.arc(0, 0, lp.r, 0.18, 6.28 - 0.18);
      sctx.closePath();
      var lcol = Forest.mix([58, 100, 55], [42, 78, 42], rng() * 0.4);
      sctx.fillStyle = Forest.rgb(lcol, 0.72);
      sctx.fill();
      // Vein line from center
      sctx.beginPath();
      sctx.moveTo(0, 0);
      sctx.lineTo(lp.r * 0.7, 0);
      sctx.lineWidth = 0.4;
      sctx.strokeStyle = 'rgba(45, 75, 40, 0.3)';
      sctx.stroke();
      // Highlight spot
      sctx.beginPath();
      sctx.arc(-lp.r * 0.2, -lp.r * 0.2, lp.r * 0.35, 0, 6.28);
      sctx.fillStyle = 'rgba(95, 145, 85, 0.15)';
      sctx.fill();
      // Small flower on some pads
      if (li % 2 === 0) {
        var fx = lp.r * (0.1 + rng() * 0.3);
        var fy = lp.r * (0.1 + rng() * 0.25);
        var fcolor = li === 0 ? [245, 215, 140] : (li === 2 ? [250, 225, 180] : [240, 235, 210]);
        for (var pet = 0; pet < 5; pet++) {
          var pa = pet * 1.256;
          sctx.beginPath();
          sctx.ellipse(fx + Math.cos(pa) * 2.2, fy + Math.sin(pa) * 2.2, 1.8, 0.8, pa, 0, 6.28);
          sctx.fillStyle = Forest.rgb(fcolor, 0.58);
          sctx.fill();
        }
        sctx.beginPath();
        sctx.arc(fx, fy, 1.5, 0, 6.28);
        sctx.fillStyle = Forest.rgb(fcolor, 0.78);
        sctx.fill();
      }
      sctx.restore();
    }

    // Water ripple rings around lily pads
    for (var ri2 = 0; ri2 < pads.length; ri2++) {
      var rp = pads[ri2];
      sctx.beginPath();
      sctx.ellipse(rp.x, rp.y, rp.r + 2.5, rp.r * 0.35 + 2, 0, 0, 6.28);
      sctx.lineWidth = 0.3;
      sctx.strokeStyle = 'rgba(90, 135, 110, 0.22)';
      sctx.stroke();
      sctx.beginPath();
      sctx.ellipse(rp.x, rp.y, rp.r + 5.5, rp.r * 0.35 + 4, 0, 0, 6.28);
      sctx.lineWidth = 0.2;
      sctx.strokeStyle = 'rgba(80, 120, 100, 0.12)';
      sctx.stroke();
    }
    // Ripple rings where log enters water
    for (var lri = 0; lri < 2; lri++) {
      var lrx = lri === 0 ? logX1 : logX2;
      var lry = lri === 0 ? logY1 : logY2;
      for (var rr = 0; rr < 3; rr++) {
        sctx.beginPath();
        sctx.ellipse(lrx, lry + rr * 1.5, 8 + rr * 5, 2 + rr * 1.2, logAng + 1.57, 0, 6.28);
        sctx.lineWidth = 0.25;
        sctx.strokeStyle = 'rgba(85, 125, 105, ' + (0.16 - rr * 0.04).toFixed(3) + ')';
        sctx.stroke();
      }
    }
    // Duckweed — tiny floating green dots scattered on water surface
    for (var dw = 0; dw < 35; dw++) {
      var dwx = W * (0.015 + rng() * 0.44);
      var dwy = top + H * (0.02 + rng() * 0.55);
      sctx.beginPath();
      sctx.arc(dwx, dwy, 0.7 + rng() * 1.2, 0, 6.28);
      sctx.fillStyle = 'rgba(75, 130, 78, ' + (0.18 + rng() * 0.22).toFixed(3) + ')';
      sctx.fill();
      if (rng() < 0.3) {
        sctx.beginPath();
        sctx.arc(dwx + rng() * 1.5, dwy + rng() * 1.2, 0.4 + rng() * 0.7, 0, 6.28);
        sctx.fillStyle = 'rgba(88, 142, 85, ' + (0.15 + rng() * 0.15).toFixed(3) + ')';
        sctx.fill();
      }
    }

    // Reeds / cattails at water edges
    var reedClusters = [
      {x: W * 0.01, n: 5}, {x: W * 0.40, n: 4}, {x: W * 0.44, n: 3},
      {x: W * 0.22, n: 3}, {x: W * 0.10, n: 4},
    ];
    for (var rci = 0; rci < reedClusters.length; rci++) {
      var rc = reedClusters[rci];
      var baseY = top + H * (0.03 + rng() * 0.06);
      for (var rj = 0; rj < rc.n; rj++) {
        var rrx = rc.x + (rng() - 0.5) * 14;
        var rrh = H * (0.022 + rng() * 0.035);
        sctx.beginPath();
        sctx.moveTo(rrx, baseY);
        sctx.quadraticCurveTo(rrx + (rng() - 0.5) * 3, baseY - rrh * 0.6, rrx + (rng() - 0.5) * 2, baseY - rrh);
        sctx.lineWidth = 0.8 + rng() * 0.7;
        sctx.strokeStyle = 'rgba(42, 62, 32, 0.6)';
        sctx.stroke();
        // Cattail head
        if (rng() < 0.45) {
          sctx.beginPath();
          sctx.ellipse(rrx, baseY - rrh, 1.5, 3.5, 0, 0, 6.28);
          sctx.fillStyle = 'rgba(68, 48, 28, 0.65)';
          sctx.fill();
        }
      }
    }

    // Emergent water plants — reeds and grasses rising from the water
    for (var ei = 0; ei < 10; ei++) {
      var ex = W * (0.015 + ei * 0.045);
      var ey = top + H * (0.05 + ei * 0.05);
      var eh = H * (0.015 + ei % 4 * 0.012);
      var esway = (ei % 3 - 1) * 3;
      // Main stem
      sctx.beginPath();
      sctx.moveTo(ex, ey);
      sctx.quadraticCurveTo(ex + esway, ey - eh * 0.5, ex + esway * 1.3, ey - eh);
      sctx.lineWidth = 0.55 + ei % 3 * 0.35;
      sctx.strokeStyle = 'rgba(40, 62, 34, ' + (0.45 + ei % 3 * 0.12).toFixed(3) + ')';
      sctx.stroke();
      // Narrow leaf blade
      sctx.beginPath();
      sctx.moveTo(ex, ey - eh * 0.3);
      sctx.quadraticCurveTo(ex + esway * 1.8, ey - eh * 0.65, ex + esway * 1.2, ey - eh * 0.85);
      sctx.lineWidth = 0.4;
      sctx.strokeStyle = 'rgba(38, 58, 30, 0.40)';
      sctx.stroke();
      // Small leaf cluster at top
      if (ei % 3 === 0) {
        sctx.beginPath();
        sctx.ellipse(ex + esway * 1.5, ey - eh * 0.9, 3, 1.2, 0.2, 0, 6.28);
        sctx.fillStyle = 'rgba(44, 70, 38, 0.48)';
        sctx.fill();
      }
      // Second blade on some
      if (ei % 2 === 0) {
        sctx.beginPath();
        sctx.moveTo(ex, ey - eh * 0.2);
        sctx.quadraticCurveTo(ex - esway, ey - eh * 0.55, ex - esway * 0.8, ey - eh * 0.7);
        sctx.lineWidth = 0.35;
        sctx.strokeStyle = 'rgba(42, 64, 36, 0.35)';
        sctx.stroke();
      }
    }

    // Frog on the log
    var fX = logX1 + (logX2 - logX1) * 0.58;
    var fY = logY1 + (logY2 - logY1) * 0.58 - 7;
    sctx.save();
    sctx.translate(fX, fY);
    sctx.rotate(logAng);
    sctx.scale(1.35, 1.35);
    // Body
    sctx.beginPath();
    sctx.ellipse(0, 0, 5, 3.5, 0, 0, 6.28);
    sctx.fillStyle = 'rgba(58, 105, 50, 0.85)';
    sctx.fill();
    // Head
    sctx.beginPath();
    sctx.ellipse(5.5, -1.5, 3.5, 2.5, 0, 0, 6.28);
    sctx.fillStyle = 'rgba(62, 112, 55, 0.88)';
    sctx.fill();
    // Eyes
    sctx.beginPath();
    sctx.arc(7, -3.5, 1.2, 0, 6.28);
    sctx.fillStyle = 'rgba(185, 205, 65, 0.8)';
    sctx.fill();
    sctx.beginPath();
    sctx.arc(7, -3.5, 0.5, 0, 6.28);
    sctx.fillStyle = '#1c1c12';
    sctx.fill();
    // Back legs
    sctx.beginPath();
    sctx.moveTo(-3, 2.5);
    sctx.quadraticCurveTo(-6, 6, -8, 3.5);
    sctx.lineWidth = 1.4;
    sctx.strokeStyle = 'rgba(52, 92, 44, 0.65)';
    sctx.stroke();
    sctx.restore();

    // Small turtle on the log near the frog
    var tX = logX1 + (logX2 - logX1) * 0.35;
    var tY = logY1 + (logY2 - logY1) * 0.35 - 10;
    sctx.save();
    sctx.translate(tX, tY);
    sctx.rotate(logAng);
    // Shell
    sctx.beginPath();
    sctx.ellipse(0, 0, 4.5, 3, 0, 0, 6.28);
    sctx.fillStyle = 'rgba(62, 48, 28, 0.82)';
    sctx.fill();
    // Shell pattern
    sctx.beginPath();
    sctx.moveTo(-2, -1.5);
    sctx.lineTo(2, -2);
    sctx.lineTo(0, 2);
    sctx.closePath();
    sctx.lineWidth = 0.35;
    sctx.strokeStyle = 'rgba(48, 36, 18, 0.40)';
    sctx.stroke();
    // Head
    sctx.beginPath();
    sctx.ellipse(4.5, 0, 2.2, 1.3, 0, 0, 6.28);
    sctx.fillStyle = 'rgba(58, 72, 36, 0.78)';
    sctx.fill();
    // Eye
    sctx.beginPath();
    sctx.arc(5.5, -0.6, 0.5, 0, 6.28);
    sctx.fillStyle = '#1c1c0e';
    sctx.fill();
    sctx.restore();

    // Feathered rim — soft dark edge gradient to blend water into ground
    sctx.beginPath();
    sctx.moveTo(-2, top + H * 0.19);
    sctx.bezierCurveTo(W * 0.02, top + H * 0.07, W * 0.06, top + H * 0.08, W * 0.10, top + H * 0.07);
    sctx.bezierCurveTo(W * 0.15, top + H * 0.05, W * 0.20, top + H * 0.07, W * 0.26, top + H * 0.06);
    sctx.bezierCurveTo(W * 0.29, top + H * 0.05, sw - W * 0.015, top + H * 0.07, sw, top + H * 0.10);
    sctx.bezierCurveTo(sw + W * 0.01, top + H * 0.14, sw - W * 0.01, H * 0.68, W * 0.30, H * 0.74);
    sctx.bezierCurveTo(W * 0.26, H * 0.80, W * 0.20, H * 0.84, W * 0.12, H * 0.86);
    sctx.lineTo(-2, H * 0.88);
    sctx.closePath();
    sctx.lineWidth = H * 0.04;
    sctx.strokeStyle = 'rgba(18, 28, 22, 0.45)';
    sctx.stroke();
    sctx.lineWidth = H * 0.022;
    sctx.strokeStyle = 'rgba(16, 24, 20, 0.28)';
    sctx.stroke();
    sctx.lineWidth = H * 0.010;
    sctx.strokeStyle = 'rgba(14, 20, 16, 0.15)';
    sctx.stroke();

    // Edge vegetation — small dark ground plants along shoreline
    var vegRng = Forest.mkRng(4444);
    for (var vi = 0; vi < 22; vi++) {
      var vx = W * (0.01 + vegRng() * 0.47);
      var vy = top + H * (0.002 + vegRng() * 0.08);
      var vh = H * (0.008 + vegRng() * 0.022);
      sctx.beginPath();
      sctx.moveTo(vx, vy);
      sctx.quadraticCurveTo(vx + (vegRng() - 0.5) * 7, vy - vh * 0.55, vx + (vegRng() - 0.5) * 4, vy - vh);
      sctx.lineWidth = 0.35 + vegRng() * 0.6;
      sctx.strokeStyle = 'rgba(24, 38, 20, ' + (0.45 + vegRng() * 0.30).toFixed(3) + ')';
      sctx.stroke();
      // Leaf tufts on most plants
      if (vegRng() < 0.55) {
        sctx.beginPath();
        sctx.ellipse(vx + (vegRng() - 0.5) * 3, vy - vh * 0.7, 3 + vegRng() * 2.5, 1.2 + vegRng() * 1.2, vegRng() * 1.5, 0, 6.28);
        sctx.fillStyle = 'rgba(34, 52, 30, ' + (0.38 + vegRng() * 0.22).toFixed(3) + ')';
        sctx.fill();
      }
      // Second leaf on some
      if (vegRng() < 0.25) {
        sctx.beginPath();
        sctx.ellipse(vx + (vegRng() - 0.5) * 4, vy - vh * 0.5, 2.2 + vegRng() * 1.8, 0.8 + vegRng() * 0.7, vegRng() * 2, 0, 6.28);
        sctx.fillStyle = 'rgba(38, 56, 34, ' + (0.30 + vegRng() * 0.15).toFixed(3) + ')';
        sctx.fill();
      }
    }
    // Larger shoreline ferns
    for (var fi2 = 0; fi2 < 5; fi2++) {
      var fvx = W * (0.05 + fi2 * 0.08);
      var fvy = top + H * (0.02 + fi2 * 0.015);
      var fvh = H * (0.018 + fi2 * 0.005);
      for (var fr = 0; fr < 5; fr++) {
        var fang = -0.8 + fr * 0.4;
        sctx.beginPath();
        sctx.moveTo(fvx, fvy);
        sctx.quadraticCurveTo(fvx + Math.cos(fang) * 5, fvy - fvh * 0.6, fvx + Math.cos(fang) * 8, fvy - fvh);
        sctx.lineWidth = 0.45;
        sctx.strokeStyle = 'rgba(30, 46, 24, 0.55)';
        sctx.stroke();
      }
    }

    // Shoreline edge highlight (after rim + veg so it sits on top)
    sctx.beginPath();
    sctx.moveTo(W * 0.02, top + H * 0.17);
    sctx.bezierCurveTo(W * 0.06, top + H * 0.09, W * 0.15, top + H * 0.07, W * 0.26, top + H * 0.07);
    sctx.bezierCurveTo(W * 0.29, top + H * 0.06, sw - W * 0.015, top + H * 0.07, sw, top + H * 0.10);
    sctx.lineWidth = 1.0;
    sctx.strokeStyle = 'rgba(72, 115, 98, 0.30)';
    sctx.stroke();

    sctx.restore();
  }

  function drawSwampAnimated(ctx, W, H, gY, time) {
    var sw = W * 0.48;
    var top = gY + H * 0.015;
    ctx.save();
    // Match the organic swamp polygon from drawSwampBase
    ctx.beginPath();
    ctx.moveTo(-2, top + H * 0.19);
    ctx.bezierCurveTo(W * 0.02, top + H * 0.07, W * 0.06, top + H * 0.08, W * 0.10, top + H * 0.07);
    ctx.bezierCurveTo(W * 0.15, top + H * 0.05, W * 0.20, top + H * 0.07, W * 0.26, top + H * 0.06);
    ctx.bezierCurveTo(W * 0.29, top + H * 0.05, sw - W * 0.015, top + H * 0.07, sw, top + H * 0.10);
    ctx.bezierCurveTo(sw + W * 0.01, top + H * 0.14, sw - W * 0.01, H * 0.68, W * 0.30, H * 0.74);
    ctx.bezierCurveTo(W * 0.26, H * 0.80, W * 0.20, H * 0.84, W * 0.12, H * 0.86);
    ctx.lineTo(-2, H * 0.88);
    ctx.closePath();
    ctx.clip();

    // Water shimmer lines (slow horizontal drift)
    for (var si = 0; si < 14; si++) {
      var sx = ((si * W * 0.04 + time * 8) % (sw * 1.15)) - W * 0.03;
      var sy = top + H * (0.03 + si * 0.038);
      var sLen = W * (0.02 + (si % 4) * 0.02);
      var sAlpha = 0.04 + Math.sin(time * 0.45 + si * 1.4) * 0.03;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + sLen, sy + Math.sin(time * 0.25 + si) * 0.7);
      ctx.lineWidth = 0.35 + (si % 3) * 0.2;
      ctx.strokeStyle = 'rgba(120, 165, 140, ' + sAlpha.toFixed(3) + ')';
      ctx.stroke();
    }
    // Occasional brighter sparkle glints
    for (var gi = 0; gi < 5; gi++) {
      var gx = W * (0.03 + gi * 0.10) + Math.sin(time * 0.22 + gi * 3.1) * W * 0.015;
      var gy = top + H * (0.06 + gi * 0.07) + Math.cos(time * 0.17 + gi * 2.7) * H * 0.008;
      var gAlpha = Math.max(0, Math.sin(time * 0.7 + gi * 4.2)) * 0.18;
      if (gAlpha > 0.01) {
        ctx.beginPath();
        ctx.arc(gx, gy, 0.6 + gi % 2 * 0.5, 0, 6.28);
        ctx.fillStyle = 'rgba(220, 240, 200, ' + gAlpha.toFixed(3) + ')';
        ctx.fill();
      }
    }

    // Firefly orbs above swamp — organic drift patterns
    for (var fi = 0; fi < 12; fi++) {
      var fx = W * (0.02 + fi * 0.042) + Math.sin(time * 0.18 + fi * 2.3) * W * 0.028;
      var fy = top + H * (0.02 + fi * 0.055) + Math.cos(time * 0.13 + fi * 1.9) * H * 0.02;
      var fAlpha = 0.18 + Math.sin(time * 0.55 + fi * 3.5) * 0.22;
      if (fAlpha < 0.03) continue;
      // Outer glow
      ctx.beginPath();
      ctx.arc(fx, fy, 7, 0, 6.28);
      ctx.fillStyle = 'rgba(210, 225, 120, ' + (fAlpha * 0.10).toFixed(3) + ')';
      ctx.fill();
      // Mid glow
      ctx.beginPath();
      ctx.arc(fx, fy, 4.5, 0, 6.28);
      ctx.fillStyle = 'rgba(225, 240, 140, ' + (fAlpha * 0.20).toFixed(3) + ')';
      ctx.fill();
      // Bright core
      ctx.beginPath();
      ctx.arc(fx, fy, 2.2, 0, 6.28);
      ctx.fillStyle = 'rgba(245, 250, 170, ' + (fAlpha * 0.45).toFixed(3) + ')';
      ctx.fill();
    }

    ctx.restore();
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

    // ═══ FULL SCENE CACHE: render everything except particles ═══
    // Built once on resize and reused every frame. Previously rebuilt every
    // ~300 ms for branch sway, but that was the sole source of the periodic
    // stutter the user saw — rebuilding ~91 trees + ~1700 canopy blobs in a
    // single frame every 18 frames = visible jank. Sway amplitude on far/mid
    // trees is 1–2 px so freezing it is imperceptible. Animated cosmetic
    // layers (mist, fog wisps, glow spots, light rays) are now drawn per-frame
    // on the MAIN ctx after the cache blits — see below.
    if (!frame._sceneCache || frame._sceneW !== W || frame._sceneH !== H) {
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
    // (ripples + croc draw on the MAIN ctx after the scene cache blits —
    // they're animated, so they can't live inside the cache.)

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

    // (Golden glow spots moved out of bake — drawn per-frame on main ctx.)

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

    // (Mist puffs moved out of bake — drawn per-frame on main ctx.)

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

    // (Moving fog wisps moved out of bake — drawn per-frame on main ctx.)

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

    // Swamp — lower-left water body, drawn after undergrowth but before
    // FG trees so trunks sit naturally in front of the water.
    drawSwampBase(sctx, W, H, gY, time);

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

    // (Volumetric light rays moved out of bake — drawn per-frame on main ctx.)

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

    // ═══ ANIMATED OVERLAYS (on main ctx, per-frame @ 60 fps) ═══
    // Previously baked into the scene cache and re-rendered every 300 ms —
    // which both ate CPU and made these elements chop-chop instead of drift.
    var _gY = H * 0.58;

    // Golden glow spots between layers (pulse + subtle drift)
    for (var gli = 0; gli < 5; gli++) {
      var glx = W * (0.1 + gli * 0.2);
      var gly = H * (0.4 + Math.sin(time * 0.1 + gli * 1.5) * 0.03);
      var glr = H * 0.12;
      var glAlpha = 0.06 + Math.sin(time * 0.2 + gli * 2) * 0.02;
      ctx.beginPath();
      ctx.arc(glx, gly, glr * 0.5, 0, 6.28);
      ctx.fillStyle = 'rgba(220,200,80,' + (glAlpha * 0.7).toFixed(3) + ')';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(glx, gly, glr, 0, 6.28);
      ctx.fillStyle = 'rgba(200,185,70,' + (glAlpha * 0.2).toFixed(3) + ')';
      ctx.fill();
    }

    // Mist puffs (drift horizontally)
    for (var mi = 0; mi < Forest.mistPuffs.length; mi++) {
      var mp = Forest.mistPuffs[mi];
      var mx = ((mp.nx + time * mp.speed) % 1.8 - 0.2) * W;
      var my = mp.ny * H + Math.sin(time * 0.2 + mp.phase) * 10;
      var mr = mp.r * H * 1.2;
      var mAlpha = mp.alpha * (0.75 + Math.sin(time * 0.12 + mp.phase) * 0.25);
      ctx.beginPath();
      ctx.arc(mx, my, mr * 0.4, 0, 6.28);
      ctx.fillStyle = 'rgba(185,180,85,' + (mAlpha * 0.7).toFixed(3) + ')';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(mx, my, mr * 0.7, 0, 6.28);
      ctx.fillStyle = 'rgba(170,165,75,' + (mAlpha * 0.25).toFixed(3) + ')';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, 6.28);
      ctx.fillStyle = 'rgba(155,150,65,' + (mAlpha * 0.08).toFixed(3) + ')';
      ctx.fill();
    }

    // Moving fog wisps near the ground
    for (var fi = 0; fi < 6; fi++) {
      var fx = ((fi * 0.18 + time * 0.008 * (1 + fi * 0.3)) % 1.4 - 0.2) * W;
      var fy = _gY + H * 0.01;
      var fr = H * (0.04 + fi * 0.01);
      ctx.beginPath();
      ctx.arc(fx, fy, fr, 0, 6.28);
      ctx.fillStyle = 'rgba(185,180,80,0.04)';
      ctx.fill();
    }

    // Volumetric light rays (pulse + width flicker)
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (var ri = 0; ri < 8; ri++) {
      var rx = W * (0.05 + ri * 0.13);
      var rPulse = Math.sin(time * 0.15 + ri * 2.1);
      var ra = 0.02 + rPulse * 0.015;
      if (ra < 0.005) continue;
      var rayW = W * (0.025 + Math.abs(rPulse) * 0.015);
      ctx.beginPath();
      ctx.moveTo(rx - rayW * 0.3, 0);
      ctx.lineTo(rx + rayW * 0.3, H * 0.25);
      ctx.lineTo(rx - rayW * 0.5, H * 0.25);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,240,130,' + ra.toFixed(3) + ')';
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(rx - rayW * 0.5, H * 0.25);
      ctx.lineTo(rx + rayW * 1.5, H * 0.7);
      ctx.lineTo(rx - rayW * 0.8, H * 0.7);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,230,100,' + (ra * 0.3).toFixed(3) + ')';
      ctx.fill();
    }
    ctx.restore();

    // Animated decorations — drawn on the main ctx AFTER the
    // scene cache blits so they actually animate (they'd freeze in cache).
    drawRiverRipples(ctx, W, H, H * 0.58, time);
    drawCroc(ctx, W, H, H * 0.58, time);

    drawBigVines(ctx, W, H, time);
    drawSwampAnimated(ctx, W, H, H * 0.58, time);

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
        // Faked glow (2-circle layered alpha). Previously used ctx.shadowBlur
        // on desktop, which is the priciest path in the per-particle loop —
        // swapping for alpha circles gave back several ms/frame on laptops.
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3.2, 0, 6.28);
        ctx.fillStyle = 'rgba(200,255,100,' + (a*fl*0.14).toFixed(3) + ')';
        ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.6, 0, 6.28);
        ctx.fillStyle = 'rgba(220,255,130,' + (a*fl*0.35).toFixed(3) + ')';
        ctx.fill();
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
