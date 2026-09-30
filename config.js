/* ============================================================
   FL-200 FACE CONFIG v12.2
   PUBLIC-SAFE
   ------------------------------------------------------------
   FACE = public dashboard
   HEART = private FL-200-Private repository

   No strategy constants.
   No GitHub token.
   No passwords.
   No trading secrets.

   HEART ROOT:
     engine.js
     state.json
     perf.json
     ledger.jsonl
     strategy.md
     FL-200_MASTER.md
     README.md
     SECURITY.md
     skills/
     .github/workflows/
   ============================================================ */

window.FL200_CONFIG = {

  /* ──────────────────────────────────────────────────────────
     VERSION / REPOSITORIES
     ────────────────────────────────────────────────────────── */

  version: "12.2",

  faceRepo: "MFJ-TRADING/FL-200",

  heartRepo: "MFJ-TRADING/FL-200-Private",

  branch: "main",


  /* ──────────────────────────────────────────────────────────
     HEART FILES — EXACT PRIVATE REPO STRUCTURE
     ────────────────────────────────────────────────────────── */

  enginePath: "engine.js",

  statePaths: [
    "state.json"
  ],

  perfPaths: [
    "perf.json"
  ],

  ledgerPaths: [
    "ledger.jsonl"
  ],

  strategyPaths: [
    "strategy.md",
    "FL-200_MASTER.md"
  ],

  documentationPaths: [
    "README.md",
    "SECURITY.md"
  ],

  skillsDir: "skills/",

  workflowDir: ".github/workflows/",


  /* ──────────────────────────────────────────────────────────
     SYMBOLS
     ────────────────────────────────────────────────────────── */

  symbols: {

    BTCUSDT: {
      name: "Bitcoin",
      exchange: "Binance",
      binance: "BTCUSDT"
    },

    ETHUSDT: {
      name: "Ethereum",
      exchange: "Binance",
      binance: "ETHUSDT"
    }

  },


  /* ──────────────────────────────────────────────────────────
     TIMEFRAMES
     ────────────────────────────────────────────────────────── */

  tfs: [
    "M30",
    "H1",
    "H4",
    "D1",
    "W1"
  ],

  binTf: {

    M30: "30m",

    H1: "1h",

    H4: "4h",

    D1: "1d",

    W1: "1w"

  },


  /* ──────────────────────────────────────────────────────────
     LIVE POLLING
     ────────────────────────────────────────────────────────── */

  pollMs: 4000,

  staleMs: 30000,

  deadMs: 120000,


  /* ──────────────────────────────────────────────────────────
     L2 DISPLAY CONFIG
     NOTE:
     Actual strategy logic remains PRIVATE in engine.js.
     These values are only dashboard/feed requirements.
     ────────────────────────────────────────────────────────── */

  l2: {

    depth: 20

  },


  /* ──────────────────────────────────────────────────────────
     TOKEN POLICY
     ────────────────────────────────────────────────────────── */

  tokenPolicy: {

    name: "FACE_TOKEN",

    required: true,

    scope: "read-only",

    github:
      "Fine-grained PAT → only FL-200-Private → Contents: Read",

    storage:
      "sessionStorage only",

    sessionKey:
      "fl200_face_tok",

    neverWrite: true

  },


  /* ──────────────────────────────────────────────────────────
     HERMES PILLARS
     ────────────────────────────────────────────────────────── */

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


  /* ──────────────────────────────────────────────────────────
     HEART FILE DESCRIPTION
     ────────────────────────────────────────────────────────── */

  reportDesc: {

    "state.json":
      "Live Heart state — grid, L2, final signal and timeframe data",

    "perf.json":
      "Model accuracy, performance and system metrics",

    "ledger.jsonl":
      "Append-only hash-chained decision ledger",

    "engine.js":
      "PRIVATE FL-200 strategy engine — token-gated read",

    "strategy.md":
      "Strategy law and operating rules",

    "FL-200_MASTER.md":
      "Master FL-200 specification",

    "README.md":
      "Private Heart repository documentation",

    "SECURITY.md":
      "Security and repository policy",

    "skills/":
      "HERMES skills/modules",

    ".github/workflows/":
      "Private automation workflows"

  },


  /* ──────────────────────────────────────────────────────────
     GITHUB API
     ────────────────────────────────────────────────────────── */

  github: {

    api:
      "https://api.github.com",

    apiVersion:
      "2022-11-28",

    accept:
      "application/vnd.github+json"

  },


  /* ──────────────────────────────────────────────────────────
     BINANCE PUBLIC MARKET DATA
     NO API KEY REQUIRED
     ────────────────────────────────────────────────────────── */

  market: {

    base:
      "https://data-api.binance.vision",

    klines:
      "/api/v3/klines",

    depth:
      "/api/v3/depth",

    limit:
      200

  },


  /* ──────────────────────────────────────────────────────────
     UI / DASHBOARD
     ────────────────────────────────────────────────────────── */

  ui: {

    defaultSymbol:
      "BTCUSDT",

    defaultTf:
      "H1",

    chartBars:
      120,

    maxLedgerRows:
      100,

    maxHistoryEvents:
      500

  },


  /* ──────────────────────────────────────────────────────────
     SYSTEM BEHAVIOUR
     ────────────────────────────────────────────────────────── */

  system: {

    livePolling:
      true,

    noAutoExecution:
      true,

    signalOnly:
      true,

    noHeartWrite:
      true,

    noTokenWrite:
      true,

    noStrategyMutation:
      true,

    noDurableHeartCache:
      true

  }

};
