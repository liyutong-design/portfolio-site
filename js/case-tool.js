/* ============================================================
   case-tool.js — AI 生图工具 Case Study 页专属脚本
   滚动入场 / 克制视差（独立于 main.js，不绑定首页元素）
   ============================================================ */
(function () {
    'use strict';

    /* ---------- 滚动入场 ---------- */
    var revealEls = document.querySelectorAll('.ct-reveal');
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

    function vhOK() {
        return window.matchMedia('(min-width: 861px)').matches;
    }

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
})();

/* ============================================================
   作品集交互演示版（tdDemo）
   - 选项/模板/片段数据与真实工具 config.js 完全一致（非敏感数据）
   - 提示词拼接顺序与真实工具一致，实时预览
   - 「生成图片」为本地模拟：不发任何网络请求，
     结果直接展示 assets/tool/ 下 4 张真实生成案例
   ============================================================ */
(function tdDemo() {
    'use strict';

    var root = document.getElementById('tdRoot');
    if (!root) return;

    /* ---------- 数据（与真实 config.js 一致） ---------- */
    var OPTIONS = {
        race: [
            { value: 'human', label: '人类' }, { value: 'elf', label: '精灵' },
            { value: 'orc', label: '兽人' }, { value: 'cyborg', label: '机械族' },
            { value: 'angel', label: '天使' }, { value: 'demon', label: '恶魔' },
            { value: 'dragonborn', label: '龙裔' }
        ],
        gender: [
            { value: 'male', label: '男' }, { value: 'female', label: '女' },
            { value: 'neutral', label: '中性' }
        ],
        hairstyle: [
            { value: 'long', label: '长发' }, { value: 'short', label: '短发' },
            { value: 'twintails', label: '双马尾' }, { value: 'ponytail', label: '单马尾' },
            { value: 'curly', label: '卷发' }, { value: 'bun', label: '盘发' },
            { value: 'wavy', label: '波浪披肩' }, { value: 'buzz', label: '寸头' },
            { value: 'double_bun', label: '丸子头' }, { value: 'half_up', label: '半扎发' },
            { value: 'braids', label: '辫子' }
        ],
        hairColor: [
            { value: 'black', label: '黑色' }, { value: 'brown', label: '棕色' },
            { value: 'blonde', label: '金色' }, { value: 'silver', label: '银色' },
            { value: 'white', label: '白色' }, { value: 'red', label: '红色' },
            { value: 'blue', label: '蓝色' }, { value: 'pink', label: '粉色' },
            { value: 'purple', label: '紫色' }, { value: 'gradient', label: '渐变色' },
            { value: 'highlight', label: '挑染' }
        ],
        outfit: [
            { value: 'casual', label: '现代休闲' }, { value: 'formal', label: '职业正装' },
            { value: 'hanfu', label: '古风汉服' }, { value: 'kimono', label: '和服' },
            { value: 'cyberpunk', label: '赛博朋克' }, { value: 'futuristic', label: '未来科技' },
            { value: 'gothic', label: '哥特' }, { value: 'lolita', label: '洛丽塔' },
            { value: 'sportswear', label: '运动装' }, { value: 'military', label: '军装' },
            { value: 'gown', label: '礼服' }, { value: 'uniform', label: '学院制服' },
            { value: 'robe', label: '奇幻长袍' }
        ],
        pose: [
            { value: 'standing', label: '站姿' }, { value: 'sitting', label: '坐姿' },
            { value: 'sideways', label: '侧身' }, { value: 'looking_back', label: '回眸' },
            { value: 'looking_up', label: '仰视' }, { value: 'looking_down', label: '俯视' },
            { value: 'running', label: '奔跑' }, { value: 'combat', label: '战斗姿态' },
            { value: 'thinking', label: '沉思托腮' }, { value: 'waving', label: '微笑挥手' }
        ],
        expression: [
            { value: 'gentle_smile', label: '温柔微笑' }, { value: 'cold', label: '冷酷' },
            { value: 'surprised', label: '惊讶' }, { value: 'thinking', label: '沉思' },
            { value: 'confident', label: '自信' }, { value: 'shy', label: '害羞' },
            { value: 'angry', label: '愤怒' }, { value: 'sad', label: '忧郁' },
            { value: 'playful', label: '俏皮' }, { value: 'aloof', label: '高冷' },
            { value: 'ethereal', label: '空灵' }
        ],
        accessories: [
            { value: 'glasses', label: '眼镜' }, { value: 'earrings', label: '耳环' },
            { value: 'necklace', label: '项链' }, { value: 'ear_studs', label: '耳钉' },
            { value: 'hat', label: '帽子' }, { value: 'hair_accessory', label: '发饰' },
            { value: 'scarf', label: '围巾' }, { value: 'veil', label: '面纱' },
            { value: 'weapon', label: '武器' }, { value: 'wings', label: '翅膀' },
            { value: 'tattoo', label: '纹身' }, { value: 'ring', label: '戒指' }
        ],
        artStyle: [
            { value: 'realistic', label: '写实摄影' }, { value: 'anime', label: '动漫' },
            { value: 'oil_painting', label: '油画' }, { value: 'watercolor', label: '水彩' },
            { value: 'cyberpunk', label: '赛博朋克' }, { value: 'pixel', label: '像素风' },
            { value: '3d_render', label: '3D渲染' }, { value: 'ink_wash', label: '国风水墨' },
            { value: 'cel_shaded', label: '赛璐璐' }, { value: 'flat_illustration', label: '扁平插画' },
            { value: 'dark_fantasy', label: '暗黑奇幻' }
        ],
        aspectRatio: [
            { value: '1:1', label: '1:1 正方形' }, { value: '3:4', label: '3:4 竖版人像' },
            { value: '4:3', label: '4:3 横版' }, { value: '9:16', label: '9:16 手机竖版' },
            { value: '16:9', label: '16:9 横版壁纸' }, { value: '2:3', label: '2:3 竖版海报' },
            { value: '3:2', label: '3:2 横版海报' }
        ],
        resolution: [
            { value: '1k', label: '1K' }, { value: '2k', label: '2K' }, { value: '4k', label: '4K' }
        ],
        quality: [
            { value: 'auto', label: '标准' }, { value: 'medium', label: '高清' }, { value: 'high', label: '超清' }
        ],
        detailLevel: [
            { value: 'low', label: '低' }, { value: 'medium', label: '中' },
            { value: 'high', label: '高' }, { value: 'ultra', label: '极致' }
        ],
        background: [
            { value: 'plain', label: '纯色背景' }, { value: 'nature', label: '自然风景' },
            { value: 'city', label: '城市街景' }, { value: 'indoor', label: '室内场景' },
            { value: 'sci_fi', label: '科幻场景' }, { value: 'dreamy', label: '梦幻抽象' },
            { value: 'ancient', label: '古风意境' }, { value: 'bokeh', label: '虚化散景' }
        ]
    };

    var FRAGMENTS = {
        race: { human: '人类', elf: '精灵', orc: '兽人', cyborg: '机械改造人', angel: '天使', demon: '恶魔', dragonborn: '龙裔' },
        gender: { male: '男性', female: '女性', neutral: '中性形象' },
        hairstyle: {
            long: '长发', short: '短发', twintails: '双马尾', ponytail: '单马尾', curly: '卷发',
            bun: '发髻', wavy: '波浪卷', buzz: '寸头', double_bun: '双发髻', half_up: '半扎发', braids: '麻花辫'
        },
        hairColor: {
            black: '黑色', brown: '棕色', blonde: '金色', silver: '银色', white: '白色', red: '红色',
            blue: '蓝色', pink: '粉色', purple: '紫色', gradient: '渐变色', highlight: '挑染'
        },
        outfit: {
            casual: '现代休闲装', formal: '正式商务装', hanfu: '传统汉服', kimono: '和服',
            cyberpunk: '赛博朋克服饰', futuristic: '未来科技感服饰', gothic: '哥特服饰',
            lolita: '洛丽塔裙装', sportswear: '运动装', military: '军装', gown: '晚礼服',
            uniform: '校服', robe: '法师长袍'
        },
        pose: {
            standing: '站立姿态', sitting: '坐姿', sideways: '侧身姿态', looking_back: '回头张望',
            looking_up: '仰望上方', looking_down: '低头俯视', running: '奔跑姿态',
            combat: '战斗架势', thinking: '手托下巴沉思', waving: '微笑挥手'
        },
        expression: {
            gentle_smile: '温柔微笑', cold: '冷漠神情', surprised: '惊讶表情', thinking: '陷入沉思',
            confident: '神情自信', shy: '害羞神态', angry: '愤怒神情', sad: '忧郁神情',
            playful: '俏皮活泼', aloof: '清冷疏离', ethereal: '空灵气质'
        },
        accessories: {
            glasses: '眼镜', earrings: '耳环', necklace: '项链', ear_studs: '耳钉', hat: '帽子',
            hair_accessory: '发饰', scarf: '围巾', veil: '面纱', weapon: '武器', wings: '翅膀',
            tattoo: '纹身', ring: '戒指'
        },
        artStyle: {
            realistic: '写实摄影风', anime: '动漫风', oil_painting: '油画风', watercolor: '水彩风',
            cyberpunk: '赛博朋克风', pixel: '像素风', '3d_render': '3D 渲染风',
            ink_wash: '中国水墨风', cel_shaded: '赛璐璐风', flat_illustration: '扁平插画风',
            dark_fantasy: '暗黑幻想风'
        },
        detailLevel: {
            low: '', medium: '精细细节', high: '高度精细，细节丰富',
            ultra: '极致精细，超高清细节，锐利对焦'
        },
        background: {
            plain: '纯色背景', nature: '自然风景背景', city: '城市街景背景', indoor: '室内场景',
            sci_fi: '科幻场景背景', dreamy: '梦幻抽象背景', ancient: '古风意境背景', bokeh: '虚化散景背景'
        }
    };

    var TEMPLATES = {
        TPL_01: { name: '治愈系少女', race: 'human', gender: 'female', hairstyle: 'long', hairColor: 'brown', outfit: 'casual', pose: 'standing', expression: 'gentle_smile', accessories: [] },
        TPL_02: { name: '赛博朋克黑客', race: 'human', gender: 'male', hairstyle: 'short', hairColor: 'silver', outfit: 'cyberpunk', pose: 'standing', expression: 'cold', accessories: ['ear_studs'] },
        TPL_03: { name: '古风侠客', race: 'human', gender: 'male', hairstyle: 'long', hairColor: 'black', outfit: 'hanfu', pose: 'looking_back', expression: 'aloof', accessories: [] },
        TPL_04: { name: '未来战士', race: 'human', gender: 'female', hairstyle: 'twintails', hairColor: 'pink', outfit: 'futuristic', pose: 'combat', expression: 'confident', accessories: ['weapon'] },
        TPL_05: { name: '学院风学生', race: 'human', gender: 'neutral', hairstyle: 'short', hairColor: 'black', outfit: 'uniform', pose: 'waving', expression: 'playful', accessories: [] },
        TPL_06: { name: '职业精英', race: 'human', gender: 'male', hairstyle: 'short', hairColor: 'brown', outfit: 'formal', pose: 'standing', expression: 'confident', accessories: ['glasses'] },
        TPL_07: { name: '精灵法师', race: 'elf', gender: 'female', hairstyle: 'long', hairColor: 'blonde', outfit: 'robe', pose: 'thinking', expression: 'ethereal', accessories: [] },
        TPL_08: { name: '机械义体人', race: 'cyborg', gender: 'neutral', hairstyle: 'buzz', hairColor: 'silver', outfit: 'futuristic', pose: 'standing', expression: 'cold', accessories: ['tattoo'] }
    };

    var DEFAULT_PERSON = {
        race: 'human', gender: 'female', hairstyle: 'long', hairColor: 'brown',
        outfit: 'casual', pose: 'standing', expression: 'gentle_smile', accessories: []
    };

    /* 4 张真实案例（文件大小为真实值） */
    var CASES = {
        1: { src: 'assets/tool/output-1.jpg', size: '2471 KB' },
        2: { src: 'assets/tool/output-2.jpg', size: '2760 KB' },
        3: { src: 'assets/tool/output-3.jpg', size: '2281 KB' },
        4: { src: 'assets/tool/output-4.jpg', size: '2359 KB' }
    };

    var DEFAULTS = {
        template: '', race: '', gender: '', hairstyle: '', hairColor: '', outfit: '',
        pose: '', expression: '', artStyle: '', aspectRatio: '1:1', resolution: '1k',
        quality: 'auto', detailLevel: 'medium', accessories: [], background: '', extraDescription: ''
    };

    var ASPECT_RATIO_LABEL = {
        '1:1': '1:1 正方形', '4:3': '4:3 横版', '3:4': '3:4 竖版',
        '16:9': '16:9 宽屏', '9:16': '9:16 竖屏', '3:2': '3:2 横版', '2:3': '2:3 竖版'
    };
    var RESOLUTION_LABEL = { '1k': '1K 分辨率', '2k': '2K 分辨率', '4k': '4K 分辨率' };
    var QUALITY_LABEL = { auto: '标准画质', medium: '高清画质', high: '超清画质' };

    /* ---------- 渲染界面骨架 ---------- */
    root.innerHTML =
        '<div class="td-app-head">' +
            '<div><p class="td-app-title">AI 生图工具</p><p class="td-app-sub">参数化人物生图 · 异步任务模式</p></div>' +
            '<div class="td-app-meta">' +
                '<span><span class="k">后端服务：</span><span class="v demo">演示模式 · 未连接</span></span>' +
                '<span><span class="k">生成模式：</span><span class="v mode">异步任务 (POST + GET)</span></span>' +
            '</div>' +
        '</div>' +
        '<div class="td-layout">' +
            '<div class="td-col-config">' +
                '<section class="td-card"><div class="td-card-title">人设模板</div>' +
                    '<div class="td-field"><label for="tdTemplate">选择预设模板</label><select class="td-select" id="tdTemplate"></select></div>' +
                    '<div class="td-btnrow"><button type="button" class="td-btn td-btn--secondary" id="tdFill">一键填充人物参数</button>' +
                    '<button type="button" class="td-btn td-btn--ghost" id="tdReset">重置配置</button></div>' +
                '</section>' +
                '<section class="td-card"><div class="td-card-title">人物属性</div>' +
                    '<div class="td-row"><div class="td-field"><label for="tdRace">种族</label><select class="td-select" id="tdRace"></select></div>' +
                    '<div class="td-field"><label for="tdGender">性别</label><select class="td-select" id="tdGender"></select></div></div>' +
                    '<div class="td-row"><div class="td-field"><label for="tdHairstyle">发型</label><select class="td-select" id="tdHairstyle"></select></div>' +
                    '<div class="td-field"><label for="tdHairColor">发色</label><select class="td-select" id="tdHairColor"></select></div></div>' +
                    '<div class="td-row"><div class="td-field"><label for="tdOutfit">服饰风格</label><select class="td-select" id="tdOutfit"></select></div>' +
                    '<div class="td-field"><label for="tdPose">人物姿态</label><select class="td-select" id="tdPose"></select></div></div>' +
                    '<div class="td-field"><label for="tdExpression">表情气质</label><select class="td-select" id="tdExpression"></select></div>' +
                '</section>' +
                '<section class="td-card"><div class="td-card-title">配饰细节(多选)</div><div class="td-checkbox-group" id="tdAccessories"></div></section>' +
                '<section class="td-card"><div class="td-card-title">画面参数</div>' +
                    '<div class="td-row"><div class="td-field"><label for="tdArtStyle">画风</label><select class="td-select" id="tdArtStyle"></select></div>' +
                    '<div class="td-field"><label for="tdAspectRatio">图片比例</label><select class="td-select" id="tdAspectRatio"></select></div></div>' +
                    '<div class="td-row"><div class="td-field"><label for="tdResolution">分辨率</label><select class="td-select" id="tdResolution"></select></div>' +
                    '<div class="td-field"><label for="tdQuality">画质参数</label><select class="td-select" id="tdQuality"></select></div></div>' +
                    '<div class="td-row"><div class="td-field"><label for="tdDetailLevel">细节强化程度</label><select class="td-select" id="tdDetailLevel"></select></div>' +
                    '<div class="td-field"><label for="tdBackground">背景氛围</label><select class="td-select" id="tdBackground"></select></div></div>' +
                    '<div class="td-field"><label for="tdExtra">额外补充描述</label>' +
                        '<textarea class="td-textarea" id="tdExtra" maxlength="200" placeholder="如：光影柔和、电影感、特定场景..."></textarea>' +
                        '<div class="td-counter"><span id="tdExtraCount">0</span>/200</div></div>' +
                '</section>' +
            '</div>' +
            '<div class="td-col-action">' +
                '<section class="td-card"><div class="td-card-title">提示词预览</div>' +
                    '<div class="td-prompt" id="tdPrompt"></div>' +
                    '<div class="td-btnrow" style="margin-top:12px;"><button type="button" class="td-btn td-btn--secondary" id="tdCopy">复制提示词</button></div>' +
                '</section>' +
                '<section class="td-card"><div class="td-card-title">生成操作</div>' +
                    '<div class="td-btnrow"><button type="button" class="td-btn td-btn--primary" id="tdGenerate">生成图片</button></div>' +
                    '<div class="td-status" id="tdStatus"></div>' +
                    '<div class="td-api-info">' +
                        '<div><span class="m-post">POST</span> <code>/api/image/generate</code> — 提交生图任务，返回 <code>task_id</code></div>' +
                        '<div><span class="m-get">GET</span> <code>/api/image/result?task_id=xxx</code> — 按 task_id 轮询，进行中返回 JSON，完成返回图片字节</div>' +
                        '<span class="td-demo-tag">作品集交互演示版 · 在线 API 调用已关闭（以上为真实工具接口说明）</span>' +
                    '</div>' +
                '</section>' +
            '</div>' +
            '<div class="td-col-result">' +
                '<section class="td-card"><div class="td-card-title">生成结果</div>' +
                    '<div class="td-preview-slot" id="tdSlot">' +
                        '<span class="td-placeholder">尚未生成图片</span>' +
                        '<div class="td-loading-box"><span class="td-spinner"></span>正在生成 Demo 预览……</div>' +
                        '<img id="tdResultImg" alt="Demo 生成结果：该工具真实案例图片">' +
                    '</div>' +
                    '<div class="td-result-actions">' +
                        '<a class="td-btn td-btn--secondary" id="tdDownload" style="display:none;">下载图片</a>' +
                        '<button type="button" class="td-btn td-btn--ghost" id="tdZoom" style="display:none;">放大预览</button>' +
                        '<button type="button" class="td-btn td-btn--ghost" id="tdRegen" style="display:none;">重新生成</button>' +
                    '</div>' +
                    '<div class="td-meta-info" id="tdMeta">' +
                        '<div class="td-meta-row"><span class="k">任务 ID</span><span class="v empty">—</span></div>' +
                        '<div class="td-meta-row"><span class="k">任务状态</span><span class="v empty">—</span></div>' +
                        '<div class="td-meta-row"><span class="k">已查询次数</span><span class="v empty">—</span></div>' +
                        '<div class="td-meta-row"><span class="k">耗时</span><span class="v empty">—</span></div>' +
                        '<div class="td-meta-row"><span class="k">图片格式</span><span class="v empty">—</span></div>' +
                        '<div class="td-meta-row"><span class="k">图片大小</span><span class="v empty">—</span></div>' +
                        '<div class="td-meta-row"><span class="k">画面比例</span><span class="v empty">—</span></div>' +
                        '<div class="td-meta-row"><span class="k">分辨率</span><span class="v empty">—</span></div>' +
                    '</div>' +
                '</section>' +
                '<section class="td-card"><div class="td-card-title">后端返回提示词</div>' +
                    '<div class="td-backend-prompt" id="tdBackendPrompt">演示模式：未向后端发送请求；此处不显示任何内容。</div>' +
                '</section>' +
            '</div>' +
        '</div>' +
        '<div class="td-lb" id="tdLb"><img id="tdLbImg" alt="案例图片放大预览"></div>';

    /* ---------- 填充 select / checkbox ---------- */
    function fillSelect(id, options) {
        var el = document.getElementById(id);
        var html = '<option value="">请选择</option>';
        for (var i = 0; i < options.length; i++) {
            html += '<option value="' + options[i].value + '">' + options[i].label + '</option>';
        }
        el.innerHTML = html;
    }

    fillSelect('tdRace', OPTIONS.race);
    fillSelect('tdGender', OPTIONS.gender);
    fillSelect('tdHairstyle', OPTIONS.hairstyle);
    fillSelect('tdHairColor', OPTIONS.hairColor);
    fillSelect('tdOutfit', OPTIONS.outfit);
    fillSelect('tdPose', OPTIONS.pose);
    fillSelect('tdExpression', OPTIONS.expression);
    fillSelect('tdArtStyle', OPTIONS.artStyle);
    fillSelect('tdAspectRatio', OPTIONS.aspectRatio);
    fillSelect('tdResolution', OPTIONS.resolution);
    fillSelect('tdQuality', OPTIONS.quality);
    fillSelect('tdDetailLevel', OPTIONS.detailLevel);
    fillSelect('tdBackground', OPTIONS.background);

    var tplEl = document.getElementById('tdTemplate');
    var tplHtml = '<option value="">不使用模板</option>';
    for (var tk in TEMPLATES) {
        if (TEMPLATES.hasOwnProperty(tk)) {
            tplHtml += '<option value="' + tk + '">' + TEMPLATES[tk].name + '</option>';
        }
    }
    tplEl.innerHTML = tplHtml;

    var accWrap = document.getElementById('tdAccessories');
    var accHtml = '';
    for (var i = 0; i < OPTIONS.accessories.length; i++) {
        accHtml += '<label class="td-checkbox-item"><input type="checkbox" value="' +
            OPTIONS.accessories[i].value + '">' + OPTIONS.accessories[i].label + '</label>';
    }
    accWrap.innerHTML = accHtml;

    /* ---------- 配置对象 ---------- */
    var cfg = {};
    function resetCfg() {
        for (var k in DEFAULTS) {
            if (DEFAULTS.hasOwnProperty(k)) {
                cfg[k] = (DEFAULTS[k] instanceof Array) ? [] : DEFAULTS[k];
            }
        }
    }
    resetCfg();

    function escapeHtml(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function frag(field, val) {
        if (!val || !FRAGMENTS[field]) return '';
        return FRAGMENTS[field][val] || '';
    }

    /* ---------- 提示词拼接（顺序与真实工具一致） ---------- */
    function buildPrompt() {
        var parts = [];
        var seen = {};
        function push(s) {
            if (!s) return;
            s = String(s).trim();
            if (!s) return;
            var tokens = s.split(/[,，]/);
            var kept = [];
            for (var i = 0; i < tokens.length; i++) {
                var t = tokens[i].trim();
                if (t && !seen[t]) { seen[t] = true; kept.push(t); }
            }
            if (kept.length) parts.push(kept.join('，'));
        }

        var raceStr = frag('race', cfg.race);
        var genderStr = frag('gender', cfg.gender);
        if (raceStr && genderStr) push(raceStr + genderStr + '角色');
        else if (raceStr) push(raceStr + '角色');
        else if (genderStr) push(genderStr + '角色');

        var hairStr = '';
        var hs = frag('hairstyle', cfg.hairstyle);
        var hc = frag('hairColor', cfg.hairColor);
        if (hc && hs) hairStr = hc + hs;
        else if (hs) hairStr = hs;
        else if (hc) hairStr = hc + '头发';
        if (hairStr) push(hairStr);

        push(frag('outfit', cfg.outfit));
        push(frag('pose', cfg.pose));
        push(frag('expression', cfg.expression));

        if (cfg.accessories.length) {
            var accF = [];
            for (var i = 0; i < cfg.accessories.length; i++) {
                var af = frag('accessories', cfg.accessories[i]);
                if (af) accF.push(af);
            }
            if (accF.length) push('佩戴' + accF.join('、'));
        }

        push(frag('artStyle', cfg.artStyle));
        push(frag('background', cfg.background));

        if (cfg.aspectRatio && ASPECT_RATIO_LABEL[cfg.aspectRatio]) {
            push('画面比例 ' + ASPECT_RATIO_LABEL[cfg.aspectRatio]);
        }
        if (cfg.resolution && RESOLUTION_LABEL[cfg.resolution]) push(RESOLUTION_LABEL[cfg.resolution]);
        if (cfg.quality && QUALITY_LABEL[cfg.quality]) push(QUALITY_LABEL[cfg.quality]);
        push(frag('detailLevel', cfg.detailLevel));
        if (cfg.extraDescription) push(cfg.extraDescription);

        return parts.join('，');
    }

    var promptEl = document.getElementById('tdPrompt');
    var copyBtn = document.getElementById('tdCopy');
    var genBtn = document.getElementById('tdGenerate');
    var currentPrompt = '';

    function updatePrompt() {
        currentPrompt = buildPrompt();
        promptEl.innerHTML = currentPrompt
            ? escapeHtml(currentPrompt)
            : '<span class="td-prompt-empty">选择参数后，提示词将自动生成于此</span>';
        copyBtn.disabled = !currentPrompt;
        genBtn.disabled = !currentPrompt || busy;
    }

    /* ---------- 绑定参数变更 ---------- */
    function bindSelect(id, field) {
        document.getElementById(id).addEventListener('change', function () {
            cfg[field] = this.value;
            updatePrompt();
        });
    }
    bindSelect('tdRace', 'race');
    bindSelect('tdGender', 'gender');
    bindSelect('tdHairstyle', 'hairstyle');
    bindSelect('tdHairColor', 'hairColor');
    bindSelect('tdOutfit', 'outfit');
    bindSelect('tdPose', 'pose');
    bindSelect('tdExpression', 'expression');
    bindSelect('tdArtStyle', 'artStyle');
    bindSelect('tdAspectRatio', 'aspectRatio');
    bindSelect('tdResolution', 'resolution');
    bindSelect('tdQuality', 'quality');
    bindSelect('tdDetailLevel', 'detailLevel');
    bindSelect('tdBackground', 'background');

    tplEl.addEventListener('change', function () { cfg.template = this.value; });

    accWrap.addEventListener('change', function () {
        var checked = accWrap.querySelectorAll('input[type="checkbox"]:checked');
        var arr = [];
        for (var i = 0; i < checked.length; i++) arr.push(checked[i].value);
        cfg.accessories = arr;
        updatePrompt();
    });

    var extraEl = document.getElementById('tdExtra');
    var extraCount = document.getElementById('tdExtraCount');
    extraEl.addEventListener('input', function () {
        extraCount.textContent = extraEl.value.length;
        extraCount.parentElement.classList.toggle('warn', extraEl.value.length > 180);
        cfg.extraDescription = extraEl.value;
        updatePrompt();
    });

    /* ---------- 一键填充 / 重置 ---------- */
    var PERSON_FIELDS = ['race', 'gender', 'hairstyle', 'hairColor', 'outfit', 'pose', 'expression'];

    function syncPersonToUI(person) {
        for (var i = 0; i < PERSON_FIELDS.length; i++) {
            var f = PERSON_FIELDS[i];
            document.getElementById('td' + (f === 'race' ? 'Race' : f === 'gender' ? 'Gender' :
                f === 'hairstyle' ? 'Hairstyle' : f === 'hairColor' ? 'HairColor' :
                f === 'outfit' ? 'Outfit' : f === 'pose' ? 'Pose' : 'Expression')).value = person[f] || '';
        }
        var boxes = accWrap.querySelectorAll('input[type="checkbox"]');
        var list = person.accessories || [];
        for (var j = 0; j < boxes.length; j++) boxes[j].checked = list.indexOf(boxes[j].value) !== -1;
    }

    document.getElementById('tdFill').addEventListener('click', function () {
        var source = (cfg.template && TEMPLATES[cfg.template]) ? TEMPLATES[cfg.template] : DEFAULT_PERSON;
        for (var i = 0; i < PERSON_FIELDS.length; i++) {
            var f = PERSON_FIELDS[i];
            if (source[f]) cfg[f] = source[f];
        }
        cfg.accessories = source.accessories ? source.accessories.slice() : [];
        syncPersonToUI(cfg);
        updatePrompt();
    });

    document.getElementById('tdReset').addEventListener('click', function () {
        resetCfg();
        tplEl.value = '';
        var sels = root.querySelectorAll('.td-select');
        for (var i = 0; i < sels.length; i++) {
            var id = sels[i].id;
            var field = id.charAt(2).toLowerCase() + id.slice(3);
            sels[i].value = cfg[field] !== undefined && cfg[field] !== '' ? cfg[field] : '';
        }
        var boxes = accWrap.querySelectorAll('input[type="checkbox"]');
        for (var j = 0; j < boxes.length; j++) boxes[j].checked = false;
        extraEl.value = '';
        extraCount.textContent = '0';
        clearResult();
        updatePrompt();
    });

    /* ---------- 复制提示词 ---------- */
    function flashCopy(ok, msg) {
        var old = copyBtn.textContent;
        copyBtn.textContent = (ok ? '✓ ' : '✗ ') + msg;
        setTimeout(function () { copyBtn.textContent = old; }, 1400);
    }
    copyBtn.addEventListener('click', function () {
        if (!currentPrompt) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(currentPrompt)
                .then(function () { flashCopy(true, '已复制'); })
                .catch(function () { fallbackCopy(); });
        } else {
            fallbackCopy();
        }
        function fallbackCopy() {
            var ta = document.createElement('textarea');
            ta.value = currentPrompt;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            var ok = false;
            try { ok = document.execCommand('copy'); } catch (e) {}
            document.body.removeChild(ta);
            flashCopy(ok, ok ? '已复制' : '复制失败');
        }
    });

    /* ---------- 模拟生成（无网络请求） ---------- */
    var slot = document.getElementById('tdSlot');
    var resultImg = document.getElementById('tdResultImg');
    var statusEl = document.getElementById('tdStatus');
    var downloadBtn = document.getElementById('tdDownload');
    var zoomBtn = document.getElementById('tdZoom');
    var regenBtn = document.getElementById('tdRegen');
    var backendPromptEl = document.getElementById('tdBackendPrompt');
    var lb = document.getElementById('tdLb');
    var lbImg = document.getElementById('tdLbImg');

    var busy = false;
    var rotateIdx = 0;
    var simTimer = null;
    var lastCase = 0;

    function setStatus(type, msg) {
        statusEl.className = 'td-status ' + (type || '');
        if (type === 'loading') statusEl.innerHTML = '<span class="td-spinner"></span>' + escapeHtml(msg);
        else statusEl.textContent = msg;
    }

    function chooseCase() {
        if (cfg.race === 'angel' || cfg.hairColor === 'white') return 1;
        if (cfg.race === 'elf' || cfg.hairColor === 'blue') return 2;
        if (cfg.race === 'demon' || (cfg.gender === 'male' && (cfg.hairColor === 'red' || cfg.hairColor === 'purple'))) return 3;
        if (cfg.hairColor === 'pink' || cfg.hairstyle === 'twintails') return 4;
        rotateIdx = (rotateIdx + 1) % 4;
        return rotateIdx + 1;
    }

    function clearResult() {
        slot.classList.remove('has-image', 'is-loading');
        resultImg.removeAttribute('src');
        downloadBtn.style.display = 'none';
        zoomBtn.style.display = 'none';
        regenBtn.style.display = 'none';
        setStatus('', '');
        resetMeta();
        backendPromptEl.innerHTML = '演示模式：未向后端发送请求；此处不显示任何内容。';
    }

    function resetMeta() {
        var rows = document.querySelectorAll('#tdMeta .td-meta-row .v');
        for (var i = 0; i < rows.length; i++) {
            rows[i].textContent = '—';
            rows[i].className = 'v empty';
        }
    }

    function setMetaRow(idx, val) {
        var el = document.querySelectorAll('#tdMeta .td-meta-row .v')[idx];
        el.textContent = val;
        el.className = 'v';
    }

    function runSimulation(forceRotate) {
        if (busy) return;
        busy = true;
        genBtn.disabled = true;
        genBtn.classList.add('is-loading');
        genBtn.textContent = '生成中...';
        setStatus('loading', '正在生成 Demo 预览……');
        slot.classList.remove('has-image');
        slot.classList.add('is-loading');
        downloadBtn.style.display = 'none';
        zoomBtn.style.display = 'none';
        regenBtn.style.display = 'none';

        var start = Date.now();

        simTimer = setTimeout(function () {
            var caseNo;
            if (forceRotate) {
                do { caseNo = (rotateIdx % 4) + 1; rotateIdx++; }
                while (caseNo === lastCase);
            } else {
                caseNo = chooseCase();
            }
            lastCase = caseNo;
            var c = CASES[caseNo];
            resultImg.src = c.src;
            slot.classList.remove('is-loading');
            slot.classList.add('has-image');

            setMetaRow(0, 'demo-' + Math.random().toString(16).slice(2, 8));
            setMetaRow(1, 'success（demo）');
            setMetaRow(2, '0（演示未请求）');
            setMetaRow(3, ((Date.now() - start) / 1000).toFixed(1) + 's');
            setMetaRow(4, 'JPEG');
            setMetaRow(5, c.size);
            setMetaRow(6, cfg.aspectRatio);
            setMetaRow(7, cfg.resolution.toUpperCase());

            setStatus('success', 'Demo 预览生成成功 · 本地真实案例图片 · 未发送任何网络请求');
            downloadBtn.href = c.src;
            downloadBtn.download = 'ai-image-case-' + caseNo + '.jpg';
            downloadBtn.style.display = '';
            zoomBtn.style.display = '';
            regenBtn.style.display = '';

            backendPromptEl.innerHTML =
                '<span class="ph">演示模式：未向后端发送请求。真实工具中将提交的提示词为：</span><br>' +
                escapeHtml(currentPrompt);

            busy = false;
            genBtn.classList.remove('is-loading');
            genBtn.textContent = '生成图片';
            genBtn.disabled = !currentPrompt;
        }, 1500);
    }

    genBtn.addEventListener('click', function () { runSimulation(false); });
    regenBtn.addEventListener('click', function () { runSimulation(true); });

    zoomBtn.addEventListener('click', function () {
        lbImg.src = resultImg.src;
        lb.classList.add('show');
    });
    downloadBtn.addEventListener('click', function () { /* 原生 download，无网络逻辑 */ });
    lb.addEventListener('click', function () { lb.classList.remove('show'); });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') lb.classList.remove('show');
    });

    /* 初始提示词（与真实工具初始态一致） */
    updatePrompt();
})();
