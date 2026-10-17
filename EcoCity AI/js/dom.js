/* dom.js
   Tiny DOM helpers shared by every module. Text always goes in through textContent or
   text nodes, so model output and sensor data can never inject markup. */
(function (EC) {
  'use strict';

  /** First element matching a CSS selector. */
  EC.$ = function (selector, root) {
    return (root || document).querySelector(selector);
  };

  /** All elements matching a CSS selector, as an array. */
  EC.$$ = function (selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  };

  /**
   * Build an element.
   *   h('div', { class: 'row', text: 'hi', onclick: fn }, child, [child, child])
   * Props: class, text, on<event> handlers, and any attribute (false/null skips it).
   * Children can be nodes, strings, numbers, arrays, or null.
   */
  EC.h = function (tag, props) {
    var el = document.createElement(tag);
    var p = props || {};
    Object.keys(p).forEach(function (key) {
      var value = p[key];
      if (key === 'class') el.className = value;
      else if (key === 'text') el.textContent = value;
      else if (key.indexOf('on') === 0) el.addEventListener(key.slice(2), value);
      else if (value !== false && value != null) el.setAttribute(key, value);
    });
    for (var i = 2; i < arguments.length; i++) {
      [].concat(arguments[i]).forEach(function (child) {
        if (child == null || child === false) return;
        el.append(child.nodeType ? child : document.createTextNode(String(child)));
      });
    }
    return el;
  };
})(window.EC = window.EC || {});
