/* ============================================================
   game.js  —  核心游戏逻辑与渲染层
   阶段 0：从原 <script> 抽离所有核心函数，保留 90% 实现
           仅将 PLAYER 实例化、save/load/init 调用改为通过 WXHXQ.store
   依赖：data.js / storage.js / audio.js / ui.js
   ============================================================ */
window.WXHXQ = window.WXHXQ || {};
window.WXHXQ.game = (function(){
  const DATA = window.WXHXQ.data;
  const store = window.WXHXQ.store;
  const audio = window.WXHXQ.audio;
  const ui = window.WXHXQ.ui;

  /* ---------- 运行时 PLAYER 实例 ---------- */
  const player = store.createInitialPlayer("陈念");

  /* 事件 09 跳过提示（仅在内存中） */
  let skipNotice = null;

  /* ============================================================
     自动推进（Auto Advance）— 阶段 U 功能 1
     说明：
       1) intro 段和 consequence 段渲染后，按估算阅读时长延迟自动 continueEvent
       2) consequence 最后段会直接触发 advanceToNextEvent / goToEnding
       3) 玩家点击 continue-btn 或空白对话区，可立即跳过定时器
     ============================================================ */
  let _autoTimer = null;
  /* 选项阶段锁定：true 时页面锁定在选项界面，只有点击选项按钮才能解锁推进 */
  let awaitingChoice = false;
  function clearAuto(){ if(_autoTimer){ clearTimeout(_autoTimer); _autoTimer = null; } }
  function scheduleAuto(fn, textOrMs){
    clearAuto();
    let ms;
    if(typeof textOrMs === "number"){ ms = textOrMs; }
    else {
      // 阅读速度估算：每个汉字 / 英文单词约 180ms，最低 800ms，最高 6000ms
      const s = (textOrMs || "").replace(/<[^>]+>/g, "").replace(/__NAME__/g, player.name || "陈念");
      ms = Math.min(6000, Math.max(900, s.length * 180));
    }
    _autoTimer = setTimeout(() => { _autoTimer = null; fn && fn(); }, ms);
  }
  // 点击 / 按键立即推进：触发当前渲染结果上绑定的 continue-btn
  function forceAdvanceOnce(){
    /* 选项阶段锁定：等待玩家选择时，点击剧情区/对话框/背景/按键全部无效 */
    if(player.currentState === "EVENT" && (player.eventPhase === "choice" || awaitingChoice)) return;
    clearAuto();
    /* 宿舍阶段：仅允许“触发事件”按钮；EVENT 阶段禁止误触隐藏在宿舍视图里的该按钮 */
    if(player.currentState === "DORM"){
      const tb = document.getElementById("triggerEventBtn");
      if(tb) tb.click();
      return;
    }
    const btn = document.getElementById("introNextBtn") || document.getElementById("resultNextBtn") || document.getElementById("climaxBtn");
    if(btn) btn.click();
  }

  /* ---------- 工具函数（原样保留） ---------- */
  const clamp = v => Math.max(0, Math.min(100, v));
  const pad   = n => String(n).padStart(2, "0");
  const getEventById = id => DATA.EVENTS.find(e => e.id === id);
  const getCurrentEvent = () => getEventById(player.currentEventId);
  const roommateName = id => (DATA.ROOMMATES.find(r => r.id === id) || {}).name || id;
  const hasKC = k => player.keyChoices.includes(k);

  function syncPlayerAffection(){ store.syncPlayerAffection(player); }
  function getLevel(aff){
    if(aff<40) return {name:"普通室友",cls:"normal"};
    if(aff<60) return {name:"熟人",cls:"normal"};
    if(aff<80) return {name:"亲密室友",cls:"close"};
    return {name:"特殊关系",cls:"intimate"};
  }

  /* 玩家姓名动态插入 */
  function interpolate(text){
    if(text == null) return "";
    return String(text).replace(/__NAME__/g, player.name || "陈念");
  }

  /* ---------- 分段剧情状态重置 ---------- */
  function resetEventPhase(){
    const ev = getCurrentEvent();
    if(!ev){ player.eventPhase = "choice"; player.paraIndex = 0; player.chosenOption = null; player.lastAffSnapshot = null; return; }
    let hasIntro = false;
    if(ev.branch){
      const br = ev.branches[player.triggeredRoommateEvent];
      hasIntro = !!(br && br.intro);
    } else {
      hasIntro = !!ev.intro;
    }
    player.eventPhase = hasIntro ? "intro" : "choice";
    player.paraIndex = 0;
    player.chosenOption = null;
    syncPlayerAffection();
    player.lastAffSnapshot = Object.assign({}, player.affection);
  }

  function getOption(ev, label){
    if(ev.branch){
      const br = ev.branches[player.triggeredRoommateEvent];
      if(!br) return null;
      return (label === "A") ? br.optionA : br.optionB;
    }
    if(ev.options){
      const idx = (label === "A") ? 0 : 1;
      return ev.options[idx];
    }
    return (label === "A") ? ev.optionA : ev.optionB;
  }

  function getIntro(ev){
    if(!ev) return null;
    if(ev.branch){
      const br = ev.branches[player.triggeredRoommateEvent];
      return br ? br.intro : null;
    }
    return ev.intro || null;
  }

  function getConsequence(ev){
    if(!ev || !player.chosenOption) return null;
    const opt = getOption(ev, player.chosenOption);
    return opt ? (opt.consequence || null) : null;
  }

  function getTransition(ev){
    if(!ev || !player.chosenOption) return null;
    const opt = getOption(ev, player.chosenOption);
    return opt ? (opt.transition || null) : null;
  }

  /* ---------- 好感度变化反馈（内嵌小型） ---------- */
  function renderAffChangeInline(){
    if(!player.lastAffSnapshot) return "";
    const rows = DATA.ROOMMATES.map(r => {
      const before = player.lastAffSnapshot[r.id] != null ? player.lastAffSnapshot[r.id] : r.affection;
      const after  = r.affection;
      const diff   = after - before;
      if(diff === 0) return "";
      const sign = diff > 0 ? "+" : "";
      const cls  = diff > 0 ? "up" : "down";
      const v    = DATA.COLOR_VAR[r.id];
      return `<span class="aff-tag ${v} ${cls}">${r.name} ${sign}${diff}</span>`;
    }).filter(Boolean).join("");
    if(!rows) return "";
    return `<div class="aff-inline">${rows}</div>`;
  }

  /* ---------- 好感度变化 Toast（右上角短暂显示） ----------
     基于 player.lastAffSnapshot 与当前 r.affection 的差值，
     在 #affToastLayer 中生成 toast，约 2s 后自动淡出。 */
  let _affToastTimer = null;
  function showAffToast(){
    if(!player.lastAffSnapshot) return;
    const layer = document.getElementById("affToastLayer");
    if(!layer) return;
    const items = [];
    DATA.ROOMMATES.forEach(r => {
      const before = player.lastAffSnapshot[r.id] != null ? player.lastAffSnapshot[r.id] : r.affection;
      const after  = r.affection;
      const diff   = after - before;
      if(diff === 0) return;
      const sign = diff > 0 ? "+" : "";
      const cls  = diff > 0 ? "up" : "down";
      items.push(`<div class="aff-toast-item ${cls}"><span class="at-dot"></span><span class="at-name">${r.name}</span><span class="at-delta">好感 ${sign}${diff}</span></div>`);
    });
    if(items.length === 0) return;
    layer.innerHTML = items.join("");
    if(_affToastTimer){ clearTimeout(_affToastTimer); _affToastTimer = null; }
    /* 动画总时长约 2.2s（in 0.34s + 停留 + out 0.6s），2.4s 后清空 */
    _affToastTimer = setTimeout(() => {
      layer.innerHTML = "";
      _affToastTimer = null;
    }, 2400);
  }

  function applyEffects(effects){
    if(!effects) return;
    if(effects.all !== undefined){
      for(const r of DATA.ROOMMATES) r.affection = clamp(r.affection + effects.all);
    } else {
      for(const id in effects){
        const r = DATA.ROOMMATES.find(x => x.id === id);
        if(r) r.affection = clamp(r.affection + effects[id]);
      }
    }
    syncPlayerAffection();
  }

  /* ---------- 分支判定 ---------- */
  function determineEvent9Branch(){
    const el = DATA.ROOMMATES.filter(r => r.affection >= 60);
    if(el.length === 0) return null;
    el.sort((a,b) => b.affection !== a.affection ? b.affection - a.affection : DATA.PRIORITY[a.id] - DATA.PRIORITY[b.id]);
    return el[0].id;
  }

  function getMaxRoommate(){
    return [...DATA.ROOMMATES].sort((a,b) => b.affection !== a.affection ? b.affection - a.affection : DATA.PRIORITY[a.id] - DATA.PRIORITY[b.id])[0];
  }

  function determineEnding(){
    const allGte60 = DATA.ROOMMATES.every(r => r.affection >= 60);
    const allLt40  = DATA.ROOMMATES.every(r => r.affection < 40);
    const max = getMaxRoommate();
    if(allGte60 && hasKC("求助室友") && hasKC("正面应对")) return "all_dorm";
    if(max.affection >= 85 && player.triggeredRoommateEvent === max.id && hasKC("求助室友") && hasKC("正面应对")) return "special";
    if(max.affection >= 70 && max.affection <= 84 && player.triggeredRoommateEvent === max.id && hasKC("求助室友")) return "ambiguous";
    if(allLt40 || (hasKC("独自扛") && hasKC("想逃避"))) return "lone";
    return "bestfriend";
  }

  /* ---------- 选择与推进 ---------- */
  function onChoice(optLabel){
    const ev = getCurrentEvent(); if(!ev) return;
    if(ev.noChoice) return;
    /* 选项锁定：仅在“选项阶段且未选择”时响应；连点/重复点击一律忽略，防止重复触发 */
    if(player.eventPhase !== "choice" || !awaitingChoice) return;
    const opt = getOption(ev, optLabel); if(!opt) return;
    awaitingChoice = false;   /* 确认有效选择后立即解锁，后续连点失效 */
    syncPlayerAffection();
    player.lastAffSnapshot = Object.assign({}, player.affection);
    applyEffects(opt.effects);
    /* 触发右上角好感度变化 toast（基于 lastAffSnapshot） */
    showAffToast();
    if(opt.keyChoice && !player.keyChoices.includes(opt.keyChoice)) player.keyChoices.push(opt.keyChoice);
    player.chosenOption = optLabel;
    if(opt.consequence && opt.consequence.length > 0){
      player.eventPhase = "consequence";
      player.paraIndex = 0;
      store.save(player); render();
      requestAnimationFrame(() => document.querySelector(".stage")?.scrollIntoView({behavior:"smooth", block:"start"}));
    } else {
      advanceToNextEvent();
    }
  }

  function continueEvent(){
    const ev = getCurrentEvent(); if(!ev) return;
    /* 选项阶段：锁定，禁止任何推进（只有点击选项按钮可离开此阶段） */
    if(player.eventPhase === "choice") return;
    if(player.eventPhase === "intro"){
      const intro = getIntro(ev);
      if(intro){
        if(player.paraIndex < intro.length - 1){
          player.paraIndex++; store.save(player); render();
        } else {
          if(ev.noChoice){ goToEnding(); return; }
          player.eventPhase = "choice"; awaitingChoice = true; clearAuto(); store.save(player); render();
        }
      }
    } else if(player.eventPhase === "consequence"){
      const cons = getConsequence(ev);
      if(cons){
        if(player.paraIndex < cons.length - 1){
          player.paraIndex++; store.save(player); render();
        } else {
          advanceToNextEvent();
        }
      }
    }
  }

  function advanceToNextEvent(){
    const ev = getCurrentEvent(); if(!ev) return;
    /* 隐藏事件检查：当前事件完成后，先检查是否有满足条件的隐藏事件 */
    const hidden = DATA.EVENTS.find(e => e.hidden && e.triggerAfter === ev.id &&
      (typeof e.condition !== "function" || e.condition(player)));
    if(hidden){
      player.currentEventId = hidden.id;
      player.day = hidden.idx;
      player.currentState = "EVENT";
      player.eventPhase = "intro"; player.paraIndex = 0; player.chosenOption = null;
      player.lastAffSnapshot = null;
      store.save(player); render();
      return;
    }
    const nextId = ev.nextEventId;
    if(nextId){
      player.currentEventId = nextId;
      const next = getEventById(nextId);
      if(next) player.day = next.idx;
      /* 事件 09 是分支判断节点，必须调用 triggerEvent() 处理 */
      if(nextId === "event_09"){
        triggerEvent(); return;
      }
      player.currentState = "EVENT";
      player.eventPhase = "intro"; player.paraIndex = 0; player.chosenOption = null;
      player.lastAffSnapshot = null;
    } else {
      player.endingId = determineEnding();
      player.currentState = "ENDING";
    }
    store.save(player); render();
  }

  function goToEnding(){
    player.endingId = determineEnding();
    player.currentState = "ENDING";
    store.save(player); render();
  }

  function triggerEvent(){
    const ev = getCurrentEvent(); if(!ev) return;
    /* 选项锁定期间禁止重新触发，避免事件从 intro 重播 */
    if(awaitingChoice) return;
    if(ev.id === "event_09"){
      const branch = determineEvent9Branch();
      if(branch === null){
        /* 无人好感度 ≥ 60：直接跳事件 10，不显示任何中间页 */
        player.currentEventId = "event_10";
        player.day = 10;
        player.triggeredRoommateEvent = null;
        player.eventPhase = "intro"; player.paraIndex = 0; player.chosenOption = null;
        player.currentState = "EVENT";
        player.lastAffSnapshot = null;
        store.save(player); render(); return;
      }
      player.triggeredRoommateEvent = branch;
      resetEventPhase();
      player.currentState = "EVENT"; store.save(player); render(); return;
    }
    resetEventPhase();
    player.currentState = "EVENT"; store.save(player); render();
  }

  /* ============================================================
     渲染层
     ============================================================ */
  function setState(name){
    player.currentState = name;
    document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.dataset.state === name));
  }

  function renderChapter(){
    const ev = getCurrentEvent();
    const lblChapter  = document.getElementById("chapterLabel");
    const lblProgress = document.getElementById("progressText");
    const fill        = document.getElementById("progressFill");
    if(player.currentState === "ENDING"){
      lblChapter.textContent  = "结局";
      lblProgress.textContent = "通关";
      fill.style.width = "100%";
      return;
    }
    if(ev){
      lblChapter.textContent  = ev.stage;
      lblProgress.textContent = "事件 " + pad(ev.idx) + " / 12";
      fill.style.width = (ev.idx / 12 * 100) + "%";
    }
  }

  function renderDorm(){
    const ev = getCurrentEvent();
    const sceneText = document.getElementById("sceneText");
    const sceneTime = document.getElementById("sceneTime");
    const tip = document.getElementById("sceneTip");
    const btn = document.getElementById("triggerEventBtn");
    if(skipNotice){
      sceneTime.textContent = "404 寝室 · 事件 09 跳过";
      sceneText.innerHTML = '<span style="color:var(--warn)">⚠ ' + skipNotice + "</span>";
      tip.textContent = "点下方按钮继续推进剧情。";
      skipNotice = null;
    } else if(player.day === 1 && ev && ev.idx === 1){
      sceneTime.textContent = "404 寝室 · 故事开始";
      sceneText.innerHTML = `开学第一天。

<span class="who lin">林小满</span> 在啃鸡腿；
<span class="who su">苏晚晴</span> 在背单词；
<span class="who shen">沈星河</span> 摆弄着塔罗牌；
<span class="who gu">顾清欢</span> 敷着面膜。

你刚搬进 404 寝室。

——这群室友，看上去就不太对劲。`;
      tip.textContent = "点下方按钮开始你的故事。";
    } else if(ev){
      sceneTime.textContent = "404 寝室 · 此刻";
      sceneText.textContent = "（寝室里的故事即将继续……）";
      tip.textContent = "点下方按钮继续推进剧情。";
    }
    if(ev){
      btn.textContent = ev.noChoice ? "进入护短之夜 →" : ("继续 · 事件 " + pad(ev.idx) + " →");
    }
  }

  function renderEvent(){
    const ev = getCurrentEvent(); if(!ev) return;
    /* 新事件首段：清空上一位人物立绘记忆 */
    if(player.paraIndex === 0 && player.eventPhase === "intro"){ resetLastChar(); }
    /* 选项锁定标志与当前阶段保持同步：选项阶段锁定，其余阶段解锁 */
    awaitingChoice = (player.eventPhase === "choice");
    /* 纯视觉：根据 currentEventId 切换事件背景（只读状态，不影响任何剧情推进） */
    updateEventBackground();
    const titleEl = document.getElementById("eventTitle");
    const dialogueEl = document.getElementById("eventDialogue");
    const choicesBox  = document.getElementById("choicesBox");
    const speakerEl  = document.getElementById("eventSpeaker");
    const eventView  = document.querySelector(".event-view");

    /* ---------- AVG 模式辅助：设置说话者名 + data-phase ---------- */
    function setSpeaker(id){
      if(!speakerEl) return;
      const finalId = id || "narr";
      if(finalId === "narr"){
        speakerEl.textContent = "404 寝室";
        speakerEl.classList.add("is-narrator");
      } else if(finalId === "you"){
        speakerEl.textContent = "你";
        speakerEl.classList.remove("is-narrator");
      } else {
        const r = DATA.ROOMMATES.find(x => x.id === finalId);
        speakerEl.textContent = r ? r.name : "404 寝室";
        speakerEl.classList.remove("is-narrator");
      }
      /* 立绘跟随说话者：室友显示对应立绘，旁白/玩家不显示 */
      showCharacterSprite(finalId);
    }
    function setPhase(phase){
      if(eventView) eventView.setAttribute("data-phase", phase);
    }
    /* 推进按钮：统一显示 ▶，CSS 定位到对话框右下角 */
    const ARROW = "▶";

    /* 分支事件（事件 09） */
    if(ev.branch){
      const br = ev.branches[player.triggeredRoommateEvent];
      if(!br){
        /* 安全网：如果 triggeredRoommateEvent 为 null，立即重定向到 event_10 */
        player.currentEventId = "event_10";
        player.day = 10;
        player.triggeredRoommateEvent = null;
        player.eventPhase = "intro";
        player.paraIndex = 0;
        player.chosenOption = null;
        player.currentState = "EVENT";
        player.lastAffSnapshot = null;
        store.save(player);
        setState("EVENT");
        renderChapter();
        renderEvent();
        return;
      }
      if(titleEl) titleEl.textContent = ev.title + " · " + roommateName(player.triggeredRoommateEvent);
      if(player.eventPhase === "intro" && br.intro){
        setPhase("intro");
        const text = interpolate(br.intro[player.paraIndex] || "");
        ui.setText(dialogueEl, text);
        const speaker = detectSpeaker(text) || player.triggeredRoommateEvent || "narr";
        setSpeaker(speaker);
        setPortrait(speaker, true);
        const isLast = player.paraIndex >= br.intro.length - 1;
        choicesBox.innerHTML = `<button class="continue-btn" id="introNextBtn" aria-label="继续">${ARROW}</button>`;
        document.getElementById("introNextBtn").addEventListener("click", () => { clearAuto(); continueEvent(); });
        if(!isLast) scheduleAuto(continueEvent, text);
        return;
      }
      if(player.eventPhase === "choice"){
        setPhase("choice");
        setSpeaker(player.triggeredRoommateEvent || "narr");
        setPortrait(player.triggeredRoommateEvent || "narr", true);
        dialogueEl.innerHTML = '<div style="color:rgba(255,246,236,0.62);font-style:italic">（她看着你……）</div>';
        choicesBox.innerHTML = choiceBtn("A", br.optionA) + choiceBtn("B", br.optionB);
        choicesBox.querySelectorAll(".choice").forEach(b => b.addEventListener("click", () => { clearAuto(); onChoice(b.dataset.opt); }));
        return;
      }
      if(player.eventPhase === "consequence" && player.chosenOption){
        setPhase("consequence");
        const opt = (player.chosenOption === "A") ? br.optionA : br.optionB;
        const cons = opt && opt.consequence ? opt.consequence : null;
        if(cons){
          const text = interpolate(cons[player.paraIndex] || "");
          const speaker = detectSpeaker(text) || player.triggeredRoommateEvent || "narr";
          setSpeaker(speaker);
          setPortrait(speaker, true);
          const isLast = player.paraIndex >= cons.length - 1;
          let dialogHtml = `<div class="consequence-label">选择结果 · ${player.chosenOption}</div>` + text;
          if(isLast){
            const affInline = renderAffChangeInline();
            const trans = opt.transition ? `<div class="transition-text">${interpolate(opt.transition)}</div>` : "";
            dialogHtml += affInline + trans;
          }
          dialogueEl.innerHTML = dialogHtml;
          choicesBox.innerHTML = `<button class="continue-btn" id="resultNextBtn" aria-label="继续">${ARROW}</button>`;
          document.getElementById("resultNextBtn").addEventListener("click", () => { clearAuto(); continueEvent(); });
          const delayText = isLast ? text + (opt.transition || "") : text;
          scheduleAuto(continueEvent, delayText);
          return;
        }
      }
      /* 兜底 */
      setPhase("choice");
      setSpeaker(player.triggeredRoommateEvent || "narr");
      dialogueEl.innerHTML = interpolate(br.content || "");
      choicesBox.innerHTML = choiceBtn("A", br.optionA) + choiceBtn("B", br.optionB);
      choicesBox.querySelectorAll(".choice").forEach(b => b.addEventListener("click", () => onChoice(b.dataset.opt)));
      return;
    }
    /* 无选项事件（事件 12） */
    if(ev.noChoice){
      if(titleEl) titleEl.textContent = ev.title;
      if(ev.intro && player.eventPhase === "intro"){
        setPhase("intro");
        const text = interpolate(ev.intro[player.paraIndex] || "");
        ui.setText(dialogueEl, text);
        setSpeaker(detectSpeaker(text));
        setPortrait(detectSpeaker(text), true);
        const isLast = player.paraIndex >= ev.intro.length - 1;
        choicesBox.innerHTML = `<button class="continue-btn" id="introNextBtn" aria-label="继续">${ARROW}</button>`;
        document.getElementById("introNextBtn").addEventListener("click", () => {
          clearAuto();
          if(isLast){ goToEnding(); } else { continueEvent(); }
        });
        if(!isLast) scheduleAuto(continueEvent, text);
        else scheduleAuto(goToEnding, text);
        return;
      }
      setPhase("intro");
      setSpeaker("narr");
      setPortrait("narr", false);
      dialogueEl.innerHTML = interpolate(ev.content);
      choicesBox.innerHTML = `<button class="choice climax" id="climaxBtn"><span class="badge">→</span><span class="txt">进入结局判定</span></button>`;
      document.getElementById("climaxBtn").addEventListener("click", goToEnding);
      return;
    }
    /* 常规事件（事件 1-8、10、11） */
    if(player.eventPhase === "intro" && ev.intro){
      if(titleEl) titleEl.textContent = ev.title;
      setPhase("intro");
      const text = interpolate(ev.intro[player.paraIndex] || "");
      ui.setText(dialogueEl, text);
      setSpeaker(detectSpeaker(text));
      setPortrait(detectSpeaker(text), true);
      const isLast = player.paraIndex >= ev.intro.length - 1;
      choicesBox.innerHTML = `<button class="continue-btn" id="introNextBtn" aria-label="继续">${ARROW}</button>`;
      document.getElementById("introNextBtn").addEventListener("click", () => { clearAuto(); continueEvent(); });
      if(!isLast) scheduleAuto(continueEvent, text);
      return;
    }
    if(player.eventPhase === "choice"){
      if(titleEl) titleEl.textContent = ev.title;
      setPhase("choice");
      setSpeaker("narr");
      setPortrait("narr", false);
      choicesBox.innerHTML = choiceBtn("A", ev.optionA) + choiceBtn("B", ev.optionB);
      choicesBox.querySelectorAll(".choice").forEach(b => b.addEventListener("click", () => { clearAuto(); onChoice(b.dataset.opt); }));
      dialogueEl.innerHTML = '<div style="color:rgba(255,246,236,0.62);font-style:italic">（她们都看着你……）</div>';
      return;
    }
    if(player.eventPhase === "consequence" && player.chosenOption){
      if(titleEl) titleEl.textContent = ev.title;
      setPhase("consequence");
      const opt = (player.chosenOption === "A") ? ev.optionA : ev.optionB;
      const cons = opt && opt.consequence ? opt.consequence : null;
      if(cons){
        const text = interpolate(cons[player.paraIndex] || "");
        setSpeaker(detectSpeaker(text));
        setPortrait(detectSpeaker(text), true);
        const isLast = player.paraIndex >= cons.length - 1;
        let dialogHtml = text;
        if(isLast){
          const affInline = renderAffChangeInline();
          const trans = opt.transition ? `<div class="transition-text">${interpolate(opt.transition)}</div>` : "";
          dialogHtml += affInline + trans;
        }
        dialogueEl.innerHTML = dialogHtml;
        choicesBox.innerHTML = `<button class="continue-btn" id="resultNextBtn" aria-label="继续">${ARROW}</button>`;
        document.getElementById("resultNextBtn").addEventListener("click", () => { clearAuto(); continueEvent(); });
        const delayText = isLast ? text + (opt.transition || "") : text;
        scheduleAuto(continueEvent, delayText);
        return;
      }
    }
    /* 兜底 */
    if(titleEl) titleEl.textContent = ev.title;
    setPhase("choice");
    setSpeaker("narr");
    dialogueEl.innerHTML = interpolate(ev.content || "");
    choicesBox.innerHTML = choiceBtn("A", ev.optionA) + choiceBtn("B", ev.optionB);
    choicesBox.querySelectorAll(".choice").forEach(b => b.addEventListener("click", () => onChoice(b.dataset.opt)));
  }

  /* 选项按钮：阶段 2 升级，加入 keyChoice 星标 + hint 预览容器（可选字段） */
  function choiceBtn(label, opt){
    const starMark = opt.keyChoice ? `<span class="star-mark" title="关键选择">★</span>` : "";
    const hintPreview = opt.hint ? `<div class="hint-preview">${interpolate(opt.hint)}</div>` : "";
    return `<button class="choice" data-opt="${label}">${starMark}<span class="badge">${label}</span><div class="txt-wrap"><span class="txt">${opt.text}</span>${hintPreview}</div></button>`;
  }

  function renderEnding(){
    const ending = DATA.ENDINGS[player.endingId] || DATA.ENDINGS.bestfriend;
    let title, text, textParts, quote, easterEgg;
    const rating = ending.rating || "";
    if(ending.perRoommate){
      const max = getMaxRoommate();
      const v = ending.perRoommate[max.id] || ending.perRoommate.linxiaoman;
      title = v.title; text = v.text;
      textParts = v.textParts; quote = v.quote; easterEgg = v.easterEgg;
    } else {
      title = ending.title; text = ending.text;
      textParts = ending.textParts; quote = ending.quote; easterEgg = ending.easterEgg;
    }
    document.getElementById("endingBadge").textContent = ending.badge;
    /* 评级 */
    const ratingEl = document.getElementById("endingRating");
    if(rating){
      ratingEl.textContent = "评级 " + rating;
      ratingEl.style.display = "block";
    } else { ratingEl.style.display = "none"; }
    /* 标题 */
    document.getElementById("endingTitle").textContent = title;
    /* 正文：优先 textParts 多段渲染，fallback text */
    const textEl = document.getElementById("endingText");
    if(textParts && textParts.length > 0){
      textEl.innerHTML = textParts.map(p => `<p class="ending-para">${interpolate(p)}</p>`).join("");
    } else {
      textEl.innerHTML = interpolate(text);
    }
    /* 核心引用 */
    const coreEl = document.getElementById("endingCore");
    if(quote){ coreEl.textContent = "「" + quote + "」"; }
    /* 彩蛋尾声 */
    const epilogueEl = document.getElementById("endingEpilogue");
    if(easterEgg){
      epilogueEl.innerHTML = `<span class="epilogue-label">彩蛋</span>${interpolate(easterEgg)}`;
      epilogueEl.style.display = "block";
    } else { epilogueEl.style.display = "none"; }
    /* 关键选择回顾 */
    const kcEl = document.getElementById("endingKeychoices");
    if(player.keyChoices && player.keyChoices.length > 0){
      kcEl.innerHTML = `<span class="kc-label">你的关键选择</span>` +
        player.keyChoices.map(k => `<span class="kc-tag">${k}</span>`).join("");
      kcEl.style.display = "block";
    } else { kcEl.style.display = "none"; }
  }

  function renderRoommates(){
    /* Drawer 版（完整） */
    const list = document.getElementById("roommateList");
    if(list){
      list.innerHTML = DATA.ROOMMATES.map(r => {
        const lvl = getLevel(r.affection); const v = DATA.COLOR_VAR[r.id];
        return `<div class="roommate">
          <div class="rm-head">
            <div class="avatar" style="background:var(--${v})">${r.name[0]}</div>
            <div><div class="rm-name">${r.name}</div><div class="rm-nick">${r.nickname}</div></div>
            <span class="rm-level ${lvl.cls}">${lvl.name}</span>
          </div>
          <div class="aff-bar"><div class="aff-fill" style="width:${r.affection}%;background:var(--${v})"></div></div>
          <div class="aff-meta"><span>好感度</span><b>${r.affection}</b></div>
          <div class="landmine">雷区：<span>${r.landmine}</span></div>
        </div>`;
      }).join("");
    }
    /* 右侧栏版（精简） */
    const rightList = document.getElementById("rightAffectionList");
    if(rightList){
      rightList.innerHTML = DATA.ROOMMATES.map(r => {
        const lvl = getLevel(r.affection); const v = DATA.COLOR_VAR[r.id];
        return `<div class="rm-card" data-rm="${r.id}">
          <div class="rm-head">
            <div class="avatar" style="background:var(--${v})">${r.name[0]}</div>
            <div class="rm-name">${r.name}</div>
            <span class="rm-level ${lvl.cls}">${lvl.name}</span>
          </div>
          <div class="aff-bar"><div class="aff-fill" style="width:${r.affection}%;background:var(--${v})"></div></div>
          <div class="aff-meta"><span>好感度</span><b>${r.affection}</b></div>
        </div>`;
      }).join("");
    }
  }

  function formatEffects(effects){
    if(!effects) return "无";
    if(effects.all !== undefined) return `全员 ${effects.all > 0 ? "+" : ""}${effects.all}`;
    return Object.entries(effects).map(([id,v]) => {
      const r = DATA.ROOMMATES.find(x => x.id === id);
      return `${r ? r.name : id} ${v > 0 ? "+" : ""}${v}`;
    }).join("，");
  }

  function renderDebug(){
    const ev = getCurrentEvent();
    let optsHtml = "";
    if(ev){
      if(ev.branch){
        const br = ev.branches[player.triggeredRoommateEvent];
        const introLen = (br && br.intro) ? br.intro.length : 0;
        let phaseDesc = "—";
        if(player.eventPhase === "intro" && introLen > 0) phaseDesc = `分段 intro（${player.paraIndex + 1}/${introLen}）`;
        else if(player.eventPhase === "choice") phaseDesc = "选项阶段";
        else if(player.eventPhase === "consequence") phaseDesc = `后果阶段（已选 ${player.chosenOption}）`;
        optsHtml = `<div class="ttl">当前事件：${ev.title}（${player.triggeredRoommateEvent?roommateName(player.triggeredRoommateEvent)+"分支":"未判定"}） · ${phaseDesc}</div>` +
          (br ? `<div class="opt-line"><b>A.</b> ${br.optionA.text} <span style="color:var(--accent)">[effects：${formatEffects(br.optionA.effects)}]</span></div><div class="opt-line"><b>B.</b> ${br.optionB.text} <span style="color:var(--accent)">[effects：${formatEffects(br.optionB.effects)}]</span></div>` : `<div class="opt-line">（事件09未触发，待跳过）</div>`);
      } else if(ev.noChoice){
        const phaseInfo = ev.intro ? `分段 intro（${player.paraIndex + 1}/${ev.intro.length}）→ 进入结局判定` : "无 A/B → 进入结局判定";
        optsHtml = `<div class="ttl">当前事件：${ev.title}</div><div class="opt-line">${phaseInfo}</div>`;
      } else {
        let phaseDesc = "—";
        if(player.eventPhase === "intro" && ev.intro) phaseDesc = `分段 intro（${player.paraIndex + 1}/${ev.intro.length}）`;
        else if(player.eventPhase === "choice") phaseDesc = "选项阶段";
        else if(player.eventPhase === "consequence") phaseDesc = `后果阶段（已选 ${player.chosenOption}）`;
        optsHtml = `<div class="ttl">当前事件：${ev.title} · ${phaseDesc}</div>` +
          `<div class="opt-line"><b>A.</b> ${ev.optionA.text} <span style="color:var(--accent)">[effects：${formatEffects(ev.optionA.effects)}]</span></div><div class="opt-line"><b>B.</b> ${ev.optionB.text} <span style="color:var(--accent)">[effects：${formatEffects(ev.optionB.effects)}]</span></div>`;
      }
    }
    const html = `
      <div class="debug-row"><span class="k">当前 State</span><span class="v">${player.currentState}</span></div>
      <div class="debug-row"><span class="k">当前事件ID</span><span class="v">${player.currentEventId}</span></div>
      <div class="debug-row"><span class="k">当前玩家</span><span class="v">${player.name}</span></div>
      <div class="debug-row"><span class="k">游戏天数</span><span class="v">${player.day}</span></div>
      <div class="debug-row"><span class="k">事件阶段</span><span class="v">${player.eventPhase}</span></div>
      <div class="debug-row"><span class="k">段落索引</span><span class="v">${player.paraIndex}</span></div>
      <div class="debug-row"><span class="k">已选选项</span><span class="v">${player.chosenOption || "（未选）"}</span></div>
      <div class="debug-block"><div class="ttl">室友好感度</div>
        ${DATA.ROOMMATES.map(r => `<div class="debug-aff ${DATA.COLOR_VAR[r.id]}"><span class="n">${r.name}</span><span class="num">${r.affection}</span></div>`).join("")}
      </div>
      <div class="debug-block"><div class="ttl">keyChoices</div><div class="opt-line">${player.keyChoices.length ? player.keyChoices.join("， ") : "（无）"}</div></div>
      <div class="debug-block"><div class="ttl">已触发专属关系事件</div><div class="opt-line">${player.triggeredRoommateEvent ? roommateName(player.triggeredRoommateEvent) : "（无）"}</div></div>
      <div class="debug-block"><div class="ttl">endingId</div><div class="opt-line">${player.endingId || "（未进入结局）"}</div></div>
      <div class="debug-opts">${optsHtml}</div>`;
    document.getElementById("debugPanel").innerHTML = html;
    const rightView = document.getElementById("rightDebugView");
    if(rightView) rightView.innerHTML = html;
  }

  function renderDrawerProgress(){
    const ev = getCurrentEvent();
    const txt = player.currentState === "ENDING"
      ? "已通关 · " + (DATA.ENDINGS[player.endingId] ? DATA.ENDINGS[player.endingId].badge : "")
      : "第 " + player.day + " 天 · 事件 " + pad(ev ? ev.idx : player.day) + " / 12";
    document.getElementById("drawerProgress").textContent = txt;
  }

  function render(){
    setState(player.currentState);
    renderChapter();
    if(player.currentState === "DORM")   renderDorm();
    if(player.currentState === "EVENT")  renderEvent();
    if(player.currentState === "ENDING") renderEnding();
    renderRoommates();
    renderDebug();
    renderDrawerProgress();
  }

  /* ---------- 暴露给外部（按钮绑定需要） ---------- */
  function initGame(name){
    store.resetPlayer(player, name);
    skipNotice = null;
  }

  /* ---------- Drawer 行为 ---------- */
  function bindDrawer(){
    const drawer = document.getElementById("drawer");
    const drawerMask = document.getElementById("drawerMask");
    function openDrawer(){ drawer.classList.add("open"); drawerMask.classList.add("show"); }
    function closeDrawer(){ drawer.classList.remove("open"); drawerMask.classList.remove("show"); }
    /* 顶栏目录按钮（阶段 2 升级为 icon-btn，但 id 仍为 menuBtn） */
    const menuBtn = document.getElementById("menuBtn");
    if(menuBtn) menuBtn.addEventListener("click", openDrawer);
    /* 兼容旧 menuBtnLegacy（隐藏） */
    const menuBtnLegacy = document.getElementById("menuBtnLegacy");
    if(menuBtnLegacy) menuBtnLegacy.addEventListener("click", openDrawer);
    document.getElementById("closeDrawerBtn").addEventListener("click", closeDrawer);
    drawerMask.addEventListener("click", closeDrawer);
    document.addEventListener("keydown", e => { if(e.key === "Escape") closeDrawer(); });

    /* 阶段 2 新增：抽屉分类导航切换 */
    const navItems = drawer.querySelectorAll(".drawer-nav-item");
    const panels = drawer.querySelectorAll(".drawer-panel");
    navItems.forEach(item => {
      item.addEventListener("click", () => {
        const target = item.dataset.panel;
        navItems.forEach(n => n.classList.toggle("active", n.dataset.panel === target));
        panels.forEach(p => p.classList.toggle("active", p.dataset.panel === target));
      });
    });

    /* 阶段 2 新增：顶栏图标按钮（音效/设置/成就）—— 阶段 2 仅切换抽屉到对应分类 */
    const audioToggleBtn = document.getElementById("audioToggleBtn");
    if(audioToggleBtn){
      audioToggleBtn.addEventListener("click", () => {
        /* 阶段 4 实现音效切换；阶段 2 仅切换图标视觉 */
        const isOn = audioToggleBtn.dataset.on !== "false";
        audioToggleBtn.dataset.on = String(!isOn);
        audioToggleBtn.classList.toggle("is-on", !isOn);
      });
    }
    const settingsBtn = document.getElementById("settingsBtn");
    if(settingsBtn){
      settingsBtn.addEventListener("click", () => {
        openDrawer();
        const settingsNav = drawer.querySelector('.drawer-nav-item[data-panel="settings"]');
        if(settingsNav) settingsNav.click();
      });
    }
    const achievementsBtn = document.getElementById("achievementsBtn");
    if(achievementsBtn){
      achievementsBtn.addEventListener("click", () => {
        openDrawer();
        const achNav = drawer.querySelector('.drawer-nav-item[data-panel="achievements"]');
        if(achNav) achNav.click();
      });
    }

    function bindToggle(toggleId, bodyId){
      const t = document.getElementById(toggleId), b = document.getElementById(bodyId);
      if(!t || !b) return;
      t.addEventListener("click", () => {
        const open = b.classList.toggle("open"); t.classList.toggle("open", open);
      });
    }
    bindToggle("toggleRoommates", "roommateSection");
    bindToggle("toggleDebug", "debugSection");
    return { openDrawer, closeDrawer };
  }

  /* ============================================================
     功能 2 & 3：Right Sidebar 绑定 + 角色肖像系统（SVG）
     ============================================================ */
  function generatePortraitSVG(id){
    // 所有肖像基于 viewBox 0 0 200 200，纯 SVG 绘制，风格统一（圆润线条 + 大卡通眼）
    switch(id){
      case "lin": // 林小满 — 暖橙，双丸子头，元气笑
        return `<defs><radialGradient id="gLin" cx="50%" cy="42%" r="60%"><stop offset="0%" stop-color="#FFE1B3"/><stop offset="100%" stop-color="#F4B36A"/></radialGradient></defs>
          <circle cx="100" cy="100" r="92" fill="url(#gLin)" opacity="0.35"/>
          <!-- 脸 -->
          <ellipse cx="100" cy="110" rx="60" ry="66" fill="#FBE9CF"/>
          <!-- 双丸子 -->
          <circle cx="52" cy="74" r="22" fill="#B2652B"/>
          <circle cx="148" cy="74" r="22" fill="#B2652B"/>
          <!-- 头发前刘海 -->
          <path d="M42 96 Q100 42 158 96 Q140 74 100 68 Q60 74 42 96 Z" fill="#C47A36"/>
          <!-- 耳朵 -->
          <ellipse cx="45" cy="118" rx="6" ry="9" fill="#F2D2AE"/>
          <ellipse cx="155" cy="118" rx="6" ry="9" fill="#F2D2AE"/>
          <!-- 腮红 -->
          <circle cx="70" cy="126" r="7" fill="#FBBAA1" opacity="0.85"/>
          <circle cx="130" cy="126" r="7" fill="#FBBAA1" opacity="0.85"/>
          <!-- 眼睛（弯月笑眼） -->
          <path d="M72 114 Q80 104 88 114" stroke="#4C2E17" stroke-width="3.5" fill="none" stroke-linecap="round"/>
          <path d="M112 114 Q120 104 128 114" stroke="#4C2E17" stroke-width="3.5" fill="none" stroke-linecap="round"/>
          <!-- 眉毛 -->
          <path d="M68 102 Q78 96 88 100" stroke="#7A4A22" stroke-width="3" fill="none" stroke-linecap="round"/>
          <path d="M112 100 Q122 96 132 102" stroke="#7A4A22" stroke-width="3" fill="none" stroke-linecap="round"/>
          <!-- 鼻子 -->
          <path d="M100 124 Q100 129 95 131" stroke="#D69E70" stroke-width="2" fill="none" stroke-linecap="round"/>
          <!-- 嘴（大笑露齿） -->
          <path d="M84 140 Q100 156 116 140 Z" fill="#B45C3C"/>
          <rect x="88" y="140" width="24" height="6" rx="1.5" fill="#FFF8E8"/>
          <!-- 发饰小黄花 -->
          <circle cx="154" cy="60" r="5" fill="#F7D15B"/>
          <circle cx="154" cy="60" r="1.6" fill="#C48A00"/>`;
      case "su": // 苏晚晴 — 冷绿，直长发 + 圆框眼镜，冷静
        return `<defs><radialGradient id="gSu" cx="50%" cy="42%" r="60%"><stop offset="0%" stop-color="#D7ECE0"/><stop offset="100%" stop-color="#8FB8A6"/></radialGradient></defs>
          <circle cx="100" cy="100" r="92" fill="url(#gSu)" opacity="0.35"/>
          <!-- 长直发后 -->
          <path d="M48 72 Q42 120 52 178 L148 178 Q158 120 152 72 Z" fill="#35584A"/>
          <!-- 脸 -->
          <ellipse cx="100" cy="110" rx="60" ry="66" fill="#FBE9CF"/>
          <!-- 刘海 -->
          <path d="M46 92 Q100 46 154 92 Q130 74 100 70 Q70 74 46 92 Z" fill="#446657"/>
          <path d="M50 90 Q56 70 62 88" stroke="#446657" stroke-width="2" fill="none"/>
          <path d="M150 90 Q144 70 138 88" stroke="#446657" stroke-width="2" fill="none"/>
          <!-- 耳朵 -->
          <ellipse cx="45" cy="118" rx="6" ry="9" fill="#F2D2AE"/>
          <ellipse cx="155" cy="118" rx="6" ry="9" fill="#F2D2AE"/>
          <!-- 圆框眼镜 -->
          <circle cx="78" cy="116" r="15" fill="none" stroke="#2C4438" stroke-width="2.6"/>
          <circle cx="122" cy="116" r="15" fill="none" stroke="#2C4438" stroke-width="2.6"/>
          <line x1="93" y1="116" x2="107" y2="116" stroke="#2C4438" stroke-width="2.6"/>
          <!-- 眼睛（冷静杏眼） -->
          <ellipse cx="78" cy="116" rx="3" ry="4.6" fill="#1F2B26"/>
          <ellipse cx="122" cy="116" rx="3" ry="4.6" fill="#1F2B26"/>
          <circle cx="79" cy="114" r="1.2" fill="#fff"/>
          <circle cx="123" cy="114" r="1.2" fill="#fff"/>
          <!-- 细眉 -->
          <line x1="68" y1="99" x2="86" y2="98" stroke="#32473D" stroke-width="2.4" stroke-linecap="round"/>
          <line x1="114" y1="98" x2="132" y2="99" stroke="#32473D" stroke-width="2.4" stroke-linecap="round"/>
          <!-- 鼻子 -->
          <line x1="100" y1="124" x2="100" y2="132" stroke="#D69E70" stroke-width="2" stroke-linecap="round"/>
          <!-- 嘴（浅笑） -->
          <path d="M88 146 Q100 152 112 146" stroke="#A85C4D" stroke-width="2.6" fill="none" stroke-linecap="round"/>
          <!-- 腮红淡 -->
          <circle cx="66" cy="134" r="5" fill="#FBBAA1" opacity="0.6"/>
          <circle cx="134" cy="134" r="5" fill="#FBBAA1" opacity="0.6"/>
          <!-- 耳边发梢微卷 -->
          <path d="M48 116 Q42 140 54 154" stroke="#35584A" stroke-width="2.6" fill="none" stroke-linecap="round"/>
          <path d="M152 116 Q158 140 146 154" stroke="#35584A" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
      case "shen": // 沈星河 — 紫色，双马尾 + 星星发夹，神秘小俏皮
        return `<defs><radialGradient id="gShen" cx="50%" cy="42%" r="60%"><stop offset="0%" stop-color="#E7DDF6"/><stop offset="100%" stop-color="#9883C4"/></radialGradient></defs>
          <circle cx="100" cy="100" r="92" fill="url(#gShen)" opacity="0.35"/>
          <!-- 双马尾后 -->
          <path d="M50 96 Q32 140 40 186 L62 186 Q52 146 56 114 Z" fill="#4E3F79"/>
          <path d="M150 96 Q168 140 160 186 L138 186 Q148 146 144 114 Z" fill="#4E3F79"/>
          <!-- 脸 -->
          <ellipse cx="100" cy="110" rx="60" ry="66" fill="#FBE9CF"/>
          <!-- 头发 -->
          <path d="M44 94 Q100 42 156 94 Q136 72 100 68 Q64 72 44 94 Z" fill="#5E4E92"/>
          <!-- 刘海分缝 -->
          <path d="M100 68 Q98 84 110 96" stroke="#7D68B4" stroke-width="2" fill="none" opacity="0.6"/>
          <!-- 耳朵 -->
          <ellipse cx="45" cy="118" rx="6" ry="9" fill="#F2D2AE"/>
          <ellipse cx="155" cy="118" rx="6" ry="9" fill="#F2D2AE"/>
          <!-- 星星发夹 -->
          <path d="M52 70 L54 75 L59 76 L55 79 L56 84 L52 81 L48 84 L49 79 L45 76 L50 75 Z" fill="#F0C14B"/>
          <path d="M148 70 L150 75 L155 76 L151 79 L152 84 L148 81 L144 84 L145 79 L141 76 L146 75 Z" fill="#F0C14B"/>
          <!-- 眼睛（大圆猫眼） -->
          <ellipse cx="78" cy="116" rx="7.4" ry="9.5" fill="#2F234F"/>
          <ellipse cx="122" cy="116" rx="7.4" ry="9.5" fill="#2F234F"/>
          <circle cx="80.5" cy="112.5" r="2.6" fill="#fff"/>
          <circle cx="124.5" cy="112.5" r="2.6" fill="#fff"/>
          <circle cx="75.5" cy="119.5" r="1.2" fill="#fff" opacity="0.6"/>
          <circle cx="119.5" cy="119.5" r="1.2" fill="#fff" opacity="0.6"/>
          <!-- 眉 -->
          <path d="M66 99 Q78 93 90 99" stroke="#463478" stroke-width="2.4" fill="none" stroke-linecap="round"/>
          <path d="M110 99 Q122 93 134 99" stroke="#463478" stroke-width="2.4" fill="none" stroke-linecap="round"/>
          <!-- 鼻子 -->
          <path d="M100 126 Q100 131 95 133" stroke="#D69E70" stroke-width="1.8" fill="none" stroke-linecap="round"/>
          <!-- 嘴（w 小俏皮） -->
          <path d="M86 144 Q92 152 100 148 Q108 152 114 144" stroke="#974A72" stroke-width="2.6" fill="none" stroke-linecap="round"/>
          <!-- 腮红 -->
          <circle cx="68" cy="132" r="6" fill="#FBBAA1" opacity="0.75"/>
          <circle cx="132" cy="132" r="6" fill="#FBBAA1" opacity="0.75"/>
          <!-- 马尾丝带 -->
          <rect x="36" y="112" width="14" height="5" rx="2" fill="#B58AD0"/>
          <rect x="150" y="112" width="14" height="5" rx="2" fill="#B58AD0"/>`;
      case "gu": // 顾清欢 — 红粉，优雅卷发 + 蝴蝶结，精致
        return `<defs><radialGradient id="gGu" cx="50%" cy="42%" r="60%"><stop offset="0%" stop-color="#F9DEDA"/><stop offset="100%" stop-color="#D7948B"/></radialGradient></defs>
          <circle cx="100" cy="100" r="92" fill="url(#gGu)" opacity="0.35"/>
          <!-- 后发（卷） -->
          <path d="M46 82 Q32 130 50 182 Q72 168 100 176 Q128 168 150 182 Q168 130 154 82 Q130 58 100 58 Q70 58 46 82 Z" fill="#7A3B42"/>
          <!-- 脸 -->
          <ellipse cx="100" cy="110" rx="60" ry="66" fill="#FBE9CF"/>
          <!-- 刘海卷 -->
          <path d="M46 92 Q62 68 86 74 Q96 60 100 76 Q104 60 114 74 Q138 68 154 92 Q126 66 100 66 Q74 66 46 92 Z" fill="#8A4A51"/>
          <path d="M58 82 Q52 96 60 100" stroke="#6A343A" stroke-width="2" fill="none" stroke-linecap="round"/>
          <path d="M142 82 Q148 96 140 100" stroke="#6A343A" stroke-width="2" fill="none" stroke-linecap="round"/>
          <!-- 耳朵 -->
          <ellipse cx="45" cy="118" rx="6" ry="9" fill="#F2D2AE"/>
          <ellipse cx="155" cy="118" rx="6" ry="9" fill="#F2D2AE"/>
          <!-- 蝴蝶结 -->
          <path d="M48 66 L30 54 L34 74 L50 68 Z" fill="#C96666"/>
          <path d="M48 66 L30 82 L34 62 L50 68 Z" fill="#C96666"/>
          <circle cx="48" cy="68" r="4" fill="#8B3A3A"/>
          <!-- 眼（精致桃形眼线） -->
          <path d="M70 114 Q78 106 90 112 Q85 122 78 122 Q72 118 70 114 Z" fill="#3D1E25"/>
          <path d="M110 112 Q122 106 130 114 Q128 118 122 122 Q115 122 110 112 Z" fill="#3D1E25"/>
          <circle cx="79" cy="114" r="2.2" fill="#fff"/>
          <circle cx="122" cy="114" r="2.2" fill="#fff"/>
          <!-- 眼线尾部 -->
          <path d="M69 115 Q62 116 64 122" stroke="#6A343A" stroke-width="2" fill="none" stroke-linecap="round"/>
          <path d="M131 115 Q138 116 136 122" stroke="#6A343A" stroke-width="2" fill="none" stroke-linecap="round"/>
          <!-- 眉（弯弧） -->
          <path d="M66 99 Q78 93 90 99" stroke="#6A343A" stroke-width="2.4" fill="none" stroke-linecap="round"/>
          <path d="M110 99 Q122 93 134 99" stroke="#6A343A" stroke-width="2.4" fill="none" stroke-linecap="round"/>
          <!-- 鼻子 -->
          <path d="M100 126 Q100 131 95 133" stroke="#D69E70" stroke-width="1.8" fill="none" stroke-linecap="round"/>
          <!-- 嘴（樱桃） -->
          <path d="M88 144 Q100 156 112 144 Q100 150 88 144 Z" fill="#C05364"/>
          <path d="M90 144 Q100 140 110 144" stroke="#8B3A44" stroke-width="1.2" fill="none"/>
          <!-- 腮红高光 -->
          <circle cx="68" cy="130" r="6" fill="#FBBAA1" opacity="0.8"/>
          <circle cx="132" cy="130" r="6" fill="#FBBAA1" opacity="0.8"/>
          <circle cx="70" cy="128" r="1.6" fill="#fff" opacity="0.6"/>
          <circle cx="134" cy="128" r="1.6" fill="#fff" opacity="0.6"/>`;
      case "narr": // 旁白 — 404 寝室 LOGO
      default:
        return `<defs><linearGradient id="gN" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#FFE2C2"/><stop offset="100%" stop-color="#F4C19B"/></linearGradient></defs>
          <circle cx="100" cy="100" r="90" fill="url(#gN)" opacity="0.5"/>
          <rect x="54" y="74" width="92" height="78" rx="10" fill="#FFF3E2" stroke="#B07B4F" stroke-width="2.4"/>
          <rect x="60" y="82" width="26" height="24" rx="2" fill="#F2CF98"/>
          <rect x="90" y="82" width="20" height="24" rx="2" fill="#E2B378"/>
          <rect x="116" y="82" width="24" height="24" rx="2" fill="#F2CF98"/>
          <rect x="60" y="114" width="30" height="30" rx="2" fill="#E2B378"/>
          <rect x="96" y="114" width="18" height="30" rx="2" fill="#C48C52"/>
          <rect x="120" y="114" width="24" height="30" rx="2" fill="#E2B378"/>
          <text x="100" y="172" text-anchor="middle" font-family="ZCOOL KuaiLe, sans-serif" font-size="18" fill="#7A4A22" font-weight="700">404</text>
          <!-- 小树 -->
          <path d="M24 120 L28 100 L32 120 Z" fill="#7BA98B"/>
          <path d="M36 124 L40 102 L44 124 Z" fill="#6D9B7D"/>
          <rect x="32" y="118" width="4" height="10" fill="#8E643B"/>
          <!-- 四小头像（代表室友） -->
          <circle cx="36" cy="60" r="10" fill="#F4B36A"/>
          <circle cx="64" cy="42" r="10" fill="#8FB8A6"/>
          <circle cx="136" cy="42" r="10" fill="#9883C4"/>
          <circle cx="164" cy="60" r="10" fill="#D7948B"/>`;
    }
  }

  let _lastPortraitId = null;
  function setPortrait(id, speakNow){
    const frame = document.getElementById("portraitFrame");
    const svgEl = document.getElementById("portraitSvg");
    const nameEl  = document.getElementById("portraitName");
    if(!frame || !svgEl || !nameEl) return;
    const finalId = id || "narr";
    if(finalId === _lastPortraitId){
      if(speakNow){
        frame.classList.remove("is-speaking");
        void frame.offsetWidth;
        frame.classList.add("is-speaking");
      }
      return;
    }
    // 平滑切换：先渐隐，切换内容，再渐显
    frame.classList.add("is-switching");
    frame.setAttribute("data-c", finalId);
    setTimeout(() => {
      svgEl.innerHTML = generatePortraitSVG(finalId);
      if(finalId === "narr"){
        nameEl.textContent = "404 寝室";
      } else {
        const r = DATA.ROOMMATES.find(x => x.id === finalId);
        nameEl.textContent = r ? r.name : "404 寝室";
      }
      frame.classList.remove("is-switching");
      _lastPortraitId = finalId;
      if(speakNow){
        frame.classList.remove("is-speaking");
        void frame.offsetWidth;
        frame.classList.add("is-speaking");
      }
    }, 220);
  }

  function detectSpeaker(text){
    if(!text) return "narr";
    const s = String(text);
    // 优先匹配对话前缀模式："姓名："、"姓名说"、"（姓名）"
    const patterns = [];
    DATA.ROOMMATES.forEach(r => {
      patterns.push({ id:r.id, rx: new RegExp("(^|[\\s（『「\"'，。])" + r.name + "\\s*[:：]") });
      patterns.push({ id:r.id, rx: new RegExp("（" + r.name + "）") });
      patterns.push({ id:r.id, rx: new RegExp("^" + r.name) });
      if(r.nickname){
        patterns.push({ id:r.id, rx: new RegExp("(^|[\\s（『「\"'，。])" + r.nickname + "\\s*[:：]") });
      }
    });
    for(const p of patterns){ if(p.rx.test(s)) return p.id; }
    // 次优：文本中出现的第一个角色名
    for(const r of DATA.ROOMMATES){
      if(s.includes(r.name)) return r.id;
      if(r.nickname && s.includes(r.nickname)) return r.id;
    }
    // 无室友时：识别主角"你"说话（允许中间夹 HTML 标签，如 <span>你</span>：）
    if(/(^|[\s（『「"'，。])你\s*(?:<[^>]+>)?\s*[:：]/.test(s)) return "you";
    return "narr";
  }

  /* ============================================================
     场景背景切换（纯视觉层）
     ------------------------------------------------------------
     规则：只读取 player.currentEventId 决定 .event-bg 的
     background-image，不参与任何剧情推进：
       - 不 return 剧情函数 / 不阻止 render
       - 不调用 continueEvent / triggerEvent / advanceToNextEvent
       - 不修改 eventPhase / paraIndex / chosenOption /
         currentState / currentEventId
     背景图加载失败仅 console.warn，剧情照常运行。
     未配置的事件：清除 inline 背景，回落 CSS 默认背景。
     ============================================================ */
  const EVENT_BG_MAP = {
    event_02: "bg/bath.png",
    event_03: "bg/canteen.png",
    event_07: "bg/dorm-night.png",
    event_12: "bg/downstairs-night.png"
  };
  function updateEventBackground(){
    const bg = document.querySelector(".event-view .event-bg");
    if(!bg) return;
    const url = EVENT_BG_MAP[player.currentEventId] || "";
    const tag = url || "default";
    if(bg.dataset.eventBg === tag) return;   /* 已是目标背景，无需重复处理 */
    if(url){
      /* 预加载探针：失败只警告，不阻断剧情、不显示占位 */
      const probe = new Image();
      probe.onerror = () => console.warn("[背景] 背景图片加载失败：" + url + "（剧情继续正常运行）");
      probe.src = url;
      bg.style.backgroundImage = 'url("' + url + '")';
      bg.dataset.eventBg = url;
    } else {
      /* 非配置事件：清除 inline 背景，回落 CSS 默认背景 */
      bg.style.backgroundImage = "";
      bg.dataset.eventBg = "default";
    }
  }

  /* ============================================================
     AVG 角色立绘系统（阶段视觉升级 2·人物立绘）
     - 谁说话显示谁；旁白 / 404寝室 / 系统文字 / 玩家内心 → 不显示
     - 结构预留双人物同屏：_activeSlot 当前固定 "right"，
       未来扩展双人物时改为 left/right 双槽同时驱动即可
     - 图片缺失时 onerror 优雅隐藏立绘，不影响游戏运行
     ============================================================ */
  const CHAR_SPRITES = {
    linxiaoman: "char/lin.png",   // 林小满
    suwanqing:  "char/su.png",    // 苏晚晴
    shenxinghe: "char/shen.png",    // 沈星河
    guqinghuan: "char/gu.png",    // 顾清欢
    you:        "char/you.png"       // 主角（暂时不显示，仅占位映射）
  };
  let _activeSlot = "right"; /* 当前主位：右侧（预留 "left" 扩展） */
  let _lastCharId = null;    /* 上一位显示的室友 id（旁白时保持显示） */
  function resetLastChar(){ _lastCharId = null; }

  function getSlotEl(slot){
    return document.getElementById(slot === "left" ? "charSlotLeft" : "charSlotRight");
  }
  function ensureSlotImg(slotEl){
    if(!slotEl) return null;
    let img = slotEl.querySelector("img");
    if(img) return img;
    img = document.createElement("img");
    img.alt = "";
    img.decoding = "async";
    img.addEventListener("load", () => { img.classList.add("is-loaded"); });
    img.addEventListener("error", () => {
      /* 图片缺失：优雅隐藏该立绘位，游戏继续 */
      img.classList.remove("is-loaded");
      slotEl.setAttribute("data-active", "false");
    });
    slotEl.appendChild(img);
    return img;
  }
  /* 显示/切换立绘：
     - 室友 id → 显示对应立绘，记录为上一位
     - "you"   → 不显示主角立绘（第一人称），不改变上一位
     - "narr"  → 保持上一位室友立绘；无则不显示
  */
  function showCharacterSprite(id){
    const stage = document.getElementById("charStage");
    if(!stage) return;
    const slot = getSlotEl(_activeSlot);
    if(!slot) return;

    /* 主角"你"说话：不显示主角立绘，也不改变上一位人物 */
    if(id === "you"){
      slot.setAttribute("data-active", "false");
      slot.setAttribute("data-char", "");
      return;
    }

    /* 旁白：保持上一位室友立绘；若无明确人物则不显示 */
    if(id === "narr"){
      if(_lastCharId && CHAR_SPRITES[_lastCharId]){
        const img = ensureSlotImg(slot);
        if(img){
          if(img.getAttribute("data-char") !== _lastCharId){
            img.classList.remove("is-loaded");
            img.setAttribute("data-char", _lastCharId);
            img.src = CHAR_SPRITES[_lastCharId];
          } else if(img.complete){
            img.classList.add("is-loaded");
          }
        }
        slot.setAttribute("data-active", "true");
        slot.setAttribute("data-char", _lastCharId);
      } else {
        slot.setAttribute("data-active", "false");
        slot.setAttribute("data-char", "");
      }
      return;
    }

    /* 室友说话：显示对应立绘 */
    const src = CHAR_SPRITES[id];
    if(!src){
      slot.setAttribute("data-active", "false");
      slot.setAttribute("data-char", "");
      return;
    }
    _lastCharId = id;
    const img = ensureSlotImg(slot);
    if(!img) return;
    if(img.getAttribute("data-char") !== id){
      img.classList.remove("is-loaded");   /* 触发 0.2s 淡入 */
      img.setAttribute("data-char", id);
      img.src = src;
    } else if(img.complete && !img.classList.contains("is-loaded")){
      img.classList.add("is-loaded");      /* 缓存命中时立即显示 */
    }
    slot.setAttribute("data-active", "true");
    slot.setAttribute("data-char", id);
  }
  function hideCharacterSprites(){
    ["charSlotLeft","charSlotRight"].forEach(sid => {
      const s = document.getElementById(sid);
      if(s){ s.setAttribute("data-active", "false"); }
    });
  }
  function preloadCharSprites(){
    Object.values(CHAR_SPRITES).forEach(src => {
      const i = new Image();
      i.src = src;
    });
  }

  function bindRightSidebar(){
    const bar = document.getElementById("rightSidebar");
    if(!bar) return;
    // 1) 初始化状态：平板/移动默认收起；桌面默认展开
    const isDesktop = window.matchMedia && window.matchMedia("(min-width:1024px)").matches;
    const wantOpen = isDesktop;
    bar.setAttribute("data-open", String(wantOpen));
    window.addEventListener("resize", () => {
      const d = window.matchMedia("(min-width:1024px)").matches;
      if(d && bar.getAttribute("data-open") === null){
        bar.setAttribute("data-open", "true");
      }
    });
    // 2) 外层 toggle
    const toggle = document.getElementById("rightSidebarToggle");
    if(toggle){
      toggle.addEventListener("click", () => {
        const cur = bar.getAttribute("data-open") !== "false";
        bar.setAttribute("data-open", String(!cur));
      });
    }
    // 3) 内部 section 折叠
    bar.querySelectorAll(".sidebar-section").forEach(sec => {
      const hd = sec.querySelector(".section-hd");
      if(!hd) return;
      hd.addEventListener("click", (e) => {
        e.stopPropagation();
        const sel = hd.getAttribute("data-toggle-target");
        const bd = sel ? bar.querySelector(sel) : sec.querySelector(".section-bd");
        if(!bd) return;
        const open = bd.classList.toggle("open");
        sec.setAttribute("data-open", String(open));
      });
    });
    // 4) 初始肖像
    setPortrait("narr", false);
  }

  /* ---------- 按钮事件绑定 ---------- */
  function bindButtons(){
    document.getElementById("triggerEventBtn").addEventListener("click", triggerEvent);
    document.getElementById("endingRestartBtn").addEventListener("click", () => {
      store.clear(); initGame("陈念"); showWelcome(false);
    });
  }

  /* ---------- Welcome / 开始 / 重新开始 ---------- */
  function hasSaveData(){
    try {
      return !!(store.safeGetItem("wxhxq_save_v2") || store.safeGetItem("wxhxq_save_v1"));
    } catch(e){ return false; }
  }
  function updateLoadBtnState(){
    const loadBtn = document.getElementById("loadBtn");
    const loadBtnSub = document.getElementById("loadBtnSub");
    if(!loadBtn) return;
    const has = hasSaveData();
    loadBtn.disabled = !has;
    if(loadBtnSub) loadBtnSub.textContent = has ? "继续上次进度" : "无存档";
  }
  function showWelcome(canResume){
    const welcome = document.getElementById("welcome");
    welcome.classList.add("show");
    /* 兼容旧结构（隐藏的 resume 卡片，保留 ID 引用） */
    const wr = document.getElementById("welcomeResume");
    if(wr) wr.style.display = canResume ? "block" : "none";
    /* 重置模态状态 */
    const nameModal = document.getElementById("nameModal");
    const helpModal = document.getElementById("helpModal");
    if(nameModal) nameModal.setAttribute("data-open", "false");
    if(helpModal) helpModal.setAttribute("data-open", "false");
    /* 更新"读取进度"按钮可用状态 */
    updateLoadBtnState();
    /* 清空输入框，避免上次输入残留 */
    const welcomeName = document.getElementById("welcomeName");
    if(welcomeName) welcomeName.value = "";
    /* 默认聚焦"开始剧情"按钮 */
    const startBtn = document.getElementById("startBtn");
    setTimeout(() => { if(startBtn) startBtn.focus(); }, 80);
  }

  function bindWelcome(){
    const welcome = document.getElementById("welcome");
    const welcomeName = document.getElementById("welcomeName");
    const startBtn = document.getElementById("startBtn");
    const loadBtn  = document.getElementById("loadBtn");
    const helpBtn  = document.getElementById("helpBtn");
    const enterBtn = document.getElementById("enterBtn");
    const nameCancelBtn  = document.getElementById("nameCancelBtn");
    const helpCloseBtn  = document.getElementById("helpCloseBtn");
    const nameModal = document.getElementById("nameModal");
    const helpModal = document.getElementById("helpModal");

    function openNameModal(){
      if(helpModal) helpModal.setAttribute("data-open", "false");
      if(nameModal) nameModal.setAttribute("data-open", "true");
      setTimeout(() => { if(welcomeName) welcomeName.focus(); }, 80);
    }
    function closeNameModal(){ if(nameModal) nameModal.setAttribute("data-open", "false"); }
    function openHelpModal(){ if(helpModal) helpModal.setAttribute("data-open", "true"); }
    function closeHelpModal(){ if(helpModal) helpModal.setAttribute("data-open", "false"); }

    /* 开始剧情 → 弹出输入名字小模态 */
    if(startBtn){
      startBtn.addEventListener("click", openNameModal);
    }
    /* 读取进度 → 加载存档并进入游戏 */
    if(loadBtn){
      loadBtn.addEventListener("click", () => {
        if(loadBtn.disabled) return;
        const ok = store.load(player);
        if(ok){
          welcome.classList.remove("show");
          closeNameModal(); closeHelpModal();
          const drawer = document.getElementById("drawer");
          const drawerMask = document.getElementById("drawerMask");
          if(drawer) drawer.classList.remove("open");
          if(drawerMask) drawerMask.classList.remove("show");
          render();
        } else {
          /* 兜底：存档读取失败，禁用按钮 */
          updateLoadBtnState();
        }
      });
    }
    /* 游戏说明 → 弹出说明模态 */
    if(helpBtn){
      helpBtn.addEventListener("click", openHelpModal);
    }
    if(helpCloseBtn){
      helpCloseBtn.addEventListener("click", closeHelpModal);
    }
    /* 名字模态：确认 → 用输入名字初始化游戏 */
    if(enterBtn){
      enterBtn.addEventListener("click", () => {
        const name = ((welcomeName && welcomeName.value) || "陈念").trim() || "陈念";
        initGame(name); store.save(player);
        welcome.classList.remove("show");
        closeNameModal(); closeHelpModal();
        const drawer = document.getElementById("drawer");
        const drawerMask = document.getElementById("drawerMask");
        if(drawer) drawer.classList.remove("open");
        if(drawerMask) drawerMask.classList.remove("show");
        render();
      });
    }
    if(nameCancelBtn){
      nameCancelBtn.addEventListener("click", closeNameModal);
    }
    if(welcomeName){
      welcomeName.addEventListener("keydown", e => {
        if(e.key === "Enter"){ e.preventDefault(); if(enterBtn) enterBtn.click(); }
        else if(e.key === "Escape"){ closeNameModal(); }
      });
    }
    /* helpModal 键盘关闭 */
    document.addEventListener("keydown", e => {
      if(e.key === "Escape" && helpModal && helpModal.getAttribute("data-open") === "true"){
        closeHelpModal();
      }
    });

    /* 旧结构兼容：drawerRestartBtn → 清存档 + 回封面 */
    const drawerRestartBtn = document.getElementById("drawerRestartBtn");
    if(drawerRestartBtn){
      drawerRestartBtn.addEventListener("click", () => {
        store.clear(); initGame("陈念");
        const drawer = document.getElementById("drawer");
        const drawerMask = document.getElementById("drawerMask");
        if(drawer) drawer.classList.remove("open");
        if(drawerMask) drawerMask.classList.remove("show");
        showWelcome(false);
      });
    }
    /* 旧 resumeLink 兼容（隐藏的 a 标签，保留 ID 不破坏原引用） */
    const resumeLink = document.getElementById("resumeLink");
    if(resumeLink){
      resumeLink.addEventListener("click", e => {
        e.preventDefault();
        welcome.classList.remove("show");
        render();
      });
    }
  }

  /* ---------- 启动 ---------- */
  function start(){
    bindDrawer();
    bindRightSidebar();
    bindButtons();
    bindWelcome();
    /* 立绘预加载：确保 0.2s 淡入流畅 */
    preloadCharSprites();
    /* 功能 1：点击对话区空白 + 空格键 = 立即推进 */
    /* AVG 模式：点击整个对话框（含说话者名）任意非按钮区域都推进 */
    const dialogBox = document.getElementById("eventDialogBox");
    if(dialogBox){
      dialogBox.addEventListener("click", (e) => {
        if(e.target.closest("button")) return;
        forceAdvanceOnce();
      });
    }
    const dialogueEl = document.getElementById("eventDialogue");
    if(dialogueEl){
      dialogueEl.addEventListener("click", (e) => {
        if(e.target.closest("button")) return;
        forceAdvanceOnce();
      });
    }
    document.addEventListener("keydown", (e) => {
      if(e.key === " " || e.key === "Enter"){
        const welcomeVisible = document.getElementById("welcome")?.classList.contains("show");
        const drawerOpen = document.getElementById("drawer")?.classList.contains("open");
        const typing = document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA");
        if(welcomeVisible || drawerOpen || typing) return;
        e.preventDefault();
        forceAdvanceOnce();
      }
    });
    /* 切换 State 或重新 render 时清理定时器 */
    const _origSetState = setState;
    function setStateWithAuto(s){ _origSetState(s); if(s !== "EVENT") clearAuto(); }
    // 直接覆盖 window.WXHXQ.game 中 setState 引用（外部不可见，用同名函数在闭包重写 render 内调用可忽略，实际 clearAuto 每次 scheduleAuto 前置清理足够）
    const loaded = store.load(player);
    if(loaded){
      /* 兼容旧存档卡在 event_09 且无触发分支的情况 */
      if(player.currentEventId === "event_09" && !player.triggeredRoommateEvent){
        const b = determineEvent9Branch();
        if(!b){
          player.currentEventId = "event_10";
          player.day = 10;
          player.eventPhase = "intro";
          player.paraIndex = 0;
          player.chosenOption = null;
          player.currentState = "EVENT";
          player.lastAffSnapshot = null;
        } else {
          player.triggeredRoommateEvent = b;
          resetEventPhase();
        }
      }
      render();
    } else {
      initGame("陈念"); render();
    }
    /* 封面首页始终显示：有存档时"读取进度"可用，无存档时禁用 */
    showWelcome(loaded);
  }

  /* ---------- 启动入口（DOM 加载后执行） ---------- */
  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

  return {
    player,
    initGame,
    render,
    triggerEvent,
    continueEvent,
    onChoice,
    advanceToNextEvent,
    goToEnding,
    setState,
    showWelcome,
    /* 立绘系统版本标记（调试用） */
    spriteVersion: "v2-sprite-20260828",
    showCharacterSprite,
    CHAR_SPRITES
  };
})();
