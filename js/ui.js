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
  // Pause video when off-screen to save GPU/battery
  var profileVideo = document.querySelector('.profile-video');
  if (profileVideo) {
    var videoObs = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) profileVideo.play();
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
