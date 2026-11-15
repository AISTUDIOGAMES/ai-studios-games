/* =====================================================================
   OWL GRIDBREAKERS v3.7.1 — MOBILE FULLSCREEN (presentation only)
   1) keeps --app-h = real visible height (URL bar / rotation aware);
   2) on touch devices, the first tap asks the browser for fullscreen
      (the browser only allows it from a user tap). If the player leaves
      fullscreen, it is not requested again in this session.
   Combat, saves and economy are untouched.
   ===================================================================== */
(function () {
  'use strict';
  if (window.__OWL_MOBILE_FS_V371__) return;
  window.__OWL_MOBILE_FS_V371__ = true;

  var root = document.documentElement;
  var coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

  /* ---- 1) visible height ---- */
  var raf = 0;
  function setHeight() {
    raf = 0;
    var vv = window.visualViewport;
    var h = Math.round((vv && vv.height) || window.innerHeight || 0);
    if (h > 0) root.style.setProperty('--app-h', h + 'px');
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(setHeight); }
  setHeight();
  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', function () { schedule(); setTimeout(schedule, 300); });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', schedule);
  document.addEventListener('fullscreenchange', function () { schedule(); setTimeout(schedule, 250); });
  document.addEventListener('webkitfullscreenchange', function () { schedule(); setTimeout(schedule, 250); });

  /* ---- 2) fullscreen on first tap (touch devices only) ---- */
  if (!coarse) return;
  var isFs = function () { return !!(document.fullscreenElement || document.webkitFullscreenElement); };
  var entered = false;   // we got into fullscreen at least once
  var gaveUp = false;    // the player left fullscreen: do not insist

  function tryFullscreen() {
    if (gaveUp || isFs()) return;
    var req = root.requestFullscreen || root.webkitRequestFullscreen;
    if (!req) return;
    try {
      var p = req.call(root, { navigationUI: 'hide' });
      if (p && p.catch) p.catch(function () { /* refused: try again on the next tap */ });
    } catch (e) { /* ignore */ }
  }
  function onFsChange() {
    if (isFs()) { entered = true; }
    else if (entered) { gaveUp = true; }
  }
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);
  document.addEventListener('click', tryFullscreen, true);
})();
