/* scanner.js
   The Scan panel: pick or take a photo, send it to the AI, show the result, keep a short log.
   All AI work is in ai.js; this file only handles the screen. */
(function (EC) {
  'use strict';

  var $ = EC.$, h = EC.h;
  var MAX_LOG = 6;

  var controller = null;   // AbortController of the scan in progress
  var photoUrl = null;     // object URL of the photo on screen
  var log = [];

  /* ---------- status line and buttons ---------- */

  function setStatus(message, isError, showStop) {
    var el = $('#status');
    el.textContent = '';
    el.className = 'status' + (isError ? ' err' : '');
    el.append(message);
    if (showStop) {
      el.append(h('button', {
        class: 'btn small', type: 'button',
        onclick: function () { if (controller) controller.abort(); }
      }, 'Stop'));
    }
  }

  function setScanEnabled(on) {
    ['#lbl-cam', '#lbl-pick'].forEach(function (sel) { $(sel).classList.toggle('is-off', !on); });
    $('#in-cam').disabled = !on;
    $('#in-pick').disabled = !on;
  }

  /* ---------- result card ---------- */

  function showResult(r, isExample) {
    var box = $('#result');
    box.textContent = '';

    if (!r.is_waste) {
      box.append(h('div', { class: 'result' }, h('div', { class: 'body' },
        h('div', { class: 'item', text: 'No item to sort' }),
        h('p', { class: 'muted', text: 'The photo shows ' + r.item.toLowerCase() + '. Point the camera at the thing you want to throw away.' }))));
      return;
    }

    var category = EC.data.categories[r.category];
    var stream = category.stream;
    var color = 'var(--s-' + stream + ')';
    var word = EC.data.binWord[stream];

    var head = h('div', { class: 'head', style: '--c:' + color },
      h('span', { class: 'chip', style: '--c:' + color }, h('span', { class: 'dot', style: '--c:' + color }), category.name),
      h('span', { class: 'tag ' + (r.recyclable ? 'yes' : 'no'), text: r.recyclable ? 'Recyclable' : 'Not recyclable' }),
      isExample ? h('span', { class: 'tag demo', text: 'Example' }) : null);

    var body = h('div', { class: 'body' },
      h('div', { class: 'item', text: r.item }),
      h('div', { class: 'goes' },
        h('span', { class: 'eyebrow', text: 'Goes in' }),
        h('span', {}, h('b', { text: 'The ' + word + ' bin' }), ' · ' + EC.data.streams[stream])),
      h('dl', { class: 'facts' },
        r.prep ? h('div', {}, h('dt', { text: 'Prepare' }), h('dd', { text: r.prep })) : null,
        r.why ? h('div', {}, h('dt', { text: 'Why' }), h('dd', { text: r.why })) : null),
      h('div', { class: 'conf' },
        h('span', { text: r.confidence + '% sure' }),
        h('span', { class: 'track' }, h('i', { style: 'width:' + r.confidence + '%' }))),
      h('button', { class: 'btn primary', type: 'button', onclick: function () { EC.nearest.find(stream); } },
        'Show nearest ' + word + ' bin'));

    box.append(h('div', { class: 'result' }, head, body));
  }

  /* ---------- scan log ---------- */

  function renderLog() {
    var list = $('#log');
    list.textContent = '';
    if (!log.length) {
      list.append(h('li', { class: 'empty muted', text: 'Nothing scanned yet.' }));
      return;
    }
    log.forEach(function (entry) {
      var r = entry.result;
      var category = EC.data.categories[r.category];
      var thumb = entry.photo
        ? h('img', { class: 'th', src: entry.photo, alt: '' })
        : h('span', { class: 'th' }, h('span', { class: 'dot', style: '--c:var(--s-' + category.stream + ')' }));
      var t = entry.time;
      var clock = t.getHours() + ':' + (t.getMinutes() < 10 ? '0' : '') + t.getMinutes();
      list.append(h('li', {},
        thumb,
        h('div', { class: 'nm' },
          h('b', { text: r.is_waste ? r.item : 'No item' }),
          h('div', { class: 'muted', text: r.is_waste ? category.name + ' → ' + EC.data.binWord[category.stream] + ' bin' : 'Nothing to sort' })),
        h('span', { class: 'tm', text: (entry.example ? 'example ' : '') + clock })));
    });
  }

  function addToLog(result, photo, isExample) {
    log.unshift({ result: result, photo: photo, example: isExample, time: new Date() });
    log = log.slice(0, MAX_LOG);
    renderLog();
  }

  /* ---------- scanning ---------- */

  async function scan(file) {
    if (controller) controller.abort();
    var mine = new AbortController();
    controller = mine;

    if (photoUrl) URL.revokeObjectURL(photoUrl);
    photoUrl = URL.createObjectURL(file);
    var img = $('#shot');
    img.src = photoUrl;
    img.hidden = false;
    $('#hint').hidden = true;
    $('#vf').classList.add('busy');
    $('#result').textContent = '';
    setStatus('Identifying the item…', false, true);

    try {
      var result = await EC.ai.classify(file, { signal: mine.signal });
      setStatus(result.is_waste ? 'Done.' : 'Nothing recognisable in that photo.', false);
      showResult(result, false);
      addToLog(result, photoUrl, false);
    } catch (e) {
      var code = e && e.code;
      if (code === 'cancelled') {
        setStatus('Scan stopped.', false);
      } else {
        setStatus(EC.ai.errorText(code), true);
        if (EC.ai.isFatal(code)) { EC.ai.disable(); setScanEnabled(false); }
      }
    } finally {
      if (controller === mine) controller = null;
      $('#vf').classList.remove('busy');
    }
  }

  function onFileChosen(event) {
    var file = event.target.files && event.target.files[0];
    event.target.value = '';   // lets the same photo be chosen again
    if (file) scan(file);
  }

  /* ---------- examples (work with no camera and no AI) ---------- */

  function renderExamples() {
    var box = $('#examples');
    EC.data.examples.forEach(function (example) {
      box.append(h('button', {
        class: 'ex', type: 'button',
        onclick: function () {
          var result = EC.ai.normalize(example);
          $('#shot').hidden = true;
          $('#hint').hidden = false;
          setStatus('Showing an example result. Scan a real item with the buttons above.', false);
          showResult(result, true);
          addToLog(result, null, true);
        }
      }, example.item));
    });
  }

  /* ---------- start-up ---------- */

  async function init() {
    $('#in-cam').addEventListener('change', onFileChosen);
    $('#in-pick').addEventListener('change', onFileChosen);
    renderExamples();
    renderLog();

    var status = await EC.ai.init();
    if (status.ready) {
      setScanEnabled(true);
      setStatus('Ready. Take a photo or choose one from your gallery.', false);
    } else {
      setStatus(status.message, false);
    }
  }

  EC.scanner = { init: init };
})(window.EC = window.EC || {});
