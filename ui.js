/* ============================================================
   FL-200 UI / PRESENTATION LAYER
   ============================================================ */
(function () {
  "use strict";

  var C = window.FL200_CONFIG;

  function esc(v) {
    if (v == null) return "";
    return String(v)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function num(v, d) {
    d = d == null ? 2 : d;
    var n = Number(v);
    if (!Number.isFinite(n)) return "—";
    return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  }

  function txt(id, v) {
    var n = document.getElementById(id);
    if (n) n.textContent = v == null || v === "" ? "—" : String(v);
  }

  function tone(signal) {
    if (signal === "BUY") return "text-emerald-300";
    if (signal === "SELL") return "text-rose-300";
    return "text-slate-300";
  }

  function mini(label, value) {
    return `
      <div class="flex items-center justify-between rounded-xl border border-white/[0.04] bg-black/20 px-3 py-2.5">
        <span class="text-[8px] uppercase tracking-[0.12em] text-slate-600">${esc(label)}</span>
        <span class="font-mono text-[9px] font-bold text-slate-300">${esc(value)}</span>
      </div>
    `;
  }

  function model(name, m) {
    m = m || {};
    var bias = m.bias || "HOLD";
    return `
      <button type="button" data-model="${esc(name)}" class="w-full rounded-xl border border-white/[0.05] bg-black/20 p-3 text-left hover:border-cyan-400/10">
        <div class="flex items-center justify-between">
          <span class="font-display text-[9px] font-bold tracking-wider text-white">${esc(name)}</span>
          <span class="font-mono text-[9px] font-bold ${tone(bias)}">${esc(bias)}</span>
        </div>
        <div class="mt-1 flex items-center justify-between gap-2">
          <span class="truncate text-[8px] text-slate-600">${esc(m.reasoning || "—")}</span>
          <span class="font-mono text-[8px] text-slate-500">${m.confidence == null ? "—" : m.confidence + "%"}</span>
        </div>
      </button>
    `;
  }

  function deepFind(obj, keys, depth) {
    depth = depth || 0;
    if (!obj || typeof obj !== "object" || depth > 7) return undefined;
    for (var i = 0; i < keys.length; i++) {
      if (Object.prototype.hasOwnProperty.call(obj, keys[i])) return obj[keys[i]];
    }
    var ks = Object.keys(obj);
    for (var j = 0; j < ks.length; j++) {
      var found = deepFind(obj[ks[j]], keys, depth + 1);
      if (found !== undefined) return found;
    }
    return undefined;
  }

  function formatTime(v) {
    if (v == null || v === "") return "—";
    if (typeof v === "number" || /^\d+$/.test(String(v))) {
      var n = Number(v);
      return new Date(n > 10000000000 ? n : n * 1000).toLocaleString();
    }
    return String(v);
  }

  function pulse(message, kind) {
    var box = document.getElementById("pulseBox");
    if (!box) return;
    box.textContent = message;
    box.className =
      kind === "bad"
        ? "rounded-full border border-rose-400/15 bg-rose-400/[0.05] px-3 py-1.5 text-[9px] font-bold text-rose-300"
        : kind === "ok"
          ? "rounded-full border border-emerald-400/15 bg-emerald-400/[0.05] px-3 py-1.5 text-[9px] font-bold text-emerald-300"
          : "rounded-full border border-cyan-400/15 bg-cyan-400/[0.05] px-3 py-1.5 text-[9px] font-bold text-cyan-200";
  }

  function renderDecision(signal) {
    signal = signal || {};
    var s = signal.signal || "WAIT";
    var plan = signal.entryPlan || null;
    var l2 = signal.l2 || {};
    var conf = signal.confidence;

    txt("recSym", window.FL200_APP ? window.FL200_APP.symbol : C.ui.defaultSymbol);
    txt("recSym2", window.FL200_APP ? window.FL200_APP.symbol : C.ui.defaultSymbol);
    txt("recTF", window.FL200_APP ? window.FL200_APP.tf : C.ui.defaultTf);
    txt("recAction", s);
    txt("recEntry", plan && plan.entry != null ? num(plan.entry) : "—");
    txt("recBy", signal.src || "realtime-engine");
    txt("l2ImbMini", l2.imb == null ? "—" : Number(l2.imb).toFixed(1) + "%");
    txt("recNote", (signal.final && signal.final.why) || "Waiting for engine evaluation…");
    txt("finStrip", s === "WAIT" ? "SIGNAL ONLY" : s + " · " + (conf == null ? "—" : conf + "%"));

    var action = document.getElementById("recAction");
    if (action) action.className = "mt-2 font-display text-2xl font-bold tracking-wider " + tone(s);
  }

  function renderPlan(signal) {
    signal = signal || {};
    var plan = signal.entryPlan || {};
    var s = signal.signal || "WAIT";
    txt("actSig", s);
    txt("actEntry", plan.entry == null ? "—" : num(plan.entry));
    txt("actTp", plan.tp == null ? "—" : num(plan.tp));
    txt("actSl", plan.sl == null ? "—" : num(plan.sl));
    txt("actTime", new Date().toLocaleTimeString());
    txt("actNote", (signal.final && signal.final.why) || "No active setup.");
    txt("actStat", s === "WAIT" ? "WAIT" : "SIGNAL");
  }

  function renderL2(signal) {
    var l2 = signal && signal.l2;
    var box = document.getElementById("l2Row");
    if (!box) return;
    if (!l2) {
      box.innerHTML = `<div class="text-[9px] text-slate-600">Realtime L2 unavailable.</div>`;
      return;
    }
    box.innerHTML = [
      mini("Bid", num(l2.bid)),
      mini("Ask", num(l2.ask)),
      mini("Mid", num(l2.mid)),
      mini("Spread", num(l2.spread, 4)),
      mini("Imbalance", l2.imb == null ? "—" : Number(l2.imb).toFixed(1) + "%"),
      mini("Bid Walls", String((l2.walls_b || []).length)),
      mini("Ask Walls", String((l2.walls_a || []).length))
    ].join("");
  }

  function renderModels(signal) {
    var models = signal && signal.models || {};
    var indicators = signal && signal.indicators || {};
    var box = document.getElementById("modelGrid");
    if (box) {
      box.innerHTML = [
        model("GRID", models.grid),
        model("L2", models.l2),
        model("QUANT", models.quant),
        model("TAURUS", models.taurus)
      ].join("");
    }
    var engineBox = document.getElementById("engGrid");
    if (engineBox) {
      engineBox.innerHTML = [
        mini("RSI", indicators.RSI == null ? "—" : indicators.RSI),
        mini("MACD-H", indicators["MACD-HIST"] == null ? "—" : indicators["MACD-HIST"]),
        mini("EMA20", indicators.EMA20 || "—"),
        mini("EMA50", indicators.EMA50 || "—")
      ].join("");
    }
    txt("engWhy", signal && signal.final && signal.final.why || "No engine output yet.");
  }

  function renderTicker() {
    var market = window.FL200_MARKET && window.FL200_MARKET.state;
    if (!market) return;
    var btc = market.ticker.BTCUSDT;
    var eth = market.ticker.ETHUSDT;
    var active = window.FL200_APP && market.ticker[window.FL200_APP.symbol];
    var ticker = document.getElementById("ticker");
    if (!ticker) return;
    ticker.innerHTML = `
      <div class="flex min-h-[28px] items-center justify-between gap-3 overflow-hidden py-1">
        <div class="flex min-w-0 items-center gap-2">
          <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300"></span>
          <span class="text-[7px] font-bold uppercase tracking-[0.16em] text-slate-700">LIVE</span>
          <span id="sdSrc" class="truncate text-[7px] uppercase tracking-[0.08em] text-slate-600">BINANCE + HEART ENGINE</span>
        </div>
        <div class="flex shrink-0 items-center gap-4 font-mono text-[8px]">
          <span class="text-slate-500">BTC ${btc == null ? "—" : num(btc)}</span>
          <span class="text-slate-500">ETH ${eth == null ? "—" : num(eth)}</span>
          <span class="text-cyan-300/70">${window.FL200_APP ? esc(window.FL200_APP.symbol) : "BTCUSDT"} ${active == null ? "—" : num(active)}</span>
        </div>
      </div>
    `;
  }

  function renderPillars() {
    var state = window.FL200_HEART && window.FL200_HEART.getState();
    var source = state && (state.pillars || state.pillarScores || (state.scores && state.scores.pillars)) || {};
    var names = C.pillarNames || {};
    var arr = Object.keys(names).map(function (key) {
      var raw = source[key] != null ? source[key] : source[key.toLowerCase()];
      var score = null;
      if (typeof raw === "number") score = raw <= 1 ? raw * 100 : raw;
      else if (raw && typeof raw === "object") score = raw.score != null ? raw.score : raw.value;
      return { key: key, name: names[key], score: score };
    });
    var valid = arr.map(function (x) { return Number(x.score); }).filter(Number.isFinite);
    var avg = valid.length ? valid.reduce(function (a, b) { return a + b; }, 0) / valid.length : null;
    txt("pillarScore", avg == null ? "—" : Math.round(avg) + " / 100");

    var miniHtml = arr.map(function (x) {
      var s = Number.isFinite(Number(x.score)) ? Math.max(0, Math.min(100, Number(x.score))) : 0;
      return `<div class="rounded-xl border border-white/[0.05] bg-black/20 p-2.5"><div class="flex justify-between"><span class="font-mono text-[9px] font-bold text-slate-300">${x.key}</span><span class="font-mono text-[9px] text-slate-500">${Number.isFinite(Number(x.score)) ? Math.round(s) : "—"}</span></div><div class="mt-1 text-[7px] uppercase tracking-wider text-slate-600">${esc(x.name)}</div><div class="mt-2 h-1 rounded-full bg-white/[0.04]"><div class="h-full rounded-full bg-cyan-300/55" style="width:${s}%"></div></div></div>`;
    }).join("");
    var box = document.getElementById("pillarGrid");
    if (box) box.innerHTML = miniHtml;
    var page = document.getElementById("pillarPageGrid");
    if (page) page.innerHTML = arr.map(function (x) {
      var s = Number.isFinite(Number(x.score)) ? Math.max(0, Math.min(100, Number(x.score))) : 0;
      return `<div class="rounded-3xl border border-white/[0.07] bg-[#070c16] p-5"><div class="flex justify-between"><div><div class="font-display text-sm font-bold text-white">${x.key}</div><div class="mt-2 text-[8px] uppercase tracking-[0.18em] text-slate-600">${esc(x.name)}</div></div><div class="font-mono text-xl font-bold text-cyan-200">${Number.isFinite(Number(x.score)) ? Math.round(s) : "—"}</div></div><div class="mt-4 h-1.5 rounded-full bg-white/[0.04]"><div class="h-full rounded-full bg-cyan-300/55" style="width:${s}%"></div></div></div>`;
    }).join("");
  }

  function renderLedger() {
    var ledger = window.FL200_HEART && window.FL200_HEART.getLedger() || [];
    var box = document.getElementById("ledgerBox");
    var hist = document.getElementById("histBox");
    if (!box) return;
    if (!ledger.length) {
      box.innerHTML = `<div class="text-[9px] text-slate-600">No ledger entries.</div>`;
      if (hist) hist.innerHTML = `<div class="text-[9px] text-slate-600">No decision history.</div>`;
      return;
    }
    var rows = ledger.slice(-100).reverse();
    box.innerHTML = `<div class="min-w-[820px]"><div class="grid grid-cols-[140px_90px_90px_1fr_110px] gap-2 border-b border-white/[0.05] pb-2 text-[7px] uppercase tracking-wider text-slate-700"><div>TIME</div><div>SYMBOL</div><div>SIGNAL</div><div>DETAIL</div><div>HASH</div></div>${rows.map(function (item) {
      var signal = item.signal || (item.final && item.final.signal) || item.action || "EVENT";
      var symbol = item.symbol || item.sym || "—";
      var detail = item.reason || item.why || item.message || (item.final && item.final.why) || "Ledger event";
      var time = item.time || item.timestamp || item.ts || item.created_at || "—";
      var hash = item.hash || item.digest || item.sha256 || "—";
      return `<div class="grid grid-cols-[140px_90px_90px_1fr_110px] gap-2 border-b border-white/[0.03] py-2 text-[8px]"><div class="font-mono text-slate-600">${esc(formatTime(time))}</div><div class="font-mono text-slate-300">${esc(symbol)}</div><div class="font-display font-bold ${tone(signal)}">${esc(signal)}</div><div class="truncate text-slate-500">${esc(detail)}</div><div class="truncate font-mono text-[7px] text-slate-700">${esc(String(hash).slice(0,18))}</div></div>`;
    }).join("")}</div>`;
    txt("ledgerMeta", "ledger.jsonl · " + ledger.length + " entries");
    if (hist) hist.innerHTML = rows.slice(0,30).map(function (item) {
      var signal = item.signal || (item.final && item.final.signal) || item.action || "EVENT";
      return `<div class="flex items-center justify-between gap-3 rounded-xl border border-white/[0.04] bg-black/20 px-3 py-2.5"><div class="min-w-0"><div class="font-display text-[9px] font-bold ${tone(signal)}">${esc(signal)}</div><div class="mt-1 truncate text-[8px] text-slate-600">${esc(item.reason || item.why || item.message || "")}</div></div><div class="font-mono text-[7px] text-slate-700">${esc(formatTime(item.time || item.timestamp || item.ts || "—"))}</div></div>`;
    }).join("");
  }

  function renderScore() {
    var perf = window.FL200_HEART && window.FL200_HEART.getPerf();
    var ledger = window.FL200_HEART && window.FL200_HEART.getLedger() || [];
    var source = perf || {};
    var total = Number(deepFind(source, ["totalTrades", "total"]));
    var wins = Number(deepFind(source, ["wins", "win", "winningTrades"]));
    var losses = Number(deepFind(source, ["losses", "loss", "losingTrades"]));
    var open = Number(deepFind(source, ["openTrades", "open"]));
    var wr = Number(deepFind(source, ["winRate", "wr", "accuracy"]));
    if (!Number.isFinite(total)) total = ledger.length;
    if (!Number.isFinite(wins)) wins = 0;
    if (!Number.isFinite(losses)) losses = 0;
    if (!Number.isFinite(open)) open = Math.max(0, total - wins - losses);
    if (!Number.isFinite(wr)) wr = wins + losses ? wins / (wins + losses) * 100 : null;
    else if (wr <= 1) wr *= 100;
    txt("scTotal", total); txt("scWin", wins); txt("scLoss", losses); txt("scOpen", open);
    txt("scWR", wr == null ? "—" : wr.toFixed(1) + "%");
    txt("scWRBar", wr == null ? "0%" : wr.toFixed(1) + "%");
    txt("scWRNote", wr == null ? "No settled trade statistics available." : wins + " wins / " + losses + " losses / " + open + " open.");
    var fill = document.getElementById("wrFill"); if (fill) fill.style.width = Math.max(0, Math.min(100, wr || 0)) + "%";
    txt("sysAcc", wr == null ? "—" : wr.toFixed(1) + "%");
    // Side panel accuracy
    txt("sideSysAcc", wr == null ? "—" : wr.toFixed(1) + "%");
    txt("sideWR", wr == null ? "—" : wr.toFixed(1) + "%");
    txt("sideTrades", total);
    txt("sideWins", wins);
    txt("sideLosses", losses);
    var sideFill = document.getElementById("sideWrFill");
    if (sideFill) sideFill.style.width = Math.max(0, Math.min(100, wr || 0)) + "%";
    txt("sideAccNote", wr == null ? "Waiting for performance data." : wins + " wins / " + losses + " losses / " + open + " open.");
  }

  function renderDocuments() {
    var H = window.FL200_HEART;
    if (!H) return;
    txt("stratBox", H.getStrategy() || "strategy.md unavailable.");
    txt("rulesBox", H.getMaster() || "FL-200_MASTER.md unavailable.");
    txt("securityBox", H.getSecurity() || "SECURITY.md unavailable.");
    var root = H.getRoot() || [];
    var repScan = document.getElementById("repScan");
    if (repScan) {
      repScan.innerHTML = root.map(function (item) {
        return `<div class="flex items-center justify-between rounded-xl border border-white/[0.04] bg-black/20 px-3 py-2.5"><span class="font-mono text-[8px] text-slate-300">${esc(item.name)}</span><span class="font-mono text-[7px] text-slate-700">${esc(item.type || "")}</span></div>`;
      }).join("");
    }
    txt("repSummary", "Private Heart connected. Root files are read directly from GitHub.");
  }

  function renderAccount() {
    var H = window.FL200_HEART;
    var perf = H && H.getPerf ? H.getPerf() : null;
    txt("accRepo", C.heartRepo);
    txt("accBranch", C.branch);
    txt("accTokenPolicy", C.tokenPolicy.scope);
    txt("accEngine", H && H.getEngine() && H.getEngine().version ? "v" + H.getEngine().version : "—");
    txt("accSession", window.FL200_TOKEN ? "ACTIVE" : "LOCKED");
    txt("accEq", perf && (perf.equity != null ? num(perf.equity) : perf.balance != null ? num(perf.balance) : "—"));
    txt("accTr", perf && (perf.totalTrades != null ? perf.totalTrades : "—"));
    txt("accPnl", perf && (perf.pnl != null ? num(perf.pnl) : "—"));
  }

  function renderConfig() {
    var box = document.getElementById("cfgInfo");
    if (!box) return;
    var safe = JSON.parse(JSON.stringify(C));
    if (safe.tokenPolicy) safe.tokenPolicy.token = "[SESSION ONLY / HIDDEN]";
    box.innerHTML = `<pre class="whitespace-pre-wrap font-mono text-[9px] leading-5 text-slate-400">${esc(JSON.stringify(safe, null, 2))}</pre>`;
  }

  function bindFileViewer() {
    document.addEventListener("click", async function (e) {
      var btn = e.target.closest("[data-view-file]");
      if (!btn) return;
      var file = btn.getAttribute("data-view-file");
      if (!file) return;
      txt("fvTitle", file);
      var body = document.getElementById("fvBody");
      if (body) body.textContent = "Loading…";
      var overlay = document.getElementById("fileOverlay");
      if (overlay) overlay.classList.remove("hidden");
      try {
        var content = await window.FL200_HEART.text(file);
        if (body) body.textContent = content;
      } catch (err) {
        if (body) body.textContent = err.message || String(err);
      }
    });
  }

  function bindModelViewer() {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-model]");
      if (!btn) return;
      var name = btn.getAttribute("data-model");
      var signal = window.FL200_APP && window.FL200_APP.signal;
      var data = signal && signal.models && signal.models[name.toLowerCase()];
      txt("modTitle", name);
      txt("modInst", "Private Heart model telemetry");
      var detail = document.getElementById("modDetail");
      if (detail) detail.innerHTML = `<pre class="whitespace-pre-wrap font-mono text-[9px] leading-6 text-slate-400">${esc(JSON.stringify(data || {}, null, 2))}</pre>`;
      var overlay = document.getElementById("modOverlay");
      if (overlay) { overlay.classList.remove("hidden"); overlay.classList.add("flex"); }
    });
  }

  function renderSysActivity() {
    var poll = (window.FL200_CONFIG && window.FL200_CONFIG.pollMs) || 4000;
    txt("sysPollMs", (poll / 1000) + "s");
    var now = new Date();
    txt("sysClock", now.toLocaleTimeString());
    var dot = document.getElementById("sysActDot");
    var label = document.getElementById("sysActLabel");
    if (window.FL200_TOKEN) {
      if (dot) { dot.className = "pulse-dot h-2 w-2 rounded-full bg-emerald-400"; }
      if (label) { label.textContent = "ACTIVE"; label.className = "font-mono text-[8px] font-bold text-emerald-300"; }
    } else {
      if (dot) { dot.className = "h-2 w-2 rounded-full bg-slate-500"; }
      if (label) { label.textContent = "IDLE"; label.className = "font-mono text-[8px] font-bold text-slate-500"; }
    }
  }

  function refresh(signal) {
    renderDecision(signal || {});
    renderPlan(signal || {});
    renderSysActivity();
    renderL2(signal || {});
    renderModels(signal || {});
    renderTicker();
    renderPillars();
    renderLedger();
    renderScore();
    renderDocuments();
    renderAccount();
    if (window.FL200_CANDLES) window.FL200_CANDLES.render();
  }

  document.addEventListener("DOMContentLoaded", function () {
    [
      ["closeCfg", function () { document.getElementById("cfgOverlay")?.classList.add("hidden"); }],
      ["closeFv", function () { document.getElementById("fileOverlay")?.classList.add("hidden"); }],
      ["closeMod", function () { var x = document.getElementById("modOverlay"); x?.classList.add("hidden"); x?.classList.remove("flex"); }]
    ].forEach(function (pair) {
      var el = document.getElementById(pair[0]);
      if (el) el.addEventListener("click", pair[1]);
    });

    var cfg = document.getElementById("openCfg");
    if (cfg) cfg.addEventListener("click", function () {
      renderConfig();
      document.getElementById("cfgOverlay")?.classList.remove("hidden");
    });

    var refreshReports = document.getElementById("repRefresh");
    if (refreshReports) refreshReports.addEventListener("click", function () {
      if (window.FL200_APP) window.FL200_APP.refreshAll(true);
    });

    var clear = document.getElementById("btnClearHist");
    if (clear) clear.addEventListener("click", function () { renderLedger(); pulse("Ledger view refreshed", "pa"); });

    bindFileViewer();
    bindModelViewer();

    $$(".navBtn").forEach(function (button) {
      button.addEventListener("click", function () {
        var id = button.dataset.s;
        $$(".section").forEach(function (section) { section.classList.toggle("active", section.id === id); });
      });
    });
  });

  function $$(selector) { return Array.from(document.querySelectorAll(selector)); }

  window.FL200_UI = {
    refresh: refresh,
    pulse: pulse,
    renderConfig: renderConfig,
    renderDocuments: renderDocuments,
    renderPillars: renderPillars,
    renderLedger: renderLedger,
    renderScore: renderScore,
    renderTicker: renderTicker,
    renderAccount: renderAccount,
    renderSysActivity: renderSysActivity
  };
})();
