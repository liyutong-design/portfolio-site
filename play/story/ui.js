/* ============================================================
   ui.js  —  UI 组件与动效层
   阶段 0：仅提供 setText（直接 innerHTML，等价原版）
   阶段 2：扩展 typewriter / toast / tooltip / floatNum
   阶段 4：扩展 renderCG / renderAchievements / guide
   ============================================================ */
window.WXHXQ = window.WXHXQ || {};
window.WXHXQ.ui = (function(){
  /* 直接设置 innerHTML（阶段 0 等价原版直接赋值） */
  function setText(el, html){
    if(el) el.innerHTML = html;
  }
  /* 阶段 0 占位：后续阶段实现 */
  function typewriter(el, text, opts){ setText(el, text); if(opts && opts.onComplete) opts.onComplete(); }
  function toast(opts){ /* noop */ }
  function floatNum(el, num){ /* noop */ }
  function guide(steps){ /* noop */ }

  return { setText, typewriter, toast, floatNum, guide };
})();
