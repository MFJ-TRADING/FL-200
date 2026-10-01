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
