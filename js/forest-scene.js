/**
 * Forest scene — generate tree layers
 */


(function () {
  'use strict';

  Forest.farTrees  = Forest.genLayer(45, 'far', 42);
  Forest.midTrees  = Forest.genLayer(24, 'mid', 137);
  Forest.fgTrees   = Forest.genLayer(18, 'fg', 99);

  // Front-left cluster — original 4-tree configuration restored (no pan).
  (function addFrontLeftTrees() {
    var leftRng = Forest.mkRng(2025);
    for (var i = 0; i < 4; i++) {
      var t = Forest.genTree(leftRng, 'fg');
      t.nx = 0.04 + i * 0.07 + (leftRng() - 0.5) * 0.04;
      t.trunkW *= 1.1 + leftRng() * 0.15;
      Forest.fgTrees.push(t);
    }
  })();
})();
