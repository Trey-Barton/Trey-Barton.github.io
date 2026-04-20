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
  var navTicking = false;
  window.addEventListener('scroll', function() {
    if (!navTicking) { navTicking = true; requestAnimationFrame(function() { updateNav(); navTicking = false; }); }
  }, { passive: true });
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
  // Autoplay the profile loop aggressively — iOS Safari + mobile Chrome
  // will block `autoplay` when: the page is backgrounded at load, Low Power
  // Mode is on, the video is preparing, or metadata hasn't arrived. Belt +
  // braces: force muted via JS (HTML attr alone isn't always trusted), call
  // play() on every readiness event, and retry on first user interaction.
  var profileVideo = document.querySelector('.profile-video');
  if (profileVideo) {
    profileVideo.muted = true;          // required for iOS autoplay
    profileVideo.defaultMuted = true;
    profileVideo.playsInline = true;
    profileVideo.setAttribute('muted', '');
    profileVideo.setAttribute('playsinline', '');
    profileVideo.setAttribute('webkit-playsinline', '');

    function tryPlay() {
      if (profileVideo.paused) {
        try {
          var p = profileVideo.play();
          if (p && p.catch) p.catch(function(){ /* will retry on next event */ });
        } catch (_) {}
      }
    }

    // Fire on every readiness signal — whichever arrives first wins.
    ['loadedmetadata','loadeddata','canplay','canplaythrough'].forEach(function(evt) {
      profileVideo.addEventListener(evt, tryPlay);
    });
    // Kick once immediately in case the video is already ready.
    tryPlay();
    // Kick again after the page settles (in case autoplay needs layout done).
    setTimeout(tryPlay, 100);
    setTimeout(tryPlay, 600);

    // Still paused? Any user interaction starts it.
    var resume = function() {
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

    // Pause when off-screen to save battery, resume when back in view.
    var videoObs = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
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
