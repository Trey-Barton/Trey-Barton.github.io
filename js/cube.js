// 3D Cube carousel, touch swipe, attachment-point wire system
(function () {
  'use strict';

  /* ═══════ ATTACHMENT POINT SYSTEM ═══════
   *
   * Each section box has 9 named attachment points:
   *   tl  tc  tr     (top-left, top-center, top-right)
   *   ml  mc  mr     (middle-left, middle-center, middle-right)
   *   bl  bc  br     (bottom-left, bottom-center, bottom-right)
   *
   * getAttachPoint(element, position) returns {x, y} in viewport coords.
   * Wires connect FROM one attachment point TO another.
   * When sections move (scroll/resize), wires stretch and angle automatically.
   */

  function getAttachPoint(el, pos) {
    var rect = el.getBoundingClientRect();
    var x, y;
    // Horizontal
    if (pos[1] === 'l') x = rect.left;
    else if (pos[1] === 'r') x = rect.right;
    else x = rect.left + rect.width / 2; // 'c'
    // Vertical
    if (pos[0] === 't') y = rect.top;
    else if (pos[0] === 'b') y = rect.bottom;
    else y = rect.top + rect.height / 2; // 'm'
    return { x: x, y: y };
  }

  // ── Cube setup ──
  var cubeScene = document.getElementById('cube-scene');
  var cubeIdx = 0;
  var cubePrev = document.getElementById('cube-prev');
  var cubeNext = document.getElementById('cube-next');
  var cubeDots = document.querySelectorAll('.cube-dot');
  var cubeFaces = document.querySelectorAll('.cube-face');
  var headingScene = document.getElementById('projects-heading-scene');
  var headingSpinDeg = 0;
  var cubeCurrentDeg = 0;

  // ── Cube & wire config ──
  var WIRE_BORDER_INSET_RATIO = 0.083;
  var CUBE_HEIGHT_RATIO = 1.2;
  var CUBE_HEIGHT_MAX = 700;
  var CUBE_PERSPECTIVE_RATIO = 2.2;

  var cubeVP = document.querySelector('.cube-viewport');
  var cubeZ = 280;

  function centerVisuals() {
    var baseWidth = cubeVP.offsetWidth;
    cubeZ = baseWidth / 2;
    var cubeHeight = Math.min(baseWidth * CUBE_HEIGHT_RATIO, CUBE_HEIGHT_MAX);
    var perspective = baseWidth * CUBE_PERSPECTIVE_RATIO;
    cubeVP.style.height = cubeHeight + 'px';
    cubeVP.style.perspective = perspective + 'px';
    var faceAngles = [0, 90, 180, -90];
    cubeFaces.forEach(function(face, i) {
      face.style.transform = 'rotateY(' + faceAngles[i] + 'deg) translateZ(' + cubeZ + 'px)';
    });
  }

  centerVisuals();
  window.scrollTo(0, 0);
  window.addEventListener('resize', function() { centerVisuals(); updateCube(); });

  function updateCube() {
    cubeCurrentDeg = -cubeIdx * 90;
    cubeScene.style.transform = 'translateZ(-' + cubeZ + 'px) rotateY(' + cubeCurrentDeg + 'deg)';
    var activeFace = ((cubeIdx % 4) + 4) % 4;
    cubeDots.forEach(function(dot, i) {
      dot.classList.toggle('active', i === activeFace);
    });
  }

  // ── Heading spin (time-based) ──
  var headingZ = Math.min(85, window.innerWidth * 0.12);
  var lastHeadingTs = null;
  function animateHeading(ts) {
    if (lastHeadingTs === null) lastHeadingTs = ts;
    var dt = (ts - lastHeadingTs) / 1000;
    lastHeadingTs = ts;
    headingSpinDeg += dt * 21;
    headingScene.style.transform = 'translateZ(-' + headingZ + 'px) rotateY(' + headingSpinDeg + 'deg)';
    requestAnimationFrame(animateHeading);
  }
  requestAnimationFrame(animateHeading);

  // ── Cube navigation ──
  if (cubePrev) cubePrev.addEventListener('click', function() { cubeIdx--; updateCube(); });
  if (cubeNext) cubeNext.addEventListener('click', function() { cubeIdx++; updateCube(); });
  cubeDots.forEach(function(dot) {
    dot.addEventListener('click', function() {
      var target = parseInt(dot.getAttribute('data-face'));
      var current = ((cubeIdx % 4) + 4) % 4;
      var diff = target - current;
      if (diff > 2) diff -= 4;
      if (diff < -2) diff += 4;
      cubeIdx += diff;
      updateCube();
    });
  });
  updateCube();

  // ── Touch swipe ──
  (function() {
    if (!cubeVP) return;
    var touchStartX = 0, touchStartY = 0, swiping = false;
    cubeVP.addEventListener('touchstart', function(e) {
      touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY; swiping = true;
    }, { passive: true });
    cubeVP.addEventListener('touchmove', function(e) {
      if (!swiping) return;
      var dx = e.touches[0].clientX - touchStartX;
      var dy = e.touches[0].clientY - touchStartY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) e.preventDefault();
    }, { passive: false });
    cubeVP.addEventListener('touchend', function(e) {
      if (!swiping) return; swiping = false;
      var dx = e.changedTouches[0].clientX - touchStartX;
      var dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) cubeIdx++; else cubeIdx--;
        updateCube();
      }
    }, { passive: true });
  })();

  /* ═══════ WIRE CONNECTION CONFIG ═══════
   *
   * Edit these to change where wires attach on each box.
   * Each box has 9 attachment points:
   *
   *   tl ── tc ── tr
   *   │           │
   *   ml    mc    mr
   *   │           │
   *   bl ── bc ── br
   *
   * Change any 2-letter code to move that wire's endpoint.
   */
  var WIRE_CONFIG = {
    topWires:     { from: 'bc', on: '.about-card',   cornerSpread: 21, cornerYShift: 12  },
    bottomWires:  { to:   'tc', on: '.contact-card',  cornerSpread: 21, cornerYShift: -15 },
    headingWires: { from: 'bc', on: '.about-card'   },  // keep as-is
  };
  // cornerSpread: px to push corners outward from center (positive = wider)
  // cornerYShift: px to shift corners vertically (positive = down, negative = up)

  // Convert a 2D page-space target point into cube-scene 3D local Y
  function pagePointToCubeY(targetPoint, cubeViewport) {
    var cubeRect = cubeViewport.getBoundingClientRect();
    var cubeCenterY = cubeRect.top + cubeRect.height / 2;
    var perspective = parseFloat(cubeViewport.style.perspective) || 1200;
    var cssScale = cubeViewport.offsetHeight > 0 ? cubeRect.height / cubeViewport.offsetHeight : 1;
    var pageDist = cubeCenterY - targetPoint.y;
    var scale = perspective / (perspective + cubeZ);
    return -(pageDist / scale / cssScale);
  }

  // Position 4 wires from a convergence point to cube corners (top or bottom)
  // spread: extra px outward from center per corner, yShift: vertical px offset on corners
  function positionWireSet(wires, convY, side, spread, yShift) {
    var cubeHalf = cubeVP.offsetHeight / 2;
    var edgeZ = cubeZ - cubeZ * WIRE_BORDER_INSET_RATIO;
    var sp = spread || 0;
    var ys = yShift || 0;
    // Push corners outward by sp pixels (diagonal direction)
    var corners = [
      { x: edgeZ + sp, z: edgeZ + sp },
      { x: edgeZ + sp, z: -(edgeZ + sp) },
      { x: -(edgeZ + sp), z: -(edgeZ + sp) },
      { x: -(edgeZ + sp), z: edgeZ + sp }
    ];

    corners.forEach(function(corner, i) {
      var dx, dy, dz;
      if (side === 'top') {
        dx = corner.x;
        dy = -(cubeHalf + ys) - convY;
        dz = corner.z;
      } else {
        dx = -corner.x;
        dy = convY - (cubeHalf + ys);
        dz = -corner.z;
      }

      var wireLen = Math.sqrt(dx * dx + dy * dy + dz * dz);
      var dxz = Math.sqrt(dx * dx + dz * dz);
      var azimuth, tilt;

      if (side === 'top') {
        azimuth = Math.atan2(-corner.x, -corner.z) * (180 / Math.PI);
        tilt = Math.atan2(dxz, dy) * (180 / Math.PI);
        wires[i].style.height = wireLen + 'px';
        wires[i].style.transform = 'translate3d(0px,' + convY + 'px,0px) rotateY(' + azimuth.toFixed(1) + 'deg) rotateX(' + tilt.toFixed(1) + 'deg)';
      } else {
        azimuth = Math.atan2(dx, dz) * (180 / Math.PI);
        tilt = Math.atan2(dxz, dy) * (180 / Math.PI);
        wires[i].style.height = wireLen + 'px';
        wires[i].style.transform = 'translate3d(' + corner.x + 'px,' + (cubeHalf + ys) + 'px,' + corner.z + 'px) rotateY(' + azimuth.toFixed(1) + 'deg) rotateX(' + tilt.toFixed(1) + 'deg)';
      }
    });
  }

  // ── Section elements ──
  var headingVP = document.querySelector('.heading-viewport');

  // Top wires: WIRE_CONFIG.topWires.on attachment → cube top corners
  function positionTopWires() {
    var wires = document.querySelectorAll('.chandelier-wire');
    var cfg = WIRE_CONFIG.topWires;
    var srcEl = document.querySelector(cfg.on);
    if (!cubeVP || !srcEl || wires.length < 4) return;
    var attachPt = getAttachPoint(srcEl, cfg.from);
    var convY = pagePointToCubeY(attachPt, cubeVP);
    positionWireSet(wires, convY, 'top', cfg.cornerSpread || 0, cfg.cornerYShift || 0);
  }

  // Bottom wires: cube bottom corners → WIRE_CONFIG.bottomWires.on attachment
  function positionBottomWires() {
    var bWires = document.querySelectorAll('.chandelier-wire-bottom');
    var cfg = WIRE_CONFIG.bottomWires;
    var destEl = document.querySelector(cfg.on);
    if (!cubeVP || !destEl || bWires.length < 4) return;
    var attachPt = getAttachPoint(destEl, cfg.to);
    var cubeRect = cubeVP.getBoundingClientRect();
    var cubeCenterY = cubeRect.top + cubeRect.height / 2;
    var perspective = parseFloat(cubeVP.style.perspective) || 1200;
    var cssScale = cubeVP.offsetHeight > 0 ? cubeRect.height / cubeVP.offsetHeight : 1;
    var pageDist = attachPt.y - cubeCenterY;
    var scale = perspective / (perspective + cubeZ);
    var bottomConvY = pageDist / scale / cssScale;
    positionWireSet(bWires, bottomConvY, 'bottom', cfg.cornerSpread || 0, cfg.cornerYShift || 0);
  }

  // Heading wires: WIRE_CONFIG.headingWires.on attachment → heading cube corners
  function positionHeadingWires() {
    var hWires = document.querySelectorAll('.heading-wire');
    var cfg = WIRE_CONFIG.headingWires;
    var srcEl = document.querySelector(cfg.on);
    if (!srcEl || !headingVP || hWires.length < 4) return;

    var attachPt = getAttachPoint(srcEl, cfg.from);
    var headingRect = headingVP.getBoundingClientRect();
    var perspective = 800;

    var cssScale = headingVP.offsetHeight > 0 ? headingRect.height / headingVP.offsetHeight : 1;
    var headingCenterY = headingRect.top + headingRect.height / 2;
    var pageDistToAbout = headingCenterY - attachPt.y;
    var scale = perspective / (perspective + headingZ);
    var convY3D = -(pageDistToAbout / scale / cssScale);

    var headingHalf = headingVP.offsetHeight / 2;
    var borderRadius = 14;
    var inset = borderRadius * Math.cos(Math.PI / 4);
    var edgeZ = headingZ - inset;
    var corners = [
      { x: edgeZ, z: edgeZ },
      { x: edgeZ, z: -edgeZ },
      { x: -edgeZ, z: -edgeZ },
      { x: -edgeZ, z: edgeZ }
    ];

    corners.forEach(function(corner, i) {
      var dx = corner.x;
      var dy = -headingHalf - convY3D;
      var dz = corner.z;
      var wireLen = Math.sqrt(dx * dx + dy * dy + dz * dz);
      var azimuth = Math.atan2(-corner.x, -corner.z) * (180 / Math.PI);
      var dxz = Math.sqrt(dx * dx + dz * dz);
      var tilt = Math.atan2(dxz, dy) * (180 / Math.PI);
      hWires[i].style.height = wireLen + 'px';
      hWires[i].style.transform = 'translate3d(0px,' + convY3D + 'px,0px) rotateY(' + azimuth.toFixed(1) + 'deg) rotateX(' + tilt.toFixed(1) + 'deg)';
    });
  }

  // ── Initialize and listen ──
  function updateAllWires() {
    positionHeadingWires();
    positionTopWires();
    positionBottomWires();
  }

  updateAllWires();
  requestAnimationFrame(function() { window.scrollTo(0, 0); });

  window.addEventListener('resize', updateAllWires);
  var wireTicking = false;
  window.addEventListener('scroll', function() {
    if (!wireTicking) {
      wireTicking = true;
      requestAnimationFrame(function() { updateAllWires(); wireTicking = false; });
    }
  }, { passive: true });
})();
