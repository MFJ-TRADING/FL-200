/* ============================================================
   FL-200 FACE CONFIG v11.0 — PUBLIC-SAFE
   ⚠ Is file mein KOI strategy constant NAHI hai.
   Saare formula constants (imbalance, walls, SL/RR, inversion)
   PRIVATE engine.js ke andar hain (heart repo).
   ============================================================ */
window.FL200_CONFIG = {
  version: "11.0",
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

  /* sirf feed plumbing — thresholds engine.js (private) mein hain */
  l2: { depth: 20 },

  pillarNames: { P1:"DATA", P2:"ANALYZE", P3:"SELF-IMP", P4:"PERSIST",
                 P5:"COMPARE", P6:"LESSONS", P7:"RISK", P8:"SIMULATE",
                 P9:"SECURITY", P10:"HEALTH" },
  reportDesc: {
    "state.json":   "brain ka live dimagh (33% grid + L2 + final per TF)",
    "perf.json":    "model improvement % + system accuracy",
    "ledger.jsonl": "append-only pillar ledger (P4)",
    "engine.js":    "PRIVATE strategy engine (token-gated)",
    "strategy.md":  "strategy law",
    "backtest_report.json": "backtest metrics",
    "trades.csv":   "trade records"
  }
};
