/* state.js
   The single source of truth: bin fill levels, the simulated clock, the collection threshold
   and the highlighted bin. Everything that changes data goes through the functions below,
   and every change notifies subscribers (dashboard, map) with a fresh snapshot.

   Real sensors would replace advance() with readings from your backend. */
(function (EC) {
  'use strict';

  var cfg = EC.config.route;
  var bins = [];
  var hour = 6;
  var threshold = cfg.defaultThreshold;
  var targetId = null;
  var listeners = [];

  /** Severity of a fill level: 'crit' (overflow risk), 'warn' (collect today) or 'ok'. */
  function severity(fill) {
    if (fill >= cfg.overflowAt) return 'crit';
    return fill >= threshold ? 'warn' : 'ok';
  }

  /** Text for how soon a bin is full, e.g. "full in 2h 05m". */
  function eta(bin) {
    if (bin.fill >= 100) return 'Overflowing';
    var hours = (100 - bin.fill) / bin.rate;
    var h = Math.floor(hours);
    var m = Math.round((hours - h) * 60);
    if (m === 60) { h += 1; m = 0; }
    return 'full in ' + h + 'h ' + (m < 10 ? '0' : '') + m + 'm';
  }

  /** Everything the views need, computed fresh. */
  function snapshot() {
    return {
      bins: bins,
      hour: hour,
      threshold: threshold,
      targetId: targetId,
      plan: EC.route.build(bins, threshold)
    };
  }

  function notify() {
    var snap = snapshot();
    listeners.forEach(function (fn) { fn(snap); });
  }

  /** Call fn(snapshot) after every change. */
  function subscribe(fn) { listeners.push(fn); }

  function loadSeed() {
    bins = EC.data.binSeed.map(function (s) {
      return { id: s.id, x: s.x, y: s.y, stream: s.stream, fill: s.fill, rate: s.rate };
    });
    hour = 6;
    targetId = null;
  }

  /** Start (or restart) the simulation at 06:00. */
  function reset() { loadSeed(); notify(); }

  /** Move time forward; every bin gains its own hourly rate. Returns how many bins overflowed. */
  function advance() {
    bins.forEach(function (b) {
      b.fill = Math.min(100, +(b.fill + b.rate * cfg.hoursPerStep).toFixed(1));
    });
    hour += cfg.hoursPerStep;
    notify();
    return bins.filter(function (b) { return b.fill >= 100; }).length;
  }

  /** Run today's route: the visited bins are emptied. Returns the plan that was driven. */
  function collect() {
    var plan = EC.route.build(bins, threshold);
    plan.order.forEach(function (b, i) {
      b.fill = 3 + ((i * 5 + b.id.charCodeAt(6)) % 6);   // a few % left after emptying
    });
    notify();
    return plan;
  }

  function setThreshold(value) { threshold = value; notify(); }
  function setTarget(id) { targetId = id; notify(); }

  EC.state = {
    severity: severity,
    eta: eta,
    snapshot: snapshot,
    subscribe: subscribe,
    reset: reset,
    advance: advance,
    collect: collect,
    setThreshold: setThreshold,
    setTarget: setTarget
  };
})(window.EC = window.EC || {});
