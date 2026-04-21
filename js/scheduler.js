/**
 * window.UI.scheduler — one coalesced per-frame work queue.
 *
 * Replaces N independent `requestAnimationFrame` + scroll/resize handlers
 * with a single dirty-flag queue. Other modules register work by name:
 *
 *   UI.scheduler.markDirty('wires');       // fire-and-forget
 *   UI.scheduler.register('wires', fn);    // runs on next RAF if dirty
 *
 * Two trigger verbs:
 *   • markDirty(key)  — request the work to run on the next RAF.
 *   • onScroll(fn) / onResize(fn) — convenience: fn gets markDirty-wrapped
 *                                  and fires with passive listeners.
 *
 * Why: previously we had 3 resize + 4 scroll listeners + 8 separate RAFs.
 * On a fast drag or scroll this did up to 240 layout reads/writes per
 * second across independent handlers, which cascaded into jank on mobile.
 * Now: one listener, one RAF, drains all dirty work once per frame.
 */
window.UI = window.UI || {};

(function () {
  'use strict';

  var dirty = Object.create(null);
  var tasks = Object.create(null);
  var scheduled = false;

  function flush() {
    scheduled = false;
    // Snapshot + clear first so tasks that re-mark themselves get the next frame.
    var toRun = dirty;
    dirty = Object.create(null);
    for (var key in toRun) {
      var fn = tasks[key];
      if (fn) {
        try { fn(); } catch (e) { console.warn('[scheduler]', key, e); }
      }
    }
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(flush);
  }

  function register(key, fn) {
    tasks[key] = fn;
  }

  function markDirty(key) {
    dirty[key] = true;
    schedule();
  }

  function onScroll(key, fn) {
    register(key, fn);
    window.addEventListener('scroll', function () { markDirty(key); }, { passive: true });
  }

  function onResize(key, fn) {
    register(key, fn);
    window.addEventListener('resize', function () { markDirty(key); }, { passive: true });
  }

  UI.scheduler = {
    register:  register,
    markDirty: markDirty,
    onScroll:  onScroll,
    onResize:  onResize,
  };
})();
