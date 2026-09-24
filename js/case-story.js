/* ============================================================
   case-story.js — Case Study 页专属脚本
   滚动入场 / 克制视差（独立于 main.js，不绑定首页元素）
   ============================================================ */
(function () {
    'use strict';

    /* ---------- 滚动入场 ---------- */
    var revealEls = document.querySelectorAll('.cs-reveal');
    if (!('IntersectionObserver' in window)) {
        revealEls.forEach(function (el) { el.classList.add('in'); });
    } else {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in');
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
        revealEls.forEach(function (el) { io.observe(el); });
    }

    /* ---------- 轻微视差（≤16px，桌面端、无减弱动效偏好时启用） ---------- */
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var parallaxEls = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
    var ticking = false;

    function applyParallax() {
        var vh = window.innerHeight || document.documentElement.clientHeight;
        parallaxEls.forEach(function (el) {
            var rect = el.getBoundingClientRect();
            if (rect.bottom < 0 || rect.top > vh) return;
            var depth = parseFloat(el.getAttribute('data-parallax')) || 0.05;
            var scale = parseFloat(el.getAttribute('data-scale')) || 1.06;
            var progress = (rect.top + rect.height / 2 - vh / 2) / vh;   // -1 ~ 1
            var shift = Math.max(-16, Math.min(16, -progress * depth * 100));
            el.style.transform = 'translate3d(0,' + shift.toFixed(2) + 'px,0) scale(' + scale + ')';
        });
        ticking = false;
    }

    if (!reduceMotion && parallaxEls.length && vhOK()) {
        parallaxEls.forEach(function (el) { el.style.transition = 'none'; });
        window.addEventListener('scroll', function () {
            if (!ticking) {
                window.requestAnimationFrame(applyParallax);
                ticking = true;
            }
        }, { passive: true });
        window.addEventListener('resize', function () {
            if (!ticking) {
                window.requestAnimationFrame(applyParallax);
                ticking = true;
            }
        }, { passive: true });
        applyParallax();
    }

    function vhOK() {
        return window.matchMedia('(min-width: 861px)').matches;
    }
})();
