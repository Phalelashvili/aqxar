/* aqxar.ge — the ping + wait, plus customisable sample names shared via the URL. */
(function () {
  "use strict";

  var SITE_URL = "https://aqxar.ge";
  var DEFAULTS = { from: "არისტოტელე", to: "ზურა" };
  var MAX = 24;

  /* ---- Georgian <-> Latin: bijective, case-sensitive, one char each way ----
     Names travel in the URL as Latin (clean, no %-encoding) and are recovered
     back to Georgian on load. The name inputs use the same map so the field is
     always Georgian, whatever keyboard you type on. */
  var GE2LAT = {
    "ა": "a", "ბ": "b", "გ": "g", "დ": "d", "ე": "e", "ვ": "v", "ზ": "z", "თ": "T",
    "ი": "i", "კ": "k", "ლ": "l", "მ": "m", "ნ": "n", "ო": "o", "პ": "p", "ჟ": "J",
    "რ": "r", "ს": "s", "ტ": "t", "უ": "u", "ფ": "f", "ქ": "q", "ღ": "R", "ყ": "y",
    "შ": "S", "ჩ": "C", "ც": "c", "ძ": "Z", "წ": "w", "ჭ": "W", "ხ": "x", "ჯ": "j",
    "ჰ": "h"
  };
  var LAT2GE = {};
  for (var g in GE2LAT) { LAT2GE[GE2LAT[g]] = g; }

  // obscure names in the URL with a fixed shift over the 33-letter Latin
  // alphabet, so the link never spells the names out
  var LAT_ORDER = Object.keys(GE2LAT).map(function (k) { return GE2LAT[k]; });
  var SHIFT = 7;
  function shiftLat(s, dir) {
    var out = "";
    for (var i = 0; i < s.length; i++) {
      var idx = LAT_ORDER.indexOf(s[i]);
      out += idx < 0 ? s[i] : LAT_ORDER[((idx + dir * SHIFT) % 33 + 33) % 33];
    }
    return out;
  }
  function encodeName(geo) { return shiftLat(geoToLat(geo), 1); }
  function decodeName(enc) { return toGeorgian(shiftLat(enc, -1)); }

  // keep only Georgian letters (+ spaces); convert any Latin to Georgian on the way
  function toGeorgian(s) {
    var out = "";
    for (var i = 0; i < s.length && out.length < MAX; i++) {
      var ch = s[i];
      if (GE2LAT[ch]) out += ch;               // already Georgian
      else if (LAT2GE[ch]) out += LAT2GE[ch];   // Latin -> Georgian
      else if (ch === " ") out += " ";
    }
    return out;
  }

  function geoToLat(s) {
    var out = "";
    for (var i = 0; i < s.length; i++) {
      out += GE2LAT[s[i]] || (s[i] === " " ? " " : "");
    }
    return out;
  }

  /* ---- names in the sample chats ---- */
  function setName(role, name) {
    var val = name || DEFAULTS[role];
    document.querySelectorAll(".nm-" + role).forEach(function (el) {
      el.textContent = val;
    });
  }

  function initNames() {
    var p = new URLSearchParams(location.search);
    ["from", "to"].forEach(function (role) {
      var raw = p.get(role);
      var name = (raw ? decodeName(raw) : "") || DEFAULTS[role];
      setName(role, name);
      var input = document.querySelector('.nm-input[data-role="' + role + '"]');
      if (input) input.value = name;
    });
  }

  function wireNameInputs() {
    document.querySelectorAll(".nm-input").forEach(function (input) {
      var role = input.getAttribute("data-role");
      input.addEventListener("input", function () {
        var pos = input.selectionStart;
        var before = input.value;
        var after = toGeorgian(before);
        if (after !== before) {
          input.value = after;
          var np = Math.min(pos, after.length);
          try { input.setSelectionRange(np, np); } catch (e) {}
        }
        setName(role, after); // live update; empty falls back to the default
      });
    });
  }

  function shareUrl() {
    var fi = document.querySelector('.nm-input[data-role="from"]');
    var ti = document.querySelector('.nm-input[data-role="to"]');
    var f = (fi && fi.value) || DEFAULTS.from;
    var t = (ti && ti.value) || DEFAULTS.to;
    if (f === DEFAULTS.from && t === DEFAULTS.to) return SITE_URL;
    return SITE_URL + "/?from=" + encodeURIComponent(encodeName(f)) +
                       "&to=" + encodeURIComponent(encodeName(t));
  }

  /* ---- sample timestamps anchored to the reader's current time ----
     minutes-ago for each message, so every chat reads as a recent, staggered
     conversation with the messages a couple of minutes apart */
  var TIMES = [
    [125, 123, 122, 120], // just "გამარჯობა"
    [52, 50, 49, 47],      // just "აქ ხარ?"
    [24, 22, 21, 19],      // just a name
    [8, 6]                 // the whole question
  ];
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function setTimes() {
    var now = Date.now();
    document.querySelectorAll(".convo").forEach(function (convo, ci) {
      var mins = TIMES[ci];
      if (!mins) return;
      convo.querySelectorAll("time").forEach(function (t, mi) {
        if (mins[mi] == null) return;
        var d = new Date(now - mins[mi] * 60000);
        t.textContent = pad(d.getHours()) + ":" + pad(d.getMinutes());
      });
    });
  }

  /* ---- the ping + never-stopping wait counter, then the reveal ---- */
  var ask = document.querySelector(".ask");
  var say = document.querySelector("[data-reveal]");
  var clock = document.querySelector("[data-clock]");
  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var waitSeconds = 0;
  var baseTitle = document.title;
  var counterStarted = false;

  function fmt(total) {
    var m = Math.floor(total / 60);
    var s = total % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }
  function showAll() {
    if (ask) ask.classList.add("is-typed");
    if (say) say.classList.add("is-shown");
  }
  // one wait-counter drives both the hero clock and the tab title
  function startCounter() {
    if (counterStarted) return;
    counterStarted = true;
    if (clock) clock.textContent = fmt(0);
    setInterval(function () {
      waitSeconds += 1;
      if (clock) clock.textContent = fmt(waitSeconds);
      if (document.hidden) document.title = "გელოდები " + fmt(waitSeconds);
    }, 1000);
  }
  function run() {
    if (!ask || !say) return;
    if (reduceMotion) { showAll(); startCounter(); return; }
    setTimeout(function () {
      ask.classList.add("is-typed");
      startCounter();
      setTimeout(function () { say.classList.add("is-shown"); }, 2600);
    }, 1100);
  }
  // switch away and the tab title keeps count of how long you've kept it waiting
  document.addEventListener("visibilitychange", function () {
    document.title = document.hidden ? "გელოდები " + fmt(waitSeconds) : baseTitle;
  });

  /* ---- copy the (possibly customised) link ---- */
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }
  function wireCopy() {
    var btn = document.querySelector("[data-copy]");
    if (!btn) return;
    var label = btn.querySelector("[data-copy-label]");
    var original = label ? label.textContent : "";
    var resetTimer;
    btn.addEventListener("click", function () {
      var url = shareUrl();
      var done = function (ok) {
        if (!label) return;
        label.textContent = ok ? "დაკოპირდა" : url;
        btn.classList.toggle("is-done", ok);
        clearTimeout(resetTimer);
        resetTimer = setTimeout(function () {
          label.textContent = original;
          btn.classList.remove("is-done");
        }, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () { done(true); },
          function () { done(fallbackCopy(url)); });
      } else {
        done(fallbackCopy(url));
      }
    });
  }

  // run each independently; a failure in one must never leave the page hidden
  try { initNames(); } catch (e) {}
  try { setTimes(); } catch (e) {}
  try { wireNameInputs(); } catch (e) {}
  try { run(); } catch (e) { showAll(); }
  try { wireCopy(); } catch (e) {}
})();
