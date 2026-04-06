/**
 * Forest palette — colors and color utility functions
 */
window.Forest = window.Forest || {};

(function () {
  'use strict';

  function mkRng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function rgb(c, a) {
    return a !== undefined
      ? 'rgba('+Math.round(c[0])+','+Math.round(c[1])+','+Math.round(c[2])+','+(+a).toFixed(3)+')'
      : 'rgb('+Math.round(c[0])+','+Math.round(c[1])+','+Math.round(c[2])+')';
  }
  function mix(a, b, t) { return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t]; }

  var BARK = [
    [200, 80, 25], [225, 150, 40], [150, 35, 70], [90, 25, 55],
    [235, 170, 45], [175, 55, 25], [45, 35, 65], [210, 100, 30],
    [120, 30, 45], [180, 125, 35], [160, 60, 30], [100, 40, 60],
  ];

  var CANOPY = [
    [55, 105, 58], [75, 130, 55], [50, 90, 50], [95, 150, 50],
    [65, 115, 72], [40, 78, 45], [88, 138, 42], [55, 100, 62],
    [105, 155, 55], [48, 88, 55], [70, 120, 48], [38, 72, 40],
    [82, 125, 60], [60, 95, 55],
  ];

  var CANOPY_ACCENT = [
    [85, 145, 50], [100, 160, 55], [110, 140, 40],
    [70, 130, 45], [95, 155, 50], [120, 165, 55],
  ];

  var LEAF_COLORS = [
    [55, 120, 50], [70, 140, 55], [45, 100, 45], [80, 150, 60],
    [60, 110, 48], [50, 95, 42], [90, 155, 55], [65, 125, 52],
    [75, 135, 45], [55, 105, 50],
  ];

  var FERN_COLORS = [
    [45, 90, 42], [55, 110, 48], [65, 100, 40], [50, 85, 50],
    [70, 120, 45], [40, 75, 38],
  ];

  Forest.mkRng = mkRng;
  Forest.rgb = rgb;
  Forest.mix = mix;
  Forest.BARK = BARK;
  Forest.CANOPY = CANOPY;
  Forest.CANOPY_ACCENT = CANOPY_ACCENT;
  Forest.LEAF_COLORS = LEAF_COLORS;
  Forest.FERN_COLORS = FERN_COLORS;
})();
