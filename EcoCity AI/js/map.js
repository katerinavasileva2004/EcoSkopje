/* map.js
   The Leaflet map: street grid, bins, depot, "you are here" and the route.
   Uses Leaflet's simple (flat) coordinate system, so positions are [y, x] in metres.

   Using real streets: replace the drawn grid with an OpenStreetMap layer
     L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)
   remove crs: L.CRS.Simple, and give each bin a real [lat, lng]. Route legs then need a road
   router (OSRM or OpenRouteService) instead of the grid distance in route.js. */
(function (EC) {
  'use strict';

  var $ = EC.$, h = EC.h;
  var cfg = EC.config.map;
  var map = null;
  var markers = {};
  var routeLayer = null;

  /** Icon for a bin: fill % on a severity-coloured tag, with its stream colour underneath. */
  function pinIcon(bin, snap) {
    var sev = EC.state.severity(bin.fill);
    var target = bin.id === snap.targetId ? ' target' : '';
    return L.divIcon({
      className: '',
      iconSize: [38, 24],
      iconAnchor: [19, 12],
      html: '<div class="pin ' + sev + target + '" style="--c:var(--s-' + bin.stream + ')"><b>' +
            Math.round(bin.fill) + '</b></div>'
    });
  }

  function binPopup(bin) {
    return h('div', { class: 'pop' },
      h('b', { text: bin.id }),
      h('div', { text: EC.data.streams[bin.stream] + ' · ' + Math.round(bin.fill) + '% full' }),
      h('div', { class: 'muted', text: EC.state.eta(bin) + ' (fills about ' + bin.rate + '% per hour)' }));
  }

  function simpleIcon(cls, size, anchor, label) {
    return L.divIcon({
      className: '', iconSize: [size, size], iconAnchor: anchor,
      html: '<div class="' + cls + '">' + (label || '') + '</div>'
    });
  }

  /** Draw streets, parks and the pond. */
  function drawScenery() {
    var s = EC.data.scenery, x, y;
    var ex = s.streetExtent;
    for (x = s.streetsX.from; x <= s.streetsX.to; x += s.streetsX.step) {
      L.polyline([[ex.y[0], x], [ex.y[1], x]],
        { className: 'street', weight: x === s.streetsX.major ? 7 : 3.5, interactive: false }).addTo(map);
    }
    for (y = s.streetsY.from; y <= s.streetsY.to; y += s.streetsY.step) {
      L.polyline([[y, ex.x[0]], [y, ex.x[1]]],
        { className: 'street', weight: y === s.streetsY.major ? 7 : 3.5, interactive: false }).addTo(map);
    }
    s.parks.forEach(function (r) { L.rectangle(r, { className: 'park', interactive: false }).addTo(map); });
    s.ponds.forEach(function (r) { L.rectangle(r, { className: 'pond', interactive: false }).addTo(map); });
  }

  /** Create the map the first time its container is visible. */
  function create() {
    var el = $('#map');
    if (map || typeof L === 'undefined' || !el.offsetWidth) return;

    var depot = EC.data.depot, here = EC.data.here;
    map = L.map(el, {
      crs: L.CRS.Simple, minZoom: cfg.minZoom, maxZoom: cfg.maxZoom,
      zoomSnap: 0.25, zoomDelta: 0.5, attributionControl: false
    });
    drawScenery();
    routeLayer = L.layerGroup().addTo(map);

    L.marker([depot.y, depot.x], { icon: simpleIcon('depot', 30, [15, 15], 'D'), keyboard: false, zIndexOffset: 500 })
      .addTo(map)
      .bindPopup(h('div', { class: 'pop' }, h('b', { text: 'Depot' }), h('div', { text: 'Trucks start and finish here.' })));
    L.marker([here.y, here.x], { icon: simpleIcon('here', 18, [9, 9]), keyboard: false })
      .addTo(map)
      .bindPopup(h('div', { class: 'pop' }, h('b', { text: 'You are here' }), h('div', { text: 'Demo position for the nearest-bin search.' })));

    EC.state.snapshot().bins.forEach(function (bin) {
      markers[bin.id] = L.marker([bin.y, bin.x], { icon: pinIcon(bin, EC.state.snapshot()), title: bin.id })
        .addTo(map)
        .bindPopup(function () { return binPopup(bin); });
    });

    map.fitBounds(cfg.bounds);
    map.setMaxBounds(cfg.maxBounds);
    render(EC.state.snapshot());
  }

  /** Redraw markers and route from a state snapshot. */
  function render(snap) {
    if (!map) return;
    var plan = snap.plan;

    snap.bins.forEach(function (bin) {
      var marker = markers[bin.id];
      if (!marker) return;
      marker.setIcon(pinIcon(bin, snap));
      marker.setZIndexOffset(bin.id === snap.targetId ? 900 : (bin.fill >= snap.threshold ? 200 : 0));
    });

    routeLayer.clearLayers();
    if (!plan.order.length) return;
    var stops = [EC.data.depot].concat(plan.order, [EC.data.depot]);
    L.polyline(EC.route.legPoints(stops), { className: 'route', weight: 4, color: '#1B5BD0', interactive: false }).addTo(routeLayer);
    plan.order.forEach(function (bin, i) {
      L.marker([bin.y, bin.x], {
        icon: L.divIcon({
          className: '', iconSize: [18, 18], iconAnchor: [-8, 26],
          html: '<div class="stopn">' + (i + 1) + '</div>'
        }),
        interactive: false, keyboard: false
      }).addTo(routeLayer);
    });
  }

  /** Make sure the map exists and fits its container. Call whenever the map panel may have appeared or resized. */
  function ensure() {
    if (!map) { create(); return; }
    if ($('#map').offsetWidth) map.invalidateSize();
  }

  /** Fly to a bin. */
  function focusBin(id) {
    var bin = EC.state.snapshot().bins.filter(function (b) { return b.id === id; })[0];
    if (!bin) return;
    ensure();
    if (!map) return;
    setTimeout(function () { map.flyTo([bin.y, bin.x], cfg.focusZoom, { duration: 0.9 }); }, 60);
  }

  EC.map = { ensure: ensure, render: render, focusBin: focusBin };
})(window.EC = window.EC || {});
