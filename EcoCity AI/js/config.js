/* config.js
   Every setting you might change lives here. No other file needs editing for a normal setup. */
(function (EC) {
  'use strict';

  EC.config = {
    ai: {
      /* Which model identifies the item in a photo:
           'auto'   inside the Claude viewer use Claude, elsewhere use Gemini if a key is set below
           'claude' only the Claude viewer (works inside claude.ai artifacts, no key needed)
           'gemini' Google Gemini API (needs geminiApiKey)
           'none'   no live scanning, example items only */
      provider: 'auto',

      /* Get a key at https://aistudio.google.com/apikey. A key in front-end code can be read by
         anyone who opens the page, so use a restricted key, never commit it, and for a real
         product call Gemini from a small server instead. */
      geminiApiKey: 'AQ.Ab8RN6KSovLYdyPKKGEL3QrlhVubtNHRufY-oSeyA9Mqnd4Rug',

      /* Check ai.google.dev/gemini-api/docs/models for the current vision-capable model name. */
      geminiModel: 'gemini-3.8-flash',

      /* Photos are shrunk to this many pixels on the long edge before upload. */
      maxImageEdge: 1024
    },

    route: {
      defaultThreshold: 70,   // collect bins at or above this fill %
      overflowAt: 90,         // fill % that raises an overflow alert
      fuelLitresPerKm: 0.45,  // assumed diesel use of one collection truck
      hoursPerStep: 2         // how far the "+2 hours" button moves the simulation
    },

    map: {
      bounds: [[20, 20], [880, 1380]],          // area shown at start, [y, x] in metres
      maxBounds: [[-200, -250], [1100, 1650]],  // how far the user can pan
      minZoom: -3,
      maxZoom: 1,
      focusZoom: -0.5                           // zoom used when jumping to a bin
    }
  };
})(window.EC = window.EC || {});
