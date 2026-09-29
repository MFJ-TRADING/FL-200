/* ============================================================
   FL-200 FACE CONFIG v10.0 — PUBLIC-SAFE (zero secrets)
   ============================================================ */
window.FL200_CONFIG = {
  version: "10.0",
  faceRepo:  "MFJ-TRADING/FL200",
  heartRepo: "MFJ-TRADING/FL-200-Private",
  branch: "main",
  enginePath: "engine.js",
  engineTtlMs: 10 * 60 * 1000,

  statePaths:    ["state.json", "state/state.json"],
  ledgerPaths:   ["ledger.jsonl", "state/ledger.jsonl"],
  strategyPaths: ["strategy.md", "FL200_MASTER.md"],
  scanDirs:      ["", "reports", "backtest_results", "state"],

  symbols: { BTCUSDT: {name:"Bitcoin"}, ETHUSDT: {name:"Ethereum"} },
  tfs: ["M30", "H1", "H4", "D1", "W1"],
  binTf: { M30:"30m", H1:"1h", H4:"4h", D1:"1d", W1:"1w" },
  pollMs: 5000, staleMs: 30000, deadMs: 120000,

  /* ═══ H1 33% GRID + L2 (owner bot ka exact spec) ═══ */
  grid: { stepPct: 0.3333, slBuf: 0.25, rr: 2.0 },
  l2:   { depth: 20, topN: 10, imbThreshold: 15, walls: { BTCUSDT: 5, ETHUSDT: 60 } },

  /* candle-only fallback (engine.js) — brain ke L2 decisive hone par use nahi hota */
  weights:    { grid: 0.40, kronos: 0.35, quant: 0.25 },
  thresholds: { entry: 0.10, agreeBonus: 10, confCap: 90 },
  quant:      { rsiHi: 65, rsiLo: 35, rsiX: 70 },
  taurus:     { trendAtr: 0.3, volHigh: 1.3, volLow: 0.7, penalty: 0.6 },
  kronos:     { up: 0.85, dn: 0.15 },

  pillarNames: { P1:"DATA", P2:"ANALYZE", P3:"SELF-IMP", P4:"PERSIST",
                 P5:"COMPARE", P6:"LESSONS", P7:"RISK", P8:"SIMULATE",
                 P9:"SECURITY", P10:"HEALTH" },
  reportDesc: {
    "state.json":   "brain ka live dimagh (33% grid + L2 + final per TF)",
    "perf.json":    "model improvement % + system accuracy (grid/l2/ensemble)",
    "ledger.jsonl": "append-only pillar ledger (P4)",
    "engine.js":    "private strategy engine (33% grid)",
    "strategy.md":  "strategy law",
    "backtest_report.json": "backtest metrics",
    "trades.csv":   "trade records"
  }
};
