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
