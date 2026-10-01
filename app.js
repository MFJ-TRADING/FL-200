/* ============================================================
   FL-200 APP ORCHESTRATOR
   ============================================================ */
(function () {
  "use strict";

  var C = window.FL200_CONFIG;

  var APP = {
    symbol: C.ui.defaultSymbol || "BTCUSDT",
    tf: C.ui.defaultTf || "H1",
    signal: null,
    started: false,
    timer: null,
    rtTimer: null,
    heartBusy: false,
    marketBusy: false
  };

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value == null ? "—" : String(value);
  }

  function updateControls() {
    document.querySelectorAll(".symbolBtn").forEach(function (b) {
      var active = b.dataset.symbol === APP.symbol;
      b.className = active
        ? "symbolBtn rounded-md border border-cyan-400/20 bg-cyan-400/[0.08] px-2 py-1.5 font-mono text-[8px] font-bold text-cyan-200"
        : "symbolBtn rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1.5 font-mono text-[8px] font-bold text-slate-500";
    });

    document.querySelectorAll(".tfBtn").forEach(function (b) {
      var active = b.dataset.tf === APP.tf;
      b.className = active
        ? "tfBtn rounded-md border border-cyan-400/20 bg-cyan-400/[0.08] px-2 py-1.5 font-mono text-[8px] font-bold text-cyan-200"
        : "tfBtn rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1.5 font-mono text-[8px] font-bold text-slate-500";
    });
  }

  function evaluate() {
    var M = window.FL200_MARKET && window.FL200_MARKET.state;
    var H = window.FL200_HEART;
    if (!M || !H) return null;

    var candles = M.candles[APP.tf] || [];
    var depth = M.depth;
    var engine = H.getEngine();

    if (!engine || candles.length < 3) {
      APP.signal = null;
      return null;
    }

    var result = null;

    try {
      if (typeof engine.fullSignalL2 === "function" && depth) {
        result = engine.fullSignalL2(candles, depth, APP.symbol, APP.tf);
      }
      if (!result && typeof engine.fullSignal === "function") {
        result = engine.fullSignal(candles, APP.tf);
      }
    } catch (e) {
      console.error("Engine evaluation", e);
    }

    APP.signal = result;
    return result;
  }

  async function refreshHeart(force) {
    if (APP.heartBusy && !force) return;
    APP.heartBusy = true;
    try {
      await window.FL200_HEART.loadAll(!!force);
      await window.FL200_HEART.loadEngine(!!force);
      if (window.FL200_UI) window.FL200_UI.refresh(APP.signal || {});
    } catch (e) {
      console.warn("Heart refresh", e);
      if (window.FL200_UI) window.FL200_UI.pulse("Heart sync failed · " + e.message, "bad");
    } finally {
      APP.heartBusy = false;
    }
  }

  async function refreshMarket(force) {
    if (APP.marketBusy && !force) return;
    APP.marketBusy = true;
    try {
      await window.FL200_MARKET.refresh(APP.symbol);
      evaluate();
      updateControls();
      if (window.FL200_CANDLES) window.FL200_CANDLES.setSelected(APP.tf);
      if (window.FL200_UI) window.FL200_UI.refresh(APP.signal || {});
      setText("gridMeta", APP.symbol + " · " + APP.tf + " · " + new Date().toLocaleTimeString());
      setText("gridStatus", APP.signal ? (APP.signal.signal || "WAIT") + " · LIVE" : "GRID WAIT");
      setText("gridSrc", APP.signal?.src || "engine");
      setText("livePrice", window.FL200_MARKET.state.ticker[APP.symbol]);
      setText("mktLive", "ONLINE");
      setText("ageVal", "LIVE");
      setText("dataLayer", [
        "Heart: " + (window.FL200_HEART.getState() ? "READY" : "WAIT"),
        "Engine: " + (window.FL200_HEART.getEngine() ? "READY" : "WAIT"),
        "M30: " + ((window.FL200_MARKET.state.candles.M30 || []).length),
        "H1: " + ((window.FL200_MARKET.state.candles.H1 || []).length),
        "H4: " + ((window.FL200_MARKET.state.candles.H4 || []).length),
        "D1: " + ((window.FL200_MARKET.state.candles.D1 || []).length),
        "W1: " + ((window.FL200_MARKET.state.candles.W1 || []).length),
        "L2: " + (window.FL200_MARKET.state.depth ? "READY" : "WAIT")
      ].join("\n"));
      setText("mktBadge", "LIVE");
    } catch (e) {
      console.warn("Market refresh", e);
      setText("mktLive", "ERROR");
      setText("gridStatus", "FEED ERROR");
      setText("dataLayer", "Binance feed error\n" + e.message);
      if (window.FL200_UI) window.FL200_UI.pulse("Market feed error · " + e.message, "bad");
    } finally {
      APP.marketBusy = false;
    }
  }

  async function refreshAll(force) {
    await refreshHeart(force);
    await refreshMarket(force);
  }

  function start() {
    if (APP.started) return;
    APP.started = true;

    updateControls();

    document.querySelectorAll(".symbolBtn").forEach(function (button) {
      button.addEventListener("click", async function () {
        APP.symbol = button.dataset.symbol || APP.symbol;
        await refreshMarket(true);
      });
    });

    document.querySelectorAll(".tfBtn").forEach(function (button) {
      button.addEventListener("click", async function () {
        APP.tf = button.dataset.tf || APP.tf;
        updateControls();
        await refreshMarket(true);
      });
    });

    var sync = document.getElementById("btnSync");
    if (sync) sync.addEventListener("click", function () { refreshAll(true); });

    var reload = document.getElementById("btnEngineReload");
    if (reload) reload.addEventListener("click", async function () {
      try {
        await window.FL200_HEART.loadEngine(true);
        evaluate();
        if (window.FL200_UI) window.FL200_UI.refresh(APP.signal || {});
        if (window.FL200_UI) window.FL200_UI.pulse("Private engine reloaded", "ok");
      } catch (e) {
        if (window.FL200_UI) window.FL200_UI.pulse("Engine reload failed · " + e.message, "bad");
      }
    });

    refreshAll(true);

    var heartCycle = 0;
    APP.timer = setInterval(function () {
      if (window.FL200_AUTH && window.FL200_AUTH.getToken()) {
        heartCycle++;
        refreshHeart(heartCycle % 5 === 0);
      }
    }, C.pollMs || 4000);

    APP.rtTimer = setInterval(function () {
      if (window.FL200_AUTH && window.FL200_AUTH.getToken()) refreshMarket(false);
    }, C.pollMs || 4000);
  }

  document.addEventListener("fl200:unlock", start);

  document.addEventListener("fl200:lock", function () {
    APP.started = false;
    if (APP.timer) clearInterval(APP.timer);
    if (APP.rtTimer) clearInterval(APP.rtTimer);
    APP.timer = null;
    APP.rtTimer = null;
  });

  window.addEventListener("resize", function () {
    if (window.FL200_CANDLES) window.FL200_CANDLES.render();
  });

  window.FL200_APP = APP;
  APP.refreshAll = refreshAll;
  APP.refreshHeart = refreshHeart;
  APP.refreshMarket = refreshMarket;
})();
