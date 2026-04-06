/**
 * Forest drawUndergrowth — renders ferns, mushrooms, grass, bushes
 */
window.Forest = window.Forest || {};

(function () {
  'use strict';

  var FERN_COLORS = Forest.FERN_COLORS;
  var CANOPY = Forest.CANOPY;
  var rgb = Forest.rgb;
  var mix = Forest.mix;

  function drawUndergrowth(ctx, W, H, time, layerFilter) {
    var undergrowth = Forest.undergrowth;
    for (var i = 0; i < undergrowth.length; i++) {
      var u = undergrowth[i];
      if (u.layer !== layerFilter) continue;
      var ux = u.nx * W;
      var uy = u.baseY * H;

      if (u.type === 'fern') {
        var sway = Math.sin(time * 0.6 + u.swayPhase) * u.swayAmp;
        var col = FERN_COLORS[u.ci];
        for (var f = 0; f < u.fronds; f++) {
          var angle = -Math.PI * 0.15 + (f / (u.fronds - 1)) * Math.PI * 0.3 - Math.PI * 0.5;
          angle += sway * 0.03;
          ctx.save();
          ctx.translate(ux, uy);
          ctx.rotate(angle);
          // Frond stem
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(u.size * 0.3, -u.size * 0.1, u.size * 0.8, -u.size * 0.05);
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = rgb(mix(col, [30, 50, 25], 0.3), 0.7);
          ctx.stroke();
          // Leaflets
          for (var l = 0; l < 5; l++) {
            var lf = (l + 1) / 6;
            var lx = u.size * 0.8 * lf;
            var ly = -u.size * 0.05 * lf;
            ctx.beginPath();
            ctx.ellipse(lx, ly - 3, 3 + u.size * 0.04, 1.5, -0.3, 0, 6.28);
            ctx.fillStyle = rgb(col, 0.6);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(lx, ly + 3, 3 + u.size * 0.04, 1.5, 0.3, 0, 6.28);
            ctx.fillStyle = rgb(mix(col, [20, 40, 20], 0.15), 0.6);
            ctx.fill();
          }
          ctx.restore();
        }
      } else if (u.type === 'mushroom') {
        var capColors = [[180, 50, 40], [200, 170, 60], [160, 130, 90]];
        var mc = capColors[u.ci];
        // Stem
        ctx.beginPath();
        ctx.moveTo(ux - u.size * 0.15, uy);
        ctx.lineTo(ux - u.size * 0.1, uy - u.size * 0.6);
        ctx.lineTo(ux + u.size * 0.1, uy - u.size * 0.6);
        ctx.lineTo(ux + u.size * 0.15, uy);
        ctx.fillStyle = 'rgba(220,210,180,0.6)';
        ctx.fill();
        // Cap
        ctx.beginPath();
        ctx.ellipse(ux, uy - u.size * 0.6, u.size * 0.4, u.size * 0.25, 0, Math.PI, 0);
        ctx.fillStyle = rgb(mc, 0.7);
        ctx.fill();
        // Cap spots
        ctx.beginPath();
        ctx.arc(ux - u.size * 0.1, uy - u.size * 0.7, u.size * 0.06, 0, 6.28);
        ctx.fillStyle = 'rgba(255,255,240,0.4)';
        ctx.fill();
      } else if (u.type === 'grass') {
        var sway = Math.sin(time * 0.8 + u.swayPhase) * u.swayAmp;
        var col = FERN_COLORS[u.ci];
        for (var bl = 0; bl < u.blades; bl++) {
          var bx = ux + (bl - u.blades / 2) * 3;
          var angle = (bl - u.blades / 2) * 0.08 + sway * 0.04;
          var tipX = bx + Math.sin(angle) * u.height;
          var tipY = uy - u.height;
          ctx.beginPath();
          ctx.moveTo(bx, uy);
          ctx.quadraticCurveTo(bx + angle * 5, uy - u.height * 0.6, tipX, tipY);
          ctx.lineWidth = 1.2;
          ctx.strokeStyle = rgb(col, 0.5);
          ctx.stroke();
        }
      } else if (u.type === 'bush') {
        var sway = Math.sin(time * 0.45 + u.swayPhase) * u.swayAmp;
        for (var bi = 0; bi < u.blobs.length; bi++) {
          var bb = u.blobs[bi];
          var bbx = ux + bb.ox + sway;
          var bby = uy + bb.oy;
          var col = CANOPY[bb.ci];
          // Shadow blob underneath
          ctx.beginPath();
          ctx.ellipse(bbx + 2, bby + 2, bb.r * 1.05, bb.r * bb.squash * 1.05, 0, 0, 6.28);
          ctx.fillStyle = rgb(mix(col, [15, 25, 15], 0.5), 0.2);
          ctx.fill();
          // Main bush blob
          ctx.beginPath();
          ctx.ellipse(bbx, bby, bb.r, bb.r * bb.squash, 0, 0, 6.28);
          ctx.fillStyle = rgb(col, 0.82);
          ctx.fill();
          // Highlight
          ctx.beginPath();
          ctx.ellipse(bbx - bb.r * 0.2, bby - bb.r * bb.squash * 0.2, bb.r * 0.45, bb.r * bb.squash * 0.35, 0, 0, 6.28);
          ctx.fillStyle = rgb(mix(col, [150, 200, 110], 0.2), 0.35);
          ctx.fill();
          // Dark edge
          ctx.beginPath();
          ctx.ellipse(bbx + bb.r * 0.15, bby + bb.r * bb.squash * 0.15, bb.r * 0.4, bb.r * bb.squash * 0.3, 0, 0, 6.28);
          ctx.fillStyle = rgb(mix(col, [20, 35, 18], 0.3), 0.25);
          ctx.fill();
        }
      }
    }
  }

  Forest.drawUndergrowth = drawUndergrowth;
})();
