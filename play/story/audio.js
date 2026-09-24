/* ============================================================
   audio.js  —  音效合成层
   阶段 0：仅占位（空实现），保证 game.js 调用不报错
   阶段 4：将实现 Web Audio API 合成 9 类音效
   ============================================================ */
window.WXHXQ = window.WXHXQ || {};
window.WXHXQ.audio = (function(){
  /* 阶段 0 占位：所有方法空实现 */
  function play(name){ /* noop */ }
  function setMuted(bool){ /* noop */ }
  function setVolume(num){ /* noop */ }
  function isMuted(){ return false; }
  return { play, setMuted, setVolume, isMuted };
})();
