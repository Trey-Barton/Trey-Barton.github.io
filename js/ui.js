// UI interactions — nav, scroll, video, reveals
document.documentElement.classList.add('js-ready');
(function () {
  'use strict';
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  var nav = document.getElementById('nav');
  var navScrolled = false;
  function updateNav() {
    var shouldScroll = window.scrollY > 40;
    if (shouldScroll !== navScrolled) { navScrolled = shouldScroll; nav.classList.toggle('scrolled', shouldScroll); }
  }
  // Registered with the shared scheduler — one RAF for nav + wires + cube.
  UI.scheduler.onScroll('nav', updateNav);
  updateNav();
  // Always start at the top on page load
  if (window.location.hash) { history.replaceState(null, '', window.location.pathname); }
  window.scrollTo(0, 0);

  document.querySelectorAll('a[href^="#"]').forEach(function(link) {
    link.addEventListener('click', function(e) {
      var target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        // Offset for #projects so the cube is centered in view
        var offset = (link.getAttribute('href') === '#projects') ? 170 : 70;
        var top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    });
  });
  // Autoplay the profile loop aggressively. Browsers block `autoplay` when:
  // the page backgrounded at load, Safari Low Power Mode is on, metadata
  // hasn't arrived, or the video isn't yet "ready." Belt + braces: force
  // muted via JS (HTML attr alone isn't always trusted), call play() on
  // every readiness event, and fall back to any user interaction.
  var profileVideo = document.querySelector('.profile-video');
  if (profileVideo) {
    profileVideo.muted = true;
    profileVideo.defaultMuted = true;
    profileVideo.playsInline = true;
    profileVideo.setAttribute('muted', '');
    profileVideo.setAttribute('playsinline', '');
    profileVideo.setAttribute('webkit-playsinline', '');
    profileVideo.controls = false;
    profileVideo.removeAttribute('controls');

    function tryPlay() {
      if (profileVideo.paused) {
        try {
          var p = profileVideo.play();
          if (p && p.catch) p.catch(function(){});
        } catch (_) {}
      }
    }
    // Force data fetch so `play()` has bytes to start on — `preload="auto"`
    // alone isn't always honored on iOS.
    try { profileVideo.load(); } catch (_) {}
    ['loadedmetadata','loadeddata','canplay','canplaythrough'].forEach(function(evt) {
      profileVideo.addEventListener(evt, tryPlay);
    });
    tryPlay();
    setTimeout(tryPlay, 100);
    setTimeout(tryPlay, 600);
    setTimeout(tryPlay, 1500);

    var resume = function () {
      tryPlay();
      if (!profileVideo.paused) {
        document.removeEventListener('touchstart', resume);
        document.removeEventListener('click', resume);
        document.removeEventListener('scroll', resume);
      }
    };
    document.addEventListener('touchstart', resume, { passive: true });
    document.addEventListener('click', resume);
    document.addEventListener('scroll', resume, { passive: true });

    var videoObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) tryPlay();
        else profileVideo.pause();
      });
    }, { threshold: 0.1 });
    videoObs.observe(profileVideo);
  }
  var revealEls = document.querySelectorAll('.reveal-section');
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        var siblings = entry.target.parentElement.querySelectorAll('.reveal-section');
        var delay = 0;
        siblings.forEach(function(sib, idx) { if (sib === entry.target) delay = idx * 100; });
        setTimeout(function() { entry.target.classList.add('visible'); }, delay);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  revealEls.forEach(function(el) { observer.observe(el); });
  // Force external links to open in new tab (works even in sandboxed previews)
  document.querySelectorAll('a[target="_blank"]').forEach(function(link) {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      window.open(link.href, '_blank');
    });
  });
})();
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

  /* Accepts either:
   *   • single-letter codes 'T' / 'B' — horizontally centered on the
   *     TOP or BOTTOM edge of the element (the new, simpler format),
   *   • two-letter codes 'tl' / 'tc' / 'tr' / 'ml' / 'mc' / 'mr' /
   *     'bl' / 'bc' / 'br' (legacy 9-point grid, still supported). */
  function getAttachPoint(el, pos) {
    var rect = el.getBoundingClientRect();
    if (pos === 'T') return { x: rect.left + rect.width / 2, y: rect.top };
    if (pos === 'B') return { x: rect.left + rect.width / 2, y: rect.bottom };
    var x, y;
    // Horizontal (legacy)
    if (pos[1] === 'l') x = rect.left;
    else if (pos[1] === 'r') x = rect.right;
    else x = rect.left + rect.width / 2;
    // Vertical (legacy)
    if (pos[0] === 't') y = rect.top;
    else if (pos[0] === 'b') y = rect.bottom;
    else y = rect.top + rect.height / 2;
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
  var CUBE_HEIGHT_RATIO = 0.89;
  var CUBE_HEIGHT_MAX = 495;
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
  UI.scheduler.onResize('cube-geom', function () { centerVisuals(); updateCube(); });

  function updateCube() {
    cubeCurrentDeg = -cubeIdx * 90;
    cubeScene.style.transform = 'translateZ(-' + cubeZ + 'px) rotateY(' + cubeCurrentDeg + 'deg)';
    var activeFace = ((cubeIdx % 4) + 4) % 4;
    cubeDots.forEach(function(dot, i) {
      dot.classList.toggle('active', i === activeFace);
    });
  }

  // ── Heading spin (time-based, pauses when offscreen) ──
  var headingZ = Math.min(85, window.innerWidth * 0.12);
  var lastHeadingTs = null;
  var headingVisible = false;
  var headingObs = new IntersectionObserver(function(entries) {
    headingVisible = entries[0].isIntersecting;
    if (headingVisible) lastHeadingTs = null; // reset timing on re-enter
  }, { threshold: 0 });
  headingObs.observe(document.querySelector('.heading-viewport'));
  function animateHeading(ts) {
    if (!headingVisible) { requestAnimationFrame(animateHeading); return; }
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
   * Three wire sets, each with 4 physical wires.
   *
   *   topWires  : About card → Mini chandelier (heading-cube) corners.
   *               (Previously called "headingWires".)
   *   miniWires : Project cube's TOP corners → Mini chandelier (conceptually
   *               drawn bottom-up from the cube up to the chandelier).
   *               (Previously called "topWires".)
   *   bottomWires: Project cube's BOTTOM corners → Contact card.
   *
   * Attachment-point codes (the `from` / `to` fields):
   *   • 'T' — top-edge, horizontally centered.
   *   • 'B' — bottom-edge, horizontally centered.
   *   (Legacy 9-point codes like 'bc' / 'tr' still work for custom anchors.)
   *
   * `on`           — CSS selector for the anchor element.
   * `cornerSpread` — px to push the 4 corner endpoints outward (wider fan).
   * `cornerYShift` — px vertical offset on corners (+down, -up).
   */
  var WIRE_CONFIG = {
    topWires:    { from: 'B', on: '.about-card', bPointSpreadDeg: 2 },          // about → mini
    miniWires:   { from: 'B', on: '.about-card',   cornerSpread: 0, cornerYShift: 0 }, // mini ← cube top
    bottomWires: { to:   'T', on: '.contact-card', cornerSpread: 0, cornerYShift: 0 }, // cube bottom → contact
  };
  // Wire-end vocabulary:
  //   T-point = the TOP of the wire (upper end in space).
  //   B-point = the BOTTOM of the wire (lower end in space).
  // For top-wires, T-point is the about-card anchor (fixed convergence);
  //                B-point is each mini-chandelier corner.
  //
  // tPointSpreadDeg: widen the fan at the TOP of each wire (upper anchor).
  // bPointSpreadDeg: widen the fan at the BOTTOM of each wire (corner side).
  //   Shift is wireLen * tan(deg) along the corner's outward azimuth.

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
      var dx, dy, dz, wireLen, dxz, azimuth, tilt;

      if (side === 'top') {
        // Wire starts at convergence point above, hangs down to cube top corner
        dx = corner.x;
        dy = -(cubeHalf + ys) - convY;
        dz = corner.z;
        wireLen = Math.sqrt(dx * dx + dy * dy + dz * dz);
        dxz = Math.sqrt(dx * dx + dz * dz);
        azimuth = Math.atan2(-corner.x, -corner.z) * (180 / Math.PI);
        tilt = Math.atan2(dxz, dy) * (180 / Math.PI);
        wires[i].style.height = wireLen + 'px';
        wires[i].style.transform = 'translate3d(0px,' + convY + 'px,0px) rotateY(' + azimuth.toFixed(1) + 'deg) rotateX(' + tilt.toFixed(1) + 'deg)';
      } else {
        // Wire starts at cube bottom corner, hangs down to convergence point below
        dx = -corner.x;
        dy = convY - (cubeHalf + ys);
        dz = -corner.z;
        wireLen = Math.sqrt(dx * dx + dy * dy + dz * dz);
        dxz = Math.sqrt(dx * dx + dz * dz);
        azimuth = Math.atan2(dx, dz) * (180 / Math.PI);
        tilt = Math.atan2(dxz, dy) * (180 / Math.PI);
        wires[i].style.height = wireLen + 'px';
        wires[i].style.transform = 'translate3d(' + corner.x + 'px,' + (cubeHalf + ys) + 'px,' + corner.z + 'px) rotateY(' + azimuth.toFixed(1) + 'deg) rotateX(' + tilt.toFixed(1) + 'deg)';
      }
    });
  }

  // ── Section elements ──
  var headingVP = document.querySelector('.heading-viewport');

  // MINI WIRES — .chandelier-wire DOM elements.
  // Physically: project-cube TOP corners → mini-chandelier (up-going).
  // (Anchor point is WIRE_CONFIG.miniWires.on — configurable.)
  function positionMiniWires() {
    var wires = document.querySelectorAll('.chandelier-wire');
    var cfg = WIRE_CONFIG.miniWires;
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

  // TOP WIRES — .heading-wire DOM elements.
  // Physically: about-card BOTTOM → mini-chandelier corners.
  // (Previously called "heading wires".)
  function positionTopWires() {
    var hWires = document.querySelectorAll('.heading-wire');
    var cfg = WIRE_CONFIG.topWires;
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

    // Spread knobs: push the T-end (upper anchor) or B-end (corner) outward
    // by some degrees along each corner's outward azimuth direction.
    var tDeg = cfg.tPointSpreadDeg || 0;
    var bDeg = cfg.bPointSpreadDeg || 0;
    var tRad = tDeg * Math.PI / 180;
    var bRad = bDeg * Math.PI / 180;

    corners.forEach(function(corner, i) {
      // Base geometry (no spread).
      var dx0 = corner.x;
      var dy0 = -headingHalf - convY3D;
      var dz0 = corner.z;
      var baseLen = Math.sqrt(dx0 * dx0 + dy0 * dy0 + dz0 * dz0);
      // Outward unit vector in XZ (from cube center toward this corner).
      var cornerLen = Math.sqrt(corner.x * corner.x + corner.z * corner.z) || 1;
      var ux = corner.x / cornerLen;
      var uz = corner.z / cornerLen;

      // T-end shift (upper anchor) — outward along azimuth.
      var tShift = baseLen * Math.tan(tRad);
      var upperX = ux * tShift;
      var upperZ = uz * tShift;
      // B-end shift (corner / lower anchor) — outward along azimuth.
      var bShift = baseLen * Math.tan(bRad);
      var lowerX = corner.x + ux * bShift;
      var lowerZ = corner.z + uz * bShift;

      // Re-derive wire geometry from the shifted anchors.
      var dx = lowerX - upperX;
      var dy = -headingHalf - convY3D;
      var dz = lowerZ - upperZ;
      var wireLen = Math.sqrt(dx * dx + dy * dy + dz * dz);
      var azimuth = Math.atan2(-dx, -dz) * (180 / Math.PI);
      var dxz = Math.sqrt(dx * dx + dz * dz);
      var tilt = Math.atan2(dxz, dy) * (180 / Math.PI);
      hWires[i].style.height = wireLen + 'px';
      hWires[i].style.transform =
        'translate3d(' + upperX.toFixed(2) + 'px,' + convY3D.toFixed(2) + 'px,' + upperZ.toFixed(2) + 'px)' +
        ' rotateY(' + azimuth.toFixed(1) + 'deg) rotateX(' + tilt.toFixed(1) + 'deg)';
    });
  }

  // ── Initialize and listen ──
  function updateAllWires() {
    positionTopWires();    // about-card → mini-chandelier (the .heading-wire DOM)
    positionMiniWires();   // project-cube top ↔ mini-chandelier (the .chandelier-wire DOM)
    positionBottomWires(); // project-cube bottom → contact-card (the .chandelier-wire-bottom DOM)
  }

  updateAllWires();

  UI.scheduler.onResize('wires', updateAllWires);
  // Only reposition wires on scroll for desktop, AND only when projects visible.
  if (window.innerWidth > 768) {
    var projectsVisible = false;
    var projectsObs = new IntersectionObserver(function(entries) {
      projectsVisible = entries[0].isIntersecting;
      if (projectsVisible) updateAllWires(); // sync on re-enter
    }, { rootMargin: '200px' });
    projectsObs.observe(document.querySelector('#projects'));

    UI.scheduler.register('wires-scroll', function () { if (projectsVisible) updateAllWires(); });
    window.addEventListener('scroll', function () {
      if (projectsVisible) UI.scheduler.markDirty('wires-scroll');
    }, { passive: true });
  }
})();
