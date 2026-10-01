/* ============================================================
   FL-200 CANDLE MATRIX
   Separate candle/grid renderer
   ============================================================ */
(function () {
  "use strict";

  var C = window.FL200_CONFIG;
  var selectedTf = C.ui.defaultTf || "H1";

  function esc(value) {
    if (value == null) return "";
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function num(value, digits) {
    digits = digits == null ? 2 : digits;
    var n = Number(value);
    if (!Number.isFinite(n)) return "—";
    return n.toLocaleString("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  }

  function metric(label, value, large) {
    return `
      <div class="${large ? "rounded-lg border border-white/[0.04] bg-white/[0.015] p-2" : ""}">
        <div class="text-[7px] uppercase tracking-wider text-slate-700">${label}</div>
        <div class="mt-0.5 font-mono ${large ? "text-[10px]" : "text-[9px]"} font-bold text-slate-300">${value}</div>
      </div>
    `;
  }

  function gridRows(grid) {
    if (!grid) return `<div class="text-[9px] text-slate-600">Grid unavailable</div>`;

    var rows = [
      ["-33%", grid.ext && grid.ext.m33],
      ["0%", grid.bands && grid.bands.l0],
      ["33%", grid.bands && grid.bands.l33],
      ["66%", grid.bands && grid.bands.l66],
      ["100%", grid.bands && grid.bands.l100],
      ["133%", grid.ext && grid.ext.p133]
    ];

    return rows.map(function (row) {
      var label = row[0];
      var value = row[1];
      var cls =
        label === "33%" || label === "66%"
          ? "text-cyan-300/80"
          : label === "-33%" || label === "133%"
            ? "text-violet-300/70"
            : "text-slate-400";

      return `
        <div class="flex items-center justify-between border-b border-white/[0.035] py-1.5 last:border-0">
          <span class="font-mono text-[8px] ${cls}">${label}</span>
          <span class="font-mono text-[9px] font-bold text-slate-300">${num(value)}</span>
        </div>
      `;
    }).join("");
  }

  function drawMiniChart(canvas, candles, grid, large) {
    if (!canvas || !candles || candles.length < 3) return;

    var rect = canvas.getBoundingClientRect();
    var width = Math.max(200, rect.width);
    var height = large ? 155 : 92;
    var dpr = window.devicePixelRatio || 1;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = "#040912";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(255,255,255,.035)";
    ctx.lineWidth = 1;

    for (var x = 0; x < width; x += 45) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (var y = 0; y < height; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    var view = candles.slice(-(large ? 24 : 14));
    var levels = [];
    if (grid) {
      levels = [
        grid.ext && grid.ext.m33,
        grid.bands && grid.bands.l0,
        grid.bands && grid.bands.l33,
        grid.bands && grid.bands.l66,
        grid.bands && grid.bands.l100,
        grid.ext && grid.ext.p133
      ].map(Number).filter(Number.isFinite);
    }

    var values = view.flatMap(function (c) {
      return [Number(c.h), Number(c.l)];
    }).concat(levels);

    var hi = Math.max.apply(null, values);
    var lo = Math.min.apply(null, values);
    if (!Number.isFinite(hi) || !Number.isFinite(lo) || hi === lo) return;
    var pad = (hi - lo) * 0.1;
    hi += pad; lo -= pad;

    function yy(price) {
      return 8 + (hi - Number(price)) / (hi - lo) * (height - 16);
    }

    levels.forEach(function (price, index) {
      var y = yy(price);
      ctx.strokeStyle = index === 2 || index === 3
        ? "rgba(34,211,238,.18)"
        : "rgba(167,139,250,.12)";
      ctx.setLineDash(index === 0 || index === 5 ? [4, 4] : []);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      ctx.setLineDash([]);
    });

    var slot = width / view.length;
    var bw = Math.max(3, Math.min(9, slot * .55));

    view.forEach(function (c, i) {
      var x = i * slot + slot / 2;
      var o = yy(c.o), h = yy(c.h), l = yy(c.l), close = yy(c.c);
      var bull = Number(c.c) >= Number(c.o);
      ctx.strokeStyle = bull ? "rgba(52,211,153,.7)" : "rgba(251,113,133,.7)";
      ctx.beginPath(); ctx.moveTo(x, h); ctx.lineTo(x, l); ctx.stroke();
      ctx.fillStyle = bull ? "rgba(52,211,153,.7)" : "rgba(251,113,133,.7)";
      ctx.fillRect(x - bw / 2, Math.min(o, close), bw, Math.max(1, Math.abs(close - o)));
    });
  }

  function card(tf, candles) {
    var isLarge = tf === selectedTf;
    var engine = window.FL200_HEART && window.FL200_HEART.getEngine();
    var grid = engine && typeof engine.gridFromCandles === "function"
      ? engine.gridFromCandles(candles)
      : null;

    if (!candles || candles.length < 3) {
      return `
        <article class="${isLarge ? "md:col-span-2" : ""} overflow-hidden rounded-3xl border border-white/[0.07] bg-[#060b15]">
          <div class="flex items-center justify-between border-b border-white/[0.05] px-4 py-3">
            <span class="font-display text-xs font-bold tracking-wider text-white">${esc(tf)}</span>
            <span class="rounded-md border border-amber-400/10 bg-amber-400/[0.03] px-2 py-1 font-mono text-[8px] text-amber-300/70">WAIT</span>
          </div>
          <div class="flex h-[160px] items-center justify-center text-[9px] text-slate-600">Waiting for ${esc(tf)} candles…</div>
        </article>
      `;
    }

    var c1 = candles[candles.length - 2];
    var c0 = candles[candles.length - 1];
    var c1Bull = Number(c1.c) >= Number(c1.o);
    var c0Bull = Number(c0.c) >= Number(c0.o);
    var range = grid && grid.anchor ? grid.anchor.R : Number(c1.h) - Number(c1.l);

    return `
      <article class="${isLarge ? "md:col-span-2" : ""} overflow-hidden rounded-3xl border ${isLarge ? "border-cyan-400/10" : "border-white/[0.07]"} bg-[#060b15] shadow-terminal">

        <div class="flex items-center justify-between border-b border-white/[0.05] px-4 py-3">
          <div class="flex items-center gap-2">
            <span class="font-display ${isLarge ? "text-sm" : "text-xs"} font-bold tracking-wider text-white">${esc(tf)}</span>
            <span class="rounded-md border ${c1Bull ? "border-emerald-400/10 bg-emerald-400/[0.03] text-emerald-300" : "border-rose-400/10 bg-rose-400/[0.03] text-rose-300"} px-2 py-1 font-mono text-[8px] font-bold">${c1Bull ? "GREEN" : "RED"}</span>
          </div>
          <span class="font-mono text-[8px] text-slate-600">${esc(isLarge ? "ACTIVE" : C.symbols[window.FL200_APP?.symbol]?.name || "BTCUSDT")}</span>
        </div>

        <div class="${isLarge ? "grid gap-4 p-4 lg:grid-cols-[1fr_1fr_0.82fr]" : "p-3"}">

          <div class="rounded-2xl border border-white/[0.05] bg-black/20 ${isLarge ? "p-4" : "p-3"}">
            <div class="flex items-center justify-between">
              <span class="font-mono text-[9px] font-bold text-slate-400">CANDLE [1]</span>
              <span class="font-mono text-[7px] ${c1Bull ? "text-emerald-300" : "text-rose-300"}">${c1Bull ? "CLOSED · GREEN" : "CLOSED · RED"}</span>
            </div>
            <div class="${isLarge ? "mt-3 grid grid-cols-2 gap-2" : "mt-2 grid grid-cols-3 gap-2"}">
              ${metric("O", num(c1.o), isLarge)}
              ${metric("H", num(c1.h), isLarge)}
              ${metric("L", num(c1.l), isLarge)}
              ${metric("C", num(c1.c), isLarge)}
              ${metric("R", num(range), isLarge)}
              ${metric("M", num(Number(c1.c) - Number(c1.o)), isLarge)}
            </div>
          </div>

          <div class="rounded-2xl border border-white/[0.05] bg-black/20 ${isLarge ? "p-4" : "p-3"}">
            <div class="flex items-center justify-between">
              <span class="font-mono text-[9px] font-bold text-slate-400">CANDLE [0]</span>
              <span class="font-mono text-[7px] ${c0Bull ? "text-emerald-300" : "text-rose-300"}">${c0Bull ? "CURRENT · GREEN" : "CURRENT · RED"}</span>
            </div>
            <div class="${isLarge ? "mt-3 grid grid-cols-2 gap-2" : "mt-2 grid grid-cols-3 gap-2"}">
              ${metric("O", num(c0.o), isLarge)}
              ${metric("H", num(c0.h), isLarge)}
              ${metric("L", num(c0.l), isLarge)}
              ${metric("C", num(c0.c), isLarge)}
              ${metric("R", num(Number(c0.h) - Number(c0.l)), isLarge)}
              ${metric("M", num(Number(c0.c) - Number(c0.o)), isLarge)}
            </div>
          </div>

          <div class="rounded-2xl border border-white/[0.05] bg-black/20 ${isLarge ? "p-4" : "p-3"}">
            <div class="flex items-center justify-between">
              <span class="font-mono text-[9px] font-bold text-slate-400">GRID</span>
              <span class="font-mono text-[7px] text-violet-300/60">[1] ANCHOR</span>
            </div>
            <div class="mt-2">
              ${gridRows(grid)}
            </div>
            ${isLarge && grid ? `
              <div class="mt-3 grid grid-cols-2 gap-2">
                ${metric("Expected H", num(grid.expected && grid.expected.high), true)}
                ${metric("Expected L", num(grid.expected && grid.expected.low), true)}
              </div>` : ""}
          </div>

          <div class="${isLarge ? "lg:col-span-3" : "mt-3"} overflow-hidden rounded-2xl border border-white/[0.05] bg-black/20 p-2">
            <canvas id="mini-${esc(tf)}" class="h-${isLarge ? "[155px]" : "[90px]"} w-full"></canvas>
          </div>

        </div>
      </article>
    `;
  }

  function render() {
    var root = document.getElementById("cvGrid");
    if (!root) return;

    var market = window.FL200_MARKET && window.FL200_MARKET.state;
    var data = market ? market.candles : {};
    var tfs = Array.isArray(C.tfs) ? C.tfs.slice() : ["M30", "H1", "H4", "D1", "W1"];
    // Prefer order: selected first (large), then W1, H4, D1, M30, H1 remaining
    var preferred = ["W1", "H4", "D1", "M30", "H1"];
    tfs.sort(function (a, b) {
      if (a === selectedTf) return -1;
      if (b === selectedTf) return 1;
      var ia = preferred.indexOf(a); if (ia < 0) ia = 99;
      var ib = preferred.indexOf(b); if (ib < 0) ib = 99;
      return ia - ib;
    });

    root.innerHTML = tfs.map(function (tf) {
      return card(tf, data[tf] || []);
    }).join("");

    tfs.forEach(function (tf) {
      var candles = data[tf] || [];
      var engine = window.FL200_HEART && window.FL200_HEART.getEngine();
      var grid = engine && candles.length >= 3 && typeof engine.gridFromCandles === "function"
        ? engine.gridFromCandles(candles)
        : null;
      drawMiniChart(document.getElementById("mini-" + tf), candles, grid, tf === selectedTf);
    });
  }

  function setSelected(tf) {
    selectedTf = tf || selectedTf;
    render();
  }

  window.FL200_CANDLES = {
    render: render,
    setSelected: setSelected
  };
})();
