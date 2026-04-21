/**
 * Forest scene — generate tree layers
 */


(function () {
  'use strict';

  Forest.farTrees  = Forest.genLayer(45, 'far', 42);
  Forest.midTrees  = Forest.genLayer(24, 'mid', 137);
  Forest.fgTrees   = Forest.genLayer(18, 'fg', 99);
  // Guarantee several larger fg trees clustered in the front-left so the
  // hero has a "coming out from behind the tree" feel on load.
  (function addFrontLeftTrees() {
    var leftSeed = 2025;
    var leftRng = Forest.mkRng(leftSeed);
    for (var i = 0; i < 4; i++) {
      var t = Forest.genTree(leftRng, 'fg');
      // Force into the left third with slight variation.
      t.nx = 0.04 + i * 0.07 + (leftRng() - 0.5) * 0.04;
      // Pump them up 10–25% so they visually dominate the front-left.
      t.trunkW *= 1.1 + leftRng() * 0.15;
      Forest.fgTrees.push(t);
    }
  })();
})();
