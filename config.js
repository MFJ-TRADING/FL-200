/* ============================================================
   FL-200 FACE CONFIG v12.1
   PUBLIC-SAFE / READ-ONLY / TOKEN-GATED
   ------------------------------------------------------------
   ZERO:
   - strategy constants
   - trading secrets
   - API keys
   - GitHub tokens
   - private engine logic
   - writable permissions
   ============================================================ */

window.FL200_CONFIG = {

  /* ──────────────────────────────────────────────────────────
     CORE
  ────────────────────────────────────────────────────────── */

  version: "12.1",

  /* Public FACE repository */
  faceRepo: "MFJ-TRADING/FL-200",

  /* Private HEART repository */
  heartRepo: "MFJ-TRADING/FL-200-Private",

  branch: "main",


  /* ──────────────────────────────────────────────────────────
     PRIVATE HEART ENGINE
  ────────────────────────────────────────────────────────── */

  enginePath: "engine.js",

  /*
   * 0 = always fetch fresh engine from GitHub.
   * This is intentional because the private Heart engine
   * can be updated without rebuilding the FACE dashboard.
   */
  engineTtlMs: 0,


  /* ──────────────────────────────────────────────────────────
     HEART STATE FILES
  ────────────────────────────────────────────────────────── */

  statePaths: [
    "state.json"
  ],

  ledgerPaths: [
    "ledger.jsonl"
  ],

  strategyPaths: [
    "strategy.md",
    "FL-200_MASTER.md",
    "FL200_MASTER.md"
  ],


  /* ──────────────────────────────────────────────────────────
     HEART REPORT / FILE SCANNER
  ────────────────────────────────────────────────────────── */

  scanDirs: [
    "",
    "reports",
    "backtest_results",
    "state"
  ],


  /* ──────────────────────────────────────────────────────────
     SUPPORTED MARKET SYMBOLS
  ────────────────────────────────────────────────────────── */

  symbols: {

    BTCUSDT: {
      name: "Bitcoin"
    },

    ETHUSDT: {
      name: "Ethereum"
    }

  },


  /* ──────────────────────────────────────────────────────────
     SUPPORTED TIMEFRAMES
  ────────────────────────────────────────────────────────── */

  tfs: [
    "M30",
    "H1",
    "H4",
    "D1",
    "W1"
  ],


  /* ──────────────────────────────────────────────────────────
     BINANCE TIMEFRAME MAPPING
  ────────────────────────────────────────────────────────── */

  binTf: {

    M30: "30m",
    H1:  "1h",
    H4:  "4h",
    D1:  "1d",
    W1:  "1w"

  },


  /* ──────────────────────────────────────────────────────────
     LIVE HEART POLLING
  ────────────────────────────────────────────────────────── */

  pollMs: 4000,

  /*
   * State older than 30 seconds:
   * dashboard should consider it stale.
   */
  staleMs: 30000,

  /*
   * State older than 120 seconds:
   * dashboard should consider Heart disconnected/dead.
   */
  deadMs: 120000,


  /* ──────────────────────────────────────────────────────────
     L2 ORDER BOOK
  ────────────────────────────────────────────────────────── */

  l2: {

    /*
     * Binance depth request.
     * Heart Engine itself uses top-N internally.
     */
    depth: 20

  },


  /* ──────────────────────────────────────────────────────────
     FACE TOKEN POLICY
  ────────────────────────────────────────────────────────── */

  tokenPolicy: {

    name: "FACE_TOKEN",

    required: true,

    scope: "read-only",

    github:
      "Fine-grained PAT → FL-200-Private only → Contents: Read",

    /*
     * Token exists only during the current session unless
     * user explicitly enables the dashboard remember option.
     */
    storage: "sessionStorage only on unlock; wiped on logout",

    /*
     * FACE must NEVER write to GitHub.
     */
    neverWrite: true

  },


  /* ──────────────────────────────────────────────────────────
     FL-200 TEN PILLARS
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
     HEART FILE DESCRIPTIONS
  ────────────────────────────────────────────────────────── */

  reportDesc: {

    "state.json":
      "Brain live state — grid + L2 + final decision per timeframe",

    "perf.json":
      "Model accuracy + system score",

    "ledger.jsonl":
      "Append-only hash-chained event ledger",

    "engine.js":
      "PRIVATE Heart strategy engine — token-gated read only",

    "strategy.md":
      "Strategy law — read-only"

  }

};
