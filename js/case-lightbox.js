/* ============================================================
   case-lightbox.js — 全站详情页统一图片灯箱组件
   功能：
   1. 自动为展示图绑定点击 → 大图预览
   2. 为 Before / After 对比组件添加 "VIEW FULL ↗" 按钮
   3. ESC / 点击背景 / 关闭按钮 → 关闭
   4. 打开时锁定背景滚动
   ============================================================ */
(function () {
    'use strict';

    /* ---------- 创建灯箱 DOM ---------- */
    var lb = document.createElement('div');
    lb.className = 'case-lb';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-hidden', 'true');
    lb.innerHTML =
        '<img class="case-lb__img" alt="">' +
        '<button class="case-lb__close" aria-label="关闭">&times;</button>' +
        '<span class="case-lb__hint">CLICK ANYWHERE TO CLOSE</span>';
    document.body.appendChild(lb);
    var lbImg   = lb.querySelector('.case-lb__img');
    var lbClose = lb.querySelector('.case-lb__close');

    /* ---------- 开 / 关 ---------- */
    var prevOverflow = '';

    function open(src, alt) {
        lbImg.src = src;
        lbImg.alt = alt || '';
        lb.classList.add('case-lb--open');
        lb.setAttribute('aria-hidden', 'false');
        prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
    }

    function close() {
        lb.classList.remove('case-lb--open');
        lb.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = prevOverflow;
    }

    /* ---------- 关闭事件 ---------- */
    lb.addEventListener('click', close);
    lbClose.addEventListener('click', function (e) { e.stopPropagation(); close(); });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && lb.classList.contains('case-lb--open')) close();
    });

    /* ---------- 1. 自动绑定展示图 ---------- */
    var showcaseSelectors = [
        /* 融合页 */
        '.vf-hero-visual .vf-frame img',
        '.vf-case-final .vf-frame img',
        /* 商业广告页 */
        '.cv-hero-main .cv-frame img',
        '.cv-hero-side .cv-frame img',
        '.cv-sub-grid .cv-sub-img img',
        '.cv-sub-stack .cv-sub-frame img',
        '.cv-final .cv-frame img',
        /* 电商详情长图独立页 */
        '.ec-stack .ec-frame img',
        /* 视觉融合独立页 */
        '.vn-group .vn-img img',
        /* 空间视觉页 */
        '.sp-hero-main .sp-frame img',
        /* 时尚重构页 */
        '.fr-hero-after .fr-frame img',
        /* 角色风格迁移页 */
        '.cs-hero-visual img',
        '.cs-step .cs-img img'
    ];

    showcaseSelectors.forEach(function (sel) {
        document.querySelectorAll(sel).forEach(function (img) {
            /* 跳过对比组件内的图片 */
            if (img.closest('[data-compare]')) return;
            img.addEventListener('click', function () {
                open(img.src, img.alt);
            });
        });
    });

    /* ---------- 2. 为对比组件添加 "VIEW FULL" 按钮 ---------- */
    document.querySelectorAll('[data-compare]').forEach(function (box) {
        /* 找 AFTER 图（class 含 --after） */
        var afterImg = box.querySelector('[class*="--after"]');
        if (!afterImg) return;

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'case-lb-trigger';
        btn.innerHTML = '<span>VIEW FULL</span><span>&#8599;</span>';

        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            e.preventDefault();
            open(afterImg.src, afterImg.alt);
        });
        btn.addEventListener('pointerdown', function (e) {
            e.stopPropagation();
        });

        box.appendChild(btn);
    });
})();
