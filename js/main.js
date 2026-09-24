/* ============================================
   LI YUETONG — AI Visual Portfolio
   1) 粒子汇聚入场动画
   2) 导航滚动态
   3) Hero 图内热区
   4) 代表作分层视差 + 次级网格视差
   5) 滚动入场（fade + translate）
   ============================================ */

/* 真实素材均已写入 HTML，此处仅补 lazy 加载 */
document.querySelectorAll('.work__img').forEach(img => { img.loading = 'lazy'; });

/* ============================================
   滚动入场：IntersectionObserver
   ============================================ */
(function scrollReveal() {
    const items = document.querySelectorAll('.reveal-el, .explorations .work');
    if (!('IntersectionObserver' in window)) {
        items.forEach(el => el.classList.add('in'));
        return;
    }
    const io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in');
                io.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    items.forEach(el => io.observe(el));
})();

/* ============================================
   1) 粒子汇聚入场
   ============================================ */
(function introAnimation() {
    const intro = document.getElementById('intro');
    const canvas = document.getElementById('intro-canvas');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function finishImmediately() {
        document.body.classList.add('is-loaded');
        document.body.classList.remove('is-loading');
        if (intro) intro.remove();
    }

    /* 非开场页（如 works.html 也引用本文件）：直接收尾 body 状态 */
    if (!intro || !canvas) { finishImmediately(); return; }

    const ctx = canvas.getContext('2d');

    if (reduceMotion) { finishImmediately(); return; }

    /* 同一会话内已播放过开场（首页 → 详情 → 返回）：不再重播 */
    let introAlreadyPlayed = false;
    try { introAlreadyPlayed = sessionStorage.getItem('portfolio.intro.played') === '1'; } catch (e) {}
    if (introAlreadyPlayed) { finishImmediately(); return; }

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let W = 0, H = 0, particles = [];
    const COLORS = [
        'rgba(255, 253, 248, A)',   /* 白 */
        'rgba(120, 110, 98, A)',    /* 暖灰 */
        'rgba(196, 183, 165, A)',   /* 低饱和暖 */
        'rgba(90, 82, 72, A)'       /* 深暖灰（少量） */
    ];

    function resize() {
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function rand(a, b) { return a + Math.random() * (b - a); }

    /* 二次贝塞尔 */
    function quad(p0, p1, p2, t) {
        const u = 1 - t;
        return {
            x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
            y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y
        };
    }

    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

    function buildParticles() {
        particles = [];
        const cx = W / 2;
        const cy = H * 0.46;                 /* 汇聚到人物视觉区域 */
        const count = Math.min(150, Math.max(70, Math.floor((W * H) / 13000)));

        for (let i = 0; i < count; i++) {
            /* 起始点：均匀分散在全屏，部分从边缘进入 */
            const fromEdge = Math.random() < 0.5;
            let sx, sy;
            if (fromEdge) {
                const side = Math.floor(Math.random() * 4);
                if (side === 0)      { sx = rand(-40, W + 40); sy = -40; }
                else if (side === 1) { sx = W + 40; sy = rand(-40, H + 40); }
                else if (side === 2) { sx = rand(-40, W + 40); sy = H + 40; }
                else                 { sx = -40; sy = rand(-40, H + 40); }
            } else {
                sx = rand(0, W);
                sy = rand(0, H);
            }

            /* 汇聚点：中心区域内轻微散布 */
            const spread = Math.min(W, H) * 0.16;
            const tx = cx + rand(-spread, spread);
            const ty = cy + rand(-spread * 0.6, spread * 0.6);

            /* 贝塞尔控制点：让路径带弧形，更像电影片头 */
            const mx = (sx + tx) / 2 + rand(-160, 160);
            const my = (sy + ty) / 2 + rand(-160, 160);

            /* 扩散方向（离场） */
            const ang = Math.atan2(ty - cy, tx - cx) + rand(-0.5, 0.5);
            const dist = rand(50, 180);

            particles.push({
                p0: { x: sx, y: sy },
                p1: { x: mx, y: my },
                p2: { x: tx, y: ty },
                delay: rand(0, 260),
                duration: rand(850, 1350),
                size: Math.random() < 0.85 ? rand(0.6, 1.8) : rand(2.2, 3.2),
                color: COLORS[Math.random() < 0.12 ? 3 : Math.floor(Math.random() * 3)],
                baseAlpha: rand(0.35, 0.9),
                swirl: rand(0, Math.PI * 2),
                outX: Math.cos(ang) * dist,
                outY: Math.sin(ang) * dist
            });
        }
    }

    /* 时间轴（ms） */
    const T_REVEAL  = 1150;   /* Hero 文字开始显现 */
    const T_EXPAND  = 1500;   /* 粒子汇聚完成，开始扩散 */
    const T_OVERLAY = 1600;   /* 遮罩淡出 */
    const T_END     = 2500;   /* 动画结束，移除画布 */

    let startTs = null;
    let rafId = null;
    let finished = false;

    function frame(ts) {
        if (startTs === null) startTs = ts;
        const t = ts - startTs;

        ctx.clearRect(0, 0, W, H);

        for (const p of particles) {
            let x, y, alpha;

            if (t < T_EXPAND) {
                /* 阶段一：沿贝塞尔快速汇聚 */
                const local = (t - p.delay) / p.duration;
                const k = easeOutCubic(Math.max(0, Math.min(1, local)));
                const pos = quad(p.p0, p.p1, p.p2, k);

                /* 汇聚末端加一点轻微环绕 */
                const holdK = Math.max(0, (t - T_EXPAND + 350) / 350);
                const wobble = Math.sin(t * 0.006 + p.swirl) * 6 * Math.min(1, k) * (1 - holdK);

                x = pos.x + wobble;
                y = pos.y + wobble * 0.4;
                alpha = p.baseAlpha * Math.min(1, t / 220);
                if (local > 1) alpha *= 1;
            } else {
                /* 阶段二：轻柔扩散并淡出 */
                const k = Math.min(1, (t - T_EXPAND) / 850);
                const ease = easeOutCubic(k);
                const pos = p.p2;
                x = pos.x + p.outX * ease;
                y = pos.y + p.outY * ease;
                alpha = p.baseAlpha * (1 - k);
            }

            if (alpha <= 0.01) continue;
            ctx.beginPath();
            ctx.fillStyle = p.color.replace('A', alpha.toFixed(3));
            ctx.arc(x, y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }

        if (t >= T_REVEAL && !document.body.classList.contains('is-loaded')) {
            document.body.classList.add('is-loaded');
            document.body.classList.remove('is-loading');
        }
        if (t >= T_OVERLAY) intro.classList.add('is-done');

        if (t < T_END) {
            rafId = requestAnimationFrame(frame);
        } else {
            finish();
        }
    }

    function finish() {
        if (finished) return;
        finished = true;
        cancelAnimationFrame(rafId);
        ctx.clearRect(0, 0, W, H);
        document.body.classList.add('is-loaded');
        document.body.classList.remove('is-loading');
        /* 标记本次浏览会话开场已播放，站内返回不再重播 */
        try { sessionStorage.setItem('portfolio.intro.played', '1'); } catch (e) {}
        intro.remove();
    }

    resize();
    buildParticles();
    window.addEventListener('resize', () => { resize(); buildParticles(); }, { once: true });
    rafId = requestAnimationFrame(frame);
})();

/* ============================================
   2) 导航滚动态
   ============================================ */
(function navScroll() {
    const nav = document.getElementById('nav');
    function onScroll() {
        nav.classList.toggle('nav--solid', window.scrollY > 80);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
})();

/* ============================================
   2.5) Hero 图内可点击热区定位
   参考图为 16:9，图内印有导航与滚动箭头。
   按 object-fit: cover 的实际渲染矩阵，把图内文字坐标
   映射为视口坐标，任何屏幕比例下热区都与图内元素对齐。
   ============================================ */
(function heroHotspots() {
    const bg = document.querySelector('.hero__bg');
    if (!bg) return;

    const scrollHot = document.querySelector('.hero__scroll-hot');
    const ring = document.querySelector('.hero__scroll-ring');
    const wordEls = Array.from(document.querySelectorAll('.hero__navhot'));

    /* 图内元素坐标（分数，基于 1672×941 原图实测） */
    const WORDS_V1 = 0.03;          /* 导航文字纵向范围 */
    const WORDS_V2 = 0.108;
    const SCROLL_U = 0.4976;        /* 圆环中心 */
    const SCROLL_V = 0.7439;
    const SCROLL_R = 26;            /* 圆环半径（原图像素） */
    const HOT_W = 230, HOT_H = 150; /* 滚动热区尺寸 */

    function layout() {
        const hero = bg.parentElement;
        const w = hero.clientWidth;
        const h = hero.clientHeight;
        const iw = bg.naturalWidth || 1672;
        const ih = bg.naturalHeight || 941;

        /* cover 渲染后的实际尺寸与裁切偏移 */
        const s = Math.max(w / iw, h / ih);
        const rw = iw * s, rh = ih * s;
        const ox = (rw - w) / 2, oy = (rh - h) / 2;

        const portrait = w / h <= 1;
        if (portrait) return; /* 竖屏由 CSS 备用排版接管 */

        wordEls.forEach(el => {
            const u1 = parseFloat(el.dataset.u1);
            const u2 = parseFloat(el.dataset.u2);
            el.style.left = (u1 * rw - ox) + 'px';
            el.style.width = ((u2 - u1) * rw) + 'px';
            el.style.top = (WORDS_V1 * rh - oy) + 'px';
            el.style.height = ((WORDS_V2 - WORDS_V1) * rh) + 'px';
        });

        if (scrollHot) {
            const cx = SCROLL_U * rw - ox;
            const cy = SCROLL_V * rh - oy;
            scrollHot.style.left = (cx - HOT_W / 2) + 'px';
            scrollHot.style.top = (cy - HOT_H / 2) + 'px';
            const d = SCROLL_R * 2 * s * 1.15;
            if (ring) ring.style.width = ring.style.height = d + 'px';
        }
    }

    bg.addEventListener('load', layout);
    window.addEventListener('resize', layout, { passive: true });
    if (bg.complete && bg.naturalWidth) layout();
})();

/* ============================================
   3) 视差引擎（单一全局 rAF，静止时自动停止）
   — 次级网格 .work：hover 轻放大 + 反向跟随
   — 代表作 [data-depth-scope] 内 .js-depth：
     按 data-depth 系数做差速位移（工具界面慢、生成结果快而反向）
   ============================================ */
(function parallaxEngine() {
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    if (!finePointer) return;

    const LERP = 0.1;        /* 惯性系数 */
    const MAX_SHIFT = 14;    /* 次级网格最大位移 px */
    const MAX_DEPTH_SHIFT = 16; /* 代表作分层最大位移 px */
    const SCALE_ON = 1.06;

    let globalRaf = null;
    const states = [];

    function addState(el, targetFn, baseScale) {
        const st = { x: 0, y: 0, s: baseScale };
        const tg = { x: 0, y: 0, s: baseScale };
        states.push({
            el, st, tg, baseScale,
            target: targetFn,   /* (nx, ny, hovering) => void 写入 tg */
            active: false
        });
    }

    /* —— 次级网格：整卡 hover 放大 + 跟随 —— */
    document.querySelectorAll('.explorations .work').forEach(work => {
        const img = work.querySelector('.work__img');
        if (!img) return;
        let hovering = false;
        const o = { img, hovering };
        work.addEventListener('mouseenter', () => { hovering = true; start(); });
        work.addEventListener('mousemove', e => {
            const r = work.getBoundingClientRect();
            o.nx = ((e.clientX - r.left) / r.width) * 2 - 1;
            o.ny = ((e.clientY - r.top) / r.height) * 2 - 1;
        });
        work.addEventListener('mouseleave', () => { hovering = false; });
        addState(img, function () {
            this.tg.x = o.hovering && o.nx !== undefined ? -o.nx * MAX_SHIFT : 0;
            this.tg.y = o.hovering && o.ny !== undefined ? -o.ny * MAX_SHIFT : 0;
            this.tg.s = o.hovering ? SCALE_ON : 1;
            this.active = o.hovering;
        }, 1);
    });

    /* —— 代表作：每个 scope 内的分层图片差速移动 —— */
    document.querySelectorAll('[data-depth-scope]').forEach(scope => {
        const layers = Array.from(scope.querySelectorAll('.js-depth'));
        if (!layers.length) return;
        const pointer = { nx: 0, ny: 0, inside: false };

        scope.addEventListener('mouseenter', () => { pointer.inside = true; start(); });
        scope.addEventListener('mousemove', e => {
            const r = scope.getBoundingClientRect();
            pointer.nx = ((e.clientX - r.left) / r.width) * 2 - 1;
            pointer.ny = ((e.clientY - r.top) / r.height) * 2 - 1;
        });
        scope.addEventListener('mouseleave', () => { pointer.inside = false; });

        layers.forEach(layer => {
            const depth = parseFloat(layer.dataset.depth) || 0;
            const baseScale = parseFloat(layer.dataset.scale)
                || (layer.classList.contains('case__char') ? 1 : 1.05);
            addState(layer, function () {
                if (pointer.inside) {
                    this.tg.x = -pointer.nx * MAX_DEPTH_SHIFT * depth;
                    this.tg.y = -pointer.ny * MAX_DEPTH_SHIFT * depth;
                    this.active = true;
                } else {
                    this.tg.x = 0;
                    this.tg.y = 0;
                    this.active = false;
                }
                this.tg.s = baseScale;
            }, baseScale);
        });
    });

    function start() {
        if (!globalRaf) globalRaf = requestAnimationFrame(globalLoop);
    }

    /* 初始化：代表作分层图先应用基础缩放，避免首次 hover 时跳变 */
    states.forEach(o => {
        o.el.style.transform = `translate3d(0, 0, 0) scale(${o.baseScale})`;
    });

    function globalLoop() {
        let moving = false;
        for (const o of states) {
            o.target();
            o.st.x += (o.tg.x - o.st.x) * LERP;
            o.st.y += (o.tg.y - o.st.y) * LERP;
            o.st.s += (o.tg.s - o.st.s) * LERP;
            o.el.style.transform =
                `translate3d(${o.st.x.toFixed(2)}px, ${o.st.y.toFixed(2)}px, 0) scale(${o.st.s.toFixed(4)})`;
            if (o.active ||
                Math.abs(o.tg.x - o.st.x) > 0.05 ||
                Math.abs(o.tg.y - o.st.y) > 0.05 ||
                Math.abs(o.tg.s - o.st.s) > 0.0008) {
                moving = true;
            }
        }
        globalRaf = moving ? requestAnimationFrame(globalLoop) : null;
    }
})();
