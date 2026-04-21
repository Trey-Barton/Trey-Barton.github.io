/**
 * Forest drawTrunk — renders tree trunks, branches, roots, vines
 */


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

    // Root flares — each root attaches at its own trunk offset, launches at
    // its own angle, may split a side-branch partway along its length, and
    // finishes with 3-6 thin fiber roots reaching into the ground.
    for (var ri = 0; ri < tree.roots.length; ri++) {
      var root = tree.roots[ri];
      var rw = wBase * root.spread * 1.6;
      var rh = root.height * H * 0.6;
      var rootColor = mix(BARK[root.ci], [40, 24, 32], 0.3);
      var rootY = baseY + root.yOffset * H;     // slight vertical offset per root
      var ang = root.angle || 0;                 // signed angle from horizontal
      // Direction vector along the root's main axis.
      var ddx = root.dir * Math.cos(ang);
      var ddy = Math.sin(ang) * 0.6 + 0.15;     // mostly horizontal, slight dip
      var tipX = x + ddx * rw;
      var tipY = rootY + ddy * rw * 0.25;

      // Soft shadow below the root.
      ctx.beginPath();
      ctx.ellipse((x + tipX) * 0.5, tipY + rh * 0.4, rw * 0.55, rh * 0.4, 0, 0, 6.28);
      ctx.fillStyle = 'rgba(10,7,12,0.3)';
      ctx.fill();

      // Main root body — quadratic curve with thickness on both sides. Path
      // is an offset polygon along the axis so the taper reads cleanly.
      var perpX = -ddy * rh;    // perpendicular (thickness axis)
      var perpY = ddx * rh;
      // Thick at trunk, thin at tip.
      var thA = 1.0, thB = 0.25;
      ctx.beginPath();
      ctx.moveTo(x + perpX * thA * -0.4, rootY + perpY * thA * -0.4);
      ctx.quadraticCurveTo(
        x + ddx * rw * 0.5 + perpX * thA * -0.3,
        rootY + ddy * rw * 0.15 + perpY * thA * -0.3,
        tipX + perpX * thB * -0.5,
        tipY + perpY * thB * -0.5
      );
      ctx.lineTo(tipX + perpX * thB * 0.5, tipY + perpY * thB * 0.5);
      ctx.quadraticCurveTo(
        x + ddx * rw * 0.5 + perpX * thA * 0.3,
        rootY + ddy * rw * 0.15 + perpY * thA * 0.3,
        x + perpX * thA * 0.4,
        rootY + perpY * thA * 0.4
      );
      ctx.closePath();
      ctx.fillStyle = rgb(rootColor, 0.93);
      ctx.fill();

      // Top-edge highlight — sunlit catch along the upper curve.
      ctx.beginPath();
      ctx.moveTo(x + perpX * thA * -0.4, rootY + perpY * thA * -0.4);
      ctx.quadraticCurveTo(
        x + ddx * rw * 0.5 + perpX * thA * -0.3,
        rootY + ddy * rw * 0.15 + perpY * thA * -0.3,
        tipX + perpX * thB * -0.5,
        tipY + perpY * thB * -0.5
      );
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = rgb(mix(rootColor, [220, 190, 110], 0.4), 0.55);
      ctx.stroke();

      // Side-split: a thinner root-branch forking off partway along the main.
      var sp = root.splitAt;
      var spSign = (root.splitAngle > 0) ? 1 : -1;
      var spBaseX = x + ddx * rw * sp;
      var spBaseY = rootY + ddy * rw * sp * 0.4;
      var spAng = ang + root.splitAngle;
      var spLen = rw * root.splitLen;
      var spTipX = spBaseX + root.dir * Math.cos(spAng) * spLen;
      var spTipY = spBaseY + (Math.sin(spAng) * 0.6 + 0.2) * spLen * 0.3 + spSign * rh * 0.2;
      ctx.beginPath();
      ctx.moveTo(spBaseX, spBaseY);
      ctx.quadraticCurveTo(
        (spBaseX + spTipX) * 0.5,
        (spBaseY + spTipY) * 0.5 + spSign * rh * 0.15,
        spTipX, spTipY
      );
      ctx.lineWidth = Math.max(1.2, rh * 0.9);
      ctx.strokeStyle = rgb(rootColor, 0.85);
      ctx.lineCap = 'round';
      ctx.stroke();

      // Fiber roots — radiate from BOTH the main tip and the side-split tip.
      var fs = root.fiberSeed >>> 0;
      function fRand() { fs = (fs + 0x6d2b79f5) >>> 0; var t = Math.imul(fs ^ (fs >>> 15), 1 | fs); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
      function feather(fromX, fromY, count) {
        for (var fbi = 0; fbi < count; fbi++) {
          var fbLen = rw * (0.12 + fRand() * 0.32);
          var fbAng = (fRand() - 0.5) * 1.1;
          var fbEx = fromX + root.dir * Math.cos(fbAng) * fbLen;
          var fbEy = fromY + Math.abs(Math.sin(fbAng)) * fbLen * 0.35 + rh * 0.25;
          ctx.beginPath();
          ctx.moveTo(fromX, fromY);
          ctx.quadraticCurveTo(fromX + root.dir * fbLen * 0.4, fromY + rh * 0.18, fbEx, fbEy);
          ctx.lineWidth = 0.8 + fRand() * 1.0;
          ctx.strokeStyle = rgb(mix(rootColor, [35, 22, 18], 0.2), 0.5 + fRand() * 0.2);
          ctx.stroke();
          if (fRand() < 0.4) {
            var sfEx = fbEx + root.dir * fbLen * 0.22 * (fRand() + 0.2);
            var sfEy = fbEy + rh * 0.12;
            ctx.beginPath();
            ctx.moveTo(fbEx, fbEy);
            ctx.lineTo(sfEx, sfEy);
            ctx.lineWidth = 0.6;
            ctx.strokeStyle = rgb(mix(rootColor, [35, 22, 18], 0.2), 0.4);
            ctx.stroke();
          }
        }
      }
      feather(tipX, tipY, root.fibers);
      feather(spTipX, spTipY, Math.max(2, Math.floor(root.fibers * 0.6)));
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

    // Branches with sub-branches + tertiary splits. Visible sway comes from
    // a layered sin amplitude (primary + harmonic) that's 4-6× bigger than
    // the old micro-sway. Sub-branches inherit the swayed angle so the
    // whole bough moves together.
    var swayAmpBase = (tree.layer === 'fg') ? 0.12 : (tree.layer === 'mid') ? 0.09 : 0.05;
    for (var bi = 0; bi < tree.branches.length; bi++) {
      var b = tree.branches[bi];
      var by = baseY - trunkH * b.yFrac;
      var bTx = trunkX(b.yFrac);
      var bx = bTx.cx;
      var bLen = b.len * H;
      var bAngle = b.angle * b.dir;
      // Per-branch phase + speed with a secondary harmonic for natural motion.
      var bPh = bi * 1.5 + b.yFrac * 3.7;
      var bSp = 0.4 + (bi % 3) * 0.08;
      var sway = Math.sin(time * bSp + bPh) * swayAmpBase
               + Math.sin(time * bSp * 2.3 + bPh * 1.7) * swayAmpBase * 0.3;
      bAngle += sway;
      var ex = bx + Math.sin(bAngle) * bLen;
      var ey = by - Math.cos(Math.abs(bAngle)) * bLen * 0.4;
      var bw = b.w * W;

      // Skip branches whose tips go off canvas edges
      if (ex < -bw * 2 || ex > W + bw * 2) continue;

      ctx.beginPath();
      ctx.moveTo(bx, by - bw * 0.4);
      ctx.quadraticCurveTo((bx + ex) / 2, Math.min(by, ey) - bw * 0.6, ex, ey);
      ctx.lineTo(ex + b.dir * bw * 0.12, ey + bw * 0.2);
      ctx.quadraticCurveTo((bx + ex) / 2, Math.min(by, ey) + bw * 0.3, bx, by + bw * 0.4);
      ctx.closePath();
      ctx.fillStyle = 'rgb(42,26,38)';
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo((bx + ex) / 2, Math.min(by, ey) - bw * 0.15, ex, ey);
      ctx.lineWidth = bw * 0.45;
      ctx.strokeStyle = rgb(BARK[b.stripeCI], 0.5);
      ctx.stroke();

      // Sub-branches (secondary) + their tertiary forks, all stroked in
      // bark colors so the whole tree reads as one connected woody system.
      var subSway = Math.sin(time * 0.5 + bi * 1.3) * 0.03;
      for (var si = 0; si < b.subCount; si++) {
        var sf = b.subLens[si];
        var sa = b.subAngles[si] * b.subDirs[si] + bAngle + subSway;
        var sx = ex + Math.sin(sa) * bLen * sf * 0.55;
        var sy = ey - Math.cos(Math.abs(sa)) * bLen * sf * 0.35;
        // Dark underlay.
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.quadraticCurveTo((ex + sx) / 2, Math.min(ey, sy) - 2, sx, sy);
        ctx.lineWidth = bw * 0.22;
        ctx.strokeStyle = 'rgb(42,26,38)';
        ctx.stroke();
        // Bark-color highlight stripe.
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.quadraticCurveTo((ex + sx) / 2, Math.min(ey, sy) - 2, sx, sy);
        ctx.lineWidth = Math.max(0.6, bw * 0.12);
        ctx.strokeStyle = rgb(BARK[(b.subStripes && b.subStripes[si]) || b.stripeCI], 0.55);
        ctx.stroke();

        // Tertiary fork at the sub-branch tip — thinner, same bark palette.
        var ta = (b.tertAngles ? b.tertAngles[si] : 0.4) * (b.tertDirs ? b.tertDirs[si] : 1) + sa;
        var tLen = bLen * (b.tertLens ? b.tertLens[si] : 0.35) * 0.5;
        var tx2 = sx + Math.sin(ta) * tLen;
        var ty2 = sy - Math.cos(Math.abs(ta)) * tLen * 0.5;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo((sx + tx2) / 2, Math.min(sy, ty2) - 1, tx2, ty2);
        ctx.lineWidth = Math.max(0.5, bw * 0.1);
        ctx.strokeStyle = rgb(BARK[(b.tertStripes && b.tertStripes[si]) || b.stripeCI], 0.55);
        ctx.stroke();

        // Big nice tuft at tertiary tip — fewer but denser leaf clusters.
        // Three ellipses overlap (shadow + main + highlight) for depth.
        var lclR = bw * 1.3;
        var lSway = Math.sin(time * 0.5 + bi * 2 + si) * 1.3;
        var lci = (bi * 3 + si) % CANOPY.length;
        var lCol = CANOPY[lci];
        // Shadow underneath.
        ctx.beginPath();
        ctx.ellipse(tx2 + lSway + lclR * 0.15, ty2 + lclR * 0.2, lclR, lclR * 0.6, 0, 0, 6.28);
        ctx.fillStyle = rgb(mix(lCol, [15, 25, 15], 0.55), 0.35);
        ctx.fill();
        // Main blob.
        ctx.beginPath();
        ctx.ellipse(tx2 + lSway, ty2, lclR, lclR * 0.65, 0, 0, 6.28);
        ctx.fillStyle = rgb(lCol, 0.88);
        ctx.fill();
        // Sunlit highlight.
        ctx.beginPath();
        ctx.ellipse(tx2 + lSway - lclR * 0.22, ty2 - lclR * 0.18, lclR * 0.55, lclR * 0.35, 0, 0, 6.28);
        ctx.fillStyle = rgb(mix(lCol, [190, 225, 140], 0.3), 0.48);
        ctx.fill();
      }

      // No extra mid-branch leaves — user wants "not too many". The tertiary
      // tufts above provide all the foliage weight for each branch.
    }

    // Vines
    for (var vi = 0; vi < tree.vines.length; vi++) {
      var v = tree.vines[vi];
      if (v.branchIdx >= tree.branches.length) continue;
      var vb = tree.branches[v.branchIdx];
      var vby = baseY - trunkH * vb.yFrac;
      var vbTx = trunkX(vb.yFrac);
      var vbx = vbTx.cx;
      var vbAngle = vb.angle * vb.dir;
      var vbLen = vb.len * H;
      var vsx = vbx + Math.sin(vbAngle) * vbLen * v.tFrac;
      var vsy = vby - Math.cos(Math.abs(vbAngle)) * vbLen * 0.4 * v.tFrac;
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
