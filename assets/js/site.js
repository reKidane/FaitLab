/* Fait Lab site script: menu, home slideshow, section index highlight, gallery lightbox.
   Plain JavaScript, no dependencies. */
(function () {
  'use strict';

  /* Mobile menu */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* Home slideshow */
  var hero = document.querySelector('[data-slideshow]');
  if (hero) {
    var slides = hero.querySelectorAll('.hero-slide');
    var dots = hero.querySelectorAll('.hero-dot');
    var caption = hero.querySelector('.hero-caption');
    var current = 0;
    var timer = null;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var show = function (i) {
      var n = slides.length;
      current = (i + n) % n;
      for (var k = 0; k < n; k++) {
        slides[k].classList.toggle('is-active', k === current);
        if (dots[k]) {
          dots[k].classList.toggle('is-active', k === current);
          dots[k].setAttribute('aria-current', k === current ? 'true' : 'false');
        }
      }
      var img = slides[current].querySelector('img');
      if (img && img.getAttribute('data-src')) {
        img.src = img.getAttribute('data-src');
        if (img.getAttribute('data-srcset')) img.srcset = img.getAttribute('data-srcset');
        img.removeAttribute('data-src');
        img.removeAttribute('data-srcset');
      }
      if (caption) caption.textContent = slides[current].getAttribute('data-caption') || '';
      // Warm up the next slide so the crossfade never shows a blank frame
      var nextImg = slides[(current + 1) % n].querySelector('img');
      if (nextImg && nextImg.getAttribute('data-src')) {
        nextImg.src = nextImg.getAttribute('data-src');
        if (nextImg.getAttribute('data-srcset')) nextImg.srcset = nextImg.getAttribute('data-srcset');
        nextImg.removeAttribute('data-src');
        nextImg.removeAttribute('data-srcset');
      }
    };
    var start = function () {
      if (reduce) return;
      stop();
      timer = window.setInterval(function () { show(current + 1); }, 6000);
    };
    var stop = function () { if (timer) { window.clearInterval(timer); timer = null; } };

    var prev = hero.querySelector('[data-prev]');
    var next = hero.querySelector('[data-next]');
    if (prev) prev.addEventListener('click', function () { show(current - 1); start(); });
    if (next) next.addEventListener('click', function () { show(current + 1); start(); });
    for (var d = 0; d < dots.length; d++) {
      (function (idx) {
        dots[idx].addEventListener('click', function () { show(idx); start(); });
      })(d);
    }

    // Swipe on touch screens
    var sx = null;
    hero.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    hero.addEventListener('touchend', function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 40) { show(current + (dx < 0 ? 1 : -1)); start(); }
      sx = null;
    }, { passive: true });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });

    show(0);
    start();
  }

  /* Section index: highlight the section in view */
  var toc = document.querySelector('.toc');
  if (toc && 'IntersectionObserver' in window) {
    var links = toc.querySelectorAll('a[href^="#"]');
    var map = {};
    var targets = [];
    for (var i = 0; i < links.length; i++) {
      var id = links[i].getAttribute('href').slice(1);
      var el = document.getElementById(id);
      if (el) { map[id] = links[i]; targets.push(el); }
    }
    var visible = {};
    var setActive = function () {
      var best = null;
      for (var t = 0; t < targets.length; t++) {
        if (visible[targets[t].id]) { best = targets[t].id; }
      }
      if (!best) return;
      for (var key in map) {
        if (Object.prototype.hasOwnProperty.call(map, key)) map[key].classList.toggle('is-active', key === best);
      }
      // Keep the active chip visible in the horizontal strip on small screens
      var a = map[best];
      var ul = a.parentNode.parentNode;
      if (ul.scrollWidth > ul.clientWidth) {
        var left = a.offsetLeft - 20;
        if (left < ul.scrollLeft || a.offsetLeft + a.offsetWidth > ul.scrollLeft + ul.clientWidth) {
          ul.scrollLeft = left;
        }
      }
    };
    var io = new IntersectionObserver(function (entries) {
      for (var e = 0; e < entries.length; e++) {
        visible[entries[e].target.id] = entries[e].isIntersecting;
      }
      setActive();
    }, { rootMargin: '-130px 0px -55% 0px', threshold: 0 });
    for (var j = 0; j < targets.length; j++) io.observe(targets[j]);
  }

  /* Gallery lightbox */
  var items = document.querySelectorAll('[data-lightbox]');
  if (items.length) {
    var box = document.createElement('div');
    box.className = 'lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Photo viewer');
    var icon = function (d) {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg>';
    };
    box.innerHTML =
      '<span class="lb-count"></span>' +
      '<button class="lb-btn lb-close" type="button" aria-label="Close">' + icon('M6 6l12 12M18 6L6 18') + '</button>' +
      '<button class="lb-btn lb-prev" type="button" aria-label="Previous photo">' + icon('M15 18l-6-6 6-6') + '</button>' +
      '<img alt="">' +
      '<button class="lb-btn lb-next" type="button" aria-label="Next photo">' + icon('M9 6l6 6-6 6') + '</button>' +
      '<p class="lightbox-caption"></p>';
    document.body.appendChild(box);
    var lbImg = box.querySelector('img');
    var lbCap = box.querySelector('.lightbox-caption');
    var lbCount = box.querySelector('.lb-count');
    var idx = 0;
    var lastFocus = null;

    var open = function (i) {
      idx = (i + items.length) % items.length;
      var a = items[idx];
      lbImg.src = a.getAttribute('href');
      lbImg.alt = a.getAttribute('data-caption') || '';
      lbCap.textContent = a.getAttribute('data-caption') || '';
      lbCount.textContent = (idx + 1) + ' / ' + items.length;
      if (!box.classList.contains('is-open')) {
        lastFocus = document.activeElement;
        box.classList.add('is-open');
        document.documentElement.style.overflow = 'hidden';
        box.querySelector('.lb-close').focus();
      }
    };
    var close = function () {
      box.classList.remove('is-open');
      document.documentElement.style.overflow = '';
      lbImg.removeAttribute('src');
      if (lastFocus) lastFocus.focus();
    };
    for (var g = 0; g < items.length; g++) {
      (function (n) {
        items[n].addEventListener('click', function (e) { e.preventDefault(); open(n); });
      })(g);
    }
    box.querySelector('.lb-close').addEventListener('click', close);
    box.querySelector('.lb-prev').addEventListener('click', function () { open(idx - 1); });
    box.querySelector('.lb-next').addEventListener('click', function () { open(idx + 1); });
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
    document.addEventListener('keydown', function (e) {
      if (!box.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') open(idx - 1);
      else if (e.key === 'ArrowRight') open(idx + 1);
    });
    var tx = null;
    box.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', function (e) {
      if (tx === null) return;
      var dx = e.changedTouches[0].clientX - tx;
      if (Math.abs(dx) > 40) open(idx + (dx < 0 ? 1 : -1));
      tx = null;
    }, { passive: true });
  }
})();
