/* ui.js
   Page-level behaviour: the Scan / Map / Bins tabs on phones, and keeping the map sized.
   On wide screens every panel is visible and the tabs are hidden by CSS. */
(function (EC) {
  'use strict';

  var $ = EC.$, $$ = EC.$$;

  /** Show one panel: 'scan', 'fleet' (map) or 'bins'. */
  function showTab(name) {
    $$('.panel').forEach(function (panel) {
      panel.classList.toggle('active', panel.id === 'panel-' + name);
    });
    $$('.tab').forEach(function (tab) {
      tab.setAttribute('aria-selected', String(tab.dataset.tab === name));
    });
    if (name === 'fleet') EC.map.ensure();   // the map can only be sized once it is visible
    window.scrollTo(0, 0);
  }

  function init() {
    $$('.tab').forEach(function (tab) {
      tab.addEventListener('click', function () { showTab(tab.dataset.tab); });
    });
    window.addEventListener('resize', function () { EC.map.ensure(); });
    if (window.matchMedia('(min-width: 960px)').matches) EC.map.ensure();   // desktop shows the map at once
  }

  EC.ui = { init: init, showTab: showTab };
})(window.EC = window.EC || {});
