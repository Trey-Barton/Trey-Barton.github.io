/**
 * Forest undergrowth generation — ferns, mushrooms, grass, bushes
 */
window.Forest = window.Forest || {};

(function () {
  'use strict';

  var mkRng = Forest.mkRng;
  var FERN_COLORS = Forest.FERN_COLORS;
  var CANOPY = Forest.CANOPY;

  var undergrowth = [];
  (function() {
    var r = mkRng(777);
    // Layer-specific baseY ranges — match where tree bases actually are
    // far trees: baseY 0.62–0.68, mid trees: 0.72–0.82, fg trees: 0.94–1.08
    function layerBaseY(layer, r) {
      if (layer === 'far') return 0.62 + r * 0.08;   // 0.62–0.70
      if (layer === 'mid') return 0.74 + r * 0.10;   // 0.74–0.84
      return 0.88 + r * 0.12;                         // 0.88–1.00 (fg)
    }
    // Ferns
    for (var i = 0; i < 40; i++) {
      var layer = r() < 0.3 ? 'far' : (r() < 0.6 ? 'mid' : 'fg');
      undergrowth.push({
        type: 'fern', nx: r(), baseY: layerBaseY(layer, r()),
        size: 15 + r() * 35, fronds: 4 + Math.floor(r() * 5),
        ci: Math.floor(r() * FERN_COLORS.length),
        swayPhase: r() * 6.28, swayAmp: 1 + r() * 2,
        layer: layer,
      });
    }
    // Mushrooms
    for (var i = 0; i < 15; i++) {
      var layer = r() < 0.4 ? 'mid' : 'fg';
      undergrowth.push({
        type: 'mushroom', nx: r(), baseY: layerBaseY(layer, r()),
        size: 4 + r() * 10, ci: Math.floor(r() * 3),
        layer: layer,
      });
    }
    // Grass tufts
    for (var i = 0; i < 60; i++) {
      var layer = r() < 0.25 ? 'far' : (r() < 0.55 ? 'mid' : 'fg');
      undergrowth.push({
        type: 'grass', nx: r(), baseY: layerBaseY(layer, r()),
        blades: 5 + Math.floor(r() * 8), height: 10 + r() * 25,
        ci: Math.floor(r() * FERN_COLORS.length),
        swayPhase: r() * 6.28, swayAmp: 1 + r() * 3,
        layer: layer,
      });
    }
    // Bushes — small leafy clusters at ground level
    for (var i = 0; i < 15; i++) {
      var layer = r() < 0.3 ? 'far' : (r() < 0.6 ? 'mid' : 'fg');
      var blobCount = 2 + Math.floor(r() * 3);
      var blobs = [];
      for (var j = 0; j < blobCount; j++) {
        blobs.push({
          ox: (r() - 0.5) * 16,
          oy: -r() * 8,
          r: 5 + r() * 10,
          ci: Math.floor(r() * CANOPY.length),
          squash: 0.55 + r() * 0.35,
        });
      }
      undergrowth.push({
        type: 'bush', nx: r(), baseY: layerBaseY(layer, r()),
        blobs: blobs,
        swayPhase: r() * 6.28, swayAmp: 0.8 + r() * 1.5,
        layer: layer,
      });
    }
    // Sort undergrowth by baseY so items draw back-to-front within each layer
    undergrowth.sort(function(a, b) { return a.baseY - b.baseY; });
  })();

  Forest.undergrowth = undergrowth;
})();
