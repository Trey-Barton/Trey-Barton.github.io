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

    // Branches — recursive fractal structure. Each entry stores a parent
    // index (-1 = attached to trunk, else another branch's index), a signed
    // angle, and a depth level. Draw-trunk.js walks the array parent-first
    // and derives endpoint positions from the parent chain.
    t.branches = [];
    var maxDepth = (layer === 'fg') ? 3 : (layer === 'mid') ? 2 : 1;
    t.maxDepth = maxDepth;
    function growBranch(parent, yFrac, angle, length, width, depth) {
      if (depth > maxDepth || length < 0.012) return;
      var myIdx = t.branches.length;
      t.branches.push({
        parent: parent,
        yFrac: yFrac,         // only meaningful for depth === 0 (trunk attach)
        angle: angle,         // signed — positive = right, negative = left
        len: length,
        w: width,
        depth: depth,
        stripeCI: Math.floor(r() * BARK.length),
        foliageCI: Math.floor(r() * CANOPY.length),
        foliageAccent: r() < 0.15,
        accentCI: Math.floor(r() * CANOPY_ACCENT.length),
        swayPhase: r() * 6.28,
        swaySpeed: 0.3 + r() * 0.4,
      });
      // Children — right-leaning branches get +1 fork so the right side
      // reads bushier and the left stays clean.
      var rightBias = angle > 0 ? 1 : 0;
      var childCount;
      if (depth === 0)       childCount = (layer === 'fg') ? 2 + Math.floor(r() * 2) + rightBias : 1 + Math.floor(r() * 2) + rightBias;
      else if (depth < maxDepth) childCount = 1 + Math.floor(r() * 2) + rightBias;
      else                   childCount = 0;
      for (var c = 0; c < childCount; c++) {
        var forkOffset;
        if (childCount === 1) {
          forkOffset = (r() - 0.5) * 0.7;
        } else {
          var spread = 0.5 + r() * 0.5;
          forkOffset = (c - (childCount - 1) / 2) * (spread * 2 / Math.max(1, childCount - 1));
        }
        forkOffset += (r() - 0.5) * 0.25;
        var childAngle = angle + forkOffset;
        var cLen = length * (0.55 + r() * 0.25);
        var cW = width * (0.55 + r() * 0.2);
        growBranch(myIdx, yFrac, childAngle, cLen, cW, depth + 1);
      }
    }
    // Seed primary branches off the trunk.
    var nb = (layer === 'fg') ? 5 + Math.floor(r() * 3) : (layer === 'mid') ? 3 + Math.floor(r() * 2) : 2 + Math.floor(r() * 2);
    for (var i = 0; i < nb; i++) {
      var evenY = 0.15 + (i / Math.max(nb - 1, 1)) * 0.55;
      var yF = Math.max(0.12, Math.min(0.72, evenY + (r() - 0.5) * 0.1));
      var dir = (i % 2 === 0) ? 1 : -1;
      if (r() < 0.25) dir = -dir;
      var ang = dir * (0.55 + r() * 0.9);
      var len = ((layer === 'fg') ? 0.1 : (layer === 'mid') ? 0.075 : 0.05) + r() * 0.06;
      var w = t.trunkW * (0.2 + r() * 0.3);
      growBranch(-1, yF, ang, len, w, 0);
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

    // Hanging vines — attach only to primary (depth 0) branches so they don't
    // dangle from deep twigs. Collect those indices first.
    var primaryIdxs = [];
    for (var bIdx = 0; bIdx < t.branches.length; bIdx++) {
      if (t.branches[bIdx].parent < 0) primaryIdxs.push(bIdx);
    }
    t.vines = [];
    var nv = (layer === 'fg') ? 2 + Math.floor(r() * 4) : (layer === 'mid') ? 1 + Math.floor(r() * 3) : Math.floor(r() * 2);
    for (var i = 0; i < nv; i++) {
      t.vines.push({
        branchIdx: primaryIdxs[Math.floor(r() * primaryIdxs.length)],
        tFrac: 0.3 + r() * 0.6,
        len: 0.04 + r() * 0.08,
        swayPhase: r() * 6.28,
        swayAmp: 1.5 + r() * 3,
        thickness: 1 + r() * 2,
        segments: 5 + Math.floor(r() * 5),
      });
    }

    // Root flares — prominent flat buttress roots spreading horizontally
    // from the trunk base (was small, steep, and sparse).
    t.roots = [];
    var nr = (layer === 'fg') ? 5 + Math.floor(r() * 5) : (layer === 'mid') ? 3 + Math.floor(r() * 3) : 1 + Math.floor(r() * 2);
    for (var i = 0; i < nr; i++) {
      t.roots.push({
        dir: r() < 0.5 ? -1 : 1,
        spread: ((layer === 'fg') ? 0.8 : (layer === 'mid') ? 0.6 : 0.45) + r() * 0.9,
        height: ((layer === 'fg') ? 0.04 : (layer === 'mid') ? 0.03 : 0.018) + r() * 0.05,
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
