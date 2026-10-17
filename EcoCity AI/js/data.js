/* data.js
   Static data: the waste taxonomy, the demo district, and example scan results.
   To model your own city, edit binSeed (positions in metres on a street grid) and the scenery. */
(function (EC) {
  'use strict';

  EC.data = {

    /* Bin streams, keyed by bin colour. */
    streams: {
      yellow: 'Plastics & metal',
      blue: 'Paper & cardboard',
      green: 'Glass',
      brown: 'Food & garden',
      grey: 'Residual',
      red: 'Hazardous & e-waste'
    },

    /* How each stream is named in a sentence ("the yellow bin"). */
    binWord: {
      yellow: 'yellow', blue: 'blue', green: 'green', brown: 'brown', grey: 'grey', red: 'red drop-off'
    },

    /* Item categories the classifier can return, and the stream each one goes to. */
    categories: {
      plastic:   { name: 'Plastic',              stream: 'yellow' },
      metal:     { name: 'Metal',                stream: 'yellow' },
      paper:     { name: 'Paper & cardboard',    stream: 'blue' },
      glass:     { name: 'Glass',                stream: 'green' },
      organic:   { name: 'Organic',              stream: 'brown' },
      ewaste:    { name: 'E-waste & batteries',  stream: 'red' },
      hazardous: { name: 'Hazardous',            stream: 'red' },
      textile:   { name: 'Textile',              stream: 'grey' },
      residual:  { name: 'Residual',             stream: 'grey' }
    },

    /* Demo district. One map unit is one metre, streets run every 100 m, bins sit at junctions. */
    depot: { x: 200, y: 100 },
    here: { x: 400, y: 300 },   // the "you are here" point used for the nearest-bin search

    /* fill = fill level in %, rate = % gained per hour. All values are simulated. */
    binSeed: [
      { id: 'EC-0401', x: 300,  y: 200, stream: 'yellow', fill: 92, rate: 3.2 },
      { id: 'EC-0402', x: 300,  y: 500, stream: 'blue',   fill: 41, rate: 1.8 },
      { id: 'EC-0403', x: 500,  y: 300, stream: 'green',  fill: 78, rate: 2.6 },
      { id: 'EC-0404', x: 500,  y: 700, stream: 'brown',  fill: 35, rate: 2.1 },
      { id: 'EC-0405', x: 700,  y: 200, stream: 'yellow', fill: 88, rate: 3.8 },
      { id: 'EC-0406', x: 700,  y: 500, stream: 'grey',   fill: 64, rate: 2.4 },
      { id: 'EC-0407', x: 900,  y: 300, stream: 'blue',   fill: 23, rate: 1.5 },
      { id: 'EC-0408', x: 900,  y: 700, stream: 'yellow', fill: 95, rate: 4.2 },
      { id: 'EC-0409', x: 1100, y: 200, stream: 'grey',   fill: 52, rate: 2.9 },
      { id: 'EC-0410', x: 1100, y: 500, stream: 'brown',  fill: 71, rate: 2.2 },
      { id: 'EC-0411', x: 1200, y: 700, stream: 'green',  fill: 30, rate: 1.7 },
      { id: 'EC-0412', x: 200,  y: 700, stream: 'grey',   fill: 83, rate: 3.1 },
      { id: 'EC-0413', x: 600,  y: 600, stream: 'yellow', fill: 18, rate: 2.0 },
      { id: 'EC-0414', x: 800,  y: 400, stream: 'green',  fill: 67, rate: 2.7 },
      { id: 'EC-0415', x: 1000, y: 600, stream: 'blue',   fill: 44, rate: 1.9 },
      { id: 'EC-0416', x: 400,  y: 400, stream: 'brown',  fill: 59, rate: 2.3 },
      { id: 'SP-0001', x: 200,  y: 400, stream: 'red',    fill: 27, rate: 1.2 },
      { id: 'SP-0002', x: 1200, y: 300, stream: 'red',    fill: 38, rate: 1.4 }
    ],

    /* What the drawn map shows besides streets: [[south, west], [north, east]] rectangles. */
    scenery: {
      streetsX: { from: 100, to: 1300, step: 100, major: 600 },
      streetsY: { from: 100, to: 800,  step: 100, major: 400 },
      streetExtent: { x: [40, 1360], y: [40, 860] },
      parks: [
        [[110, 810], [190, 890]],
        [[510, 410], [590, 490]],
        [[110, 1010], [190, 1090]]
      ],
      ponds: [
        [[710, 1010], [790, 1090]]
      ]
    },

    /* Pre-written results shown by the example chips, so the demo works without a camera or AI. */
    examples: [
      { item: 'Plastic water bottle', category: 'plastic', recyclable: true, confidence: 96,
        prep: 'Empty it, squash it and put the cap back on.',
        why: 'PET bottles are collected together with metal packaging.' },
      { item: 'Glass jar', category: 'glass', recyclable: true, confidence: 94,
        prep: 'Rinse it. The metal lid goes in the yellow bin.',
        why: 'Clean glass can be melted and reformed again and again.' },
      { item: 'Greasy pizza box', category: 'residual', recyclable: false, confidence: 88,
        prep: 'Tear off the clean lid for paper. The stained base goes in residual.',
        why: 'Food grease ruins paper fibres during recycling.' },
      { item: 'AA battery', category: 'ewaste', recyclable: true, confidence: 97,
        prep: 'Tape the terminals if you have several. Never put it in a normal bin.',
        why: 'Batteries can start fires in trucks and leak metals.' },
      { item: 'Banana peel', category: 'organic', recyclable: true, confidence: 95,
        prep: 'Drop it in loose. Skip plastic bags, even compostable ones.',
        why: 'Food scraps become compost and biogas.' }
    ]
  };
})(window.EC = window.EC || {});
