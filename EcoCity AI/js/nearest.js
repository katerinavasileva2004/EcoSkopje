/* nearest.js
   "Show nearest bin": after a scan, find the closest bin of the right stream that still has
   room, highlight it, and jump to the map. Skips a bin that is almost full. */
(function (EC) {
  'use strict';

  var $ = EC.$, h = EC.h;
  var FULL_ENOUGH_TO_SKIP = 90;   // fill % at which a bin is treated as "no room"

  function hide() {
    $('#nearest').textContent = '';
  }

  function dismiss() {
    hide();
    EC.state.setTarget(null);
  }

  /** Find and show the nearest bin of a stream ('yellow', 'blue', ...). */
  function find(stream) {
    var here = EC.data.here;
    var candidates = EC.state.snapshot().bins
      .filter(function (b) { return b.stream === stream; })
      .sort(function (a, b) { return EC.route.distance(a, here) - EC.route.distance(b, here); });
    if (!candidates.length) return;

    var closest = candidates[0];
    var pick = candidates.filter(function (b) { return b.fill < FULL_ENOUGH_TO_SKIP; })[0] || closest;
    var metres = EC.route.distance(pick, here);

    var message = 'Nearest ' + EC.data.binWord[stream] + ' bin: ' + pick.id + ', ' + metres +
                  ' m away, ' + Math.round(pick.fill) + '% full.';
    if (pick !== closest) {
      message = closest.id + ' is closest but almost full (' + Math.round(closest.fill) + '%). Use ' + pick.id +
                ' instead, ' + metres + ' m away, ' + Math.round(pick.fill) + '% full.';
    }

    var box = $('#nearest');
    box.textContent = '';
    box.append(h('div', { class: 'nearest' },
      h('div', { text: message }),
      h('button', { type: 'button', 'aria-label': 'Dismiss', onclick: dismiss }, '×')));

    EC.ui.showTab('fleet');
    EC.state.setTarget(pick.id);
    EC.map.focusBin(pick.id);
  }

  EC.nearest = { find: find, hide: hide };
})(window.EC = window.EC || {});
