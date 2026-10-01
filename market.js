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
