/* ============================================================
   case-fusion.js — AI 多元素视觉融合 Case 页脚本
   仅滚动入场（动效保持克制）
   ============================================================ */
(function () {
    'use strict';

    var revealEls = document.querySelectorAll('.vf-reveal');
    if (!('IntersectionObserver' in window)) {
        revealEls.forEach(function (el) { el.classList.add('in'); });
        return;
    }

    var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('in');
                io.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    revealEls.forEach(function (el) { io.observe(el); });
})();
