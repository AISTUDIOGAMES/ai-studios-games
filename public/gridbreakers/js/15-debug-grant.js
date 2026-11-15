/* ===== ONE-TIME LOCAL SAVE GRANT: 1,000,000 DIAMONDS ===== */
(function(){
  try {
    if (OWL_CONFIG.debug && typeof S !== 'undefined' && typeof save === 'function' && !S.__awoMillionDiamondsGranted) {
      S.soul = Math.max(0, Number(S.soul) || 0) + 1000000;
      S.__awoMillionDiamondsGranted = true;
      save();
      if (typeof head === 'function') head();
      console.info('[AWO] One-time grant applied: +1,000,000 diamonds');
    }
  } catch (e) { console.warn('[AWO] Diamond grant could not be applied:', e); }
})();
