/* route.js
   Collection-route planning. Pure functions, no DOM, so it is easy to test or replace.

   Method: pick the bins to visit, build a tour with nearest-neighbour, then improve it with
   2-opt. Distances are street-grid (Manhattan) because trucks follow streets.
   For a whole city, swap plan() for a real solver such as Google OR-Tools; keep the same
   return shape and nothing else has to change. */
(function (EC) {
  'use strict';

  /** Street-grid distance in metres between two points that have x and y. */
  function distance(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  /** Length of a path through the given points, in metres. */
  function pathLength(points) {
    var total = 0;
    for (var i = 1; i < points.length; i++) total += distance(points[i - 1], points[i]);
    return total;
  }

  /**
   * Order the given bins into a round trip from the depot.
   * Returns { order: [bin...], length: metres }.
   */
  function plan(selected) {
    var depot = EC.data.depot;
    if (!selected.length) return { order: [], length: 0 };

    // 1. nearest neighbour: always drive to the closest bin that is left
    var left = selected.slice();
    var current = depot;
    var order = [];
    while (left.length) {
      var best = 0, bestDist = Infinity;
      for (var i = 0; i < left.length; i++) {
        var d = distance(current, left[i]);
        if (d < bestDist) { bestDist = d; best = i; }
      }
      current = left.splice(best, 1)[0];
      order.push(current);
    }

    // 2. 2-opt: reverse a section of the tour whenever that makes it shorter
    var improved = true;
    while (improved) {
      improved = false;
      var path = [depot].concat(order, [depot]);
      for (var a = 1; a < path.length - 2; a++) {
        for (var b = a + 1; b < path.length - 1; b++) {
          var before = distance(path[a - 1], path[a]) + distance(path[b], path[b + 1]);
          var after = distance(path[a - 1], path[b]) + distance(path[a], path[b + 1]);
          if (after < before) {
            var reversed = order.slice(a - 1, b).reverse();
            order.splice.apply(order, [a - 1, b - a + 1].concat(reversed));
            path = [depot].concat(order, [depot]);
            improved = true;
          }
        }
      }
    }
    return { order: order, length: pathLength([depot].concat(order, [depot])) };
  }

  /**
   * Plan today's route and compare it with a fixed round.
   * Returns { selected, order, length, fixedLength } (lengths in metres).
   * The fixed round is the baseline: every bin, in list order, every day.
   */
  function build(bins, threshold) {
    var depot = EC.data.depot;
    var selected = bins.filter(function (b) { return b.fill >= threshold; });
    var result = plan(selected);
    return {
      selected: selected,
      order: result.order,
      length: result.length,
      fixedLength: pathLength([depot].concat(bins, [depot]))
    };
  }

  /**
   * Turn stops into drawable street-following points, as Leaflet [y, x] pairs.
   * Each leg goes along x first, then along y.
   */
  function legPoints(stops) {
    var out = [[stops[0].y, stops[0].x]];
    for (var i = 1; i < stops.length; i++) {
      out.push([stops[i - 1].y, stops[i].x]);
      out.push([stops[i].y, stops[i].x]);
    }
    return out;
  }

  EC.route = { distance: distance, pathLength: pathLength, plan: plan, build: build, legPoints: legPoints };
})(window.EC = window.EC || {});
