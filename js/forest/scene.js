/**
 * Forest scene — generate tree layers
 */
window.Forest = window.Forest || {};

(function () {
  'use strict';

  Forest.farTrees  = Forest.genLayer(45, 'far', 42);
  Forest.midTrees  = Forest.genLayer(24, 'mid', 137);
  Forest.fgTrees   = Forest.genLayer(14, 'fg', 99);
})();
