/* ============================================================
 * FL-200 FACE  ·  config.js  v12.4   (PUBLIC — zero secrets, zero write access)
 * Modules: FL200_CONFIG · FL200_AUTH · FL200_MARKET · FL200_HEART · FL200_APP
 * SIGNAL ONLY. No auto-execution. FACE never writes to HEART.
 * Token: user-entered fine-grained PAT (FL-200-Private · Contents: READ only),
 *        kept in sessionStorage only. Never hardcode a token in this file.
 * ============================================================ */
(function (win) {
  "use strict";

  var deepFreeze = function (o) {
    Object.getOwnPropertyNames(o).forEach(function (k) {
      if (o[k] && typeof o[k] === "object") deepFreeze(o[k]);
    });
    return Object.freeze(o);
  };
  var emit = function (kind, extra) {
    win.dispatchEvent(new CustomEvent("fl200:update", { detail: Object.assign({ kind: kind }, extra || {}) }));
  };
  var now = function () { return Date.now(); };

  /* ============================================================
   * 1) FL200_CONFIG
   * ============================================================ */
  var CFG = deepFreeze({
    name: "FL-200", version: "12.4", engineContract: "11.2", masterVersion: "9.0",
    repos: { face: "MFJ-TRADING/FL-200", heart: "MFJ-TRADING/FL-200-Private", branch: "main" },
    paths: {
      state: "state.json", perf: "perf.json", ledger: "ledger.jsonl",
      strategy: "strategy.md", master: "FL200_MASTER.md", engine: "engine.js",
      brainLog: "brain_log.json", advice: "llm_advice.md"
    },
    symbols: ["BTCUSDT", "ETHUSDT"],
    tfs: ["D1", "H4", "H1"],
    defaultSymbol: "BTCUSDT", defaultTf: "H1",
    pollMs: 4000,            // market + evaluate
    heartPollMs: 10000,      // HEART (ETag-conditional: 304 = free vs GitHub rate limit)
    docsPollMs: 300000,      // strategy.md / FL200_MASTER.md / engine update check
    staleBrainSec: 600,      // Brain considered stale after 10 min
    market: {
      bases: ["https://data-api.binance.vision", "https://api.binance.com", "https://api1.binance.com",
              "https://api2.binance.com", "https://api3.binance.com", "https://api4.binance.com"],
      timeoutMs: 8000, deadMs: 600000
    },
    tokenPolicy: {
      storage: "sessionStorage", key: "FL200_FACE_TOKEN", persist: false, write: false,
      scope: "fine-grained PAT · FL-200-Private · Contents: Read ONLY"
    },
    system: {
      signalOnly: true, noAutoExecution: true, noHeartWrite: true,
      noTokenWrite: true, noStrategyMutation: true, sessionTokenOnly: true
    }
  });

  var APP, HEART; // forward refs

  /* ============================================================
   * 2) FL200_AUTH  (sessionStorage only)
   * ============================================================ */
  var AUTH = (function () {
    var KEY = CFG.tokenPolicy.key, mem = null, bad = false;
    function readSS() { try { return win.sessionStorage.getItem(KEY); } catch (e) { return null; } }
    function token() { return mem || readSS(); }

    function validate(t) {
      return fetch("https://api.github.com/repos/" + CFG.repos.heart + "/contents?ref=" + CFG.repos.branch, {
        method: "GET", cache: "no-store",
        headers: { Authorization: "Bearer " + t, Accept: "application/vnd.github+json" }
      }).then(function (r) {
        if (r.status === 200) return { ok: true };
        if (r.status === 401) return { ok: false, msg: "Token invalid or expired (401)" };
        if (r.status === 403) return { ok: false, msg: "Forbidden (403) — rate limit, or token lacks Contents: Read" };
        if (r.status === 404) return { ok: false, msg: "Repo not found (404) — token needs access to FL-200-Private" };
        return { ok: false, msg: "GitHub HTTP " + r.status };
      }).catch(function (e) { return { ok: false, msg: "Network error: " + e.message }; });
    }

    function unlock(t) {
      t = String(t || "").trim();
      if (!/^[A-Za-z0-9_\-]{20,}$/.test(t)) return Promise.resolve({ ok: false, msg: "Token format looks wrong" });
      return validate(t).then(function (v) {
        if (!v.ok) return v;
        mem = t; bad = false;
        try { win.sessionStorage.setItem(KEY, t); } catch (e) { /* memory only */ }
        emit("unlock");
        return APP.start().then(function () { return { ok: true }; });
      });
    }
    function resume() {                      // page reload inside same tab session
      var t = readSS();
      if (!t) return Promise.resolve({ ok: false, msg: "" });
      return unlock(t);
    }
    function lock(reason) {
      mem = null;
      try { win.sessionStorage.removeItem(KEY); } catch (e) { }
      APP.stop(); HEART.reset();
      emit("lock", { reason: reason || "manual" });
    }
    function invalid() { bad = true; lock("token rejected by GitHub (401)"); }
    return Object.freeze({ token: token, validate: validate, unlock: unlock, resume: resume, lock: lock, invalid: invalid,
      isUnlocked: function () { return !!token() && !bad; } });
  })();

  /* ============================================================
   * 3) FL200_MARKET  (Binance PUBLIC feed, multi-base fallback)
   * ============================================================ */
  var MARKET = (function () {
    var TF = {
      D1: { bin: "1d", limit: 120, ttl: 30000 }, H4: { bin: "4h", limit: 120, ttl: 15000 },
      H1: { bin: "1h", limit: 120, ttl: 3500 },  M15: { bin: "15m", limit: 48, ttl: 15000 },
      M5: { bin: "5m", limit: 36, ttl: 6000 }
    };
    var LTF = { H1: "M5", H4: "M15", D1: "H1" };      // lower TF used for exact first-zone order
    var baseOk = null, dead = {}, cache = {}, data = {};
    var status = { ok: false, base: null, lastOk: 0, lastErr: "", latency: 0 };

    function getJson(path, params) {
      var qs = Object.keys(params || {}).map(function (k) { return k + "=" + encodeURIComponent(params[k]); }).join("&");
      var all = CFG.market.bases;
      var order = baseOk ? [baseOk].concat(all.filter(function (b) { return b !== baseOk; })) : all.slice();
      var live = order.filter(function (b) { return (dead[b] || 0) <= now(); });
      if (!live.length) live = order;
      var i = 0, lastErr = "";
      function next() {
        if (i >= live.length) { status.ok = false; status.lastErr = lastErr; return Promise.reject(new Error("all bases failed (" + lastErr + ")")); }
        var b = live[i++], t0 = now();
        var ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
        var to = ctl ? setTimeout(function () { ctl.abort(); }, CFG.market.timeoutMs) : null;
        return fetch(b + path + (qs ? "?" + qs : ""), { method: "GET", cache: "no-store", signal: ctl ? ctl.signal : undefined })
          .then(function (r) {
            if (to) clearTimeout(to);
            if (r.status === 451 || r.status === 403 || r.status === 418 || r.status === 429) { dead[b] = now() + CFG.market.deadMs; lastErr = b + " -> " + r.status; return next(); }
            if (!r.ok) { lastErr = b + " -> " + r.status; return next(); }
            return r.json().then(function (j) {
              baseOk = b; status.ok = true; status.base = b; status.lastOk = now(); status.latency = now() - t0; status.lastErr = "";
              return j;
            });
          })
          .catch(function (e) { if (to) clearTimeout(to); lastErr = b + " -> " + (e && e.message); return next(); });
      }
      return next();
    }

    function klines(sym, tf) {
      var k = sym + "|" + tf, c = cache[k], cfg = TF[tf];
      if (c && now() - c.t < cfg.ttl) return Promise.resolve(c.v);
      return getJson("/api/v3/klines", { symbol: sym, interval: cfg.bin, limit: cfg.limit }).then(function (rows) {
        var v = rows.map(function (x) { return { t: +x[0], o: +x[1], h: +x[2], l: +x[3], c: +x[4], v: +x[5] }; });
        cache[k] = { t: now(), v: v };
        return v;
      }).catch(function () { return c ? c.v : null; });
    }
    function depth(sym) {
      return getJson("/api/v3/depth", { symbol: sym, limit: 20 }).catch(function () { return null; });
    }
    function ticker(sym) {
      var k = sym + "|tk", c = cache[k];
      if (c && now() - c.t < 10000) return Promise.resolve(c.v);
      return getJson("/api/v3/ticker/24hr", { symbol: sym }).then(function (j) {
        var v = { last: +j.lastPrice, chg: +j.priceChangePercent, high: +j.highPrice, low: +j.lowPrice, vol: +j.volume, qvol: +j.quoteVolume };
        cache[k] = { t: now(), v: v }; return v;
      }).catch(function () { return c ? c.v : null; });
    }

    function refresh(sym) {
      var p = [klines(sym, "D1"), klines(sym, "H4"), klines(sym, "H1"), klines(sym, "M15"), klines(sym, "M5"), depth(sym), ticker(sym)];
      return Promise.all(p).then(function (r) {
        var prev = data[sym] || {}, pk = prev.k || {};
        data[sym] = {
          sym: sym, t: now(),
          k: { D1: r[0] || pk.D1 || null, H4: r[1] || pk.H4 || null, H1: r[2] || pk.H1 || null, M15: r[3] || pk.M15 || null, M5: r[4] || pk.M5 || null },
          depth: r[5] || null, ticker: r[6] || null
        };
        return data[sym];
      });
    }
    function get(sym) { return data[sym] || null; }
    function ltf(sym, tf) {
      var d = data[sym], name = LTF[tf];
      if (!d || !name) return null;
      var cs = d.k[name], cur = d.k[tf] && d.k[tf][d.k[tf].length - 1];
      if (!cs || !cur) return null;
      return cs.filter(function (c) { return c.t >= cur.t; });
    }
    function reset() { data = {}; cache = {}; }
    return Object.freeze({ TF: TF, status: status, refresh: refresh, get: get, ltf: ltf, klines: klines, depth: depth, ticker: ticker, reset: reset });
  })();

  /* ============================================================
   * 4) FL200_HEART  (GitHub PRIVATE reader — GET only)
   * ============================================================ */
  HEART = (function () {
    var etags = {}, texts = {};
    var status = { ok: false, lastOk: 0, lastErr: "", rate: null, files: {} };
    var blank = function () { return { state: null, perf: null, ledger: [], ledgerRaw: [], ledgerChain: null, brainLog: null, advice: "", strategy: "", master: "", t: 0 }; };
    var D = blank();
    var engineInfo = { ok: false, src: null, version: null, err: "" };
    var REQUIRED = ["gridFromCandles", "parseDepth", "l2Signal", "fullSignalL2", "fullSignal", "firstZone", "indicators", "pathFor"];

    function get(path) {
      var tk = AUTH.token();
      if (!tk) return Promise.reject(new Error("locked"));
      var url = "https://api.github.com/repos/" + CFG.repos.heart + "/contents/" + path + "?ref=" + CFG.repos.branch;
      var h = { Authorization: "Bearer " + tk, Accept: "application/vnd.github.raw+json", "X-GitHub-Api-Version": "2022-11-28" };
      if (etags[path]) h["If-None-Match"] = etags[path];
      return fetch(url, { method: "GET", headers: h, cache: "no-store" }).then(function (r) {   // READ ONLY: method is always GET
        var rem = r.headers.get("x-ratelimit-remaining");
        if (rem !== null) status.rate = { remaining: +rem, limit: +r.headers.get("x-ratelimit-limit"), reset: +r.headers.get("x-ratelimit-reset") };
        status.files[path] = { status: r.status, t: now() };
        if (r.status === 304) { status.ok = true; status.lastOk = now(); return { ok: true, changed: false, text: texts[path] }; }
        if (r.status === 404) { delete etags[path]; delete texts[path]; return { ok: false, notFound: true, text: null }; }
        if (r.status === 401) { AUTH.invalid(); throw new Error("401"); }
        if (!r.ok) { status.lastErr = path + " -> " + r.status; return { ok: false, status: r.status, text: null }; }
        return r.text().then(function (txt) {
          var et = r.headers.get("etag"); if (et) etags[path] = et;
          texts[path] = txt; status.ok = true; status.lastOk = now();
          return { ok: true, changed: true, text: txt };
        });
      });
    }
    function parseJson(t) { if (!t) return null; try { return JSON.parse(t); } catch (e) { return null; } }

    function sha16(s) {
      if (!(win.crypto && win.crypto.subtle)) return Promise.resolve(null);
      return win.crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)).then(function (b) {
        return Array.prototype.map.call(new Uint8Array(b), function (x) { return ("0" + x.toString(16)).slice(-2); }).join("").slice(0, 16);
      });
    }
    function verifyLedger(raw) {             // hash-chain check (prev = sha256(previous raw line)[:16])
      var entries = raw.map(function (l) { return parseJson(l); });
      if (raw.length < 2) return Promise.resolve({ ok: true, checked: 0, broken: [] });
      var jobs = [];
      for (var i = Math.max(1, raw.length - 200); i < raw.length; i++) (function (i) {
        jobs.push(sha16(raw[i - 1]).then(function (h) { return { i: i, ok: h === null ? null : (!!entries[i] && entries[i].prev === h) }; }));
      })(i);
      return Promise.all(jobs).then(function (rs) {
        if (rs.some(function (r) { return r.ok === null; })) return { ok: null, checked: 0, broken: [] };
        var broken = rs.filter(function (r) { return !r.ok; }).map(function (r) { return entries[r.i] ? entries[r.i].seq : r.i; });
        return { ok: broken.length === 0, checked: rs.length, broken: broken };
      });
    }

    function loadAll(full) {
      var P = CFG.paths, jobs = [
        get(P.state).then(function (r) { if (r.ok) D.state = parseJson(r.text); }),
        get(P.perf).then(function (r) { if (r.ok) D.perf = parseJson(r.text); }),
        get(P.brainLog).then(function (r) { if (r.ok) D.brainLog = parseJson(r.text); }),
        get(P.advice).then(function (r) { if (r.ok) D.advice = r.text || ""; }),
        get(P.ledger).then(function (r) {
          if (!r.ok) return;
          if (r.changed || !D.ledgerRaw.length) {
            D.ledgerRaw = (r.text || "").split("\n").filter(function (x) { return x.trim(); });
            D.ledger = D.ledgerRaw.map(parseJson).filter(Boolean);
            return verifyLedger(D.ledgerRaw).then(function (v) { D.ledgerChain = v; });
          }
        })
      ];
      if (full) {
        jobs.push(get(P.strategy).then(function (r) { if (r.ok) D.strategy = r.text || ""; }));
        jobs.push(get(P.master).then(function (r) { if (r.ok) D.master = r.text || ""; }));
      }
      return Promise.all(jobs.map(function (j) {
        return j.catch(function (e) { if (String(e.message) !== "401" && e.message !== "locked") status.lastErr = e.message; });
      })).then(function () { D.t = now(); return D; });
    }

    function checkEngine(e) {
      if (!e) return "missing";
      var miss = REQUIRED.filter(function (k) { return typeof e[k] !== "function"; });
      if (miss.length) return "missing: " + miss.join(", ");
      if (String(e.version || "").indexOf("11.") !== 0) return "version " + e.version + " != 11.x";
      return null;
    }
    function runEngine(text) { (new Function(text + "\n//# sourceURL=fl200-engine.js")).call(win); }
    function loadScript(src) {
      return new Promise(function (res, rej) {
        var s = document.createElement("script"); s.src = src; s.onload = res;
        s.onerror = function () { rej(new Error("local engine.js not found")); };
        document.head.appendChild(s);
      });
    }
    function setInfo(src) { engineInfo = { ok: true, src: src, version: win.FL200_ENGINE.version, err: "" }; return engineInfo; }

    // order: a) already present  b) GitHub private (production)  c) local relative engine.js (dev)
    function loadEngine(force) {
      if (!force && win.FL200_ENGINE && !checkEngine(win.FL200_ENGINE)) return Promise.resolve(setInfo(engineInfo.src || "window"));
      if (force) delete win.FL200_ENGINE;
      return get(CFG.paths.engine).then(function (r) {
        if (r.ok && r.text) {
          runEngine(r.text);
          var err = checkEngine(win.FL200_ENGINE);
          if (!err) return setInfo("github");
          engineInfo = { ok: false, src: "github", version: null, err: err };
        }
        throw new Error("github engine unavailable");
      }).catch(function () {
        return loadScript("engine.js?v=" + now()).then(function () {
          var err = checkEngine(win.FL200_ENGINE);
          if (!err) return setInfo("local");
          engineInfo = { ok: false, src: "local", version: null, err: err }; return engineInfo;
        }).catch(function () {
          engineInfo = { ok: false, src: null, version: null, err: "engine.js not loadable (GitHub private + local both failed)" };
          return engineInfo;
        });
      });
    }
    function checkEngineUpdate() {
      if (engineInfo.src !== "github") return Promise.resolve(false);
      return get(CFG.paths.engine).then(function (r) {
        if (r.ok && r.changed && r.text) {
          var old = win.FL200_ENGINE;
          try { runEngine(r.text); } catch (e) { win.FL200_ENGINE = old; return false; }
          if (checkEngine(win.FL200_ENGINE)) { win.FL200_ENGINE = old; return false; }
          setInfo("github"); return true;
        }
        return false;
      }).catch(function () { return false; });
    }
    function reset() {
      etags = {}; texts = {}; D = blank();
      status.ok = false; status.files = {}; status.rate = null;
      engineInfo = { ok: false, src: null, version: null, err: "" };
      delete win.FL200_ENGINE;                  // private strategy leaves memory on lock
    }
    return Object.freeze({
      status: status, loadAll: loadAll, loadEngine: loadEngine, checkEngineUpdate: checkEngineUpdate, reset: reset,
      data: function () { return D; }, engine: function () { return engineInfo; }
    });
  })();

  /* ============================================================
   * 5) FL200_APP  (orchestrator)
   * ============================================================ */
  APP = (function () {
    var sym = CFG.defaultSymbol, running = false, tM = null, tH = null, lastDocs = 0;
    var last = { sym: sym, t: 0, price: null, sigs: {}, flow: null, l2: null, ticker: null, err: "", prev: {} };

    function evaluate() {
      var E = win.FL200_ENGINE, d = MARKET.get(sym);
      if (!E || !d) return;
      var l2 = null; try { l2 = E.parseDepth(d.depth, sym); } catch (e) { }
      var sigs = {}, err = "";
      CFG.tfs.forEach(function (tf) {
        var cs = d.k[tf];
        if (!cs || cs.length < 5) { sigs[tf] = null; return; }
        var opts = { ltf: MARKET.ltf(sym, tf), sym: sym };
        try { sigs[tf] = l2 ? E.fullSignalL2(cs, l2, sym, tf, opts) : E.fullSignal(cs, tf, opts); }
        catch (e) { sigs[tf] = null; err = "engine: " + e.message; }
      });
      var flow = null;
      try { flow = E.flow ? E.flow(sigs) : null; } catch (e) { err = "flow: " + e.message; }
      var h1 = sigs.H1;
      if (!flow) flow = { d1: null, h4: null, final: h1 ? { signal: h1.signal, confidence: h1.confidence, entryPlan: h1.entryPlan, note: "H1 only" } : null };
      var price = l2 ? l2.mid : (d.ticker ? d.ticker.last : (h1 ? h1.price : null));
      var prevSig = last.prev[sym];
      last.sym = sym; last.t = now(); last.price = price; last.sigs = sigs; last.flow = flow; last.l2 = l2; last.ticker = d.ticker; last.err = err;
      var cur = flow.final ? flow.final.signal : null;
      if (cur && prevSig !== undefined && prevSig !== cur) emit("signal-change", { sym: sym, from: prevSig, to: cur, confidence: flow.final.confidence });
      if (cur) last.prev[sym] = cur;
    }

    function marketLoop() {
      if (!running) return;
      var s = sym;
      MARKET.refresh(s).then(function () { if (s === sym) evaluate(); }).catch(function (e) { last.err = "market: " + e.message; })
        .then(function () {
          emit("market");
          if (running) tM = setTimeout(marketLoop, win.document && win.document.hidden ? 15000 : CFG.pollMs);
        });
    }
    function heartLoop() {
      if (!running) return;
      var full = now() - lastDocs > CFG.docsPollMs;
      HEART.loadAll(full).then(function () {
        if (full) { lastDocs = now(); return HEART.checkEngineUpdate(); }
      }).catch(function () { }).then(function () {
        emit("heart");
        if (running) tH = setTimeout(heartLoop, CFG.heartPollMs);
      });
    }
    function start() {
      if (running) return Promise.resolve();
      running = true; lastDocs = 0;
      return HEART.loadEngine().then(function (info) {
        emit("engine", { info: info });
        if (!running) return;                 // locked meanwhile
        marketLoop(); heartLoop();
      });
    }
    function stop() { running = false; clearTimeout(tM); clearTimeout(tH); tM = tH = null; last.sigs = {}; last.flow = null; }
    function setSymbol(s) {
      if (CFG.symbols.indexOf(s) < 0 || s === sym) return;
      sym = s; last.sigs = {}; last.flow = null; last.l2 = null; last.price = null;
      emit("symbol", { sym: sym });
      if (running) { clearTimeout(tM); marketLoop(); }
    }
    return Object.freeze({ start: start, stop: stop, setSymbol: setSymbol, evaluate: evaluate,
      symbol: function () { return sym; }, snapshot: function () { return last; }, isRunning: function () { return running; } });
  })();

  win.FL200_CONFIG = CFG; win.FL200_AUTH = AUTH; win.FL200_MARKET = MARKET; win.FL200_HEART = HEART; win.FL200_APP = APP;
})(window);
