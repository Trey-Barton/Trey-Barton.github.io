!function(){"use strict";
// ── Quality-aware tree counts (kept in sync with forest-gl.js QUALITY_TIERS) ─
var w=window.innerWidth,q=w<=768?"low":w<=1440?"medium":"high";
var counts={low:{far:18,mid:10,fg:5},medium:{far:35,mid:18,fg:10},high:{far:45,mid:24,fg:12}};
var c=counts[q];
Forest.farTrees=Forest.genLayer(c.far,"far",42),
Forest.midTrees=Forest.genLayer(c.mid,"mid",137),
Forest.fgTrees=Forest.genLayer(c.fg,"fg",99),
function(){for(var e=Forest.mkRng(2025),r=0;r<2;r++){var s=Forest.genTree(e,"fg");s.nx=.04+.07*r+.04*(e()-.5),s.trunkW*=1.1+.15*e(),Forest.fgTrees.push(s)}}()}();