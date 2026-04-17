/**
 * Forest drawTrunk — renders tree trunks, branches, roots, vines
 */
window.Forest = window.Forest || {};

(function () {
  'use strict';

  var BARK = Forest.BARK;
  var CANOPY = Forest.CANOPY;
  var rgb = Forest.rgb;
  var mix = Forest.mix;

  function drawTrunk(ctx, tree, x, W, H, time) {
    var baseY = tree.baseY * H;
    var topY  = tree.topY * H;
    var trunkH = baseY - topY;
    var wBase = tree.trunkW * W;
    var wTop  = wBase * tree.taper;

    function trunkX(frac) {
      var w = wBase + (wTop - wBase) * frac;
      var lean = tree.lean * frac * H;
      var curve = Math.sin(frac * tree.curveFreq * Math.PI) * tree.curve * H;
      return { cx: x + lean + curve, hw: w * 0.5 };
    }

    // Root flares — flat buttress roots laying along the ground.
    for (var ri = 0; ri < tree.roots.length; ri++) {
      var root = tree.roots[ri];
      var rw = wBase * root.spread * 1.6;
      var rh = root.height * H * 0.5;
      var rootColor = mix(BARK[root.ci], [40, 24, 32], 0.25);
      // Shadow under the root — thin, long, flat.
      ctx.beginPath();
      ctx.ellipse(x + root.dir * rw * 0.6, baseY + rh * 0.5, rw * 0.75, rh * 0.3, 0, 0, 6.28);
      ctx.fillStyle = 'rgba(15,10,18,0.4)';
      ctx.fill();
      // Main root — thick at trunk, tapering outward nearly horizontal.
      ctx.beginPath();
      ctx.moveTo(x, baseY - rh * 0.3);
      ctx.quadraticCurveTo(x + root.dir * rw * 0.45, baseY - rh * 0.15, x + root.dir * rw, baseY + rh * 0.05);
      ctx.lineTo(x + root.dir * rw * 0.98, baseY + rh * 0.35);
      ctx.quadraticCurveTo(x + root.dir * rw * 0.4, baseY + rh * 0.3, x, baseY + rh * 0.35);
      ctx.closePath();
      ctx.fillStyle = rgb(rootColor, 0.95);
      ctx.fill();
      // Top-edge highlight — sunlight catch.
      ctx.beginPath();
      ctx.moveTo(x, baseY - rh * 0.3);
      ctx.quadraticCurveTo(x + root.dir * rw * 0.45, baseY - rh * 0.15, x + root.dir * rw, baseY + rh * 0.05);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = rgb(mix(rootColor, [220, 190, 110], 0.35), 0.5);
      ctx.stroke();
    }

    // Base trunk fill
    ctx.beginPath();
    ctx.moveTo(x - wBase * 0.5, baseY);
    for (var f = 0; f <= 1; f += 0.04) {
      var tx = trunkX(f);
      ctx.lineTo(tx.cx - tx.hw, baseY - trunkH * f);
    }
    for (var f = 1; f >= 0; f -= 0.04) {
      var tx = trunkX(f);
      ctx.lineTo(tx.cx + tx.hw, baseY - trunkH * f);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgb(42,26,38)';
    ctx.fill();

    // Clip for stripes
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x - wBase * 0.55, baseY + 2);
    for (var f = 0; f <= 1; f += 0.03) {
      var tx = trunkX(f);
      ctx.lineTo(tx.cx - tx.hw - 1, baseY - trunkH * f);
    }
    for (var f = 1; f >= 0; f -= 0.03) {
      var tx = trunkX(f);
      ctx.lineTo(tx.cx + tx.hw + 1, baseY - trunkH * f);
    }
    ctx.closePath();
    ctx.clip();

    // Bark stripes
    var step = Math.max(3, Math.round(4 * (tree.layer === 'far' ? 2 : 1)));
    for (var si = 0; si < tree.stripes.length; si++) {
      var s = tree.stripes[si];
      var color = BARK[s.ci];
      ctx.beginPath();
      for (var py = baseY + 5; py >= topY - 5; py -= step) {
        var frac = (baseY - py) / trunkH;
        var tx = trunkX(Math.max(0, Math.min(1, frac)));
        var localW = tx.hw * 2;
        var sx = tx.cx - tx.hw + s.pos * localW;
        var wave = Math.sin(frac * s.freq * 8 + s.phase + time * 0.1) * s.amp * H;
        ctx.lineTo(sx + wave, py);
      }
      for (var py = topY - 5; py <= baseY + 5; py += step) {
        var frac = (baseY - py) / trunkH;
        var tx = trunkX(Math.max(0, Math.min(1, frac)));
        var localW = tx.hw * 2;
        var sw = s.w * localW;
        var sx = tx.cx - tx.hw + s.pos * localW;
        var wave = Math.sin(frac * s.freq * 8 + s.phase + time * 0.1) * s.amp * H;
        ctx.lineTo(sx + sw + wave, py);
      }
      ctx.closePath();
      ctx.fillStyle = rgb(color, s.alpha);
      ctx.fill();
    }

    // Trunk texture — vertical grain lines
    ctx.globalAlpha = 0.06;
    for (var gi = 0; gi < 6; gi++) {
      var gx = x + (gi / 6 - 0.5) * wBase;
      ctx.beginPath();
      ctx.moveTo(gx, baseY);
      ctx.lineTo(gx + tree.lean * H * 0.5, topY);
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = '#000';
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Highlight edge — left highlight + right shadow (no gradient alloc)
    ctx.fillStyle = 'rgba(255,220,160,0.04)';
    ctx.fillRect(x - wBase * 0.6, topY - 10, wBase * 0.6, trunkH + 20);
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fillRect(x, topY - 10, wBase * 0.6, trunkH + 20);

    ctx.restore();

    // Hierarchical branches — parent-first layout so each child can anchor to
    // its parent's swayed tip. Whole boughs move together with the wind.
    var swayAmpBase = (tree.layer === 'fg') ? 0.11 : (tree.layer === 'mid') ? 0.08 : 0.05;
    var branchEnds = [];
    for (var bi = 0; bi < tree.branches.length; bi++) {
      var b = tree.branches[bi];
      // Per-branch sway phase + speed + secondary harmonic — natural, not robotic.
      var bPh = b.swayPhase, bSp = b.swaySpeed;
      var depthGain = 1 + b.depth * 0.25; // finer tips sway a bit more
      var sway = (Math.sin(time * bSp + bPh)
               +  Math.sin(time * bSp * 2.3 + bPh * 1.7) * 0.25) * swayAmpBase * depthGain;
      var ang = b.angle + sway;
      var bLen = b.len * H;
      var bw   = b.w * W;
      var sx, sy;
      if (b.parent < 0) {
        var attachY = baseY - trunkH * b.yFrac;
        var tx = trunkX(b.yFrac);
        sx = tx.cx; sy = attachY;
      } else {
        var p = branchEnds[b.parent];
        sx = p.ex; sy = p.ey;
      }
      // Branch vector: sideways + slight upward rise (flattened so trees
      // don't all point straight up).
      var dx = Math.sin(ang);
      var dy = -Math.cos(ang) * 0.55;
      var ex = sx + dx * bLen;
      var ey = sy + dy * bLen;
      branchEnds.push({ sx: sx, sy: sy, ex: ex, ey: ey, ang: ang, bw: bw });
    }

    // Mark terminal branches — they carry the foliage clusters.
    var hasChild = new Array(tree.branches.length);
    for (var bi = 0; bi < tree.branches.length; bi++) {
      if (tree.branches[bi].parent >= 0) hasChild[tree.branches[bi].parent] = true;
    }

    // Draw branches parent-first so children overlap joints cleanly.
    for (var bi = 0; bi < tree.branches.length; bi++) {
      var b = tree.branches[bi];
      var be = branchEnds[bi];
      if ((be.sx < -be.bw * 2 && be.ex < -be.bw * 2) ||
          (be.sx > W + be.bw * 2 && be.ex > W + be.bw * 2)) continue;
      var startW = be.bw;
      var tipW = be.bw * Math.max(0.28, 1 - b.depth * 0.22);
      var midX = (be.sx + be.ex) / 2;
      var midY = (be.sy + be.ey) / 2 - be.bw * 0.15;
      // Branch fill (tapered from startW to tipW).
      ctx.beginPath();
      ctx.moveTo(be.sx, be.sy - startW * 0.45);
      ctx.quadraticCurveTo(midX, midY - startW * 0.35, be.ex, be.ey - tipW * 0.35);
      ctx.lineTo(be.ex + tipW * 0.2, be.ey + tipW * 0.35);
      ctx.quadraticCurveTo(midX, midY + startW * 0.2, be.sx, be.sy + startW * 0.45);
      ctx.closePath();
      ctx.fillStyle = 'rgb(42,26,38)';
      ctx.fill();
      // Bark-color stripe on top.
      ctx.beginPath();
      ctx.moveTo(be.sx, be.sy);
      ctx.quadraticCurveTo(midX, midY - startW * 0.1, be.ex, be.ey);
      ctx.lineWidth = Math.max(0.4, startW * (0.4 - b.depth * 0.07));
      ctx.strokeStyle = rgb(BARK[b.stripeCI], 0.5);
      ctx.stroke();
    }

    // Depth-aware foliage — draws after all branch wood so leaves cover tips.
    // Further layers dim toward atmospheric haze (aerial perspective).
    var _lyr = tree.layer;
    var layerDim    = (_lyr === 'far') ? 0.55 : (_lyr === 'mid') ? 0.82 : 1.0;
    var layerFolScl = (_lyr === 'far') ? 0.5  : (_lyr === 'mid') ? 0.85 : 1.0;
    for (var bi = 0; bi < tree.branches.length; bi++) {
      var b = tree.branches[bi];
      var be = branchEnds[bi];
      if (be.ex < -60 || be.ex > W + 60 || be.ey < -60 || be.ey > H + 30) continue;
      var isTerminal = !hasChild[bi];
      var depthT = b.depth / Math.max(1, tree.maxDepth);
      var baseCol = b.foliageAccent ? Forest.CANOPY_ACCENT[b.accentCI] : CANOPY[b.foliageCI];
      // Inner leaves shaded, outer sunlit.
      var shade = 0.65 + depthT * 0.35;
      var col = mix(baseCol, [35, 55, 30], 1 - shade);
      col = mix(col, [95, 120, 75], 1 - layerDim);

      if (isTerminal) {
        var clR = be.bw * (1.1 + depthT * 1.2) * layerFolScl;
        var cSway = Math.sin(time * 0.35 + bi * 1.4) * (1.2 + b.depth * 0.5);
        var squash = 0.55 + Math.abs(Math.sin(bi * 3.1)) * 0.3;
        ctx.save();
        ctx.translate(be.ex + cSway, be.ey);
        ctx.rotate(Math.sin(bi * 1.7) * 0.45);
        // Under-shadow.
        ctx.beginPath();
        ctx.ellipse(clR * 0.15, clR * 0.22, clR, clR * squash, 0, 0, 6.28);
        ctx.fillStyle = rgb(mix(col, [15, 25, 15], 0.55), 0.35 * layerDim);
        ctx.fill();
        // Main blob.
        ctx.beginPath();
        ctx.ellipse(0, 0, clR, clR * squash, 0, 0, 6.28);
        ctx.fillStyle = rgb(col, 0.88 * layerDim);
        ctx.fill();
        // Sunlit highlight.
        ctx.beginPath();
        ctx.ellipse(-clR * 0.22, -clR * 0.2, clR * 0.55, clR * squash * 0.55, 0, 0, 6.28);
        ctx.fillStyle = rgb(mix(col, [185, 225, 135], 0.28), 0.45 * layerDim);
        ctx.fill();
        ctx.restore();

        // Stray leaves poking out of deeper fg/mid terminal clusters.
        if (_lyr !== 'far' && b.depth >= 1) {
          var leafN = 2 + b.depth;
          for (var li = 0; li < leafN; li++) {
            var lAng = (bi * 0.73 + li * 1.31) % 6.28;
            var lDist = clR * (0.75 + (li / leafN) * 0.7);
            var lx = be.ex + Math.cos(lAng) * lDist * 0.85 + cSway * 0.7;
            var ly = be.ey + Math.sin(lAng) * lDist * 0.55;
            var lSz = clR * (0.22 + (li % 3) * 0.05);
            ctx.save();
            ctx.translate(lx, ly);
            ctx.rotate(lAng + Math.PI / 2);
            ctx.beginPath();
            ctx.ellipse(0, 0, lSz, lSz * 0.4, 0, 0, 6.28);
            ctx.fillStyle = rgb(mix(col, [205, 235, 145], 0.15), 0.55 * layerDim);
            ctx.fill();
            ctx.restore();
          }
        }
      } else if (_lyr === 'fg' && b.depth >= tree.maxDepth - 1) {
        // Sparse single leaf on interior near-terminal branches for texture.
        var lf = 0.55 + Math.sin(bi * 1.5) * 0.2;
        var lx = be.sx + (be.ex - be.sx) * lf;
        var ly = be.sy + (be.ey - be.sy) * lf - be.bw * 0.25;
        var lSz = be.bw * 0.6;
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(be.ang + Math.PI / 3);
        ctx.beginPath();
        ctx.ellipse(0, 0, lSz, lSz * 0.45, 0, 0, 6.28);
        ctx.fillStyle = rgb(col, 0.5 * layerDim);
        ctx.fill();
        ctx.restore();
      }
    }

    // Vines — interpolate along the PRIMARY branch using its live, swayed
    // endpoints from branchEnds, so vines ride the wind with their branch.
    for (var vi = 0; vi < tree.vines.length; vi++) {
      var v = tree.vines[vi];
      if (v.branchIdx == null || v.branchIdx >= tree.branches.length) continue;
      var vbEnds = branchEnds[v.branchIdx];
      if (!vbEnds) continue;
      var vsx = vbEnds.sx + (vbEnds.ex - vbEnds.sx) * v.tFrac;
      var vsy = vbEnds.sy + (vbEnds.ey - vbEnds.sy) * v.tFrac;
      var vineLen = v.len * H;

      ctx.beginPath();
      ctx.moveTo(vsx, vsy);
      for (var seg = 1; seg <= v.segments; seg++) {
        var sf = seg / v.segments;
        var vx = vsx + Math.sin(time * 0.5 + v.swayPhase + sf * 3) * v.swayAmp * sf;
        var vy = vsy + vineLen * sf;
        ctx.lineTo(vx, vy);
      }
      ctx.lineWidth = v.thickness;
      ctx.strokeStyle = 'rgba(45,80,40,0.6)';
      ctx.stroke();

      // Tiny leaves on vine
      for (var seg = 2; seg <= v.segments; seg += 2) {
        var sf = seg / v.segments;
        var lx = vsx + Math.sin(time * 0.5 + v.swayPhase + sf * 3) * v.swayAmp * sf;
        var ly = vsy + vineLen * sf;
        ctx.beginPath();
        ctx.ellipse(lx + 3, ly, 3, 1.5, 0.3, 0, 6.28);
        ctx.fillStyle = 'rgba(55,100,45,0.5)';
        ctx.fill();
      }
    }
  }

  Forest.drawTrunk = drawTrunk;
})();
