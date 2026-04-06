/**
 * Forest tree generation — genTree and genLayer
 */
window.Forest = window.Forest || {};

(function () {
  'use strict';

  var BARK = Forest.BARK;
  var CANOPY = Forest.CANOPY;
  var CANOPY_ACCENT = Forest.CANOPY_ACCENT;
  var mkRng = Forest.mkRng;

  function genTree(r, layer) {
    var t = { nx: r(), layer: layer };

    if (layer === 'fg') {
      t.trunkW = 0.05 + r() * 0.06;
      t.baseY  = 0.94 + r() * 0.14;
      t.topY   = -0.08 + r() * 0.12;
      t.taper  = 0.55 + r() * 0.2;
    } else if (layer === 'mid') {
      t.trunkW = 0.02 + r() * 0.025;
      t.baseY  = 0.72 + r() * 0.1;
      t.topY   = 0.06 + r() * 0.14;
      t.taper  = 0.45 + r() * 0.25;
    } else {
      t.trunkW = 0.009 + r() * 0.014;
      t.baseY  = 0.62 + r() * 0.06;
      t.topY   = 0.1 + r() * 0.18;
      t.taper  = 0.4 + r() * 0.2;
    }

    t.lean = (r() - 0.5) * 0.035;
    // Trunk curvature — sinusoidal bend
    t.curve = (r() - 0.5) * 0.02;
    t.curveFreq = 1 + r() * 1.5;

    // Bark stripes
    t.stripes = [];
    var ns = (layer === 'fg') ? 14 + Math.floor(r() * 14) : (layer === 'mid') ? 9 + Math.floor(r() * 10) : 5 + Math.floor(r() * 6);
    for (var i = 0; i < ns; i++) {
      t.stripes.push({
        pos: r(), w: 0.04 + r() * 0.22,
        ci: Math.floor(r() * BARK.length),
        phase: r() * 6.28, amp: 0.003 + r() * 0.01,
        freq: 3 + r() * 7, alpha: 0.55 + r() * 0.4,
      });
    }

    // Branches
    t.branches = [];
    var nb = (layer === 'fg') ? 3 + Math.floor(r() * 3) : (layer === 'mid') ? 2 + Math.floor(r() * 2) : 1 + Math.floor(r() * 2);
    for (var i = 0; i < nb; i++) {
      // Spread branches evenly up the trunk, with some jitter
      var evenY = 0.15 + (i / Math.max(nb - 1, 1)) * 0.45;
      var jitter = (r() - 0.5) * 0.12;
      // Alternate direction for natural look
      var dir = (i % 2 === 0) ? 1 : -1;
      if (r() < 0.2) dir = -dir; // occasional flip
      // Wider angle range, more horizontal spread
      var angle = 0.6 + r() * 1.0;
      t.branches.push({
        yFrac: Math.max(0.08, Math.min(0.65, evenY + jitter)),
        dir: dir,
        angle: angle,
        len: (layer === 'fg' ? 0.09 : 0.06) + r() * 0.07,
        w: t.trunkW * (0.18 + r() * 0.35),
        stripeCI: Math.floor(r() * BARK.length),
        subCount: Math.floor(r() * 3),
        subAngles: [r() * 0.8, r() * 0.8, r() * 0.8],
        subLens: [0.3 + r() * 0.4, 0.3 + r() * 0.4, 0.3 + r() * 0.4],
        subDirs: [r() < 0.5 ? -1 : 1, r() < 0.5 ? -1 : 1, r() < 0.5 ? -1 : 1],
      });
    }

    // Canopy blobs
    t.canopy = [];
    var trunkH = t.baseY - t.topY;
    var canopyCenter = t.topY + trunkH * 0.04;
    var canopyR = (layer === 'fg') ? 0.14 + r() * 0.1 : (layer === 'mid') ? 0.09 + r() * 0.07 : 0.06 + r() * 0.05;
    var nc = (layer === 'fg') ? 28 + Math.floor(r() * 18) : (layer === 'mid') ? 18 + Math.floor(r() * 12) : 10 + Math.floor(r() * 8);

    for (var i = 0; i < nc; i++) {
      var a = r() * 6.28;
      var d = Math.pow(r(), 0.7) * canopyR; // bias toward edges for fuller canopy
      var blobR = canopyR * (0.2 + r() * 0.5);
      t.canopy.push({
        ox: Math.cos(a) * d * 1.4,
        oy: Math.sin(a) * d * 0.6 - canopyR * 0.45 + canopyCenter,
        r: blobR,
        ci: Math.floor(r() * CANOPY.length),
        isAccent: r() < 0.08,
        accentCI: Math.floor(r() * CANOPY_ACCENT.length),
        swayPhase: r() * 6.28,
        swayAmp: 0.6 + r() * 2.0,
        squash: 0.65 + r() * 0.45,
        rot: (r() - 0.5) * 0.6,
        depth: r(), // for layered shading
      });
    }

    // Hanging vines from branches
    t.vines = [];
    var nv = (layer === 'fg') ? 2 + Math.floor(r() * 4) : (layer === 'mid') ? 1 + Math.floor(r() * 3) : Math.floor(r() * 2);
    for (var i = 0; i < nv; i++) {
      t.vines.push({
        branchIdx: Math.floor(r() * nb),
        tFrac: 0.3 + r() * 0.6, // position along branch
        len: 0.04 + r() * 0.08,
        swayPhase: r() * 6.28,
        swayAmp: 1.5 + r() * 3,
        thickness: 1 + r() * 2,
        segments: 5 + Math.floor(r() * 5),
      });
    }

    // Root flares at base
    t.roots = [];
    var nr = (layer === 'fg') ? 3 + Math.floor(r() * 4) : (layer === 'mid') ? 2 + Math.floor(r() * 2) : Math.floor(r() * 2);
    for (var i = 0; i < nr; i++) {
      t.roots.push({
        dir: r() < 0.5 ? -1 : 1,
        spread: 0.3 + r() * 0.7,
        height: 0.02 + r() * 0.03,
        ci: Math.floor(r() * BARK.length),
      });
    }

    return t;
  }

  function genLayer(count, layer, seed) {
    var r = mkRng(seed), arr = [];
    for (var i = 0; i < count; i++) arr.push(genTree(r, layer));
    return arr;
  }

  Forest.genTree = genTree;
  Forest.genLayer = genLayer;
})();
