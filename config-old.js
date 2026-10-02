/* ============================================================
   FL-200 FACE CONFIG v12.3 — PUBLIC-SAFE
   ============================================================ */
window.FL200_CONFIG = {
  version: "12.3",

  faceRepo: "MFJ-TRADING/FL-200",
  heartRepo: "MFJ-TRADING/FL-200-Private",
  branch: "main",

  enginePath: "engine.js",
  statePaths: ["state.json"],
  perfPaths: ["perf.json"],
  ledgerPaths: ["ledger.jsonl"],
  strategyPaths: ["strategy.md", "FL-200_MASTER.md"],
  documentationPaths: ["README.md", "SECURITY.md"],

  symbols: {
    BTCUSDT: { name: "Bitcoin", exchange: "Binance", binance: "BTCUSDT" },
    ETHUSDT: { name: "Ethereum", exchange: "Binance", binance: "ETHUSDT" }
  },

  tfs: ["M30", "H1", "H4", "D1", "W1"],

  binTf: {
    M30: "30m",
    H1: "1h",
    H4: "4h",
    D1: "1d",
    W1: "1w"
  },

  pollMs: 4000,
  staleMs: 30000,
  deadMs: 120000,

  l2: {
    depth: 20
  },

  tokenPolicy: {
    name: "FACE_TOKEN",
    required: true,
    scope: "read-only",
    github: "Fine-grained PAT → FL-200-Private → Contents: Read",
    storage: "sessionStorage only",
    sessionKey: "fl200_face_tok",
    neverWrite: true
  },

  pillarNames: {
    P1: "DATA",
    P2: "ANALYZE",
    P3: "SELF-IMP",
    P4: "PERSIST",
    P5: "COMPARE",
    P6: "LESSONS",
    P7: "RISK",
    P8: "SIMULATE",
    P9: "SECURITY",
    P10: "HEALTH"
  },

  reportDesc: {
    "state.json": "Live Heart state — grid + L2 + final signal per timeframe",
    "perf.json": "Model accuracy + system performance metrics",
    "ledger.jsonl": "Append-only hash-chained decision ledger",
    "engine.js": "PRIVATE strategy engine — read-only runtime load",
    "strategy.md": "Strategy law / operating rules",
    "FL-200_MASTER.md": "Master FL-200 specification",
    "README.md": "Private Heart repository documentation",
    "SECURITY.md": "Security and repository policy"
  },

  github: {
    api: "https://api.github.com",
    accept: "application/vnd.github+json"
  },

  market: {
    bases: [
      "https://api.binance.com",
      "https://data-api.binance.vision"
    ],
    klines: "/api/v3/klines",
    depth: "/api/v3/depth",
    ticker: "/api/v3/ticker/price",
    limit: 150
  },

  ui: {
    defaultSymbol: "BTCUSDT",
    defaultTf: "H1",
    maxLedgerRows: 100,
    chartBars: 60,
    cardBars: 18
  },

  system: {
    signalOnly: true,
    noAutoExecution: true,
    noHeartWrite: true,
    noTokenWrite: true,
    noStrategyMutation: true,
    sessionTokenOnly: true
  }
};

/* ============================================================
   FL-200 MARKET FEED
   Binance public market data only
   ============================================================ */
(function () {
  "use strict";

  var C = window.FL200_CONFIG;

  var STATE = {
    candles: {},
    depth: null,
    ticker: {},
    base: "",
    lastAt: 0,
    failures: 0
  };

  function bases() {
    var arr = C.market && Array.isArray(C.market.bases)
      ? C.market.bases
      : ["https://api.binance.com", "https://data-api.binance.vision"];
    return arr.filter(Boolean);
  }

  async function request(path, params) {
    var lastError = null;

    for (var i = 0; i < bases().length; i++) {
      var base = bases()[i];
      var query = new URLSearchParams(params || {});
      var url = base + path + (query.toString() ? "?" + query.toString() : "");

      try {
        var res = await fetch(url, {
          method: "GET",
          cache: "no-store",
          headers: { Accept: "application/json" }
        });

        if (!res.ok) {
          var detail = "";
          try {
            var body = await res.json();
            if (body && body.msg) detail = " — " + body.msg;
          } catch (e) {}
          throw new Error("HTTP " + res.status + detail);
        }

        STATE.base = base;
        return await res.json();
      } catch (e) {
        lastError = e;
      }
    }

    throw new Error(
      "Binance feed unavailable" +
      (lastError && lastError.message ? ": " + lastError.message : "")
    );
  }

  async function klines(symbol, tf) {
    var interval = (C.binTf && C.binTf[tf]) || "1h";
    var rows = await request(
      C.market.klines,
      {
        symbol: symbol,
        interval: interval,
        limit: Number(C.market.limit || 150)
      }
    );

    return rows.map(function (r) {
      return {
        t: Number(r[0]),
        o: Number(r[1]),
        h: Number(r[2]),
        l: Number(r[3]),
        c: Number(r[4]),
        v: Number(r[5]),
        closeT: Number(r[6])
      };
    });
  }

  async function depth(symbol) {
    return await request(
      C.market.depth,
      {
        symbol: symbol,
        limit: Math.max(20, Number(C.l2 && C.l2.depth || 20))
      }
    );
  }

  async function ticker(symbol) {
    var row = await request(
      C.market.ticker,
      { symbol: symbol }
    );
    var price = Number(row && row.price);
    if (!Number.isFinite(price)) throw new Error("Invalid ticker response.");
    return price;
  }

  async function allTimeframes(symbol) {
    var tfs = Array.isArray(C.tfs) ? C.tfs : ["M30", "H1", "H4", "D1", "W1"];
    var settled = await Promise.allSettled(
      tfs.map(function (tf) {
        return klines(symbol, tf).then(function (candles) {
          return { tf: tf, candles: candles };
        });
      })
    );

    var output = {};
    settled.forEach(function (r) {
      if (r.status === "fulfilled" && r.value) {
        output[r.value.tf] = r.value.candles;
      }
    });
    return output;
  }

  async function refresh(symbol) {
    var results = await Promise.allSettled([
      allTimeframes(symbol),
      depth(symbol),
      ticker("BTCUSDT"),
      ticker("ETHUSDT")
    ]);

    if (results[0].status !== "fulfilled") {
      STATE.failures++;
      throw results[0].reason || new Error("Candle feed failed.");
    }

    STATE.candles = results[0].value || {};
    STATE.depth = results[1].status === "fulfilled" ? results[1].value : null;
    STATE.ticker.BTCUSDT = results[2].status === "fulfilled" ? results[2].value : null;
    STATE.ticker.ETHUSDT = results[3].status === "fulfilled" ? results[3].value : null;
    STATE.lastAt = Date.now();
    STATE.failures = 0;

    return STATE;
  }

  window.FL200_MARKET = {
    state: STATE,
    request: request,
    klines: klines,
    depth: depth,
    ticker: ticker,
    allTimeframes: allTimeframes,
    refresh: refresh
  };
})();

/* ============================================================
   FL-200 HEART CONNECTOR
   Exact private root structure
   ============================================================ */
(function () {
  "use strict";

  var C = window.FL200_CONFIG;

  var DATA = {
    state: null,
    perf: null,
    ledger: [],
    strategy: "",
    master: "",
    security: "",
    engineText: "",
    engine: null,
    root: []
  };

  function token() {
    return window.FL200_TOKEN || (window.FL200_AUTH && window.FL200_AUTH.getToken()) || "";
  }

  function apiBase() {
    return (C.github && C.github.api) || "https://api.github.com";
  }

  async function get(path, accept) {
    if (!token()) throw new Error("No FACE_TOKEN.");

    var clean = String(path || "").replace(/^\/+/, "");
    var base = apiBase() + "/repos/" + C.heartRepo + "/contents";
    var url = base + (clean ? "/" + clean : "") +
      "?ref=" + encodeURIComponent(C.branch) + "&_=" + Date.now();

    var res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: "Bearer " + token(),
        Accept: accept || C.github.accept || "application/vnd.github+json"
      },
      cache: "no-store"
    });

    if (res.status === 401) throw new Error("GitHub 401.");
    if (res.status === 403) throw new Error("GitHub 403.");
    if (res.status === 404) throw new Error("File not found: " + clean);
    if (!res.ok) throw new Error("GitHub " + res.status + ": " + clean);

    return res;
  }

  async function json(path) {
    var res = await get(path);
    var payload = await res.json();
    if (payload && typeof payload.content === "string") {
      var raw = decodeBase64(payload.content);
      try { return JSON.parse(raw); } catch (e) { return null; }
    }
    return payload;
  }

  async function text(path) {
    var res = await get(path, "application/vnd.github.raw+json");
    return await res.text();
  }

  function decodeBase64(value) {
    try {
      var bin = atob(String(value).replace(/\s/g, ""));
      var bytes = Uint8Array.from(bin, function (c) { return c.charCodeAt(0); });
      return new TextDecoder().decode(bytes);
    } catch (e) {
      return "";
    }
  }

  async function loadAll(full) {
    if (!full) {
      try { DATA.state = await json((C.statePaths && C.statePaths[0]) || "state.json"); } catch (e) {}
      return DATA;
    }

    var results = await Promise.allSettled([
      json((C.statePaths && C.statePaths[0]) || "state.json"),
      json((C.perfPaths && C.perfPaths[0]) || "perf.json"),
      text((C.ledgerPaths && C.ledgerPaths[0]) || "ledger.jsonl"),
      text((C.strategyPaths && C.strategyPaths[0]) || "strategy.md"),
      text((C.strategyPaths && C.strategyPaths[1]) || "FL-200_MASTER.md"),
      text("SECURITY.md"),
      root()
    ]);

    if (results[0].status === "fulfilled") DATA.state = results[0].value;
    if (results[1].status === "fulfilled") DATA.perf = results[1].value;

    if (results[2].status === "fulfilled") {
      DATA.ledger = String(results[2].value || "")
        .split(/\r?\n/)
        .map(function (line) { return line.trim(); })
        .filter(Boolean)
        .slice(-1000)
        .map(function (line) {
          try { return JSON.parse(line); }
          catch (e) { return { raw: line }; }
        });
    }

    if (results[3].status === "fulfilled") DATA.strategy = results[3].value || "";
    if (results[4].status === "fulfilled") DATA.master = results[4].value || "";
    if (results[5].status === "fulfilled") DATA.security = results[5].value || "";
    if (results[6].status === "fulfilled") DATA.root = results[6].value || [];

    return DATA;
  }

  async function root() {
    return await get("", C.github.accept || "application/vnd.github+json").then(function (r) {
      return r.json();
    });
  }

  async function loadEngine(force) {
    if (DATA.engine && !force) return DATA.engine;

    DATA.engineText = await text(C.enginePath || "engine.js");

    var runner = new Function(
      DATA.engineText + "\n//# sourceURL=FL200-Private-engine.js"
    );

    runner();

    DATA.engine = window.FL200_ENGINE || null;

    if (!DATA.engine) {
      throw new Error("engine.js loaded but window.FL200_ENGINE is unavailable.");
    }

    return DATA.engine;
  }

  function getState() { return DATA.state; }
  function getPerf() { return DATA.perf; }
  function getLedger() { return DATA.ledger || []; }
  function getStrategy() { return DATA.strategy; }
  function getMaster() { return DATA.master; }
  function getSecurity() { return DATA.security; }
  function getEngine() { return DATA.engine; }
  function getRoot() { return DATA.root || []; }

  window.FL200_HEART = {
    data: DATA,
    get: get,
    json: json,
    text: text,
    root: root,
    loadAll: loadAll,
    loadEngine: loadEngine,
    getState: getState,
    getPerf: getPerf,
    getLedger: getLedger,
    getStrategy: getStrategy,
    getMaster: getMaster,
    getSecurity: getSecurity,
    getEngine: getEngine,
    getRoot: getRoot
  };
})();

/* ============================================================
   FL-200 FACE AUTH
   Token-only / sessionStorage-only
   ============================================================ */
(function () {
  "use strict";

  var C = window.FL200_CONFIG;

  function key() {
    return (C && C.tokenPolicy && C.tokenPolicy.sessionKey) || "fl200_face_tok";
  }

  function getToken() {
    try { return sessionStorage.getItem(key()) || ""; } catch (e) { return ""; }
  }

  function setToken(token) {
    token = token || "";
    try {
      if (token) sessionStorage.setItem(key(), token);
      else sessionStorage.removeItem(key());
    } catch (e) {}
    return token;
  }

  function clear() {
    try { sessionStorage.removeItem(key()); } catch (e) {}
  }

  async function validate(token) {
    if (!token) throw new Error("FACE_TOKEN zaroori hai.");

    var repoUrl =
      (C.github.api || "https://api.github.com") +
      "/repos/" + C.heartRepo;

    var opts = {
      method: "GET",
      headers: {
        Authorization: "Bearer " + token,
        Accept: C.github.accept || "application/vnd.github+json"
      },
      cache: "no-store"
    };

    var repoResp = await fetch(repoUrl + "?_=" + Date.now(), opts);

    if (repoResp.status === 401) throw new Error("401 — FACE_TOKEN incorrect or expired.");
    if (repoResp.status === 403) throw new Error("403 — GitHub permission denied.");
    if (repoResp.status === 404) throw new Error("404 — FL-200-Private is not accessible with this token.");
    if (!repoResp.ok) throw new Error("GitHub " + repoResp.status + " during token verification.");

    var rootResp = await fetch(
      repoUrl + "/contents/?ref=" + encodeURIComponent(C.branch) + "&_=" + Date.now(),
      opts
    );

    if (!rootResp.ok) {
      throw new Error("Repository contents read failed (" + rootResp.status + ").");
    }

    return true;
  }

  function openApp() {
    var lock = document.getElementById("lock");
    var shell = document.getElementById("appShell");
    if (lock) lock.style.display = "none";
    if (shell) {
      shell.style.display = "block";
      shell.removeAttribute("aria-hidden");
    }
    document.body.classList.remove("locked");
    document.dispatchEvent(new CustomEvent("fl200:unlock"));
  }

  function lockApp() {
    clear();
    var shell = document.getElementById("appShell");
    var lock = document.getElementById("lock");
    if (shell) {
      shell.style.display = "none";
      shell.setAttribute("aria-hidden", "true");
    }
    if (lock) lock.style.display = "flex";
    var input = document.getElementById("ltok");
    if (input) {
      input.value = "";
      input.focus();
    }
    var err = document.getElementById("lockErr");
    if (err) err.textContent = "";
    document.dispatchEvent(new CustomEvent("fl200:lock"));
  }

  async function boot() {
    var lock = document.getElementById("lock");
    if (lock) lock.style.display = "flex";

    var existing = getToken();
    if (!existing) {
      var input = document.getElementById("ltok");
      if (input) input.focus();
      return;
    }

    try {
      await validate(existing);
      window.FL200_TOKEN = existing;
      openApp();
    } catch (e) {
      clear();
      var err = document.getElementById("lockErr");
      if (err) err.textContent = "Session expired. Enter FACE_TOKEN again.";
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.getElementById("lockBtn");
    var input = document.getElementById("ltok");
    var toggle = document.getElementById("toggleToken");
    var logout = document.getElementById("btnLogout");
    var logout2 = document.getElementById("btnLogout2");

    if (toggle) {
      toggle.addEventListener("click", function () {
        if (!input) return;
        var visible = input.type === "text";
        input.type = visible ? "password" : "text";
        toggle.textContent = visible ? "SHOW" : "HIDE";
      });
    }

    if (btn) {
      btn.addEventListener("click", async function () {
        var token = input ? input.value.trim() : "";
        var err = document.getElementById("lockErr");
        if (!token) {
          if (err) err.textContent = "FACE_TOKEN zaroori hai.";
          return;
        }
        if (err) err.textContent = "Verifying FACE_TOKEN…";
        try {
          await validate(token);
          window.FL200_TOKEN = setToken(token);
          if (err) err.textContent = "";
          openApp();
        } catch (e) {
          window.FL200_TOKEN = "";
          if (err) err.textContent = e && e.message ? e.message : "Authentication failed.";
        }
      });
    }

    if (input) {
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && btn) btn.click();
      });
    }

    if (logout) logout.addEventListener("click", lockApp);
    if (logout2) logout2.addEventListener("click", lockApp);

    boot();
  });

  window.FL200_AUTH = {
    getToken: getToken,
    setToken: setToken,
    clear: clear,
    validate: validate,
    lock: lockApp,
    open: openApp
  };
})();

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
        ? "tfBtn rounded-md border border-cyan-400/20 bg-cyan-400/[0.08] px-1.5 py-1.5 font-mono text-[8px] font-bold text-cyan-200"
        : "tfBtn rounded-md border border-white/[0.06] bg-white/[0.02] px-1.5 py-1.5 font-mono text-[8px] font-bold text-slate-500";
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
