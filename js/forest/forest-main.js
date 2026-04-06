// Forest canvas render loop — orchestrates all Forest.* modules
window.Forest = window.Forest || {};

try {
(function () {
  'use strict';

  var farTrees = Forest.farTrees;
  var midTrees = Forest.midTrees;
  var fgTrees = Forest.fgTrees;
  /* ════════ CANVAS ════════ */

  var canvas = document.getElementById('bg-canvas');
  var ctx = canvas.getContext('2d', { alpha: false });
  var time = 0, lastTs = null;

  function resize() { var dpr = Math.min(window.devicePixelRatio || 1, Forest.isMobile ? 1.5 : 2);
    canvas.width = window.innerWidth * dpr; canvas.height = Math.max(window.innerHeight, document.documentElement.clientHeight, screen.height) * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); Forest.isMobile = window.innerWidth <= 768; Forest.MAX_PARTICLES = Forest.isMobile ? 150 : 400; }
  var resizeTimer;
  window.addEventListener('resize', function() { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 100); });
  resize();

  // Wind variable — slowly oscillates for natural feel
  var windPhase = 0;

  /* ════════ RENDER LOOP ════════ */

  function frame(ts) {
    if (!window._isPageVisible) { lastTs = null; requestAnimationFrame(frame); return; }
    if (lastTs === null) lastTs = ts;
    var dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;
    time += dt;
    windPhase += dt * 0.15;

    var W = canvas.width, H = canvas.height;
    var wind = Math.sin(windPhase) * 0.5 + Math.sin(windPhase * 2.3) * 0.2;

    // ── Sky gradient (cached — only recreate on resize)
    if (!frame._skyGrad || frame._skyW !== W || frame._skyH !== H) {
      frame._skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.72);
      frame._skyGrad.addColorStop(0,    'Forest.rgb(28,48,68)');
      frame._skyGrad.addColorStop(0.2,  'Forest.rgb(38,68,75)');
      frame._skyGrad.addColorStop(0.4,  'Forest.rgb(65,100,68)');
      frame._skyGrad.addColorStop(0.6,  'Forest.rgb(120,140,60)');
      frame._skyGrad.addColorStop(0.8,  'Forest.rgb(175,170,70)');
      frame._skyGrad.addColorStop(1,    'Forest.rgb(215,200,85)');
      frame._skyW = W; frame._skyH = H;
    }
    ctx.fillStyle = frame._skyGrad;
    ctx.fillRect(0, 0, W, H);

    // ── Stars (subtle)
    for (var i = 0; i < Forest.stars.length; i++) {
      var s = Forest.stars[i];
      ctx.beginPath();
      ctx.arc(s.nx*W, s.ny*H, s.sz, 0, 6.28);
      ctx.fillStyle = 'rgba(210,225,255,'+(0.12+Math.sin(time*0.5+s.ph)*0.08).toFixed(3)+')';
      ctx.fill();
    }

    // ── Multiple horizon glows — strong warm backlight (cached on resize)
    if (!frame._horizonCache || frame._hcW !== W || frame._hcH !== H) {
      frame._cenGlow = ctx.createRadialGradient(W*0.5, H*0.44, 0, W*0.5, H*0.44, H*0.55);
      frame._cenGlow.addColorStop(0, 'rgba(250,220,85,0.3)');
      frame._cenGlow.addColorStop(0.25, 'rgba(240,210,75,0.15)');
      frame._cenGlow.addColorStop(0.5, 'rgba(220,195,65,0.06)');
      frame._cenGlow.addColorStop(1, 'rgba(180,150,50,0)');
      frame._sideGlows = [];
      for (var gi = 0; gi < 4; gi++) {
        var gx = W * (0.15 + gi * 0.23);
        var sg = ctx.createRadialGradient(gx, H*0.47, 0, gx, H*0.47, H*0.4);
        sg.addColorStop(0, 'rgba(245,215,80,0.18)');
        sg.addColorStop(0.3, 'rgba(225,200,65,0.07)');
        sg.addColorStop(1, 'rgba(180,150,50,0)');
        frame._sideGlows.push(sg);
      }
      frame._hBand = ctx.createLinearGradient(0, H * 0.38, 0, H * 0.58);
      frame._hBand.addColorStop(0, 'rgba(230,210,80,0)');
      frame._hBand.addColorStop(0.4, 'rgba(235,215,85,0.08)');
      frame._hBand.addColorStop(0.6, 'rgba(230,210,80,0.06)');
      frame._hBand.addColorStop(1, 'rgba(220,200,75,0)');
      frame._groundGrd = ctx.createLinearGradient(0, H * 0.58, 0, H);
      frame._groundGrd.addColorStop(0,   'Forest.rgb(165,160,65)');
      frame._groundGrd.addColorStop(0.15,'Forest.rgb(130,135,50)');
      frame._groundGrd.addColorStop(0.35,'Forest.rgb(80,95,42)');
      frame._groundGrd.addColorStop(0.6, 'Forest.rgb(50,65,35)');
      frame._groundGrd.addColorStop(1,   'Forest.rgb(30,42,25)');
      frame._horizonCache = true; frame._hcW = W; frame._hcH = H;
    }
    ctx.fillStyle = frame._cenGlow;
    ctx.fillRect(0, 0, W, H);
    for (var gi = 0; gi < 4; gi++) {
      ctx.fillStyle = frame._sideGlows[gi];
      ctx.fillRect(0, 0, W, H);
    }
    ctx.fillStyle = frame._hBand;
    ctx.fillRect(0, H * 0.38, W, H * 0.2);

    // ── Ground
    var gY = H * 0.58;
    ctx.fillStyle = frame._groundGrd;
    ctx.fillRect(0, gY, W, H - gY);

    // ── Golden ground light patches (dappled sunlight — layered circles)
    for (var gi = 0; gi < 10; gi++) {
      var gx = W * (0.04 + gi * 0.1);
      var gy = gY + H * 0.01 + Math.sin(gi * 2.3) * H * 0.02;
      var gpulse = 0.14 + Math.sin(time * 0.25 + gi * 1.8) * 0.05;
      var gRadius = H * (0.05 + Math.sin(gi * 1.1) * 0.02);
      ctx.beginPath();
      ctx.arc(gx, gy, gRadius * 0.5, 0, 6.28);
      ctx.fillStyle = 'rgba(220,210,95,' + (gpulse * 0.7).toFixed(3) + ')';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(gx, gy, gRadius, 0, 6.28);
      ctx.fillStyle = 'rgba(210,200,85,' + (gpulse * 0.2).toFixed(3) + ')';
      ctx.fill();
    }

    // ── Ground texture — rich forest floor detail (static parts cached to offscreen canvas)
    var gRng = Forest.mkRng(999);
    var gBottom = H;
    var gDepth = gBottom - gY;
    var earthR = 95, earthG = 78, earthB = 45;

    // Cache static ground to offscreen canvas (regenerate only on resize)
    if (!frame._groundCache || frame._gcW !== W || frame._gcH !== H || frame._gcGY !== Math.round(gY)) {
      var gc = document.createElement('canvas');
      gc.width = W; gc.height = H;
      var gctx = gc.getContext('2d');
      frame._groundCache = gc;
      frame._gcW = W; frame._gcH = H; frame._gcGY = Math.round(gY);
      var _gRng = Forest.mkRng(999);

      // Base ground color variation
      for (var ep = 0; ep < 25; ep++) {
        var epx = _gRng() * W;
        var epy = gY + _gRng() * gDepth;
        var epsz = H * (0.03 + _gRng() * 0.06);
        gctx.beginPath();
        gctx.ellipse(epx, epy, epsz, epsz * 0.5, _gRng() * 3.14, 0, 6.28);
        gctx.fillStyle = 'rgba(' + earthR + ',' + earthG + ',' + earthB + ',' + (0.15 + _gRng() * 0.12).toFixed(3) + ')';
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

      // Sticks/twigs
      for (var si = 0; si < 45; si++) {
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

      // Rocks/pebbles
      for (var ri = 0; ri < 28; ri++) {
        var rx = _gRng() * W;
        var ry = gY + _gRng() * gDepth;
        var rsz = 2 + _gRng() * 5;
        var rg = 80 + Math.floor(_gRng() * 60);
        gctx.beginPath();
        gctx.ellipse(rx, ry, rsz, rsz * (0.5 + _gRng() * 0.3), _gRng() * 3.14, 0, 6.28);
        gctx.fillStyle = 'rgba(' + rg + ',' + (rg - 5) + ',' + (rg - 15) + ',' + (0.4 + _gRng() * 0.25).toFixed(3) + ')';
        gctx.fill();
      }

      // Moss patches
      for (var msi = 0; msi < 16; msi++) {
        var msx = _gRng() * W;
        var msy = gY + _gRng() * gDepth;
        var msz = 4 + _gRng() * 10;
        gctx.beginPath();
        gctx.ellipse(msx, msy, msz, msz * 0.4, _gRng() * 3.14, 0, 6.28);
        gctx.fillStyle = 'rgba(45,90,30,' + (0.2 + _gRng() * 0.15).toFixed(3) + ')';
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
    ctx.drawImage(frame._groundCache, 0, 0);

    // Advance gRng to stay in sync for any code that follows

    // Animated grass tufts — only these need per-frame rendering (sway animation)
    for (var gti = 0; gti < 70; gti++) {
      var gtx = gRng() * W;
      var gty = gY + gRng() * gDepth;
      var gtH = 8 + gRng() * 20;
      var gtBl = 4 + Math.floor(gRng() * 5);
      var gtSw = Math.sin(time * 0.6 + gti * 1.3) * 1.0;
      var gtC = Forest.FERN_COLORS[Math.floor(gRng() * FERN_COLORS.length)];
      for (var gb = 0; gb < gtBl; gb++) {
        var gbx = gtx + (gb - gtBl / 2) * 2.5;
        var gba = (gb - gtBl / 2) * 0.14 + gtSw * 0.06;
        ctx.beginPath();
        ctx.moveTo(gbx, gty);
        ctx.quadraticCurveTo(gbx + gba * 4, gty - gtH * 0.6, gbx + Math.sin(gba) * gtH * 0.45, gty - gtH);
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = Forest.rgb(gtC, 0.55 + gRng() * 0.2);
        ctx.stroke();
      }
    }

    // (Flowers cached in offscreen ground canvas)

    // ── Distant hills / rolling terrain silhouettes (cached on resize)
    if (!frame._hillCache || frame._hillW !== W || frame._hillH !== H) {
      var hc = document.createElement('canvas');
      hc.width = W; hc.height = H;
      var hctx = hc.getContext('2d');
      var hillRng = Forest.mkRng(7777);
      // Layer 1: furthest hills (blue-green, very muted)
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
      // Distant tree line silhouette along horizon
      for (var dti = 0; dti < 120; dti++) {
        var dtx = hillRng() * W;
        var dty = gY - H * 0.01 - hillRng() * H * 0.04;
        var dth = H * (0.015 + hillRng() * 0.03);
        var dtw = H * (0.004 + hillRng() * 0.006);
        // Tiny tree trunk
        hctx.fillStyle = 'rgba(50,40,30,' + (0.15 + hillRng() * 0.15).toFixed(3) + ')';
        hctx.fillRect(dtx - dtw * 0.3, dty, dtw * 0.6, dth);
        // Tiny canopy blob
        var dcr = dtw * (1.5 + hillRng() * 2);
        hctx.beginPath();
        hctx.arc(dtx, dty - dcr * 0.3, dcr, 0, 6.28);
        var dtcol = Forest.CANOPY[Math.floor(hillRng() * CANOPY.length)];
        hctx.fillStyle = Forest.rgb(Forest.mix(dtcol, [50, 70, 40], 0.5), 0.25 + hillRng() * 0.15);
        hctx.fill();
      }
      // Scattered distant bushes along horizon
      for (var dbi = 0; dbi < 40; dbi++) {
        var dbx = hillRng() * W;
        var dby = gY + hillRng() * H * 0.03;
        var dbr = H * (0.005 + hillRng() * 0.012);
        hctx.beginPath();
        hctx.ellipse(dbx, dby, dbr * 1.8, dbr, 0, 0, 6.28);
        var dbcol = Forest.CANOPY[Math.floor(hillRng() * CANOPY.length)];
        hctx.fillStyle = Forest.rgb(Forest.mix(dbcol, [60, 80, 45], 0.4), 0.2 + hillRng() * 0.15);
        hctx.fill();
      }
      frame._hillCache = hc;
      frame._hillW = W; frame._hillH = H;
    }
    ctx.drawImage(frame._hillCache, 0, 0);

    // ── FAR undergrowth
    Forest.drawUndergrowth(ctx, W, H, time, 'far');

    // ── FAR TREES (thin left third) — single position calc, two draw passes
    var _farPos = [];
    for (var i = 0; i < farTrees.length; i++) {
      var t = farTrees[i];
      var tx = ((t.nx * 1.5 - 0.25) * W + W * 3) % (W * 1.5) - W * 0.25;
      if (tx < W * 0.33 && (i % 3 === 0)) { _farPos.push(null); continue; }
      _farPos.push(tx);
      Forest.drawTrunk(ctx, t, tx, W, H, time);
    }
    for (var i = 0; i < farTrees.length; i++) {
      if (_farPos[i] === null) continue;
      Forest.drawCanopy(ctx, farTrees[i], _farPos[i], W, H, time, 0.65);
    }

    // ── Atmospheric haze — warm golden between layers (cached on resize)
    if (!frame._hazeG || frame._hazeW !== W || frame._hazeH !== H) {
      frame._hazeG = ctx.createLinearGradient(0, H * 0.15, 0, H * 0.7);
      frame._hazeG.addColorStop(0, 'rgba(90,110,60,0.07)');
      frame._hazeG.addColorStop(0.3, 'rgba(140,140,60,0.1)');
      frame._hazeG.addColorStop(0.5, 'rgba(170,160,65,0.08)');
      frame._hazeG.addColorStop(0.7, 'rgba(130,130,55,0.06)');
      frame._hazeG.addColorStop(1, 'rgba(90,100,50,0.03)');
      frame._hazeW = W; frame._hazeH = H;
    }
    ctx.fillStyle = frame._hazeG;
    ctx.fillRect(0, 0, W, H);

    // Golden glow spots between far and mid layers (simplified: layered circles)
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

    // ── MID undergrowth
    Forest.drawUndergrowth(ctx, W, H, time, 'mid');

    // ── MID TREES (thin left third) — single position calc, two draw passes
    var _midPos = [];
    for (var i = 0; i < midTrees.length; i++) {
      var t = midTrees[i];
      var tx = ((t.nx * 1.4 - 0.2) * W + W * 3) % (W * 1.4) - W * 0.2;
      if (tx < W * 0.33 && (i % 3 === 0)) { _midPos.push(null); continue; }
      _midPos.push(tx);
      Forest.drawTrunk(ctx, t, tx, W, H, time);
    }
    for (var i = 0; i < midTrees.length; i++) {
      if (_midPos[i] === null) continue;
      Forest.drawCanopy(ctx, midTrees[i], _midPos[i], W, H, time, 0.82);
    }

    // ── Golden atmosphere between mid and fg (cached on resize)
    if (!frame._midGlow || frame._mgW !== W || frame._mgH !== H) {
      frame._midGlow = ctx.createLinearGradient(0, H * 0.35, 0, H * 0.65);
      frame._midGlow.addColorStop(0, 'rgba(180,170,60,0)');
      frame._midGlow.addColorStop(0.3, 'rgba(200,185,65,0.04)');
      frame._midGlow.addColorStop(0.5, 'rgba(210,195,70,0.06)');
      frame._midGlow.addColorStop(0.7, 'rgba(200,185,65,0.03)');
      frame._midGlow.addColorStop(1, 'rgba(180,170,60,0)');
      frame._mgW = W; frame._mgH = H;
    }
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = frame._midGlow;
    ctx.fillRect(0, H * 0.35, W, H * 0.3);
    ctx.restore();

    // ── Mist puffs — drifting slowly (simplified: layered circles instead of per-frame gradients)
    for (var mi = 0; mi < Forest.mistPuffs.length; mi++) {
      var mp = Forest.mistPuffs[mi];
      var mx = ((mp.nx + time * mp.speed) % 1.8 - 0.2) * W;
      var my = mp.ny * H + Math.sin(time * 0.2 + mp.phase) * 10;
      var mr = mp.r * H * 1.2;
      var mAlpha = mp.alpha * (0.75 + Math.sin(time * 0.12 + mp.phase) * 0.25);
      // Core
      ctx.beginPath();
      ctx.arc(mx, my, mr * 0.4, 0, 6.28);
      ctx.fillStyle = 'rgba(185,180,85,' + (mAlpha * 0.7).toFixed(3) + ')';
      ctx.fill();
      // Mid ring
      ctx.beginPath();
      ctx.arc(mx, my, mr * 0.7, 0, 6.28);
      ctx.fillStyle = 'rgba(170,165,75,' + (mAlpha * 0.25).toFixed(3) + ')';
      ctx.fill();
      // Outer ring
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, 6.28);
      ctx.fillStyle = 'rgba(155,150,65,' + (mAlpha * 0.08).toFixed(3) + ')';
      ctx.fill();
    }

    // ── Ground fog band — thicker, more layered (cached on resize)
    if (!frame._fogG || frame._fogW !== W || frame._fogH !== H) {
      frame._fogG = ctx.createLinearGradient(0, gY - 50, 0, gY + 70);
      frame._fogG.addColorStop(0, 'rgba(175,170,72,0)');
      frame._fogG.addColorStop(0.2, 'rgba(180,175,75,0.06)');
      frame._fogG.addColorStop(0.4, 'rgba(185,180,78,0.14)');
      frame._fogG.addColorStop(0.6, 'rgba(170,168,70,0.1)');
      frame._fogG.addColorStop(0.8, 'rgba(160,158,65,0.05)');
      frame._fogG.addColorStop(1, 'rgba(150,148,60,0)');
      frame._fogW = W; frame._fogH = H;
    }
    ctx.fillStyle = frame._fogG;
    ctx.fillRect(0, gY - 50, W, 120);

    // Moving fog wisps at ground level — use simple solid circles instead of gradients
    for (var fi = 0; fi < 6; fi++) {
      var fx = ((fi * 0.18 + time * 0.008 * (1 + fi * 0.3)) % 1.4 - 0.2) * W;
      var fy = gY + H * 0.01;
      var fr = H * (0.04 + fi * 0.01);
      ctx.beginPath();
      ctx.arc(fx, fy, fr, 0, 6.28);
      ctx.fillStyle = 'rgba(185,180,80,0.04)';
      ctx.fill();
    }

    // ── FG undergrowth
    Forest.drawUndergrowth(ctx, W, H, time, 'fg');

    // ── Depth-sorted FG scene: trees + undergrowth sorted by Y
    // Cache undergrowth items (only depend on W/H, regenerate on resize)
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
          col: Forest.CANOPY[Math.floor(fgU() * CANOPY.length)], seed: fgU() * 9999 });
      }
      // Grass tufts
      for (var ugi = 0; ugi < 74; ugi++) {
        var ugy = ugZoneTop + fgU() * ugRange;
        var depthT = (ugy - ugZoneTop) / ugRange;
        frame._fgUG.push({ type: 'grass', x: fgU() * W, y: ugy, depth: depthT,
          h: (6 + depthT * 18 + fgU() * 8), blades: 3 + Math.floor(fgU() * 4 + depthT * 2),
          col: Forest.FERN_COLORS[Math.floor(fgU() * FERN_COLORS.length)], idx: ugi });
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
          col: Forest.LEAF_COLORS[Math.floor(fgU() * LEAF_COLORS.length)] });
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
      // Pre-sort undergrowth by Y (stable across frames)
      frame._fgUG.sort(function(a, b) { return a.y - b.y; });
      frame._fgUGW = W; frame._fgUGH = H;
    }

    // Collect FG tree positions (thin left third)
    var _fgTreeItems = [];
    for (var i = 0; i < fgTrees.length; i++) {
      var t = fgTrees[i];
      var tx = ((t.nx * 1.6 - 0.3) * W + W * 3) % (W * 1.6) - W * 0.3;
      if (tx < W * 0.33 && (i % 3 === 0)) continue;
      _fgTreeItems.push({ tree: t, tx: tx, y: gY + t.nx * H * 0.03 });
    }
    _fgTreeItems.sort(function(a, b) { return a.y - b.y; });

    // Draw undergrowth first (sorted), then trees on top (sorted)
    var fgUG = frame._fgUG;

    // Draw undergrowth in depth order (cached), then trees on top
    for (var fi = 0; fi < fgUG.length; fi++) {
      var item = fgUG[fi];

      if (item.type === 'bush') {
        var bR2 = Forest.mkRng(Math.floor(item.seed));
        var bDark = Forest.mix(item.col, [18, 30, 15], 0.45);
        for (var bc = 0; bc < 3 + Math.floor(bR2() * 4); bc++) {
          var bcx = item.x + (bR2() - 0.5) * item.sz * 2.8;
          var bcy = item.y + (bR2() - 0.5) * item.sz * 0.6 - item.sz * 0.4;
          var bcr = item.sz * (0.45 + bR2() * 0.55);
          ctx.beginPath();
          ctx.arc(bcx, bcy, bcr, 0, 6.28);
          ctx.fillStyle = Forest.rgb(Forest.mix(bDark, item.col, bR2() * 0.5), 0.55 + item.depth * 0.25);
          ctx.fill();
        }

      } else if (item.type === 'grass') {
        var gSw = Math.sin(time * 0.55 + item.idx * 1.2) * 1.2;
        for (var gb = 0; gb < item.blades; gb++) {
          var gbx = item.x + (gb - item.blades / 2) * (2 + item.depth * 1.5);
          var gba = (gb - item.blades / 2) * 0.15 + gSw * 0.07;
          ctx.beginPath();
          ctx.moveTo(gbx, item.y);
          ctx.quadraticCurveTo(gbx + gba * 4, item.y - item.h * 0.6, gbx + Math.sin(gba) * item.h * 0.5, item.y - item.h);
          ctx.lineWidth = 0.8 + item.depth * 0.8;
          ctx.strokeStyle = Forest.rgb(item.col, 0.5 + item.depth * 0.25);
          ctx.stroke();
        }

      } else if (item.type === 'stick') {
        var stEx = item.x + Math.cos(item.angle) * item.len;
        var stEy = item.y + Math.sin(item.angle) * item.len * 0.2;
        ctx.beginPath();
        ctx.moveTo(item.x, item.y);
        ctx.lineTo(stEx, stEy);
        ctx.lineWidth = item.lw;
        ctx.strokeStyle = 'rgba(75,58,32,' + (0.3 + item.depth * 0.3).toFixed(3) + ')';
        ctx.stroke();
        if (item.fork) {
          var fkx = item.x + (stEx - item.x) * 0.55;
          var fky = item.y + (stEy - item.y) * 0.55;
          ctx.beginPath();
          ctx.moveTo(fkx, fky);
          ctx.lineTo(fkx + Math.cos(item.fAngle + item.angle) * item.len * 0.4, fky + Math.sin(item.fAngle + item.angle) * item.len * 0.1);
          ctx.lineWidth = item.lw * 0.6;
          ctx.strokeStyle = 'rgba(68,52,30,' + (0.25 + item.depth * 0.25).toFixed(3) + ')';
          ctx.stroke();
        }

      } else if (item.type === 'leaf') {
        ctx.save();
        ctx.translate(item.x, item.y);
        ctx.rotate(item.rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, item.sz, item.sz * 0.4, 0, 0, 6.28);
        ctx.fillStyle = Forest.rgb(Forest.mix(item.col, [35, 45, 22], 0.2), 0.4 + item.depth * 0.25);
        ctx.fill();
        ctx.restore();

      } else if (item.type === 'rock') {
        ctx.beginPath();
        ctx.ellipse(item.x, item.y, item.sz, item.sz * item.aspect, item.rot, 0, 6.28);
        ctx.fillStyle = 'rgba(80,74,52,' + (0.3 + item.depth * 0.3).toFixed(3) + ')';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(item.x - item.sz * 0.2, item.y - item.sz * 0.2, item.sz * 0.3, 0, 6.28);
        ctx.fillStyle = 'rgba(125,118,88,0.15)';
        ctx.fill();

      } else if (item.type === 'flower') {
        ctx.beginPath();
        ctx.moveTo(item.x, item.y);
        ctx.lineTo(item.x, item.y - item.sz * 4);
        ctx.lineWidth = 0.6 + item.depth * 0.4;
        ctx.strokeStyle = 'rgba(50,90,30,0.5)';
        ctx.stroke();
        var fpy = item.y - item.sz * 4;
        for (var fp = 0; fp < 5; fp++) {
          var pa = fp * 1.256;
          ctx.beginPath();
          ctx.arc(item.x + Math.cos(pa) * item.sz * 0.6, fpy + Math.sin(pa) * item.sz * 0.6, item.sz * 0.5, 0, 6.28);
          ctx.fillStyle = 'rgba(' + item.petalCol[0] + ',' + item.petalCol[1] + ',' + item.petalCol[2] + ',' + (0.35 + item.depth * 0.25).toFixed(3) + ')';
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(item.x, fpy, item.sz * 0.35, 0, 6.28);
        ctx.fillStyle = 'rgba(240,230,105,0.45)';
        ctx.fill();
      }
    }
    // Draw FG trees on top of undergrowth (sorted by Y)
    for (var fi = 0; fi < _fgTreeItems.length; fi++) {
      var ti = _fgTreeItems[fi];
      Forest.drawTrunk(ctx, ti.tree, ti.tx, W, H, time);
      Forest.drawCanopy(ctx, ti.tree, ti.tx, W, H, time, 1.0);
    }

    // ── Dense canopy fill across the top — multiple overlapping passes
    var cR = Forest.mkRng(333);
    // Pass 1: large background blobs for solid coverage
    for (var ci = 0; ci < 30; ci++) {
      var cx = cR() * W * 1.3 - W * 0.15;
      var cy = cR() * H * 0.18 - H * 0.04;
      var cr = H * (0.06 + cR() * 0.09);
      var col = Forest.CANOPY[Math.floor(cR() * CANOPY.length)];
      col = Forest.mix(col, [35, 60, 35], 0.2); // darker base layer
      var sway = Math.sin(time * 0.25 + ci * 0.9) * 1.2 + wind * 1.5;
      ctx.beginPath();
      ctx.ellipse(cx + sway, cy, cr * (1.0 + cR() * 0.4), cr * (0.6 + cR() * 0.3), (cR()-0.5)*0.4, 0, 6.28);
      ctx.fillStyle = Forest.rgb(col, 0.92);
      ctx.fill();
    }
    // Pass 2: medium detail blobs
    cR = Forest.mkRng(444);
    for (var ci = 0; ci < 50; ci++) {
      var cx = cR() * W * 1.3 - W * 0.15;
      var cy = cR() * H * 0.22 - H * 0.02;
      var cr = H * (0.03 + cR() * 0.06);
      var col = Forest.CANOPY[Math.floor(cR() * CANOPY.length)];
      var isAcc = cR() < 0.07;
      if (isAcc) col = Forest.CANOPY_ACCENT[Math.floor(cR() * CANOPY_ACCENT.length)];
      var sway = Math.sin(time * 0.3 + ci * 0.7) * 1.8 + wind * 2;
      ctx.beginPath();
      ctx.ellipse(cx + sway, cy, cr * (0.85 + cR() * 0.35), cr * (0.55 + cR() * 0.35), (cR()-0.5)*0.5, 0, 6.28);
      ctx.fillStyle = Forest.rgb(col, 0.88);
      ctx.fill();
      // Highlight
      ctx.beginPath();
      ctx.arc(cx + sway - cr * 0.18, cy - cr * 0.12, cr * 0.42, 0, 6.28);
      ctx.fillStyle = Forest.rgb(Forest.mix(col, [155,200,115], 0.22), 0.38);
      ctx.fill();
      // Shadow
      ctx.beginPath();
      ctx.arc(cx + sway + cr * 0.12, cy + cr * 0.14, cr * 0.38, 0, 6.28);
      ctx.fillStyle = Forest.rgb(Forest.mix(col, [18, 30, 15], 0.35), 0.28);
      ctx.fill();
    }
    // Pass 3: small top detail blobs for bumpy organic edge
    cR = Forest.mkRng(555);
    for (var ci = 0; ci < 35; ci++) {
      var cx = cR() * W * 1.2 - W * 0.1;
      var cy = cR() * H * 0.12 - H * 0.01;
      var cr = H * (0.015 + cR() * 0.035);
      var col = Forest.CANOPY[Math.floor(cR() * CANOPY.length)];
      var sway = Math.sin(time * 0.35 + ci * 1.1) * 1.2 + wind * 1.5;
      ctx.beginPath();
      ctx.arc(cx + sway, cy, cr, 0, 6.28);
      ctx.fillStyle = Forest.rgb(Forest.mix(col, [120, 170, 90], 0.15), 0.85);
      ctx.fill();
    }

    // ── Hanging canopy drips (small downward extensions)
    cR = Forest.mkRng(666);
    for (var di = 0; di < 20; di++) {
      var dx = cR() * W;
      var dy = H * (0.12 + cR() * 0.15);
      var dLen = H * (0.02 + cR() * 0.05);
      var col = Forest.CANOPY[Math.floor(cR() * CANOPY.length)];
      var sway = Math.sin(time * 0.4 + di * 1.3) * 1.5 + wind;
      ctx.beginPath();
      ctx.moveTo(dx + sway - 4, dy);
      ctx.quadraticCurveTo(dx + sway, dy + dLen, dx + sway + 4, dy);
      ctx.fillStyle = Forest.rgb(col, 0.7);
      ctx.fill();
    }

    // ── Volumetric light rays (simplified: alpha triangles, no per-frame gradient alloc)
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (var ri = 0; ri < 8; ri++) {
      var rx = W * (0.05 + ri * 0.13);
      var rPulse = Math.sin(time * 0.15 + ri * 2.1);
      var ra = 0.02 + rPulse * 0.015;
      if (ra < 0.005) continue;
      var rayW = W * (0.025 + Math.abs(rPulse) * 0.015);
      // Upper bright portion
      ctx.beginPath();
      ctx.moveTo(rx - rayW * 0.3, 0);
      ctx.lineTo(rx + rayW * 0.3, H * 0.25);
      ctx.lineTo(rx - rayW * 0.5, H * 0.25);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,240,130,' + ra.toFixed(3) + ')';
      ctx.fill();
      // Lower fading portion
      ctx.beginPath();
      ctx.moveTo(rx - rayW * 0.5, H * 0.25);
      ctx.lineTo(rx + rayW * 1.5, H * 0.7);
      ctx.lineTo(rx - rayW * 0.8, H * 0.7);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,230,100,' + (ra * 0.3).toFixed(3) + ')';
      ctx.fill();
    }
    ctx.restore();

    // ── Warm color grading — golden hour wash
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = 'rgba(180,160,60,0.03)';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // ── Vignette — stronger for depth (cached on resize)
    if (!frame._vig || frame._vigW !== W || frame._vigH !== H) {
      frame._vig = ctx.createRadialGradient(W/2, H*0.38, H*0.12, W/2, H*0.38, H*0.95);
      frame._vig.addColorStop(0, 'rgba(0,0,0,0)');
      frame._vig.addColorStop(0.6, 'rgba(8,18,12,0.08)');
      frame._vig.addColorStop(0.8, 'rgba(10,20,15,0.18)');
      frame._vig.addColorStop(1, 'rgba(8,16,10,0.35)');
      frame._vigW = W; frame._vigH = H;
    }
    ctx.fillStyle = frame._vig;
    ctx.fillRect(0, 0, W, H);

    // ── Particles — spawn rates scaled for mobile
    var spawnMul = Forest.isMobile ? 0.4 : 1;
    if (Math.random() < 0.05 * spawnMul) Forest.spawnP('firefly', W, H);
    if (Math.random() < 0.1 * spawnMul) Forest.spawnP('spore', W, H);
    if (Math.random() < 0.18 * spawnMul) Forest.spawnP('leaf', W, H);
    if (!Forest.isMobile && Math.random() < 0.12) Forest.spawnP('leaf', W, H);
    if (Math.random() < 0.04 * spawnMul) Forest.spawnP('petal', W, H);
    if (Math.random() < 0.08 * spawnMul) Forest.spawnP('dust', W, H);

    for (var i = Forest.particles.length - 1; i >= 0; i--) {
      var p = Forest.particles[i];
      p.life--;
      if (p.life <= 0) { Forest.particles[i] = Forest.particles[Forest.particles.length - 1]; Forest.particles.pop(); continue; }
      var lr = p.life / p.ml;
      var a = lr < 0.15 ? lr/0.15 : (lr > 0.85 ? (1-lr)/0.15 : 1);

      if (p.type === 'firefly') {
        p.ph += p.fs;
        p.vx += (Math.random()-0.5)*0.012 + wind * 0.003;
        p.vy += (Math.random()-0.5)*0.008;
        p.x += p.vx; p.y += p.vy;
        var fl = 0.25+Math.sin(p.ph)*0.6;
        // Glow via shadowBlur (GPU-accelerated, no gradient alloc)
        ctx.save();
        ctx.shadowColor = 'rgba(200,255,100,' + (a*fl*0.6).toFixed(3) + ')';
        ctx.shadowBlur = p.r * 12;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.5, 0, 6.28);
        ctx.fillStyle = 'rgba(200,255,100,' + (a*fl*0.5).toFixed(3) + ')';
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
        // Core bright dot
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r*0.8,0,6.28);
        ctx.fillStyle = 'rgba(240,255,180,'+(a*fl*0.9).toFixed(3)+')'; ctx.fill();
      } else if (p.type === 'spore') {
        p.x += p.vx+Math.sin(time*0.8+p.ph)*0.3 + wind * 0.2;
        p.y += p.vy;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,6.28);
        ctx.fillStyle = 'rgba(225,225,180,'+(a*0.35).toFixed(3)+')'; ctx.fill();
      } else if (p.type === 'leaf') {
        // Realistic leaf flutter: oscillating horizontal drift + tumble
        p.vx += wind * 0.008;
        p.x += p.vx + Math.sin(time * p.flutterSpeed + p.ph) * p.flutter;
        p.y += p.vy + Math.sin(time * 0.3 + p.ph * 2) * 0.15;
        p.rot += p.rs + Math.cos(time * p.flutterSpeed + p.ph) * 0.02;
        if (p.y > H + 20) p.life = 0;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        if (p.leafType === 0) {
          // Oval leaf
          ctx.beginPath();
          ctx.ellipse(0, 0, p.sz, p.sz * 0.4, 0, 0, 6.28);
          ctx.fillStyle = Forest.rgb(p.c, a * 0.75);
          ctx.fill();
          // Vein
          ctx.beginPath();
          ctx.moveTo(-p.sz * 0.7, 0);
          ctx.lineTo(p.sz * 0.7, 0);
          ctx.lineWidth = 0.5;
          ctx.strokeStyle = Forest.rgb(Forest.mix(p.c, [255,255,200], 0.3), a * 0.3);
          ctx.stroke();
        } else if (p.leafType === 1) {
          // Pointed leaf
          ctx.beginPath();
          ctx.moveTo(-p.sz, 0);
          ctx.quadraticCurveTo(-p.sz * 0.3, -p.sz * 0.45, p.sz, 0);
          ctx.quadraticCurveTo(-p.sz * 0.3, p.sz * 0.45, -p.sz, 0);
          ctx.fillStyle = Forest.rgb(p.c, a * 0.75);
          ctx.fill();
        } else {
          // Round leaf
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
