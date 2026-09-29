const HERMES_CONFIG = {
  REPO: "MFJ-TRADING/FL-200-Private",
  BRANCH: "main",
  PASSWORD: null,          // Secret se hash aayega
  PRIVATE_MODE: true,      // 2-repo setup mein hamesha true
  SESSION_DAYS: 7
};


/* ============================================================
   FL-200 FACE CONFIG v9.0 — PUBLIC-SAFE (zero secrets)
   ============================================================ */
window.FL200_CONFIG = {
  version: "9.0",
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

  /* ═══ FARRUKH GRID STRATEGY CONSTANTS (system-prompt point 0–5) ═══ */
  grid: {
    stepPct: 0.3333,        /* grid step = 33.33% of R  (point 0) */
    invertOnRed: false,     /* zone-label inversion flag (default: positional zones) */
    predUp: 0.6, predDown: 0.4,   /* predictor skews  (point 0) */
    expFrac: 0.5,                 /* expected_high/low = C ± R/2 */
    bodyMin: 0.10                 /* |M|/R is se kam → MID/gray candle */
  },
  weights: { grid: 0.40, kronos: 0.35, quant: 0.25 },  /* point 5 */
  thresholds: { entry: 0.10, agreeBonus: 10, confCap: 90 },
  rrMin: 2.0,               /* B1/S1 min 1:2  (point 2/3) */
  fade: { sellZoneToBuy: true, buyZoneToSell: true },  /* point 1 */
  taurus: { trendAtr: 0.3, volHigh: 1.3, volLow: 0.7, fadePenaltyTrendHighVol: 0.6 },
  kronos: { stretchUp: 0.85, stretchDown: 0.15 },
  quant:  { rsiHi: 65, rsiLo: 35, rsiExtreme: 70, macdBonus: 10 },
  zoneWeight: 0.5,          /* actual first-zone vs model matrix ka blend */

  pillarNames: { P1:"DATA", P2:"ANALYZE", P3:"SELF-IMP", P4:"PERSIST",
                 P5:"COMPARE", P6:"LESSONS", P7:"RISK", P8:"SIMULATE",
                 P9:"SECURITY", P10:"HEALTH" },
  reportDesc: {
    "state.json":"brain ka live dimagh (grid+models+final per TF)",
    "perf.json":"model improvement % + system accuracy",
    "ledger.jsonl":"append-only pillar ledger",
    "engine.js":"private strategy engine (grid+fade+matrix)",
    "strategy.md":"strategy law",
    "backtest_report.json":"backtest metrics",
    "trades.csv":"trade records"
  }
};