// 3D Cube carousel, touch swipe, heading & chandelier wires
(function () {
  'use strict';
  // 3D Cube carousel — continuous rotation, no rewinding
  var cubeScene = document.getElementById('cube-scene');
  var cubeIdx = 0;
  var cubePrev = document.getElementById('cube-prev');
  var cubeNext = document.getElementById('cube-next');
  var cubeDots = document.querySelectorAll('.cube-dot');

  var cubeFaces = document.querySelectorAll('.cube-face');
  var headingScene = document.getElementById('projects-heading-scene');
  var headingSpinDeg = 0;
  var cubeCurrentDeg = 0;

  // ── Cube & wire config (ratios relative to cubeZ) ──
  var WIRE_CONVERGENCE_RATIO = 0.35;   // 75° from vertical — nearly horizontal spread
  var WIRE_BORDER_INSET_RATIO = 0.083; // border-radius inset / cubeZ (4px longer toward cube)
  var CUBE_HEIGHT_RATIO = 1.2;         // cubeHeight / baseWidth (shorter projects section)
  var CUBE_HEIGHT_MAX = 700;           // max height cap (px)
  var CUBE_PERSPECTIVE_RATIO = 2.2;    // perspective / baseWidth

  /*
   * Universal visual centering system
   * All large moving visual elements (cube, heading, wires, nav)
   * are centered on the viewport X-axis and Y-aligned to each other.
   * Works across desktop, mobile, portrait, and landscape orientations.
   */
  var cubeVP = document.querySelector('.cube-viewport');
  var cubeZ = 280;

  function centerVisuals() {
    var vw = window.innerWidth;
    var baseWidth = cubeVP.offsetWidth; // CSS handles fluid sizing via clamp()
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
  // Force scroll to top after layout changes to prevent jumping to Projects
  window.scrollTo(0, 0);
  // Wire positioning handled by positionWires/positionBottomWires below
  window.addEventListener('resize', function() { centerVisuals(); updateCube(); });

  function updateCube() {
    cubeCurrentDeg = -cubeIdx * 90;
    cubeScene.style.transform = 'translateZ(-' + cubeZ + 'px) rotateY(' + cubeCurrentDeg + 'deg)';
    var activeFace = ((cubeIdx % 4) + 4) % 4;
    cubeDots.forEach(function(dot, i) {
      dot.classList.toggle('active', i === activeFace);
    });
  }

  // Animate the Projects heading cube: time-based spin for consistent speed
  var headingZ = Math.min(85, window.innerWidth * 0.12);
  var lastHeadingTs = null;
  function animateHeading(ts) {
    if (lastHeadingTs === null) lastHeadingTs = ts;
    var dt = (ts - lastHeadingTs) / 1000;
    lastHeadingTs = ts;
    headingSpinDeg += dt * 21; // 21 degrees per second (smooth)
    headingScene.style.transform = 'translateZ(-' + headingZ + 'px) rotateY(' + headingSpinDeg + 'deg)';
    requestAnimationFrame(animateHeading);
  }
  requestAnimationFrame(animateHeading);

  if (cubePrev) cubePrev.addEventListener('click', function() {
    cubeIdx--;
    updateCube();
  });
  if (cubeNext) cubeNext.addEventListener('click', function() {
    cubeIdx++;
    updateCube();
  });

  // Click dots — find shortest rotation path
  cubeDots.forEach(function(dot) {
    dot.addEventListener('click', function() {
      var target = parseInt(dot.getAttribute('data-face'));
      var current = ((cubeIdx % 4) + 4) % 4;
      var diff = target - current;
      // Choose shortest rotation direction
      if (diff > 2) diff -= 4;
      if (diff < -2) diff += 4;
      cubeIdx += diff;
      updateCube();
    });
  });

  updateCube();

  // Touch swipe support for cube carousel on mobile
  (function() {
    var cubeVP = document.querySelector('.cube-viewport');
    if (!cubeVP) return;
    var touchStartX = 0;
    var touchStartY = 0;
    var swiping = false;
    cubeVP.addEventListener('touchstart', function(e) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      swiping = true;
    }, { passive: true });
    cubeVP.addEventListener('touchmove', function(e) {
      if (!swiping) return;
      var dx = e.touches[0].clientX - touchStartX;
      var dy = e.touches[0].clientY - touchStartY;
      // Only swipe if horizontal movement dominates
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
        e.preventDefault();
      }
    }, { passive: false });
    cubeVP.addEventListener('touchend', function(e) {
      if (!swiping) return;
      swiping = false;
      var dx = e.changedTouches[0].clientX - touchStartX;
      var dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) { cubeIdx++; } else { cubeIdx--; }
        updateCube();
      }
    }, { passive: true });
  })();

  // Position heading wires: from heading cube corners UP to about section bottom center
  function positionHeadingWires() {
    var aboutCard = document.querySelector('.about-card');
    var headingVP = document.querySelector('.heading-viewport');
    var hWires = document.querySelectorAll('.heading-wire');
    if (!aboutCard || !headingVP || hWires.length < 4) return;

    var aboutRect = aboutCard.getBoundingClientRect();
    var headingRect = headingVP.getBoundingClientRect();
    var perspective = 800;
    // headingZ from outer scope

    var cssScale = headingVP.offsetHeight > 0 ? headingRect.height / headingVP.offsetHeight : 1;

    var headingCenterY = headingRect.top + headingRect.height / 2;
    var pageDistToAbout = headingCenterY - aboutRect.bottom;

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

  // Position top wires: from cube corners UP to about-card bottom edge
  function positionWires() {
    var cubeViewport = document.querySelector('.cube-viewport');
    var aboutCard = document.querySelector('.about-card');
    var wires = document.querySelectorAll('.chandelier-wire');
    if (!cubeViewport || !aboutCard || wires.length < 4) return;

    var cubeRect = cubeViewport.getBoundingClientRect();
    var aboutRect = aboutCard.getBoundingClientRect();
    var cubeHalf = cubeViewport.offsetHeight / 2;
    var cubeCenterY = cubeRect.top + cubeRect.height / 2;
    var perspective = parseFloat(cubeViewport.style.perspective) || 1200;
    var cssScale = cubeViewport.offsetHeight > 0 ? cubeRect.height / cubeViewport.offsetHeight : 1;
    var pageDistToAbout = cubeCenterY - aboutRect.bottom;
    var scale = perspective / (perspective + cubeZ);
    var convY = -(pageDistToAbout / scale / cssScale);
    var edgeZ = cubeZ - cubeZ * WIRE_BORDER_INSET_RATIO;

    var corners = [
      { x: edgeZ, z: edgeZ },
      { x: edgeZ, z: -edgeZ },
      { x: -edgeZ, z: -edgeZ },
      { x: -edgeZ, z: edgeZ }
    ];

    corners.forEach(function(corner, i) {
      var dx = corner.x;
      var dy = -cubeHalf - convY;
      var dz = corner.z;
      var wireLen = Math.sqrt(dx * dx + dy * dy + dz * dz);
      var azimuth = Math.atan2(-corner.x, -corner.z) * (180 / Math.PI);
      var dxz = Math.sqrt(dx * dx + dz * dz);
      var tilt = Math.atan2(dxz, dy) * (180 / Math.PI);
      if (i === 0) { positionWires._topTilt = tilt; positionWires._topLen = wireLen; }

      wires[i].style.height = wireLen + 'px';
      wires[i].style.transform = 'translate3d(0px,' + convY + 'px,0px) rotateY(' + azimuth.toFixed(1) + 'deg) rotateX(' + tilt.toFixed(1) + 'deg)';
    });
  }

  // Position bottom wires: from cube corners DOWN to contact-card top edge
  function positionBottomWires() {
    var cubeViewport = document.querySelector('.cube-viewport');
    var contactCard = document.querySelector('.contact-card');
    var bWires = document.querySelectorAll('.chandelier-wire-bottom');
    if (!cubeViewport || !contactCard || bWires.length < 4) return;

    var cubeRect = cubeViewport.getBoundingClientRect();
    var contactRect = contactCard.getBoundingClientRect();
    var cubeHalf = cubeViewport.offsetHeight / 2;
    var cubeCenterY = cubeRect.top + cubeRect.height / 2;
    var perspective = parseFloat(cubeViewport.style.perspective) || 1200;
    var cssScale = cubeViewport.offsetHeight > 0 ? cubeRect.height / cubeViewport.offsetHeight : 1;
    var pageDistToContact = contactRect.top - cubeCenterY;
    var scale = perspective / (perspective + cubeZ);
    var convY = pageDistToContact / scale / cssScale;
    var edgeZ = cubeZ - cubeZ * WIRE_BORDER_INSET_RATIO;

    var corners = [
      { x: edgeZ, z: edgeZ },
      { x: edgeZ, z: -edgeZ },
      { x: -edgeZ, z: -edgeZ },
      { x: -edgeZ, z: edgeZ }
    ];

    corners.forEach(function(corner, i) {
      var dx = -corner.x;
      var dy = convY - cubeHalf;
      var dz = -corner.z;
      var wireLen = Math.sqrt(dx * dx + dy * dy + dz * dz);
      var azimuth = Math.atan2(dx, dz) * (180 / Math.PI);
      var dxz = Math.sqrt(dx * dx + dz * dz);
      var tilt = Math.atan2(dxz, dy) * (180 / Math.PI);

      bWires[i].style.height = wireLen + 'px';
      bWires[i].style.transform = 'translate3d(' + corner.x + 'px,' + cubeHalf + 'px,' + corner.z + 'px) rotateY(' + azimuth.toFixed(1) + 'deg) rotateX(' + tilt.toFixed(1) + 'deg)';
    });
  }

  positionHeadingWires();
  positionWires();
  positionBottomWires();
  // Final scroll reset after all layout changes
  requestAnimationFrame(function() { window.scrollTo(0, 0); });
  window.addEventListener('resize', function() { positionHeadingWires(); positionWires(); positionBottomWires(); });
  // Re-position wires on scroll since wire angles depend on relative element positions
  var wireTicking = false;
  window.addEventListener('scroll', function() {
    if (!wireTicking) { wireTicking = true; requestAnimationFrame(function() { positionHeadingWires(); positionWires(); positionBottomWires(); wireTicking = false; }); }
  }, { passive: true });
})();
