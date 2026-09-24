/* ============================================================
   nav-memory.js — 站内浏览位置记忆
   1) 列表页（index.html / works.html）
      - 点击任意作品卡片进入详情前：记录来源页 + 滚动位置 + 项目
      - 从详情页返回时（返回链接带 ?back=1，或浏览器后退时
        referrer 为详情页）：恢复进入前的精确滚动位置
   2) 详情页（case-*.html）
      - 依据进入前记录，把所有返回链接指向真实来源页并带 ?back=1
   粒子开场是否已播放由 main.js 读取
   sessionStorage['portfolio.intro.played'] 决定；本脚本在返回
   首页时同步移除已结束的开场层，避免 overflow:hidden 锁定滚动。
   ============================================================ */
(function () {
    'use strict';

    var KEY_RETURN = 'portfolio.intro.return';
    var KEY_INTRO  = 'portfolio.intro.played';

    var path = location.pathname.split('/').pop() || 'index.html';
    var pageId = path === '' ? 'index.html' : path;
    var isList = pageId === 'index.html' || pageId === 'works.html';
    var CASE_RE = /^case-[a-z0-9-]+\.html$/i;

    function fileOf(href) {
        if (!href) return '';
        return href.split('#')[0].split('?')[0].split('/').pop();
    }
    function readRec() {
        try { return JSON.parse(sessionStorage.getItem(KEY_RETURN) || 'null'); }
        catch (e) { return null; }
    }
    function writeRec(r) {
        try { sessionStorage.setItem(KEY_RETURN, JSON.stringify(r)); } catch (e) {}
    }

    /* ========================================================
       列表页
       ======================================================== */
    if (isList) {

        /* 本次会话粒子开场已播放过：同步收尾开场层与 body 状态 */
        if (pageId === 'index.html') {
            var played = false;
            try { played = sessionStorage.getItem(KEY_INTRO) === '1'; } catch (e) {}
            if (played) {
                document.body.classList.add('is-loaded');
                document.body.classList.remove('is-loading');
                var introEl = document.getElementById('intro');
                if (introEl && introEl.parentNode) introEl.parentNode.removeChild(introEl);
            }
        }

        /* 捕获阶段：点击任意作品卡片前，写入来源与滚动位置
           （捕获阶段保证在跳转发生前完成写入） */
        document.addEventListener('click', function (e) {
            var t = e.target;
            var a = t && t.closest ? t.closest('a') : null;
            if (!a) return;
            var file = fileOf(a.getAttribute('href'));
            if (!CASE_RE.test(file)) return;
            writeRec({
                from: pageId,
                y: window.pageYOffset || 0,
                item: file,
                t: Date.now()
            });
        }, true);

        /* 按 href 找到当前列表页上的作品卡片
           （核心代表作 .case__link / 首页视觉网格 .ex-item / works 网格 .works-item） */
        function findItem(href) {
            if (!href) return null;
            var all = document.querySelectorAll('.case__link[href], .ex-item[href], .works-item[href]');
            for (var i = 0; i < all.length; i++) {
                if (fileOf(all[i].getAttribute('href')) === href) return all[i];
            }
            return null;
        }

        /* 是否为“从详情页返回”：
           - 自己的返回链接带 ?back=1
           - 或浏览器后退：referrer 为 case-*.html */
        function isReturn() {
            if (/[?&]back=1(?:&|$)/.test(location.search)) return true;
            return CASE_RE.test(fileOf(document.referrer));
        }

        function restore() {
            var rec = readRec();
            if (!rec || rec.from !== pageId) return;
            var y = Math.max(0, rec.y | 0);

            /* 以“目标作品元素”校正：图片延迟加载导致两次布局高度不同
               （如首次会话进入详情时上方图片尚未完成布局），若记录位置
               已远离该作品，则直接对准作品顶部，保证落点在该作品附近 */
            var el = findItem(rec.item);
            if (el) {
                var et = el.getBoundingClientRect().top + window.pageYOffset;
                var eh = el.offsetHeight || window.innerHeight;
                var tol = Math.max(240, window.innerHeight * 0.6);
                if (y < et - tol || y > et + eh) y = et - 24;
            }

            var max = document.documentElement.scrollHeight - window.innerHeight;
            window.scrollTo(0, Math.min(y, Math.max(0, max)));

            /* 视口及以上的滚动入场元素直接显现，向上回滚时不留空白 */
            var vis = document.querySelectorAll('.reveal-el');
            for (var i = 0; i < vis.length; i++) {
                if (vis[i].classList.contains('in')) continue;
                if (vis[i].getBoundingClientRect().top < window.innerHeight + 40) {
                    vis[i].classList.add('in');
                }
            }
        }

        if (isReturn()) {
            /* 立即恢复 + 在图片/字体加载过程中反复校正，消除跳动 */
            restore();
            window.addEventListener('load', restore);
            if (document.fonts && document.fonts.ready) document.fonts.ready.then(restore);
            [60, 160, 360, 750, 1300, 2200].forEach(function (d) {
                setTimeout(restore, d);
            });
        }

        /* bfcache：浏览器自行恢复滚动位置，无需处理 */
        window.addEventListener('pageshow', function () {});
    }

    /* ========================================================
       详情页：把返回链接重指到真实来源页
       ======================================================== */
    else if (CASE_RE.test(pageId)) {
        var rec = readRec();
        if (rec && (rec.from === 'index.html' || rec.from === 'works.html')) {
            var links = document.getElementsByTagName('a');
            for (var i = 0; i < links.length; i++) {
                var a = links[i];
                var f = fileOf(a.getAttribute('href'));
                if (f !== 'index.html' && f !== 'works.html') continue;
                /* 只动“返回类”链接（class 含 back），不触碰顶部导航 */
                if (!/back/i.test(a.className || '')) continue;
                a.setAttribute('href', rec.from + '?back=1');
            }
        }
    }
})();
