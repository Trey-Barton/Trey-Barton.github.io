/**
 * Forest scene — generate tree layers
 */


(function () {
  'use strict';

  Forest.farTrees  = Forest.genLayer(45, 'far', 42);
  Forest.midTrees  = Forest.genLayer(24, 'mid', 137);
  Forest.fgTrees   = Forest.genLayer(14, 'fg', 99);   // back to 14 (was 18)

  // Front-left cluster — smaller + shifted further left, so the camera
  // reads as panned leftward without the trees dominating the foreground.
  (function addFrontLeftTrees() {
    var leftRng = Forest.mkRng(2025);
    for (var i = 0; i < 3; i++) {                     // 3 trees (was 4)
      var t = Forest.genTree(leftRng, 'fg');
      // Cluster pushed hard left (nx range 0.0–0.18 instead of 0.04–0.25).
      t.nx = 0.00 + i * 0.06 + (leftRng() - 0.5) * 0.03;
      // Only 0-10% boost (was 10-25%) — they frame the hero without
      // crowding out the rest of the scene.
      t.trunkW *= 1.0 + leftRng() * 0.10;
      Forest.fgTrees.push(t);
    }
  })();
})();
