/* ============================================================
   case-commercial.js — AI 商业广告视觉 Case 页脚本
   滚动入场（无对比器）
   ============================================================ */
(function () {
    'use strict';

    var revealEls = document.querySelectorAll('.cv-reveal');
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
})();
