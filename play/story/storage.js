/* ============================================================
   storage.js  —  存储层
   阶段 0：单周目 save/load/clear（已完成）
   阶段 1：多周目存储体系（7 个 key）+ 旧存档迁移 + 跨周目数据
           - wxhxq_save_v1   （旧，兼容备份）
           - wxhxq_save_v2   （新单周目，含 playLog/memories）
           - wxhxq_endings_v1（结局图鉴，跨周目）
           - wxhxq_achievements_v1（成就，跨周目）
           - wxhxq_cg_v1     （CG 解锁，跨周目）
           - wxhxq_settings_v1（设置，跨周目）
           - wxhxq_meta_v1   （元数据，跨周目）
   ============================================================ */
window.WXHXQ = window.WXHXQ || {};
window.WXHXQ.store = (function(){
  const DATA = window.WXHXQ.data;

  /* ============================================================
     localStorage 安全封装层
     ------------------------------------------------------------
     在 file:// 直接打开、隐私模式、浏览器错误页(chromewebdata)
     等环境下，连「读取 window.localStorage 属性」本身都会抛
     SecurityError。所有存档读写统一走以下三个函数：
       - 可用时：正常读写 localStorage（存档功能完全保留）
       - 不可用时：降级为内存对象（页面不崩溃，仅刷新后不保留）
     ============================================================ */
  const _memoryStore = {};
  let _storageOK = null;
  function detectStorage(){
    if(_storageOK !== null) return _storageOK;
    try{
      const k = "__wxhxq_probe__";
      window.localStorage.setItem(k, "1");
      window.localStorage.removeItem(k);
      _storageOK = true;
    }catch(e){
      _storageOK = false;
      console.warn("[存档] localStorage 不可用，已降级为内存模式（刷新后进度不保留）。请通过 http://localhost 访问以正常存档。", e && e.message ? e.message : e);
    }
    return _storageOK;
  }
  function safeGetItem(key){
    if(!detectStorage()) return (key in _memoryStore ? _memoryStore[key] : null);
    try{ return window.localStorage.getItem(key); }
    catch(e){ return (key in _memoryStore ? _memoryStore[key] : null); }
  }
  function safeSetItem(key, value){
    _memoryStore[key] = value;               /* 内存里始终留一份，降级时仍可读 */
    if(!detectStorage()) return false;
    try{ window.localStorage.setItem(key, value); return true; }
    catch(e){ return false; }
  }
  function safeRemoveItem(key){
    delete _memoryStore[key];
    if(!detectStorage()) return;
    try{ window.localStorage.removeItem(key); }catch(e){}
  }

  /* ---------- localStorage Key 常量 ---------- */
  const SAVE_KEY        = "wxhxq_save_v1";  /* 兼容旧存档读取（备份用） */
  const SAVE_KEY_V2     = "wxhxq_save_v2";
  const ENDINGS_KEY     = "wxhxq_endings_v1";
  const ACHIEVEMENTS_KEY= "wxhxq_achievements_v1";
  const CG_KEY          = "wxhxq_cg_v1";
  const SETTINGS_KEY    = "wxhxq_settings_v1";
  const META_KEY        = "wxhxq_meta_v1";

  /* ---------- 默认跨周目数据结构 ---------- */
  const DEFAULT_ENDINGS     = { ids:[], count:0, lastEnding:null };
  const DEFAULT_ACHIEVEMENTS= { unlocked:{}, pending:[] };
  const DEFAULT_CG          = { ids:[] };
  const DEFAULT_SETTINGS   = { sound:true, bgm:true, typeSpeed:"medium", autoMode:0, skip:false, fontSize:"medium" };
  const DEFAULT_META       = { totalPlaythroughs:0, totalTime:0, firstPlay:true, lastPlayed:null };

  /* ---------- 同步 player.affection 与 ROOMMATES ---------- */
  function syncPlayerAffection(player){
    for(const r of DATA.ROOMMATES) player.affection[r.id] = r.affection;
  }
  function syncRoommatesFromPlayer(player){
    for(const r of DATA.ROOMMATES) r.affection = player.affection[r.id] != null ? player.affection[r.id] : 50;
  }

  /* ---------- 兼容旧存档：补全新字段默认值 ---------- */
  function normalizePlayer(player){
    if(!player.affection) player.affection = { linxiaoman:50, suwanqing:50, shenxinghe:50, guqinghuan:50 };
    if(!player.keyChoices) player.keyChoices = [];
    if(player.eventPhase == null) player.eventPhase = "intro";
    if(player.paraIndex == null) player.paraIndex = 0;
    if(player.chosenOption == null) player.chosenOption = null;
    if(player.lastAffSnapshot == null) player.lastAffSnapshot = null;
    if(player.lastTransition == null) player.lastTransition = null;
    /* 旧存档可能 eventPhase 为 "result"，统一映射为 "consequence" */
    if(player.eventPhase === "result") player.eventPhase = "consequence";
    /* 阶段 1 新增字段：playLog / memories */
    if(!Array.isArray(player.playLog)) player.playLog = [];
    if(!Array.isArray(player.memories)) player.memories = [];
  }

  /* ---------- 旧存档迁移（v1 → v2） ---------- */
  function migrate(){
    try {
      const v1Raw = safeGetItem(SAVE_KEY);
      const v2Raw = safeGetItem(SAVE_KEY_V2);
      if(v1Raw && !v2Raw){
        const v1Data = JSON.parse(v1Raw);
        if(v1Data && v1Data.currentEventId){
          normalizePlayer(v1Data);
          safeSetItem(SAVE_KEY_V2, JSON.stringify(v1Data));
          /* 保留 v1 作为备份，不删除 */
          return { migrated:true, from:"v1", to:"v2" };
        }
      }
      return { migrated:false };
    } catch(e) {
      return { migrated:false, error:String(e) };
    }
  }

  /* ---------- 通用 JSON 读写 ---------- */
  function readJSON(key, fallback){
    try {
      const raw = safeGetItem(key);
      if(!raw) return JSON.parse(JSON.stringify(fallback));
      const data = JSON.parse(raw);
      /* 合并默认字段，避免老数据缺字段 */
      return Object.assign(JSON.parse(JSON.stringify(fallback)), data);
    } catch(e) {
      return JSON.parse(JSON.stringify(fallback));
    }
  }
  function writeJSON(key, obj){
    return safeSetItem(key, JSON.stringify(obj));
  }

  /* ---------- 单周目存档：save / load / clear ---------- */
  function save(player){
    syncPlayerAffection(player);
    /* 同时写 v1（兼容旧版读取）和 v2（新结构） */
    safeSetItem(SAVE_KEY, JSON.stringify(player));
    safeSetItem(SAVE_KEY_V2, JSON.stringify(player));
  }

  function load(player){
    try {
      /* 优先读 v2 */
      let raw = safeGetItem(SAVE_KEY_V2);
      if(!raw){
        /* v2 不存在，尝试迁移 v1 */
        migrate();
        raw = safeGetItem(SAVE_KEY_V2);
      }
      if(!raw) return false;
      const data = JSON.parse(raw);
      if(!data || !data.currentEventId) return false;
      Object.assign(player, data);
      normalizePlayer(player);
      syncRoommatesFromPlayer(player);
      /* 首次游玩标记清除（如果首次进入且加载到存档，标记为非首次） */
      const meta = getMeta();
      if(meta.firstPlay){
        meta.firstPlay = false;
        setMeta(meta);
      }
      return true;
    } catch(e) { return false; }
  }

  function clearSave(){
    /* 仅清当前周目存档，保留跨周目数据（结局/成就/CG/设置/元数据） */
    /* v1 也清除，避免下次启动又迁移到 v2 */
    safeRemoveItem(SAVE_KEY);
    safeRemoveItem(SAVE_KEY_V2);
  }

  /* ---------- 初始化新 player ---------- */
  function createInitialPlayer(name){
    const player = JSON.parse(JSON.stringify(DATA.PLAYER_TEMPLATE));
    player.name = name || "陈念";
    /* 阶段 1 新增字段 */
    player.playLog = [];
    player.memories = [];
    return player;
  }

  function resetPlayer(player, name){
    player.name = name || "陈念";
    player.currentEventId = "event_01";
    player.currentState = "DORM";
    player.day = 1;
    player.keyChoices = [];
    player.triggeredRoommateEvent = null;
    player.endingId = null;
    player.eventPhase = "intro";
    player.paraIndex = 0;
    player.chosenOption = null;
    player.lastAffSnapshot = null;
    player.lastTransition = null;
    /* 阶段 1 新增字段重置 */
    player.playLog = [];
    player.memories = [];
    for(const r of DATA.ROOMMATES) r.affection = 50;
    syncPlayerAffection(player);
  }

  /* ============================================================
     跨周目数据接口（供阶段 4 商业化模块调用）
     ============================================================ */

  /* ---------- 结局图鉴 ---------- */
  function getEndings(){
    return readJSON(ENDINGS_KEY, DEFAULT_ENDINGS);
  }
  function addEnding(endingId){
    const data = getEndings();
    if(!data.ids.includes(endingId)){
      data.ids.push(endingId);
      data.count = data.ids.length;
    }
    data.lastEnding = endingId;
    writeJSON(ENDINGS_KEY, data);
    return data;
  }
  function hasEnding(endingId){
    return getEndings().ids.includes(endingId);
  }

  /* ---------- 成就 ---------- */
  function getAchievements(){
    return readJSON(ACHIEVEMENTS_KEY, DEFAULT_ACHIEVEMENTS);
  }
  function unlockAchievement(id, playthrough){
    const data = getAchievements();
    if(data.unlocked[id]) return { newlyUnlocked:false, data };
    data.unlocked[id] = { unlockTime: Date.now(), playthrough: playthrough || 1 };
    data.pending.push(id);
    writeJSON(ACHIEVEMENTS_KEY, data);
    return { newlyUnlocked:true, data };
  }
  function hasAchievement(id){
    return !!getAchievements().unlocked[id];
  }
  function popPendingAchievements(){
    const data = getAchievements();
    const pending = data.pending.slice();
    if(pending.length > 0){
      data.pending = [];
      writeJSON(ACHIEVEMENTS_KEY, data);
    }
    return pending;
  }

  /* ---------- CG 图鉴 ---------- */
  function getCG(){
    return readJSON(CG_KEY, DEFAULT_CG);
  }
  function unlockCG(id){
    const data = getCG();
    if(!data.ids.includes(id)){
      data.ids.push(id);
      writeJSON(CG_KEY, data);
      return { newlyUnlocked:true, data };
    }
    return { newlyUnlocked:false, data };
  }
  function hasCG(id){
    return getCG().ids.includes(id);
  }

  /* ---------- 设置 ---------- */
  function getSettings(){
    return readJSON(SETTINGS_KEY, DEFAULT_SETTINGS);
  }
  function setSettings(partial){
    const data = getSettings();
    Object.assign(data, partial || {});
    writeJSON(SETTINGS_KEY, data);
    return data;
  }

  /* ---------- 元数据 ---------- */
  function getMeta(){
    return readJSON(META_KEY, DEFAULT_META);
  }
  function setMeta(partial){
    const data = getMeta();
    Object.assign(data, partial || {});
    writeJSON(META_KEY, data);
    return data;
  }
  function incrementPlaythrough(){
    const data = getMeta();
    data.totalPlaythroughs = (data.totalPlaythroughs || 0) + 1;
    data.lastPlayed = Date.now();
    data.firstPlay = false;
    setMeta(data);
    return data;
  }
  function addPlayTime(seconds){
    const data = getMeta();
    data.totalTime = (data.totalTime || 0) + (seconds || 0);
    setMeta(data);
    return data;
  }

  /* ---------- 清除全部数据（设置面板中的"清除所有数据"） ---------- */
  function clearAll(){
    safeRemoveItem(SAVE_KEY);
    safeRemoveItem(SAVE_KEY_V2);
    safeRemoveItem(ENDINGS_KEY);
    safeRemoveItem(ACHIEVEMENTS_KEY);
    safeRemoveItem(CG_KEY);
    safeRemoveItem(SETTINGS_KEY);
    safeRemoveItem(META_KEY);
  }

  return {
    /* 常量 */
    SAVE_KEY, SAVE_KEY_V2,
    ENDINGS_KEY, ACHIEVEMENTS_KEY, CG_KEY, SETTINGS_KEY, META_KEY,

    /* 安全封装（localStorage 不可用时自动降级内存） */
    safeGetItem, safeSetItem, safeRemoveItem,
    storageAvailable: detectStorage,

    /* 单周目 */
    save, load,
    clear: clearSave,
    createInitialPlayer,
    resetPlayer,
    syncPlayerAffection,
    syncRoommatesFromPlayer,
    normalizePlayer,
    migrate,

    /* 跨周目：结局 */
    getEndings, addEnding, hasEnding,

    /* 跨周目：成就 */
    getAchievements, unlockAchievement, hasAchievement, popPendingAchievements,

    /* 跨周目：CG */
    getCG, unlockCG, hasCG,

    /* 跨周目：设置 */
    getSettings, setSettings,

    /* 跨周目：元数据 */
    getMeta, setMeta, incrementPlaythrough, addPlayTime,

    /* 危险操作 */
    clearAll
  };
})();
