/* controls.js
   The buttons and slider under the map: collection threshold, "+2 hours", "Run route", "Reset".
   They call state.js actions and show a one-line note about what happened. */
(function (EC) {
  'use strict';

  var $ = EC.$;
  var cfg = EC.config.route;

  function setNote(message, isWarning) {
    var el = $('#note');
    el.textContent = message;
    el.className = 'status' + (isWarning ? ' err' : '');
  }

  function init() {
    var slider = $('#thr');
    slider.value = cfg.defaultThreshold;
    $('#thr-out').textContent = cfg.defaultThreshold + '%';

    slider.addEventListener('input', function (e) {
      var value = +e.target.value;
      $('#thr-out').textContent = value + '%';
      EC.state.setThreshold(value);
    });

    $('#b-adv').addEventListener('click', function () {
      var overflowed = EC.state.advance();
      if (overflowed) {
        setNote(overflowed + (overflowed === 1 ? ' bin has' : ' bins have') + ' overflowed. Run the route to empty them.', true);
      } else {
        setNote(cfg.hoursPerStep + ' hours later. Fill levels updated.', false);
      }
    });

    $('#b-collect').addEventListener('click', function () {
      var plan = EC.state.collect();
      if (!plan.order.length) { setNote('Nothing to collect at this threshold.', false); return; }
      setNote('Collected ' + plan.order.length + ' bins over ' + (plan.length / 1000).toFixed(1) + ' km. Fill levels reset.', false);
    });

    $('#b-reset').addEventListener('click', function () {
      EC.nearest.hide();
      EC.state.reset();
      setNote('Simulation reset to 06:00.', false);
    });
  }

  EC.controls = { init: init };
})(window.EC = window.EC || {});
