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

    // Root flares
    for (var ri = 0; ri < tree.roots.length; ri++) {
      var root = tree.roots[ri];
      var rw = wBase * root.spread;
      var rh = root.height * H;
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.quadraticCurveTo(x + root.dir * rw * 0.5, baseY - rh * 0.3, x + root.dir * rw, baseY + rh * 0.5);
      ctx.lineTo(x + root.dir * rw * 0.8, baseY + rh);
      ctx.quadraticCurveTo(x + root.dir * rw * 0.3, baseY + rh * 0.2, x, baseY);
      ctx.fillStyle = rgb(mix(BARK[root.ci], [48, 30, 42], 0.5), 0.8);
      ctx.fill();
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

    // Branches with sub-branches
    for (var bi = 0; bi < tree.branches.length; bi++) {
      var b = tree.branches[bi];
      var by = baseY - trunkH * b.yFrac;
      var bTx = trunkX(b.yFrac);
      var bx = bTx.cx;
      var bLen = b.len * H;
      var bAngle = b.angle * b.dir;
      var sway = Math.sin(time * 0.4 + bi * 1.5) * 0.02;
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

      // Sub-branches
      for (var si = 0; si < b.subCount; si++) {
        var sf = b.subLens[si];
        var sa = b.subAngles[si] * b.subDirs[si] + bAngle;
        var sx = ex + Math.sin(sa) * bLen * sf * 0.5;
        var sy = ey - Math.cos(Math.abs(sa)) * bLen * sf * 0.3;
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.quadraticCurveTo((ex + sx) / 2, Math.min(ey, sy) - 2, sx, sy);
        ctx.lineWidth = bw * 0.15;
        ctx.strokeStyle = 'rgb(42,26,38)';
        ctx.stroke();

        // Small leaf cluster at sub-branch tip
        var lclR = bw * 0.6;
        var lSway = Math.sin(time * 0.5 + bi * 2 + si) * 1;
        var lci = (bi * 3 + si) % CANOPY.length;
        ctx.beginPath();
        ctx.ellipse(sx + lSway, sy, lclR, lclR * 0.6, 0, 0, 6.28);
        ctx.fillStyle = rgb(CANOPY[lci], 0.7);
        ctx.fill();
      }

      // Small foliage tuft at main branch tip
      var tipR = bw * 1.0;
      var tipSway = Math.sin(time * 0.4 + bi * 1.7) * 1.2;
      var tipCI = (bi * 7) % CANOPY.length;
      ctx.beginPath();
      ctx.ellipse(ex + tipSway, ey, tipR, tipR * 0.65, 0, 0, 6.28);
      ctx.fillStyle = rgb(CANOPY[tipCI], 0.75);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(ex + tipSway - tipR * 0.15, ey - tipR * 0.1, tipR * 0.4, tipR * 0.3, 0, 0, 6.28);
      ctx.fillStyle = rgb(mix(CANOPY[tipCI], [150, 200, 110], 0.2), 0.3);
      ctx.fill();

      // A couple small leaves along the branch
      for (var li = 0; li < 2; li++) {
        var lf = 0.35 + li * 0.3;
        var lx = bx + (ex - bx) * lf + Math.sin(time * 0.5 + bi + li) * 0.8;
        var ly = by + (ey - by) * lf - bw * 0.3;
        var leafSz = bw * 0.35;
        var leafCI = (bi + li * 3) % CANOPY.length;
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(-0.3 + li * 0.5 + Math.sin(time * 0.6 + li) * 0.08);
        ctx.beginPath();
        ctx.ellipse(0, 0, leafSz, leafSz * 0.4, 0, 0, 6.28);
        ctx.fillStyle = rgb(CANOPY[leafCI], 0.6);
        ctx.fill();
        ctx.restore();
      }
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
