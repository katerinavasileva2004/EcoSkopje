/* ai.js
   Waste classification from a photo. Two interchangeable providers sit behind one function:

     EC.ai.init()                  -> decides which provider is usable, resolves { ready, provider, message }
     EC.ai.classify(file, opts)    -> resolves a clean result object, rejects { code, message }

   Providers
     claude  the Claude viewer's built-in vision (works inside claude.ai artifacts, no key)
     gemini  Google Gemini API (for your own hosting; key goes in config.js)

   To add another model, write a provider with the same shape:
     { name: 'x', classify: function (file, signal) { return Promise<object with the JSON fields> } }
   and return it from pickProvider(). Everything else in the app stays the same. */
(function (EC) {
  'use strict';

  var cfg = EC.config.ai;
  var active = null;

  /* ---------- the question we ask the model ---------- */

  var PROMPT =
    'You are the waste-sorting engine of EcoCity AI, a municipal recycling app. ' +
    'The attached photo shows one item a resident wants to throw away. ' +
    'Identify the single main item and say where it belongs.\n\n' +
    'Reply with only one JSON object in exactly this shape:\n' +
    '{"is_waste":true,"item":"Plastic water bottle","category":"plastic","recyclable":true,"confidence":93,' +
    '"prep":"Empty it and put the cap back on.","why":"PET is collected with metal packaging."}\n\n' +
    'category must be one of: ' +
    'plastic (bottles, tubs, wrappers, packaging), metal (cans, foil, lids), paper (paper, cardboard, cartons), ' +
    'glass (bottles, jars), organic (food scraps, garden waste), ewaste (electronics, cables, batteries, bulbs), ' +
    'hazardous (paint, chemicals, medicines, aerosols, oil), textile (clothes, shoes), ' +
    'residual (non-recyclable, mixed, soiled, ceramics, hygiene items).\n' +
    'confidence is your certainty from 0 to 100. If the photo shows no discardable item, set is_waste to false ' +
    'and put what you see in item. Keep item under 40 characters and prep and why under 110 characters each. ' +
    'Use plain English and no markdown.';

  /* ---------- clean up whatever the model returned ---------- */

  function text(value, max) {
    return (typeof value === 'string' ? value : '').trim().slice(0, max);
  }

  function clamp(n, lo, hi) {
    n = Number(n);
    return isFinite(n) ? Math.max(lo, Math.min(hi, n)) : lo;
  }

  /** Never trust model output: force it into the shape the UI expects. */
  function normalize(raw) {
    var r = raw && typeof raw === 'object' ? raw : {};
    var category = EC.data.categories[r.category] ? r.category : 'residual';
    return {
      is_waste: r.is_waste !== false,
      item: text(r.item, 60) || 'Unidentified item',
      category: category,
      recyclable: r.recyclable === true,
      confidence: Math.round(clamp(r.confidence, 0, 100)),
      prep: text(r.prep, 160),
      why: text(r.why, 160)
    };
  }

  /* ---------- user-facing error text, keyed by error code ---------- */

  var MESSAGES = {
    not_granted: 'Scanning needs your OK to use Claude. Reload the page and allow it, or try an example.',
    sampling_disabled: 'Claude is not available on this account, so live scanning is off. Examples still work.',
    images_unavailable: 'This viewer cannot send photos to Claude. Examples still work.',
    bad_key: 'The Gemini API key was rejected. Check geminiApiKey in js/config.js.',
    rate_limited: 'Too many scans in a short time. Wait a minute, then scan again.',
    image_rejected: 'That photo could not be read. Use a JPEG or PNG under 20 MB.',
    refused: 'That photo could not be sorted. Try a clearer photo of one item.',
    empty_completion: 'No answer came back. Try again with a closer photo.',
    invalid_json: 'The answer could not be read. Try the photo again.',
    session_expired: 'Your Claude session expired. Sign in again, then retry.',
    upstream_error: 'The connection dropped. Scan again.'
  };

  /** Codes that mean scanning cannot work until something is changed, so the buttons switch off. */
  var FATAL = ['not_granted', 'sampling_disabled', 'images_unavailable', 'bad_key',
               'not_declared', 'capability_disabled', 'capability_removed'];

  function errorText(code) {
    return MESSAGES[code] || 'Scanning is not available right now.';
  }

  /* ---------- provider: Claude viewer ---------- */

  function claudeProvider(sample) {
    return {
      name: 'claude',
      classify: function (file, signal) {
        return sample.json(PROMPT, { images: file, modelTier: 'quick', signal: signal });
      }
    };
  }

  /* ---------- provider: Google Gemini ---------- */

  /** Shrink a photo and return it as base64 JPEG, so uploads stay small and fast. */
  async function toJpegBase64(file, maxEdge) {
    var bitmap = await createImageBitmap(file);
    var scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    var w = Math.round(bitmap.width * scale);
    var h = Math.round(bitmap.height * scale);
    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
    if (bitmap.close) bitmap.close();
    var blob = await new Promise(function (resolve) { canvas.toBlob(resolve, 'image/jpeg', 0.85); });
    var bytes = new Uint8Array(await blob.arrayBuffer());
    var binary = '';
    for (var i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    }
    return btoa(binary);
  }

  /** Parse JSON even if the model wrapped it in a code fence or added a sentence. */
  function parseJson(raw) {
    try { return JSON.parse(raw); } catch (e) { /* fall through */ }
    var match = /\{[\s\S]*\}/.exec(raw);
    if (match) { try { return JSON.parse(match[0]); } catch (e2) { /* fall through */ } }
    throw { code: 'invalid_json', message: 'Model did not return JSON.' };
  }

  function geminiProvider() {
    return {
      name: 'gemini',
      classify: async function (file, signal) {
        var image;
        try { image = await toJpegBase64(file, cfg.maxImageEdge); }
        catch (e) { throw { code: 'image_rejected', message: 'Could not decode the photo.' }; }

        var url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
                  encodeURIComponent(cfg.geminiModel) + ':generateContent';
        var response;
        try {
          response = await fetch(url, {
            method: 'POST',
            signal: signal,
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.geminiApiKey },
            body: JSON.stringify({
              contents: [{ parts: [{ text: PROMPT }, { inlineData: { mimeType: 'image/jpeg', data: image } }] }],
              generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
            })
          });
        } catch (e) {
          if (e && e.name === 'AbortError') throw { code: 'cancelled', message: 'Stopped.' };
          throw { code: 'upstream_error', message: 'Network error.' };
        }

        if (response.status === 400 || response.status === 401 || response.status === 403) {
          throw { code: 'bad_key', message: 'HTTP ' + response.status };
        }
        if (response.status === 429) throw { code: 'rate_limited', message: 'HTTP 429' };
        if (!response.ok) throw { code: 'upstream_error', message: 'HTTP ' + response.status };

        var data = await response.json();
        var parts = data && data.candidates && data.candidates[0] && data.candidates[0].content &&
                    data.candidates[0].content.parts;
        if (!parts || !parts[0] || !parts[0].text) throw { code: 'refused', message: 'No answer returned.' };
        return parseJson(parts[0].text);
      }
    };
  }

  /* ---------- choosing a provider ---------- */

  async function claudeIfAvailable() {
    try {
      var sample = window.claude && window.claude.use ? await window.claude.use('sample') : null;
      if (!sample) return null;
      var limits = await sample.limits().catch(function () { return null; });
      return limits && limits.images ? claudeProvider(sample) : null;
    } catch (e) {
      return null;
    }
  }

  async function pickProvider() {
    var want = cfg.provider;
    if (want === 'none') return { provider: null, message: 'Live scanning is switched off in js/config.js.' };

    if (want === 'auto' || want === 'claude') {
      var claude = await claudeIfAvailable();
      if (claude) return { provider: claude };
      if (want === 'claude') {
        return { provider: null, message: 'Live scanning needs the Claude viewer with photo access. The examples still work.' };
      }
    }
    if ((want === 'auto' || want === 'gemini') && cfg.geminiApiKey) return { provider: geminiProvider() };

    return {
      provider: null,
      message: want === 'gemini'
        ? 'Add a Gemini API key in js/config.js to turn on live scanning. The examples still work.'
        : 'Live scanning needs the Claude viewer or a Gemini key in js/config.js. The examples still work.'
    };
  }

  /* ---------- public API ---------- */

  /** Decide which provider to use. Call once at start-up. */
  async function init() {
    var pick = await pickProvider();
    active = pick.provider;
    return { ready: !!active, provider: active ? active.name : null, message: pick.message || '' };
  }

  /** Switch the provider off for the rest of the page's life (after a fatal error). */
  function disable() { active = null; }

  /**
   * Identify the item in a photo (a File or Blob).
   * opts.signal is an AbortSignal from the Stop button.
   * Resolves the normalized result; rejects { code, message }.
   */
  async function classify(file, opts) {
    if (!active) throw { code: 'capability_disabled', message: 'No AI provider is ready.' };
    var raw = await active.classify(file, opts && opts.signal);
    return normalize(raw);
  }

  EC.ai = {
    init: init,
    disable: disable,
    classify: classify,
    normalize: normalize,
    errorText: errorText,
    isFatal: function (code) { return FATAL.indexOf(code) > -1; }
  };
})(window.EC = window.EC || {});
