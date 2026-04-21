/**
 * Forest particles — fireflies, spores, leaves, petals, dust, stars, mist
 */


(function () {
  'use strict';

  var LEAF_COLORS = Forest.LEAF_COLORS;
  var mkRng = Forest.mkRng;

  Forest.isMobile = window.innerWidth <= 768;

  var particles = [];
  var MAX_PARTICLES = Forest.isMobile ? 150 : 400;

  window._isPageVisible = true;
  document.addEventListener('visibilitychange', function() { window._isPageVisible = !document.hidden; });

  function spawnP(type, W, H) {
    if (particles.length >= MAX_PARTICLES) return;
    var p = { type: type };
    if (type === 'firefly') {
      p.x = Math.random() * W; p.y = H * 0.2 + Math.random() * H * 0.5;
      p.vx = (Math.random()-0.5)*0.4; p.vy = (Math.random()-0.5)*0.25;
      p.r = 2+Math.random()*3; p.life = 400+Math.random()*500;
      p.ml = p.life; p.ph = Math.random()*6.28; p.fs = 0.04+Math.random()*0.07;
    } else if (type === 'spore') {
      p.x = Math.random()*W; p.y = H*0.15+Math.random()*H*0.55;
      p.vx = (Math.random()-0.5)*0.3; p.vy = -0.08-Math.random()*0.3;
      p.r = 1+Math.random()*2.5; p.life = 300+Math.random()*350;
      p.ml = p.life; p.ph = Math.random()*6.28;
    } else if (type === 'leaf') {
      p.x = Math.random()*W*1.3-W*0.15; p.y = -15-Math.random()*40;
      p.vx = -0.4+Math.random()*0.8; p.vy = 0.5+Math.random()*1.4;
      p.rot = Math.random()*6.28; p.rs = (Math.random()-0.5)*0.09;
      p.sz = 4+Math.random()*8;
      p.c = LEAF_COLORS[Math.floor(Math.random()*LEAF_COLORS.length)];
      p.life = 700; p.ml = 700; p.ph = Math.random()*6.28;
      p.flutter = 0.8 + Math.random() * 1.5; // flutter intensity
      p.flutterSpeed = 0.5 + Math.random() * 0.8;
      // Leaf shape variation
      p.leafType = Math.floor(Math.random() * 3); // 0=oval, 1=pointed, 2=round
    } else if (type === 'petal') {
      p.x = Math.random()*W; p.y = -10-Math.random()*30;
      p.vx = -0.2+Math.random()*0.4; p.vy = 0.3+Math.random()*0.8;
      p.rot = Math.random()*6.28; p.rs = (Math.random()-0.5)*0.05;
      p.sz = 2+Math.random()*4;
      p.c = [255, 200+Math.random()*55, 200+Math.random()*40];
      p.life = 500; p.ml = 500; p.ph = Math.random()*6.28;
    } else if (type === 'dust') {
      p.x = Math.random()*W; p.y = H*0.4+Math.random()*H*0.3;
      p.vx = (Math.random()-0.5)*0.15; p.vy = (Math.random()-0.5)*0.1;
      p.r = 0.5+Math.random()*1.5; p.life = 200+Math.random()*200;
      p.ml = p.life; p.ph = Math.random()*6.28;
    }
    particles.push(p);
  }

  // Stars
  var stars = [];
  (function() { var r = mkRng(55); for (var i = 0; i < 80; i++) stars.push({nx:r(),ny:r()*0.25,sz:0.3+r()*1.2,ph:r()*6.28}); })();

  // Mist puffs
  var mistPuffs = [];
  (function() {
    var r = mkRng(888);
    for (var i = 0; i < 12; i++) {
      mistPuffs.push({
        nx: r() * 1.4 - 0.2, ny: 0.5 + r() * 0.15,
        r: 0.08 + r() * 0.12, speed: 0.003 + r() * 0.006,
        alpha: 0.04 + r() * 0.06, phase: r() * 6.28,
      });
    }
  })();

  Forest.particles = particles;
  Forest.spawnP = spawnP;
  Forest.stars = stars;
  Forest.mistPuffs = mistPuffs;
  Forest.MAX_PARTICLES = MAX_PARTICLES;
})();
