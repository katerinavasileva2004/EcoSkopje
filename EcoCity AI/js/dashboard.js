/* dashboard.js
   Renders everything that reads from the simulation: clock, KPI strip, overflow alert,
   route summary and the fill-level list. It only draws; it never changes data. */
(function (EC) {
  'use strict';

  var $ = EC.$, h = EC.h;
  var cfg = EC.config.route;

  var WARNING_ICON =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/></svg>';

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function renderClock(snap) {
    var day = Math.floor(snap.hour / 24) + 1;
    $('#clock').textContent = 'Day ' + day + ' · ' + pad(snap.hour % 24) + ':00';
  }

  function renderKpis(snap) {
    var plan = snap.plan, bins = snap.bins;
    var overflowRisk = bins.filter(function (b) { return b.fill >= cfg.overflowAt; }).length;
    var km = plan.length / 1000;
    var fixedKm = plan.fixedLength / 1000;
    var savedKm = Math.max(0, fixedKm - km);

    var box = $('#kpis');
    box.textContent = '';
    function kpi(label, value, sub, cls) {
      box.append(h('div', { class: 'kpi' + (cls ? ' ' + cls : '') },
        h('div', { class: 'eyebrow', text: label }),
        h('b', { text: value }),
        h('small', { text: sub })));
    }
    kpi('Overflow risk', String(overflowRisk), 'bins at ' + cfg.overflowAt + '% or more', overflowRisk ? 'crit' : '');
    kpi('To collect', String(plan.selected.length), 'of ' + bins.length + ' bins at ' + snap.threshold + '%+');
    kpi('Route', km.toFixed(1) + ' km', 'fixed round: ' + fixedKm.toFixed(1) + ' km');
    kpi('Fuel saved', (savedKm * cfg.fuelLitresPerKm).toFixed(1) + ' L', 'per round, ' + savedKm.toFixed(1) + ' km less');
  }

  function renderAlert(snap) {
    var risky = snap.bins
      .filter(function (b) { return b.fill >= cfg.overflowAt; })
      .sort(function (a, b) { return b.fill - a.fill; });
    var box = $('#alert');
    box.textContent = '';
    if (!risky.length) return;

    var wrap = h('div', { class: 'alert', role: 'alert' });
    wrap.innerHTML = WARNING_ICON;   // fixed markup, no dynamic text
    wrap.append(h('div', {},
      h('b', { text: risky.length + (risky.length === 1 ? ' bin is' : ' bins are') + ' close to overflowing. ' }),
      risky.map(function (b) { return b.id + ' (' + Math.round(b.fill) + '%)'; }).join(', ') + '. Collect these first.'));
    box.append(wrap);
  }

  function renderRouteSummary(snap) {
    var plan = snap.plan;
    var box = $('#route-sum');
    box.textContent = '';
    if (!plan.order.length) {
      box.append(h('div', {}, 'No bin is at ' + snap.threshold + '% or more. The truck stays in the depot.'));
      return;
    }
    var km = plan.length / 1000;
    var fixedKm = plan.fixedLength / 1000;
    var savedKm = fixedKm - km;
    box.append(
      h('div', {},
        h('b', { text: plan.order.length + ' stops, ' + km.toFixed(1) + ' km. ' }),
        'A fixed round visits all ' + snap.bins.length + ' bins (' + fixedKm.toFixed(1) + ' km). ' +
        'Skipping bins below ' + snap.threshold + '% saves ' + savedKm.toFixed(1) + ' km, about ' +
        (savedKm * cfg.fuelLitresPerKm).toFixed(1) + ' L of diesel.'),
      h('div', { class: 'seq', text: 'Depot → ' + plan.order.map(function (b) { return b.id; }).join(' → ') + ' → Depot' }));
  }

  function renderRows(snap) {
    var box = $('#rows');
    box.textContent = '';
    snap.bins.slice().sort(function (a, b) { return b.fill - a.fill; }).forEach(function (bin) {
      var sev = EC.state.severity(bin.fill);
      var bar = h('div', { class: 'bar ' + sev, role: 'img', 'aria-label': Math.round(bin.fill) + ' percent full' },
        h('i', { style: 'width:' + Math.min(100, bin.fill) + '%' }),
        h('u', { style: 'left:' + snap.threshold + '%' }));   // tick = collection threshold
      box.append(h('div', { class: 'row' + (bin.id === snap.targetId ? ' target' : '') },
        h('div', { class: 'id' },
          h('span', { class: 'dot', style: '--c:var(--s-' + bin.stream + ')' }),
          h('div', {}, h('b', { text: bin.id }), h('small', { text: EC.data.streams[bin.stream] }))),
        bar,
        h('div', { class: 'pct' }, Math.round(bin.fill) + '%', h('span', { class: 'eta', text: EC.state.eta(bin) }))));
    });
  }

  /** Redraw every dashboard part from a state snapshot. */
  function render(snap) {
    renderClock(snap);
    renderKpis(snap);
    renderAlert(snap);
    renderRouteSummary(snap);
    renderRows(snap);
  }

  EC.dashboard = { render: render };
})(window.EC = window.EC || {});
