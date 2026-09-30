/* FL-200 FACE CONFIG v12.1 — PUBLIC-SAFE
 * Zero strategy constants. Zero secrets. Zero tokens in source.
 * Live Heart sync every 4s — no durable cache of Heart payloads.
 */
window.FL200_CONFIG = {
  version: "12.1",
  faceRepo:  "MFJ-TRADING/FL-200",
  heartRepo: "MFJ-TRADING/FL-200-Private",
  branch: "main",
  enginePath: "engine.js",
  engineTtlMs: 0,
  statePaths:    ["state.json", "state/state.json"],
  ledgerPaths:   ["ledger.jsonl", "state/ledger.jsonl"],
  strategyPaths: ["strategy.md", "FL-200_MASTER.md", "FL200_MASTER.md"],
  scanDirs:      ["", "reports", "backtest_results", "state"],
  symbols: { BTCUSDT: { name: "Bitcoin" }, ETHUSDT: { name: "Ethereum" } },
  tfs: ["M30", "H1", "H4", "D1", "W1"],
  binTf: { M30: "30m", H1: "1h", H4: "4h", D1: "1d", W1: "1w" },
  pollMs: 4000,
  staleMs: 30000,
  deadMs: 120000,
  l2: { depth: 20 },
  tokenPolicy: {
    name: "FACE_TOKEN",
    required: true,
    scope: "read-only",
    github: "Fine-grained PAT → only FL-200-Private → Contents: Read",
    storage: "sessionStorage only on unlock; wiped on logout",
    neverWrite: true
  },
  pillarNames: {
    P1: "DATA", P2: "ANALYZE", P3: "SELF-IMP", P4: "PERSIST",
    P5: "COMPARE", P6: "LESSONS", P7: "RISK", P8: "SIMULATE",
    P9: "SECURITY", P10: "HEALTH"
  },
  reportDesc: {
    "state.json":   "Brain live mind (grid + L2 + final per TF)",
    "perf.json":    "Model accuracy + system score",
    "ledger.jsonl": "Append-only hash-chained ledger",
    "engine.js":    "PRIVATE strategy engine (token-gated read)",
    "strategy.md":  "Strategy law (read-only)"
  }
};
