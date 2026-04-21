/**
 * Forest drawCanopy — renders canopy blobs with highlights and shadows
 */


(function () {
  'use strict';

  var CANOPY = Forest.CANOPY;
  var CANOPY_ACCENT = Forest.CANOPY_ACCENT;
  var rgb = Forest.rgb;
  var mix = Forest.mix;

  function drawCanopy(ctx, tree, x, W, H, time, dimFactor) {
    // Sort by depth for better layering
    for (var i = 0; i < tree.canopy.length; i++) {
      var b = tree.canopy[i];
      var bx = x + b.ox * W + Math.sin(time * 0.35 + b.swayPhase) * b.swayAmp;
      var by = b.oy * H + Math.sin(time * 0.28 + b.swayPhase * 1.3) * b.swayAmp * 0.5;
      var br = b.r * H;

      var color = b.isAccent ? CANOPY_ACCENT[b.accentCI] : CANOPY[b.ci];
      color = mix(color, [25, 40, 30], 1 - dimFactor);

      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(b.rot + Math.sin(time * 0.22 + b.swayPhase) * 0.04);
      ctx.scale(1, b.squash);

      // Shadow underneath (depth illusion)
      if (b.depth > 0.5) {
        ctx.beginPath();
        ctx.arc(br * 0.1, br * 0.15, br * 1.05, 0, 6.28);
        ctx.fillStyle = rgb(mix(color, [15, 25, 15], 0.5), 0.25);
        ctx.fill();
      }

      // Main blob
      ctx.beginPath();
      ctx.arc(0, 0, br, 0, 6.28);
      ctx.fillStyle = rgb(color, 0.9);
      ctx.fill();

      // Highlight
      ctx.beginPath();
      ctx.arc(-br * 0.22, -br * 0.2, br * 0.5, 0, 6.28);
      ctx.fillStyle = rgb(mix(color, [175, 210, 130], 0.22), 0.4);
      ctx.fill();

      // Darker edge
      ctx.beginPath();
      ctx.arc(br * 0.18, br * 0.22, br * 0.55, 0, 6.28);
      ctx.fillStyle = rgb(mix(color, [15, 30, 15], 0.35), 0.28);
      ctx.fill();

      // Tiny leaf texture dots
      if (br > 10 && dimFactor > 0.7) {
        for (var d = 0; d < 4; d++) {
          var dx = (Math.sin(d * 2.1 + b.swayPhase) * br * 0.4);
          var dy = (Math.cos(d * 1.7 + b.swayPhase) * br * 0.3);
          ctx.beginPath();
          ctx.arc(dx, dy, br * 0.12, 0, 6.28);
          ctx.fillStyle = rgb(mix(color, [140, 180, 100], 0.15), 0.3);
          ctx.fill();
        }
      }

      ctx.restore();
    }
  }

  Forest.drawCanopy = drawCanopy;
})();
