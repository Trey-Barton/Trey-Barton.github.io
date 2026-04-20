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
  // Pause video when off-screen to save GPU/battery. play() returns a
  // Promise that rejects if autoplay is blocked (e.g., iOS low-power mode
  // or tab backgrounded at load) — swallow the error so one failure doesn't
  // permanently disable playback. Retry on first user interaction.
  var profileVideo = document.querySelector('.profile-video');
  if (profileVideo) {
    function tryPlay() {
      var p = profileVideo.play();
      if (p && p.catch) p.catch(function(){});
    }
    // Kick it once on load.
    tryPlay();
    var videoObs = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) tryPlay();
        else profileVideo.pause();
      });
    }, { threshold: 0.1 });
    videoObs.observe(profileVideo);
    // Recover if a hands-off autoplay got blocked — any tap starts it.
    var resume = function() {
      tryPlay();
      document.removeEventListener('touchstart', resume);
      document.removeEventListener('click', resume);
    };
    document.addEventListener('touchstart', resume, { passive: true, once: true });
    document.addEventListener('click', resume, { once: true });
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
