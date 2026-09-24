/* ============================================================
   case-spatial.js — AI 空间视觉 Case 页脚本
   滚动入场 + Before/After 拖动对比
   ============================================================ */
(function () {
    'use strict';

    /* ---------- 滚动入场 ---------- */
    var revealEls = document.querySelectorAll('.sp-reveal');
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

    /* ---------- Before / After 拖动对比 ---------- */
    document.querySelectorAll('[data-compare]').forEach(function (box) {
        function setPos(clientX) {
            var rect = box.getBoundingClientRect();
            var ratio = (clientX - rect.left) / rect.width;
            ratio = Math.max(0, Math.min(1, ratio));
            box.style.setProperty('--pos', (ratio * 100).toFixed(2) + '%');
        }

        var dragging = false;
        box.addEventListener('pointerdown', function (e) {
            dragging = true;
            box.setPointerCapture(e.pointerId);
            setPos(e.clientX);
        });
        box.addEventListener('pointermove', function (e) {
            if (dragging) setPos(e.clientX);
        });
        box.addEventListener('pointerup', function () { dragging = false; });
        box.addEventListener('pointercancel', function () { dragging = false; });
    });
})();
