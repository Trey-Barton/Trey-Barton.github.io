/**
 * forest-gl.js — Three.js WebGL forest background
 *
 * Replaces the Canvas 2D forest with GPU-accelerated rendering.
 * Drops into the existing Forest namespace.
 *
 * Requires Three.js r128 via CDN and forest-palette.js for color arrays + mkRng.
 *
 * API surface:
 *   Forest.initGL()  — build scene once (auto-called on boot)
 *   Forest.render(ts) — per-frame update + draw (called by internal RAF loop)
 *   Forest.resize()   — full teardown + rebuild at new viewport size
 *
 * Render ordering (renderOrder — higher = drawn later / on top):
 *   0 sky, 1 stars, 2 sun glow, 3 horizon band, 4 hills, 5 ground, 6 river,
 *   10 far trees, 11 mid trees, 12 fg trees, 13 undergrowth,
 *   15 ground fog, 20 particles
 * (Ground renders BEFORE trees, matching Canvas 2D behavior where
 *  ground fill precedes tree draws — tree trunks extend below the
 *  ground line and paint over it.)
 */
(function () {
  'use strict';

  // ── Shortcuts ──────────────────────────────────────────────────────────
  var BARK   = Forest.BARK;
  var CANOPY = Forest.CANOPY;
  var FERN   = Forest.FERN_COLORS;
  var LEAF   = Forest.LEAF_COLORS;
  var mkRng  = Forest.mkRng;

  // ══════════════════════════════════════════════════════════════════════════
  //  QUALITY TIER KNOBS — tune these to adjust tree & particle counts
  //  (see bottom of file for resize logic that acts on tier boundaries)
  // ══════════════════════════════════════════════════════════════════════════
  var QUALITY_TIERS = {
    low:    { maxW: 768,  pixelRatioCap: 1.5, far: 18, mid: 10, fg: 5,  particles: 150 },
    medium: { maxW: 1440, pixelRatioCap: 2.0, far: 35, mid: 18, fg: 10, particles: 250 },
    high:   { maxW: 99999,pixelRatioCap: null, far: 45, mid: 24, fg: 12, particles: 400 }
  };
  function _detectQuality(w) {
    if (w <= QUALITY_TIERS.low.maxW)    return 'low';
    if (w <= QUALITY_TIERS.medium.maxW) return 'medium';
    return 'high';
  }
  function _tierCfg(q) { return QUALITY_TIERS[q]; }

  // ── Internal state ─────────────────────────────────────────────────────
  var _3d = {};           // holds all Three.js objects by name
  var W, H;               // current viewport size
  var gY;                 // ground Y = H * 0.58

  // Accumulated time (seconds) — matches original canvas-core's `time` variable
  var _time = 0;
  var _windPhase = 0;
  var _lastTs = null;

  // ── Quality detection ──────────────────────────────────────────────────
  Forest.quality = _detectQuality(window.innerWidth);
  Forest.tierCfg  = _tierCfg(Forest.quality);

  // ── Particle system (replaces forest-particles.js) ─────────────────────
  var MAX_P = Forest.tierCfg.particles;
  Forest.MAX_PARTICLES = MAX_P;
  Forest.particles = [];
  var _particlePool = [];
  Forest._recycleParticle = function (p) {
    if (_particlePool.length < MAX_P * 2) _particlePool.push(p);
  };

  // Pre-allocated particle buffers — zero per-frame allocations
  var _pBufPos   = new Float32Array(MAX_P * 3);
  var _pBufCol   = new Float32Array(MAX_P * 3);
  var _pBufSize  = new Float32Array(MAX_P);
  var _pVisCount = 0;

  // ── Pre-allocated per-frame temporaries (zero GC pressure in render loop) ─
  var _tmpMat  = new THREE.Matrix4();
  var _tmpPos  = new THREE.Vector3();
  var _tmpQuat = new THREE.Quaternion();
  var _tmpEul  = new THREE.Euler();
  var _tmpScl  = new THREE.Vector3();

  /** Spawn a single particle — pool-backed, zero allocations */
  Forest.spawnP = function (type, w, h) {
    if (Forest.particles.length >= MAX_P) return;
    var p = _particlePool.pop() || {};
    p.type = type;
    if (type === 'firefly') {
      p.x   = Math.random() * w;
      p.y   = 0.2 * h + Math.random() * h * 0.5;
      p.vx  = 0.6 * (Math.random() - 0.5);
      p.vy  = 0.4 * (Math.random() - 0.5);
      p.r   = 2 + 3 * Math.random();
      p.life = 400 + Math.floor(500 * Math.random());
      p.ml  = p.life;
      p.ph  = 6.28 * Math.random();
      p.fs  = 0.06 + 0.11 * Math.random();
    } else if (type === 'spore') {
      p.x   = Math.random() * w;
      p.y   = 0.15 * h + Math.random() * h * 0.55;
      p.vx  = 0.5 * (Math.random() - 0.5);
      p.vy  = -0.12 - 0.45 * Math.random();
      p.r   = 1 + 2.5 * Math.random();
      p.life = 300 + Math.floor(350 * Math.random());
      p.ml  = p.life;
      p.ph  = 6.28 * Math.random();
    } else if (type === 'leaf') {
      p.x   = Math.random() * w * 1.3 - 0.15 * w;
      p.y   = -15 - 40 * Math.random();
      p.vx  = 1.2 * Math.random() - 0.6;
      p.vy  = 0.7 + 2.1 * Math.random();
      p.rot = 6.28 * Math.random();
      p.rs  = 0.09 * (Math.random() - 0.5);
      p.sz  = 4 + 8 * Math.random();
      p.c   = LEAF[Math.floor(Math.random() * LEAF.length)];
      p.life = 700; p.ml = 700;
      p.ph  = 6.28 * Math.random();
      p.flutter = 0.8 + 1.5 * Math.random();
      p.flutterSpeed = 0.7 + 1.2 * Math.random();
      p.leafType = Math.floor(3 * Math.random());
    } else if (type === 'petal') {
      p.x   = Math.random() * w;
      p.y   = -10 - 30 * Math.random();
      p.vx  = 0.6 * Math.random() - 0.3;
      p.vy  = 0.5 + 1.2 * Math.random();
      p.rot = 6.28 * Math.random();
      p.rs  = 0.05 * (Math.random() - 0.5);
      p.sz  = 2 + 4 * Math.random();
      p.c   = [255, 200 + 55 * Math.random(), 200 + 40 * Math.random()];
      p.life = 500; p.ml = 500;
      p.ph  = 6.28 * Math.random();
    } else if (type === 'dust') {
      p.x   = Math.random() * w;
      p.y   = 0.4 * h + Math.random() * h * 0.3;
      p.vx  = 0.25 * (Math.random() - 0.5);
      p.vy  = 0.18 * (Math.random() - 0.5);
      p.r   = 0.5 + 1.5 * Math.random();
      p.life = 200 + Math.floor(200 * Math.random());
      p.ml  = p.life;
      p.ph  = 6.28 * Math.random();
    }
    Forest.particles.push(p);
  };

  // Stars + mist puffs (same seed data as forest-particles.js)
  Forest.stars = [];
  (function () {
    var r = mkRng(55);
    for (var i = 0; i < 80; i++) {
      Forest.stars.push({
        nx: r(), ny: 0.25 * r(), sz: 0.3 + 1.2 * r(), ph: 6.28 * r()
      });
    }
  })();
  Forest.mistPuffs = [];
  (function () {
    var r = mkRng(888);
    for (var i = 0; i < 12; i++) {
      Forest.mistPuffs.push({
        nx: 1.4 * r() - 0.2, ny: 0.5 + 0.15 * r(), r: 0.08 + 0.12 * r(),
        speed: 0.003 + 0.006 * r(), alpha: 0.04 + 0.06 * r(), phase: 6.28 * r()
      });
    }
  })();

  // ── Reduced motion — skip animations for accessibility ──────────────────
  var _prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', function (e) {
    _prefersReducedMotion = e.matches;
  });

  // ── Page visibility — full pause when tab hidden, resume on return ──────
  var _playing = true;
  var _rafId = null;
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      _playing = false;
      if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
      _lastTs = null;
    } else {
      _playing = true;
      if (!_rafId) _rafId = requestAnimationFrame(_rafLoop);
    }
  });

  // ── Helper: build sphere vertices merged from blob descriptors ────────
  /* Builds one merged BufferGeometry from an array of canopy blobs.
     Each blob has { ox, oy, r, squash } in normalized units.
     The geometry is built at unit scale; per-instance scaling applies at render time. */
  function _buildCanopyGeo(blobs) {
    var pos = [], nrm = [];
    var segs = 7, rings = 4;

    function addSphere(ox, oy, oz, rx, ry, rz) {
      for (var ring = 0; ring <= rings; ring++) {
        var phi = (ring / rings) * Math.PI - Math.PI * 0.5;
        var cosPhi = Math.cos(phi);
        var sinPhi = Math.sin(phi);
        for (var seg = 0; seg <= segs; seg++) {
          var theta = (seg / segs) * Math.PI * 2;
          var cosTheta = Math.cos(theta);
          var sinTheta = Math.sin(theta);
          var nx = cosPhi * cosTheta;
          var ny = sinPhi;
          var nz = cosPhi * sinTheta;
          pos.push(ox + nx * rx, oy + ny * ry, oz + nz * rz);
          nrm.push(nx, ny, nz);
        }
      }
    }

    for (var i = 0; i < blobs.length; i++) {
      var b = blobs[i];
      addSphere(b.ox, b.oy, 0, b.r, b.r * b.squash, b.r);
    }

    var vertsPerBlob = (segs + 1) * (rings + 1);
    var idx = [];
    for (var b = 0; b < blobs.length; b++) {
      var base = b * vertsPerBlob;
      for (var ring = 0; ring < rings; ring++) {
        for (var seg = 0; seg < segs; seg++) {
          var a = base + ring * (segs + 1) + seg;
          var bb = a + segs + 1;
          var c = a + 1;
          var d = bb + 1;
          idx.push(a, bb, c);
          idx.push(c, bb, d);
        }
      }
    }

    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal',   new THREE.Float32BufferAttribute(nrm, 3));
    geo.setIndex(idx);
    return geo;
  }

  // ── Helper: build hill layer buffer geometry ────────────────────────────
  function _buildHillLayer(func, wRef, hRef, gRef, fillCol) {
    var segments = Math.max(200, Math.floor(wRef / 3));
    var positions = [];
    var indices = [];

    // Top curve points + bottom edge points
    for (var i = 0; i <= segments; i++) {
      var x = (i / segments) * wRef;
      positions.push(x, func(x, wRef, hRef, gRef), 0);           // top vertex
    }
    for (var i = 0; i <= segments; i++) {
      positions.push((i / segments) * wRef, hRef, 0);            // bottom vertex (extends below)
    }

    for (var i = 0; i < segments; i++) {
      var t0 = i, t1 = i + 1;
      var b0 = (segments + 1) + i, b1 = (segments + 1) + i + 1;
      indices.push(t0, b0, t1);
      indices.push(t1, b0, b1);
    }

    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    var mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(fillCol[0] / 255, fillCol[1] / 255, fillCol[2] / 255),
      transparent: true,
      opacity: fillCol[3],
      depthTest: false,
      depthWrite: false
    });
    mat.renderOrder = 4;
    return new THREE.Mesh(geo, mat);
  }

  // ── Helper: compose a Matrix4 from translation, Z-rotation, and scale ──
  // All temp objects pre-allocated at module scope (zero per-frame allocations)
  function _setInstance(inst, idx, x, y, z, rotZ, sx, sy, sz) {
    _tmpPos.set(x, y, z);
    _tmpEul.set(0, 0, rotZ);
    _tmpQuat.setFromEuler(_tmpEul);
    _tmpScl.set(sx, sy, sz);
    _tmpMat.compose(_tmpPos, _tmpQuat, _tmpScl);
    inst.setMatrixAt(idx, _tmpMat);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Forest.initGL() — full scene construction
  // ══════════════════════════════════════════════════════════════════════════

  Forest.initGL = function () {
    if (_3d.renderer) return; // already initialized

    W  = window.innerWidth;
    H  = window.innerHeight;
    gY = H * 0.58;

    // ── Renderer ────────────────────────────────────────────────────────
    var prCap = Forest.tierCfg.pixelRatioCap;
    var pr = prCap ? Math.min(window.devicePixelRatio || 1, prCap) : (window.devicePixelRatio || 1);
    _3d.renderer = new THREE.WebGLRenderer({ alpha: false, antialias: false });
    _3d.renderer.setPixelRatio(pr);
    _3d.renderer.setSize(W, H);

    var canvas = _3d.renderer.domElement;
    canvas.id = 'bg-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100vh';
    canvas.style.height = '100dvh';
    canvas.style.pointerEvents = 'none';
    canvas.style.willChange = 'transform';
    canvas.style.transform = 'translateZ(0)';
    canvas.style.backfaceVisibility = 'hidden';

    // Replace old canvas #bg-canvas (from index.html) with Three.js canvas
    var oldCanvas = document.querySelector('#bg-canvas');
    if (oldCanvas) {
      oldCanvas.parentNode.replaceChild(canvas, oldCanvas);
    } else {
      document.body.insertBefore(canvas, document.body.firstChild);
    }

    // ── Vignette overlay (CSS-only, replaces per-frame radial gradient draw) ──
    var vignette = document.getElementById('bg-vignette');
    if (!vignette) {
      vignette = document.createElement('div');
      vignette.id = 'bg-vignette';
      vignette.style.cssText =
        'position:fixed;top:0;left:0;width:100%;height:100vh;height:100dvh;' +
        'pointer-events:none;z-index:0;' +
        'background:radial-gradient(ellipse at 50% 38%,' +
          'rgba(0,0,0,0) 12%,' +
          'rgba(8,18,12,0.08) 60%,' +
          'rgba(10,20,15,0.18) 80%,' +
          'rgba(8,16,10,0.35) 100%);';
      canvas.parentNode.insertBefore(vignette, canvas.nextSibling);
    }

    // Camera — orthographic, maps screen pixels 1:1 with Y downward
    _3d.camera = new THREE.OrthographicCamera(0, W, H, 0, 0.1, 100);
    _3d.camera.position.z = 50;

    // Scene
    _3d.scene = new THREE.Scene();

    // ── Build elements in back-to-front order ───────────────────────────
    _buildSky();
    _buildStars();
    _buildSunGlow();
    _buildHorizonGlow();
    _buildHills();
    _buildGround();
    _buildRiver();
    _buildGroundFog();
    _buildTrees();
    _buildUndergrowth();
    _buildParticles();
  };

  // ── 0. Sky — fullscreen quad with shader gradient ───────────────────────
  function _buildSky() {
    // Exact color stops from canvas-core.js createLinearGradient(0,0,0,H*0.72):
    //   0.0: rgb(28,48,68)   0.2: rgb(38,68,75)   0.4: rgb(65,100,68)
    //   0.6: rgb(120,140,60) 0.8: rgb(175,170,70)  1.0: rgb(215,200,85)
    var vertShader =
      'varying vec2 vUv;\n' +
      'void main() {\n' +
      '  vUv = uv;\n' +
      '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n' +
      '}';

    var fragShader =
      'varying vec2 vUv;\n' +
      'void main() {\n' +
      // Canvas 2D Y=0 is at top, but our orthographic camera has Y=H at top.
      // Invert: t runs 0 (screen top) to 1 (screen bottom).
      '  float t = clamp(1.0 - vUv.y, 0.0, 1.0);\n' +
      '  vec3 col;\n' +
      '  if (t < 0.2) {\n' +
      '    col = mix(vec3(28.0/255.0, 48.0/255.0, 68.0/255.0), vec3(38.0/255.0, 68.0/255.0, 75.0/255.0), t / 0.2);\n' +
      '  } else if (t < 0.4) {\n' +
      '    col = mix(vec3(38.0/255.0, 68.0/255.0, 75.0/255.0), vec3(65.0/255.0, 100.0/255.0, 68.0/255.0), (t - 0.2) / 0.2);\n' +
      '  } else if (t < 0.6) {\n' +
      '    col = mix(vec3(65.0/255.0, 100.0/255.0, 68.0/255.0), vec3(120.0/255.0, 140.0/255.0, 60.0/255.0), (t - 0.4) / 0.2);\n' +
      '  } else if (t < 0.8) {\n' +
      '    col = mix(vec3(120.0/255.0, 140.0/255.0, 60.0/255.0), vec3(175.0/255.0, 170.0/255.0, 70.0/255.0), (t - 0.6) / 0.2);\n' +
      '  } else {\n' +
      '    col = mix(vec3(175.0/255.0, 170.0/255.0, 70.0/255.0), vec3(215.0/255.0, 200.0/255.0, 85.0/255.0), clamp((t - 0.8) / 0.2, 0.0, 1.0));\n' +
      '  }\n' +
      '  gl_FragColor = vec4(col, 1.0);\n' +
      '}';

    var mat = new THREE.ShaderMaterial({
      vertexShader: vertShader,
      fragmentShader: fragShader,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });
    mat.renderOrder = 0;

    var geo = new THREE.PlaneGeometry(W, H);
    var mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(W * 0.5, H * 0.5, 0);
    _3d.scene.add(mesh);
    _3d.sky = mesh;
  }

  // ── 1. Stars — static points with per-frame alpha pulse ─────────────────
  function _buildStars() {
    var count = Forest.stars.length;
    var posArr = new Float32Array(count * 3);
    var colArr = new Float32Array(count * 3);
    for (var i = 0; i < count; i++) {
      var s = Forest.stars[i];
      posArr[i * 3]     = s.nx * W;
      posArr[i * 3 + 1] = s.ny * H;
      posArr[i * 3 + 2] = 0;
      colArr[i * 3]     = 0.82;
      colArr[i * 3 + 1] = 0.88;
      colArr[i * 3 + 2] = 1.0;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colArr, 3));
    var mat = new THREE.PointsMaterial({
      size: 1.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.2,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    mat.renderOrder = 1;
    var pts = new THREE.Points(geo, mat);
    _3d.scene.add(pts);
    _3d.starPoints = pts;
    _3d.starPositions = posArr;
    _3d.starColors = colArr;
  }

  // ── 2. Sun/moon glow — circular additive sprites ────────────────────────
  function _buildSunGlow() {
    // Central glow at (W*0.5, H*0.44) — matching cenGlow center
    var cx = W * 0.5, cy = H * 0.44;

    // Inner bright disc — small Plane with radial shader
    var innerSize = H * 0.12;
    var innerGeo = new THREE.PlaneGeometry(innerSize, innerSize);
    var innerMat = new THREE.ShaderMaterial({
      vertexShader:
        'varying vec2 vUv;\n' +
        'void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader:
        'varying vec2 vUv;\n' +
        'void main() {\n' +
        '  float d = length(vUv - 0.5) * 2.0;\n' +
        '  float a = pow(1.0 - smoothstep(0.0, 1.0, d), 3.0) * 0.85;\n' +
        '  gl_FragColor = vec4(0.98, 0.92, 0.6, a);\n' +
        '}',
      transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending
    });
    innerMat.renderOrder = 2;
    var inner = new THREE.Mesh(innerGeo, innerMat);
    inner.position.set(cx, cy, 0);
    _3d.scene.add(inner);
    _3d.sunInner = inner;

    // Outer soft glow
    var outerSize = H * 0.55;
    var outerGeo = new THREE.PlaneGeometry(outerSize, outerSize);
    var outerMat = new THREE.ShaderMaterial({
      vertexShader:
        'varying vec2 vUv;\n' +
        'void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader:
        'varying vec2 vUv;\n' +
        'void main() {\n' +
        '  float d = length(vUv - 0.5) * 2.0;\n' +
        '  float a = pow(1.0 - smoothstep(0.0, 1.0, d), 5.0) * 0.3;\n' +
        '  gl_FragColor = vec4(0.96, 0.88, 0.35, a);\n' +
        '}',
      transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending
    });
    outerMat.renderOrder = 2;
    var outer = new THREE.Mesh(outerGeo, outerMat);
    outer.position.set(cx, cy, 0);
    _3d.scene.add(outer);

    // Side glows (4 positions matching original sideGlows)
    _3d.sideGlows = [];
    for (var i = 0; i < 4; i++) {
      var sx = W * (0.15 + i * 0.23);
      var sGeo = new THREE.PlaneGeometry(H * 0.4, H * 0.4);
      var sMat = new THREE.ShaderMaterial({
        vertexShader:
          'varying vec2 vUv;\n' +
          'void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader:
          'varying vec2 vUv;\n' +
          'void main() {\n' +
          '  float d = length(vUv - 0.5) * 2.0;\n' +
          '  float a = pow(1.0 - smoothstep(0.0, 1.0, d), 5.0) * 0.18;\n' +
          '  gl_FragColor = vec4(0.94, 0.86, 0.3, a);\n' +
          '}',
        transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending
      });
      sMat.renderOrder = 2;
      var sg = new THREE.Mesh(sGeo, sMat);
      sg.position.set(sx, H * 0.47, 0);
      _3d.scene.add(sg);
      _3d.sideGlows.push(sg);
    }
  }

  // ── 3. Horizon band glow ────────────────────────────────────────────────
  function _buildHorizonGlow() {
    var hGeo = new THREE.PlaneGeometry(W, H * 0.2);
    var hMat = new THREE.ShaderMaterial({
      vertexShader:
        'varying vec2 vUv;\n' +
        'void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader:
        'varying vec2 vUv;\n' +
        'void main() {\n' +
        '  float t = vUv.y;\n' +
        '  float a = t < 0.4 ? t / 0.4 : t > 0.6 ? (1.0 - t) / 0.4 : 1.0;\n' +
        '  a *= 0.08;\n' +
        '  gl_FragColor = vec4(0.92, 0.84, 0.33, a);\n' +
        '}',
      transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending
    });
    hMat.renderOrder = 3;
    var hMesh = new THREE.Mesh(hGeo, hMat);
    hMesh.position.set(W * 0.5, H * 0.48, 0);
    _3d.scene.add(hMesh);
    _3d.horizonBand = hMesh;
  }

  // ── 4. Hills — 4 layers of silhouette buffer geometry ──────────────────
  function _buildHills() {
    _3d.scene.add(_buildHillLayer(function (x) {
      return gY - H * 0.055 - Math.sin(x * 0.0015 + 0.7) * H * 0.035
           - Math.sin(x * 0.004 + 2.4) * H * 0.018 - Math.sin(x * 0.009 + 1.1) * H * 0.01;
    }, W, H, gY, [45, 65, 40, 0.25]));

    _3d.scene.add(_buildHillLayer(function (x) {
      return gY - H * 0.07 - Math.sin(x * 0.002 + 2.1) * H * 0.03
           - Math.sin(x * 0.006 + 1.7) * H * 0.015;
    }, W, H, gY, [55, 75, 50, 0.28]));

    _3d.scene.add(_buildHillLayer(function (x) {
      return gY - H * 0.04 - Math.sin(x * 0.003 + 1.2) * H * 0.025
           - Math.sin(x * 0.008 + 0.5) * H * 0.012;
    }, W, H, gY, [65, 85, 50, 0.35]));

    _3d.scene.add(_buildHillLayer(function (x) {
      return gY - H * 0.015 - Math.sin(x * 0.005 + 3.8) * H * 0.018
           - Math.sin(x * 0.012 + 1.1) * H * 0.008;
    }, W, H, gY, [80, 100, 55, 0.3]));
  }

  // ── 5. Ground — flat plane with shader gradient ─────────────────────────
  function _buildGround() {
    var groundH = H - gY;
    var geo = new THREE.PlaneGeometry(W, groundH);
    var mat = new THREE.ShaderMaterial({
      vertexShader:
        'varying vec2 vUv;\n' +
        'void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader:
        'varying vec2 vUv;\n' +
        'void main() {\n' +
        '  float t = vUv.y;\n' +
        '  vec3 col;\n' +
        '  if (t < 0.15) col = mix(vec3(0.647,0.627,0.255), vec3(0.510,0.529,0.196), t/0.15);\n' +
        '  else if (t < 0.35) col = mix(vec3(0.510,0.529,0.196), vec3(0.314,0.373,0.165), (t-0.15)/0.20);\n' +
        '  else if (t < 0.60) col = mix(vec3(0.314,0.373,0.165), vec3(0.196,0.255,0.137), (t-0.35)/0.25);\n' +
        '  else col = mix(vec3(0.196,0.255,0.137), vec3(0.118,0.165,0.098), (t-0.60)/0.40);\n' +
        '  gl_FragColor = vec4(col, 1.0);\n' +
        '}',
      depthTest: false, depthWrite: false
    });
    mat.renderOrder = 5;
    var ground = new THREE.Mesh(geo, mat);
    ground.position.set(W * 0.5, gY + groundH * 0.5, 0);
    _3d.scene.add(ground);
    _3d.ground = ground;
  }

  // ── 6. River — thin blue plane ──────────────────────────────────────────
  function _buildRiver() {
    var rivY = gY - H * 0.02;
    var rivH = H * 0.04;
    var geo = new THREE.PlaneGeometry(W, rivH);
    var mat = new THREE.ShaderMaterial({
      vertexShader:
        'varying vec2 vUv;\n' +
        'void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader:
        'varying vec2 vUv;\n' +
        'void main() {\n' +
        '  float t = vUv.y;\n' +
        '  vec3 col = t < 0.5\n' +
        '    ? mix(vec3(0.176,0.275,0.345), vec3(0.235,0.373,0.424), t*2.0)\n' +
        '    : mix(vec3(0.235,0.373,0.424), vec3(0.137,0.216,0.275), (t-0.5)*2.0);\n' +
        '  gl_FragColor = vec4(col, 0.92);\n' +
        '}',
      transparent: true, depthTest: false, depthWrite: false
    });
    mat.renderOrder = 6;
    var river = new THREE.Mesh(geo, mat);
    river.position.set(W * 0.5, rivY + rivH * 0.5, 0);
    _3d.scene.add(river);
    _3d.river = river;
  }

  // ── 7. Ground fog ───────────────────────────────────────────────────────
  function _buildGroundFog() {
    var fogGeo = new THREE.PlaneGeometry(W, 120);
    var fogMat = new THREE.ShaderMaterial({
      vertexShader:
        'varying vec2 vUv;\n' +
        'void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader:
        'varying vec2 vUv;\n' +
        'void main() {\n' +
        '  float t = vUv.y;\n' +
        '  float a = t < 0.2 ? t/0.2 : t < 0.4 ? 1.0 : t < 0.6 ? 1.0-(t-0.4)/0.2 : 0.0;\n' +
        '  a *= 0.14;\n' +
        '  gl_FragColor = vec4(0.73, 0.71, 0.31, a);\n' +
        '}',
      transparent: true, depthTest: false, depthWrite: false
    });
    fogMat.renderOrder = 15;
    var fog = new THREE.Mesh(fogGeo, fogMat);
    fog.position.set(W * 0.5, gY, 0);
    _3d.scene.add(fog);
    _3d.groundFog = fog;
  }

  // ── 10/11/12. Trees — InstancedMesh per layer (far, mid, fg) ────────────
  function _buildTrees() {
    _3d.treeInstances = {};

    var layers = [
      { name: 'far', trees: Forest.farTrees, order: 10 },
      { name: 'mid', trees: Forest.midTrees, order: 11 },
      { name: 'fg',  trees: Forest.fgTrees,  order: 12 }
    ];

    for (var li = 0; li < layers.length; li++) {
      var layer = layers[li];
      var trees = layer.trees;
      if (!trees || !trees.length) continue;

      // Filter visible trees (matches canvas-core.js skip logic)
      var visible = [];
      for (var i = 0; i < trees.length; i++) {
        var tx;
        if (layer.name === 'far') {
          tx = W * (((i + 0.5) / trees.length + (trees[i].nx - 0.5) * 0.12) * 1.5 - 0.25);
        } else if (layer.name === 'mid') {
          tx = W * (((i + 0.5) / trees.length + (trees[i].nx - 0.5) * 0.12) * 1.4 - 0.2);
        } else {
          tx = W * (((i + 0.5) / trees.length + (trees[i].nx - 0.5) * 0.12) * 1.6 - 0.3);
        }
        if (tx < W * 0.33 && (i % 3 === 0)) continue;
        visible.push({ tree: trees[i], tx: tx });
      }

      var nVis = visible.length;
      if (nVis === 0) continue;

      // ── Trunk InstancedMesh ────────────────────────────────────────────
      var taper = layer.name === 'far' ? 0.5 : layer.name === 'mid' ? 0.575 : 0.65;
      var trunkGeo = new THREE.CylinderGeometry(1.0, taper, 1, 8, 1);
      var trunkMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0.165, 0.102, 0.149),
        depthTest: false, depthWrite: false
      });
      trunkMat.renderOrder = layer.order;
      var trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, nVis);
      trunkInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

      // Per-instance bark tint via instanceColor (r128+)
      if (trunkInst.instanceColor) {
        for (var j = 0; j < nVis; j++) {
          var t = visible[j].tree;
          var si = t.stripes.length ? t.stripes[0].ci : 0;
          var bc = BARK[si % BARK.length];
          trunkInst.setColorAt(j, new THREE.Color(bc[0] / 255, bc[1] / 255, bc[2] / 255));
        }
        trunkInst.instanceColor.needsUpdate = true;
      }
      _3d.scene.add(trunkInst);

      // ── Canopy InstancedMesh ───────────────────────────────────────────
      var refTree = trees[Math.floor(trees.length / 2)];
      var refBlobs = [];
      for (var bi = 0; bi < refTree.canopy.length; bi++) {
        var blob = refTree.canopy[bi];
        refBlobs.push({ ox: blob.ox, oy: blob.oy, r: blob.r, squash: blob.squash });
      }
      var canopyGeo = _buildCanopyGeo(refBlobs);
      var canopyMat = new THREE.MeshBasicMaterial({
        color: 0x376a3a,
        depthTest: false, depthWrite: false
      });
      canopyMat.renderOrder = layer.order;
      var canopyInst = new THREE.InstancedMesh(canopyGeo, canopyMat, nVis);
      canopyInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

      // Per-instance canopy color
      if (canopyInst.instanceColor) {
        for (var j = 0; j < nVis; j++) {
          var ct = visible[j].tree;
          var ci = ct.canopy.length ? ct.canopy[0].ci : 0;
          var cc = CANOPY[ci % CANOPY.length];
          canopyInst.setColorAt(j, new THREE.Color(cc[0] / 255, cc[1] / 255, cc[2] / 255));
        }
        canopyInst.instanceColor.needsUpdate = true;
      }
      _3d.scene.add(canopyInst);

      // ── Compute per-tree data for sway ─────────────────────────────────
      var treeData = [];
      for (var j = 0; j < nVis; j++) {
        var v = visible[j];
        var t = v.tree;
        var trunkBottom = t.baseY * H;
        var trunkTop    = t.topY * H;
        var trunkH      = trunkBottom - trunkTop;
        var trunkCY     = (trunkBottom + trunkTop) * 0.5;
        var baseW       = t.trunkW * W;

        var refAvgOX = 0, refAvgOY = 0, refAvgR = 0;
        for (var bi = 0; bi < refTree.canopy.length; bi++) {
          refAvgOX += refTree.canopy[bi].ox;
          refAvgOY += refTree.canopy[bi].oy;
          refAvgR  += refTree.canopy[bi].r;
        }
        var refN = Math.max(refTree.canopy.length, 1);
        refAvgOX /= refN; refAvgOY /= refN; refAvgR /= refN;

        var tgtAvgOY = 0, avgR = 0;
        for (var bi = 0; bi < t.canopy.length; bi++) {
          tgtAvgOY += t.canopy[bi].oy;
          avgR     += t.canopy[bi].r;
        }
        var tgtN = Math.max(t.canopy.length, 1);
        tgtAvgOY /= tgtN; avgR /= tgtN;

        var cRatio = refAvgR > 0.001 ? avgR / refAvgR : 1.0;
        var canopySX = W * cRatio;
        var canopySY = H * cRatio;
        var canopyPX = v.tx + W * 0 - canopySX * refAvgOX;
        var canopyPY = H * tgtAvgOY - canopySY * refAvgOY;

        treeData.push({
          tx: v.tx,
          nx: t.nx,
          trunkCY: trunkCY,
          trunkH: trunkH,
          baseW: baseW,
          canopyPX: canopyPX,
          canopyPY: canopyPY,
          canopySX: canopySX,
          canopySY: canopySY,
          layer: layer.name,
          lean: t.lean,
        });
      }

      _3d.treeInstances[layer.name] = {
        trunk:  { inst: trunkInst,  data: treeData },
        canopy: { inst: canopyInst, data: treeData }
      };
    }
  }

  // ── 13. Undergrowth — InstancedMesh for ferns + Points for grass ────────
  function _buildUndergrowth() {
    var ug = Forest.undergrowth;
    if (!ug || !ug.length) return;

    var ferns = [], grasses = [], bushes = [], mushrooms = [];
    for (var i = 0; i < ug.length; i++) {
      var u = ug[i];
      if (u.type === 'fern') ferns.push(u);
      else if (u.type === 'grass') grasses.push(u);
      else if (u.type === 'bush') bushes.push(u);
      else if (u.type === 'mushroom') mushrooms.push(u);
    }

    // ── Ferns: thin PlaneGeometry instances ──────────────────────────────
    if (ferns.length) {
      var fGeo = new THREE.PlaneGeometry(1, 1);
      var fMat = new THREE.MeshBasicMaterial({
        color: 0x2d5a2a,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
        depthTest: false,
        depthWrite: false
      });
      fMat.renderOrder = 13;
      var fInst = new THREE.InstancedMesh(fGeo, fMat, ferns.length);
      fInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      if (fInst.instanceColor) {
        for (var i = 0; i < ferns.length; i++) {
          var fc = FERN[ferns[i].ci % FERN.length];
          fInst.setColorAt(i, new THREE.Color(fc[0] / 255, fc[1] / 255, fc[2] / 255));
        }
        fInst.instanceColor.needsUpdate = true;
      }
      _3d.scene.add(fInst);
      _3d.ugFerns = { inst: fInst, data: ferns };
    }

    // ── Grass: Points (colored dots) ─────────────────────────────────────
    if (grasses.length) {
      var gPos = new Float32Array(grasses.length * 3);
      var gCol = new Float32Array(grasses.length * 3);
      for (var i = 0; i < grasses.length; i++) {
        var g = grasses[i];
        gPos[i * 3]     = g.nx * W;
        gPos[i * 3 + 1] = g.baseY * H;
        gPos[i * 3 + 2] = 0;
        var gc = FERN[g.ci % FERN.length];
        gCol[i * 3]     = gc[0] / 255;
        gCol[i * 3 + 1] = gc[1] / 255;
        gCol[i * 3 + 2] = gc[2] / 255;
      }
      var gGeo = new THREE.BufferGeometry();
      gGeo.setAttribute('position', new THREE.Float32BufferAttribute(gPos, 3));
      gGeo.setAttribute('color', new THREE.Float32BufferAttribute(gCol, 3));
      var gMat = new THREE.PointsMaterial({
        size: 5,
        vertexColors: true,
        transparent: true,
        opacity: 0.5,
        depthTest: false,
        depthWrite: false
      });
      gMat.renderOrder = 13;
      var gPts = new THREE.Points(gGeo, gMat);
      _3d.scene.add(gPts);
      _3d.ugGrass = gPts;
    }

    // ── Bushes: Sphere instances ─────────────────────────────────────────
    if (bushes.length) {
      var bGeo = new THREE.SphereGeometry(1, 5, 4);
      var bMat = new THREE.MeshBasicMaterial({
        color: 0x3a6a30,
        transparent: true,
        opacity: 0.82,
        depthTest: false,
        depthWrite: false
      });
      bMat.renderOrder = 13;
      var bInst = new THREE.InstancedMesh(bGeo, bMat, bushes.length);
      bInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      if (bInst.instanceColor) {
        for (var i = 0; i < bushes.length; i++) {
          var bu = bushes[i];
          var ci = bu.blobs.length ? bu.blobs[0].ci : 0;
          var bc = CANOPY[ci % CANOPY.length];
          bInst.setColorAt(i, new THREE.Color(bc[0] / 255, bc[1] / 255, bc[2] / 255));
        }
        bInst.instanceColor.needsUpdate = true;
      }
      _3d.scene.add(bInst);
      _3d.ugBushes = { inst: bInst, data: bushes };
    }

    // ── Mushrooms: tiny capped shapes (spheres) ──────────────────────────
    if (mushrooms.length) {
      var mGeo = new THREE.SphereGeometry(1, 5, 3);
      var mColors = [[180, 50, 40], [200, 170, 60], [160, 130, 90]];
      var mMat = new THREE.MeshBasicMaterial({
        color: 0xb43228,
        transparent: true,
        opacity: 0.7,
        depthTest: false,
        depthWrite: false
      });
      mMat.renderOrder = 13;
      var mInst = new THREE.InstancedMesh(mGeo, mMat, mushrooms.length);
      mInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      if (mInst.instanceColor) {
        for (var i = 0; i < mushrooms.length; i++) {
          var mc = mColors[mushrooms[i].ci % 3];
          mInst.setColorAt(i, new THREE.Color(mc[0] / 255, mc[1] / 255, mc[2] / 255));
        }
        mInst.instanceColor.needsUpdate = true;
      }
      _3d.scene.add(mInst);
      _3d.ugMushrooms = { inst: mInst, data: mushrooms };
    }
  }

  // ── 20. Particles — single Points object ────────────────────────────────
  function _buildParticles() {
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(_pBufPos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(_pBufCol, 3));
    geo.setAttribute('size', new THREE.Float32BufferAttribute(_pBufSize, 1));
    geo.setDrawRange(0, 0);

    // Circular sprite texture
    var spriteCvs = document.createElement('canvas');
    spriteCvs.width = 32; spriteCvs.height = 32;
    var sctx = spriteCvs.getContext('2d');
    sctx.beginPath();
    sctx.arc(16, 16, 15, 0, Math.PI * 2);
    sctx.fillStyle = '#fff';
    sctx.fill();
    var spriteTex = new THREE.CanvasTexture(spriteCvs);

    var mat = new THREE.PointsMaterial({
      size: 4,
      map: spriteTex,
      vertexColors: true,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    mat.renderOrder = 20;
    _3d.particles = new THREE.Points(geo, mat);
    _3d.scene.add(_3d.particles);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Forest.render(ts) — per-frame update + draw
  //  ZERO per-frame allocations: all temps pre-allocated, no new/[]/{…obj}
  //  inside this function or any function it calls.
  // ══════════════════════════════════════════════════════════════════════════

  Forest.render = function (ts) {
    if (!_3d.renderer || !_playing) return;

    // Accumulate time (same as original canvas-core)
    if (_lastTs === null) _lastTs = ts;
    var dt = Math.min((ts - _lastTs) / 1000, 0.05);
    _lastTs = ts;
    _time += dt;
    _windPhase += dt * 0.15;
    var wind = Math.sin(_windPhase) * 0.5 + Math.sin(_windPhase * 2.3) * 0.2;

    // ── Update star alpha pulse ─────────────────────────────────────────
    if (_3d.starColors && !_prefersReducedMotion) {
      var sc = _3d.starColors;
      var stars = Forest.stars;
      for (var si = 0; si < stars.length; si++) {
        var a = 0.12 + Math.sin(_time * 0.5 + stars[si].ph) * 0.08;
        sc[si * 3 + 1] = 0.88 + a * 0.5;
      }
      _3d.starPoints.geometry.attributes.color.needsUpdate = true;
      _3d.starPoints.material.opacity = 0.14 + Math.sin(_time * 0.3) * 0.06;
    }

    // ── Update tree transforms ──────────────────────────────────────────
    var layerNames = ['far', 'mid', 'fg'];
    for (var li = 0; li < layerNames.length; li++) {
      var ln = layerNames[li];
      var layerInst = _3d.treeInstances[ln];
      if (!layerInst) continue;

      var trunkT  = layerInst.trunk;
      var canopyT = layerInst.canopy;
      var data    = trunkT.data;

      for (var j = 0; j < data.length; j++) {
        var d = data[j];
        var sway, trunkLean;
        if (_prefersReducedMotion) {
          sway = 0;
          trunkLean = 0;
        } else {
          var swayBase;
          if (ln === 'fg')  swayBase = 0.12;
          else if (ln === 'mid') swayBase = 0.09;
          else /* far */        swayBase = 0.05;

          var phase = d.nx * 6.28;
          sway  = Math.sin(_time * 0.15 + phase) * swayBase
                + Math.sin(_time * 0.15 * 2.3 + phase * 1.7) * swayBase * 0.3;
          sway += wind * (ln === 'fg' ? 0.035 : ln === 'mid' ? 0.018 : 0.008);
          trunkLean = d.lean * 0.5;
        }

        var trunkX     = d.tx + sway;
        var trunkCY    = d.trunkCY;
        var trunkH     = d.trunkH;

        _setInstance(trunkT.inst, j,
          trunkX, trunkCY, 0,
          trunkLean,
          d.baseW, trunkH, d.baseW);

        _setInstance(canopyT.inst, j,
          d.canopyPX + sway * 0.6, d.canopyPY, 0,
          trunkLean + sway * 0.1,
          d.canopySX, d.canopySY, d.canopySX);
      }

      trunkT.inst.instanceMatrix.needsUpdate = true;
      canopyT.inst.instanceMatrix.needsUpdate = true;
    }

    // ── Update undergrowth transforms ───────────────────────────────────
    if (!_prefersReducedMotion) {
    if (_3d.ugFerns) {
      var fInst = _3d.ugFerns.inst;
      var fData = _3d.ugFerns.data;
      for (var i = 0; i < fData.length; i++) {
        var f = fData[i];
        var fs = Math.sin(_time * 0.6 + f.swayPhase) * f.swayAmp * 0.3;
        _setInstance(fInst, i,
          f.nx * W + fs, f.baseY * H - f.size * 0.5, 0,
          Math.sin(_time * 0.6 + f.swayPhase) * 0.2,
          f.size * 0.1, f.size, 1);
      }
      fInst.instanceMatrix.needsUpdate = true;
    }

    if (_3d.ugBushes) {
      var bInst = _3d.ugBushes.inst;
      var bData = _3d.ugBushes.data;
      for (var i = 0; i < bData.length; i++) {
        var b = bData[i];
        var bs = Math.sin(_time * 0.45 + b.swayPhase) * b.swayAmp * 0.2;
        var br = b.blobs.length ? b.blobs[0].r : 10;
        _setInstance(bInst, i,
          b.nx * W + bs, b.baseY * H - br * 0.4, 0,
          0,
          br, br * 0.7, br);
      }
      bInst.instanceMatrix.needsUpdate = true;
    }
    } // end reduced-motion guard for undergrowth sway

    if (_3d.ugMushrooms) {
      var mInst = _3d.ugMushrooms.inst;
      var mData = _3d.ugMushrooms.data;
      for (var i = 0; i < mData.length; i++) {
        var m = mData[i];
        _setInstance(mInst, i,
          m.nx * W, m.baseY * H - m.size * 0.6, 0,
          0,
          m.size * 0.4, m.size * 0.25, m.size * 0.4);
      }
      mInst.instanceMatrix.needsUpdate = true;
    }

    // ── Particles — spawn + update (skip when reduced motion) ──────────
    if (!_prefersReducedMotion) {
    // Spawn at original rates
    if (Math.random() < 0.05) Forest.spawnP('firefly', W, H);
    if (Math.random() < 0.10) Forest.spawnP('spore',   W, H);
    if (Math.random() < 0.18) Forest.spawnP('leaf',    W, H);
    if (Math.random() < 0.12) Forest.spawnP('leaf',    W, H);
    if (Math.random() < 0.04) Forest.spawnP('petal',   W, H);
    if (Math.random() < 0.08) Forest.spawnP('dust',    W, H);

    _pVisCount = 0;
    var parts = Forest.particles;
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.life--;
      if (p.life <= 0) {
        parts[i] = parts[parts.length - 1];
        parts.pop();
        Forest._recycleParticle(p);
        continue;
      }

      var lr = p.life / p.ml;
      var a = lr < 0.15 ? lr / 0.15 : (lr > 0.85 ? (1 - lr) / 0.15 : 1);

      if (p.type === 'firefly') {
        p.ph += p.fs;
        p.vx += (Math.random() - 0.5) * 0.018 + wind * 0.004;
        p.vy += (Math.random() - 0.5) * 0.012;
        p.x += p.vx; p.y += p.vy;
        var fl = 0.25 + Math.sin(p.ph) * 0.6;
        if (_pVisCount < MAX_P) {
          var fi = _pVisCount;
          _pBufPos[fi * 3] = p.x; _pBufPos[fi * 3 + 1] = p.y; _pBufPos[fi * 3 + 2] = 0;
          _pBufCol[fi * 3] = 0.86; _pBufCol[fi * 3 + 1] = 1.0; _pBufCol[fi * 3 + 2] = 0.55;
          _pBufSize[fi] = p.r * 3.2 * a * fl;
          _pVisCount++;
        }
      } else if (p.type === 'spore') {
        p.x += p.vx + Math.sin(_time * 0.8 + p.ph) * 0.45 + wind * 0.3;
        p.y += p.vy;
        if (_pVisCount < MAX_P) {
          var si = _pVisCount;
          _pBufPos[si * 3] = p.x; _pBufPos[si * 3 + 1] = p.y; _pBufPos[si * 3 + 2] = 0;
          _pBufCol[si * 3] = 0.88; _pBufCol[si * 3 + 1] = 0.88; _pBufCol[si * 3 + 2] = 0.71;
          _pBufSize[si] = p.r * a;
          _pVisCount++;
        }
      } else if (p.type === 'leaf') {
        p.vx += wind * 0.012;
        p.x += p.vx + Math.sin(_time * p.flutterSpeed + p.ph) * p.flutter;
        p.y += p.vy + Math.sin(_time * 0.3 + p.ph * 2) * 0.15;
        p.rot += p.rs + Math.cos(_time * p.flutterSpeed + p.ph) * 0.02;
        if (p.y > H + 20) p.life = 0;
        if (_pVisCount < MAX_P) {
          var li = _pVisCount;
          _pBufPos[li * 3] = p.x; _pBufPos[li * 3 + 1] = p.y; _pBufPos[li * 3 + 2] = 0;
          var lc = p.c;
          _pBufCol[li * 3] = lc[0] / 255; _pBufCol[li * 3 + 1] = lc[1] / 255; _pBufCol[li * 3 + 2] = lc[2] / 255;
          _pBufSize[li] = p.sz * a;
          _pVisCount++;
        }
      } else if (p.type === 'petal') {
        p.x += p.vx + Math.sin(_time * 0.4 + p.ph) * 0.8 + wind * 0.3;
        p.y += p.vy;
        p.rot += p.rs;
        if (p.y > H + 10) p.life = 0;
        if (_pVisCount < MAX_P) {
          var pi = _pVisCount;
          _pBufPos[pi * 3] = p.x; _pBufPos[pi * 3 + 1] = p.y; _pBufPos[pi * 3 + 2] = 0;
          var pc = p.c;
          _pBufCol[pi * 3] = pc[0] / 255; _pBufCol[pi * 3 + 1] = pc[1] / 255; _pBufCol[pi * 3 + 2] = pc[2] / 255;
          _pBufSize[pi] = p.sz * a;
          _pVisCount++;
        }
      } else if (p.type === 'dust') {
        p.x += p.vx + Math.sin(_time * 0.3 + p.ph) * 0.15 + wind * 0.1;
        p.y += p.vy + Math.sin(_time * 0.25 + p.ph * 1.3) * 0.1;
        if (_pVisCount < MAX_P) {
          var di = _pVisCount;
          _pBufPos[di * 3] = p.x; _pBufPos[di * 3 + 1] = p.y; _pBufPos[di * 3 + 2] = 0;
          _pBufCol[di * 3] = 0.86; _pBufCol[di * 3 + 1] = 0.82; _pBufCol[di * 3 + 2] = 0.59;
          _pBufSize[di] = p.r * a;
          _pVisCount++;
        }
      }
    }
    } // end reduced-motion guard for particles

    // Update particle buffer attributes — direct Float32Array writes, no allocation
    if (_3d.particles) {
      var pGeo = _3d.particles.geometry;
      pGeo.attributes.position.needsUpdate = true;
      pGeo.attributes.color.needsUpdate = true;
      pGeo.attributes.size.needsUpdate = true;
      pGeo.setDrawRange(0, _pVisCount);
    }

    // ── Render ──────────────────────────────────────────────────────────
    _3d.renderer.render(_3d.scene, _3d.camera);
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  Forest.resize() — soft vs hard resize
  //  - Same quality tier: update camera + renderer only (immediate, zero tear-down)
  //  - Cross-tier: full rebuild (debounced to 500ms)
  // ══════════════════════════════════════════════════════════════════════════

  /** Soft resize: update camera frustum + renderer size, keep scene intact */
  function _softResize() {
    if (!_3d.renderer || !_3d.camera) return;
    W = window.innerWidth;
    H = window.innerHeight;
    gY = H * 0.58;
    _3d.camera.right = W;
    _3d.camera.top = H;
    _3d.camera.bottom = 0;
    _3d.camera.updateProjectionMatrix();
    _3d.renderer.setSize(W, H, false);
  }

  /** Hard rebuild: tear down scene, regenerate trees + rebuild */
  Forest.resize = function () {
    var newQuality = _detectQuality(window.innerWidth);
    var newCfg = _tierCfg(newQuality);

    // Update quality state
    Forest.quality = newQuality;
    Forest.tierCfg  = newCfg;

    // Update particle limits
    MAX_P = newCfg.particles;
    Forest.MAX_PARTICLES = MAX_P;

    // Resize or reallocate particle buffers
    if (_pBufPos.length < MAX_P * 3) {
      _pBufPos  = new Float32Array(MAX_P * 3);
      _pBufCol  = new Float32Array(MAX_P * 3);
      _pBufSize = new Float32Array(MAX_P);
    }
    // Cap existing particles if we downsized
    while (Forest.particles.length > MAX_P) {
      Forest.particles.pop();
    }
    _particlePool = [];

    // Regenerate scene layers with new tree counts
    Forest.farTrees = Forest.genLayer(newCfg.far, 'far', 42);
    Forest.midTrees = Forest.genLayer(newCfg.mid, 'mid', 137);
    Forest.fgTrees  = Forest.genLayer(newCfg.fg, 'fg',  99);

    // Add 2 extra near-camera trees (same as forest-scene.js)
    (function () {
      var r = Forest.mkRng(2025);
      for (var i = 0; i < 2; i++) {
        var t = Forest.genTree(r, 'fg');
        t.nx = 0.04 + 0.07 * i + 0.04 * (r() - 0.5);
        t.trunkW *= 1.1 + 0.15 * r();
        Forest.fgTrees.push(t);
      }
    })();

    _disposeScene();
    _time = 0;
    _windPhase = 0;
    _lastTs = null;
    Forest.initGL();
  };

  function _disposeScene() {
    if (_3d.scene) {
      _3d.scene.traverse(function (obj) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(function (m) { if (m.map) m.map.dispose(); m.dispose(); });
          } else {
            if (obj.material.map) obj.material.map.dispose();
            obj.material.dispose();
          }
        }
      });
      while (_3d.scene.children.length) {
        _3d.scene.remove(_3d.scene.children[0]);
      }
    }

    if (_3d.renderer) {
      var el = _3d.renderer.domElement;
      if (el && el.parentNode) el.parentNode.removeChild(el);
      _3d.renderer.dispose();
      _3d.renderer = null;
    }
    _3d = {};
  }

  // ── Resize listener: soft on same-tier, hard (debounced) on cross-tier ──
  var _resizeTimer = null;
  var _lastQualityOnResize = Forest.quality;
  window.addEventListener('resize', function () {
    var newQuality = _detectQuality(window.innerWidth);
    if (newQuality === _lastQualityOnResize) {
      // Same tier — immediate soft resize
      _softResize();
    } else {
      // Cross-tier — immediate soft (camera) + debounce the full rebuild
      _softResize();
      if (_resizeTimer) clearTimeout(_resizeTimer);
      _resizeTimer = setTimeout(function () {
        _resizeTimer = null;
        // Recheck: avoid rebuilding if quality bounced back during debounce
        var qNow = _detectQuality(window.innerWidth);
        if (qNow !== _lastQualityOnResize) {
          _lastQualityOnResize = qNow;
          Forest.resize();
        }
      }, 500);
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  Boot — start the RAF loop
  // ══════════════════════════════════════════════════════════════════════════

  function _rafLoop(ts) {
    Forest.render(ts);
    _rafId = requestAnimationFrame(_rafLoop);
  }

  function _tryBoot() {
    if (!Forest.farTrees || !Forest.midTrees || !Forest.fgTrees || !Forest.genLayer) {
      requestAnimationFrame(_tryBoot);
      return;
    }
    Forest.initGL();
    _rafId = requestAnimationFrame(_rafLoop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _tryBoot);
  } else {
    _tryBoot();
  }

})();
