/* main.js
   Start-up. Order matters: views subscribe first, then the data is loaded, so the first
   notification draws everything. */
(function (EC) {
  'use strict';

  EC.state.subscribe(EC.dashboard.render);
  EC.state.subscribe(EC.map.render);

  EC.state.reset();     // loads the simulated bins and draws the dashboard
  EC.controls.init();
  EC.ui.init();
  EC.scanner.init();    // asks ai.js which model is available, then enables the scan buttons
})(window.EC = window.EC || {});
