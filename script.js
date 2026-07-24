/* aqxar.ge — someone pings you, you wait a moment, then a friendly reply. */
(function () {
  "use strict";

  var SITE_URL = "https://aqxar.ge";

  var ask   = document.querySelector(".ask");
  var say   = document.querySelector("[data-reveal]");
  var clock = document.querySelector("[data-clock]");

  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function fmt(total) {
    var m = Math.floor(total / 60);
    var s = total % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function showAll() {
    if (ask) ask.classList.add("is-typed");
    if (say) say.classList.add("is-shown");
  }

  /* ---- the ping + never-stopping wait counter, then the reveal ---- */
  function run() {
    if (!ask || !say) return;
    if (reduceMotion) { showAll(); return; }

    setTimeout(function () {
      ask.classList.add("is-typed");

      var seconds = 0;
      if (clock) clock.textContent = fmt(0);
      // the clock never stops — you're still waiting, even once you scroll on
      setInterval(function () {
        seconds += 1;
        if (clock) clock.textContent = fmt(seconds);
      }, 1000);

      setTimeout(function () {
        say.classList.add("is-shown");
      }, 2600);
    }, 1100);
  }

  /* ---- copy the link ---- */
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
    var url = btn.getAttribute("data-url") || SITE_URL;
    var resetTimer;

    btn.addEventListener("click", function () {
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
  try { run(); } catch (e) { showAll(); }
  try { wireCopy(); } catch (e) {}
})();
