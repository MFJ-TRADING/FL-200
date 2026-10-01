var MFJ_GLOBAL = {
    /* ---- GRID ---- */
    // Anchor low se kitne % pe levels (0 = low, 1 = high of previous candle)
    // Example: 0, 0.33, 0.66, 1.00, 1.33, 1.66
    gridLevels:   [-0.33, 0, 0.33, 0.66, 1.00, 1.33, 1.66],
    gridColors:   [                     // same order as gridLevels
        "rgba(0,243,255,.45)",          // -33%
        "rgba(0,243,255,.45)",          // 0%
        "rgba(0,255,102,.50)",          // 33%
        "rgba(0,255,102,.70)",          // 66%
        "rgba(255,170,0,.65)",          // 100%
        "rgba(255,0,85,.55)",           // 133%
        "rgba(255,0,85,.75)"            // 166%
    ],
    gridLineColor: "rgba(0,243,255,.055)",   // background grid lines

    /* ---- PREVIOUS / EXPECTED lines (yellow) ---- */
    previousLineColor: "#ffaa00",            // ExpH / ExpL / open-close style
    expectedHighMult:  0.50,                // midpoint + range * this
    expectedLowMult:   0.50,                // midpoint - range * this

    /* ============================================================
       ALL SIGNALS → LEFT SIDE only (optional)
       Empty array / 0 = hide that signal
       ============================================================ */

    /* ---- BUY signals (LEFT) ---- */
    buyColor:     "#00ff66",
    buySignals:   [0.33, 0.66],             // [] = hide
    buyLabels:    ["BUY2", "BUY1"],

    /* ---- SELL signals (LEFT) ---- */
    sellColor:    "#ff0055",
    sellSignals:  [1.33, 1.66],             // [] = hide
    sellLabels:   ["SELL1", "SELL2"],

    /* ---- SL / TP (LEFT) — 0 = hide ---- */
    buySL:  0.55,
    buyTP:  0.55,
    sellSL: 0.55,
    sellTP: 0.55,
    sltpColor: "#bd00ff",

    /* ---- EXTRA / FUTURE custom signals (LEFT) ---- */
    // Example: [ { pct: 0.80, label: "MY1", color: "#ffffff" } ]
    // Empty = nothing. Future me yahan add kar sakte ho.
    extraSignals: []
 };

 (function($){
    "use strict";
    /* ========================================================
       CHART CLASS
       ======================================================== */
    function MFJChart(element){
        var self = this;
        /* ====================================================
           ELEMENT
           ==================================================== */
        self.$chart =
            $(element);
        self.canvas =
            self.$chart.find(".mfj-canvas")[0];
        if(!self.canvas){
            return;
        }
        self.ctx =
            self.canvas.getContext("2d");
        /* ====================================================
           SETTINGS
           ==================================================== */
        self.symbol =
            self.$chart.attr("data-symbol") || "BTCUSDT";
        self.timeframe =
            self.$chart.attr("data-timeframe") || "H1";
        /* ====================================================
           CONNECTION STATE
           ==================================================== */
        self.connected  = false;
        self.demoMode   = false;
        self.wsFails    = 0;
        self.restHost   = 0;
        /* Binance public market-data hosts (fallback ke sath) */
        self.restHosts = [
            "https://data-api.binance.vision/api/v3",
            "https://api.binance.com/api/v3"
        ];
        /* ====================================================
           ONLY TWO CANDLES
           [0] = ANCHOR (closed)   [1] = CURRENT (live)
           ==================================================== */
        self.candles = [
            { o:3800.00, h:3812.00, l:3788.00, c:3806.00 },
            { o:3806.00, h:3818.00, l:3798.00, c:3812.00 }
        ];
        /* ====================================================
           RESIZE
           ==================================================== */
        self.resize = function(){
            var W =
                self.canvas.clientWidth;
            var H =
                self.canvas.clientHeight;
            if(W <= 0 || H <= 0){
                return;
            }
            var dpr =
                window.devicePixelRatio || 1;
            self.canvas.width =
                W * dpr;
            self.canvas.height =
                H * dpr;
            self.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        /* ====================================================
           VALIDATE CANDLE
           ==================================================== */
        self.validCandle = function(c){
            if(!c){
                return false;
            }
            return (
                typeof c.o === "number" &&
                typeof c.h === "number" &&
                typeof c.l === "number" &&
                typeof c.c === "number" &&
                c.h >= c.l &&
                c.h >= c.o &&
                c.h >= c.c &&
                c.l <= c.o &&
                c.l <= c.c
            );
        };
        /* ====================================================
           VALIDATE BOTH
           ==================================================== */
        self.validCandles = function(){
            return (
                self.candles.length === 2 &&
                self.validCandle(self.candles[0]) &&
                self.validCandle(self.candles[1])
            );
        };
        /* ====================================================
           BACKGROUND
           ==================================================== */
        self.drawBackground = function(W,H){
            var ctx = self.ctx;
            ctx.fillStyle = "#060913";
            ctx.fillRect(0, 0, W, H);
            ctx.strokeStyle = MFJ_GLOBAL.gridLineColor || "rgba(0,243,255,.055)";
            ctx.lineWidth = 1;
            /* Vertical */
            for(var x=0; x<=W; x+=40){
                ctx.beginPath();
                ctx.moveTo(x,0);
                ctx.lineTo(x,H);
                ctx.stroke();
            }
            /* Horizontal */
            for(var y=0; y<=H; y+=35){
                ctx.beginPath();
                ctx.moveTo(0,y);
                ctx.lineTo(W,y);
                ctx.stroke();
            }
        };
        /* ====================================================
           TAG BOX
           ==================================================== */
        self.tagBox = function(x, y, w, h, text, color){
            var ctx = self.ctx;
            ctx.fillStyle = "rgba(2,6,23,.96)";
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, w, h);
            ctx.fillStyle = color;
            ctx.font = "15px JetBrains Mono";
            ctx.textAlign = "left";
            ctx.fillText(text, x + 5, y + h/2 + 3);
        };
        /* ====================================================
           CANDLE
           ==================================================== */
        self.drawCandle = function(x, candle, width, y){
            var ctx = self.ctx;
            var o = candle.o;
            var h = candle.h;
            var l = candle.l;
            var c = candle.c;
            var up = c >= o;
            var color = up ? "#00ff66" : "#ff0055";
            /* Wick */
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x, y(h));
            ctx.lineTo(x, y(l));
            ctx.stroke();
            /* Body */
            var top    = y(Math.max(o,c));
            var bottom = y(Math.min(o,c));
            var bodyHeight = Math.max(4, bottom-top);
            ctx.fillStyle = color;
            ctx.fillRect(x-width/2, top, width, bodyHeight);
            ctx.strokeStyle = color;
            ctx.strokeRect(x-width/2, top, width, bodyHeight);
        };
        /* ====================================================
           GRID LEVELS  (reads MFJ_GLOBAL.gridLevels)
           ==================================================== */
        self.calculateLevels = function(){
            var anchor = self.candles[0];
            var range  = anchor.h - anchor.l;
            var low    = anchor.l;
            var levels = {};
            var gl = MFJ_GLOBAL.gridLevels || [0, 0.33, 0.66, 1, 1.33, 1.66];
            for(var i = 0; i < gl.length; i++){
                levels["p" + Math.round(gl[i]*100)] = low + range * gl[i];
            }
            // always keep common keys for safety
            levels.p0   = levels.p0   !== undefined ? levels.p0   : low;
            levels.p100 = levels.p100 !== undefined ? levels.p100 : anchor.h;
            return levels;
        };
        /* ====================================================
           EXPECTED HIGH / LOW  (reads MFJ_GLOBAL)
           ==================================================== */
        self.expectedLevels = function(){
            var anchor = self.candles[0];
            var range  = anchor.h - anchor.l;
            var midpoint = (anchor.h + anchor.l)/2;
            return {
                high: midpoint + range * (MFJ_GLOBAL.expectedHighMult || 0.50),
                low:  midpoint - range * (MFJ_GLOBAL.expectedLowMult  || 0.50)
            };
        };
        /* ====================================================
           PRICE MAP
           ==================================================== */
        self.priceMap = function(low, high, H){
            var range = high - low;
            if(range === 0){
                range = 1;
            }
            return function(price){
                return (
                    H - 45 -
                    ((price - low) / range) * (H - 70)
                );
            };
        };
        /* ====================================================
           LEVEL
           ==================================================== */
        self.drawLevel = function(price, label, color, y, W, right){
            var ctx = self.ctx;
            var yy = y(price);
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.setLineDash([7,5]);
            ctx.beginPath();
            ctx.moveTo(20, yy);
            ctx.lineTo(W-right, yy);
            ctx.stroke();
            ctx.setLineDash([]);
            self.tagBox(
                W - right + 5,
                yy - 9,
                right - 10,
                18,
                label + " " + price.toFixed(2),
                color
            );
        };
        /* ====================================================
           MAIN DRAW
           ==================================================== */
        self.draw = function(){
            var W = self.canvas.clientWidth;
            var H = self.canvas.clientHeight;
            if(W <= 0 || H <= 0){
                requestAnimationFrame(self.draw);
                return;
            }
            self.drawBackground(W, H);
            /* -----------------------------------------------
               DATA CHECK
               ----------------------------------------------- */
            if(!self.validCandles()){
                var ctx = self.ctx;
                ctx.fillStyle = "#7d8ca3";
                ctx.font = "bold 15px Orbitron";
                ctx.textAlign = "center";
                ctx.fillText("DATA KA INTAZAR", W/2, H/2);
                ctx.textAlign = "left";
                requestAnimationFrame(self.draw);
                return;
            }
            /* -----------------------------------------------
               LEVELS  (from MFJ_GLOBAL)
               ----------------------------------------------- */
            var G = self.calculateLevels();
            var E = self.expectedLevels();
            var anchor = self.candles[0];
            var range  = anchor.h - anchor.l;
            var lowA   = anchor.l;

            // collect all prices that should be visible
            var prices = [
                self.candles[0].l, self.candles[0].h,
                self.candles[1].l, self.candles[1].h,
                E.high, E.low
            ];
            // add every grid level
            var gl = MFJ_GLOBAL.gridLevels || [];
            for(var i=0; i<gl.length; i++){
                prices.push(lowA + range * gl[i]);
            }
            // add buy / sell signal prices
            var bs = MFJ_GLOBAL.buySignals || [];
            for(i=0; i<bs.length; i++){ prices.push(lowA + range * bs[i]); }
            var ss = MFJ_GLOBAL.sellSignals || [];
            for(i=0; i<ss.length; i++){ prices.push(lowA + range * ss[i]); }
            // add SL / TP + extra signals so they stay in view
            var midTmp = (anchor.h + anchor.l) / 2;
            if(MFJ_GLOBAL.buySL  > 0) prices.push(midTmp - range * MFJ_GLOBAL.buySL);
            if(MFJ_GLOBAL.buyTP  > 0) prices.push(midTmp + range * MFJ_GLOBAL.buyTP);
            if(MFJ_GLOBAL.sellSL > 0) prices.push(midTmp + range * MFJ_GLOBAL.sellSL);
            if(MFJ_GLOBAL.sellTP > 0) prices.push(midTmp - range * MFJ_GLOBAL.sellTP);
            var extrasTmp = MFJ_GLOBAL.extraSignals || [];
            for(i=0; i<extrasTmp.length; i++){
                if(extrasTmp[i] && typeof extrasTmp[i].pct === "number"){
                    prices.push(lowA + range * extrasTmp[i].pct);
                }
            }

            var low  = Math.min.apply(null, prices);
            var high = Math.max.apply(null, prices);
            var padding = (high - low) * .08;
            low  -= padding;
            high += padding;
            var y = self.priceMap(low, high, H);

            /* -----------------------------------------------
               EXPECTED AREA
               ----------------------------------------------- */
            self.ctx.fillStyle = "rgba(255,170,0,.055)";
            self.ctx.fillRect(
                20,
                y(E.high),
                W - 160,
                y(E.low) - y(E.high)
            );
            /* -----------------------------------------------
               RIGHT SIDE ONLY — Grid lines + PH/PL (ExpH/ExpL)
               Kabhi nahi haten
               ----------------------------------------------- */
            var gColors = MFJ_GLOBAL.gridColors || [];
            for(i=0; i<gl.length; i++){
                var pct = gl[i];
                var price = lowA + range * pct;
                var label = Math.round(pct * 100) + "%";
                var col   = gColors[i] || "rgba(0,243,255,.45)";
                self.drawLevel(price, label, col, y, W, 150);
            }
            var prevColor = MFJ_GLOBAL.previousLineColor || "#ffaa00";
            self.drawLevel(E.high, "PH", prevColor, y, W, 150);   // Previous High
            self.drawLevel(E.low,  "PL", prevColor, y, W, 150);   // Previous Low

            /* -----------------------------------------------
               LEFT SIDE ONLY — ALL SIGNALS (optional)
               Empty / 0 = hide
               ----------------------------------------------- */
            // BUY
            var buyColor = MFJ_GLOBAL.buyColor || "#00ff66";
            var buyLabs  = MFJ_GLOBAL.buyLabels || [];
            for(i=0; i<bs.length; i++){
                var bPrice = lowA + range * bs[i];
                var bLab   = buyLabs[i] || ("BUY" + (i+1));
                self.tagBox(25, y(bPrice)-9, 70, 18, bLab, buyColor);
            }
            // SELL
            var sellColor = MFJ_GLOBAL.sellColor || "#ff0055";
            var sellLabs  = MFJ_GLOBAL.sellLabels || [];
            for(i=0; i<ss.length; i++){
                var sPrice = lowA + range * ss[i];
                var sLab   = sellLabs[i] || ("SELL" + (i+1));
                self.tagBox(25, y(sPrice)-9, 70, 18, sLab, sellColor);
            }
            // SL / TP
            var sltpCol = MFJ_GLOBAL.sltpColor || "#bd00ff";
            var mid = (anchor.h + anchor.l) / 2;
            if(MFJ_GLOBAL.buySL > 0){
                self.tagBox(25, y(mid - range * MFJ_GLOBAL.buySL)-9, 70, 18, "BuySL", sltpCol);
            }
            if(MFJ_GLOBAL.buyTP > 0){
                self.tagBox(25, y(mid + range * MFJ_GLOBAL.buyTP)-9, 70, 18, "BuyTP", sltpCol);
            }
            if(MFJ_GLOBAL.sellSL > 0){
                self.tagBox(25, y(mid + range * MFJ_GLOBAL.sellSL)-9, 70, 18, "SellSL", sltpCol);
            }
            if(MFJ_GLOBAL.sellTP > 0){
                self.tagBox(25, y(mid - range * MFJ_GLOBAL.sellTP)-9, 70, 18, "SellTP", sltpCol);
            }
            // EXTRA / FUTURE custom signals
            var extras = MFJ_GLOBAL.extraSignals || [];
            for(i=0; i<extras.length; i++){
                var ex = extras[i];
                if(!ex || typeof ex.pct !== "number") continue;
                var exPrice = lowA + range * ex.pct;
                var exLab   = ex.label || ("SIG" + (i+1));
                var exCol   = ex.color || "#ffffff";
                self.tagBox(25, y(exPrice)-9, 70, 18, exLab, exCol);
            }
            /* -----------------------------------------------
               TWO CANDLES
               ----------------------------------------------- */
            var candleArea = W - 190;
            var x1 = candleArea * .40;
            var x0 = candleArea * .72;
            var candleWidth = Math.max(25, Math.min(65, candleArea * .10));
            /* Candle [1] */
            self.drawCandle(x1, self.candles[0], candleWidth, y);
            /* Candle [0] */
            self.drawCandle(x0, self.candles[1], candleWidth, y);
            /* -----------------------------------------------
               CANDLE NUMBERS
               ----------------------------------------------- */
            self.ctx.font = "bold 15px JetBrains Mono";
            self.ctx.textAlign = "center";
            self.ctx.fillStyle = "#bd00ff";
            self.ctx.fillText("[1]", x1, H - 12);
            self.ctx.fillText("[0]", x0, H - 12);
            /* -----------------------------------------------
               CURRENT PRICE
               ----------------------------------------------- */
            var current  = self.candles[1].c;
            var currentY = y(current);
            var pulse = .55 + .35 * Math.sin(Date.now()/250);
            self.ctx.strokeStyle = "rgba(0,243,255," + pulse + ")";
            self.ctx.setLineDash([3,4]);
            self.ctx.beginPath();
            self.ctx.moveTo(20, currentY);
            self.ctx.lineTo(W - 150, currentY);
            self.ctx.stroke();
            self.ctx.setLineDash([]);
            self.tagBox(
                W - 145,
                currentY - 10,
                135,
                20,
                current.toFixed(2),
                "#00f3ff"
            );
            /* -----------------------------------------------
               HEADER INFO
               ----------------------------------------------- */
            self.ctx.textAlign = "left";
            self.ctx.font = "10px JetBrains Mono";
            self.ctx.fillStyle = "#7d8ca3";
            self.ctx.fillText(
                self.symbol + " · " + self.timeframe + " · [1] [0]",
                20,
                20
            );
            /* -----------------------------------------------
               STATUS  (SYNC -> LIVE / DEMO)
               FIX: pehle yahan default LIVE dikhta tha
               ----------------------------------------------- */
            var status;
            if(self.connected){
                status = "● LIVE";
            }
            else if(self.demoMode){
                status = "● DEMO";
            }
            else{
                status = "● SYNC";
            }
            self.$chart
                .find(".mfj-chart-status")
                .text(status)
                .toggleClass("warn", self.demoMode);
            /* -----------------------------------------------
               NEXT FRAME
               ----------------------------------------------- */
            requestAnimationFrame(self.draw);
        };
        /* ====================================================
           BINANCE LAYER — SYMBOL / INTERVAL MAP
           ==================================================== */
        self.binanceSymbol = function(){
            var s = (self.symbol || "BTCUSDT").toUpperCase();
            if(s.indexOf("USDT") !== -1){
                return s;
            }
            return s.replace(/USD$/, "USDT");
        };
        self.binanceInterval = function(){
                var map = {
                    MN:"1M",                                  /* MONTHLY — Binance uses 1M */
                    H1:"1h",  H4:"4h",  D1:"1d",   W1:"1w"
                };
                return map[self.timeframe] || "1h";
            };
        /* ====================================================
           BINANCE LAYER — REST (LAST 2 KLINES)
           [0] = pichla closed candle (ANCHOR)
           [1] = current live candle
           ==================================================== */
        self.loadBinance = function(){
            var url =
                self.restHosts[self.restHost] +
                "/klines" +
                "?symbol="   + self.binanceSymbol() +
                "&interval=" + self.binanceInterval() +
                "&limit=2";
            $.getJSON(url)
            .done(function(data){
                if(!data || data.length < 2){
                    self.startDemo();
                    return;
                }
                self.candles = [
                    {
                        t: data[0][0],
                        o: +data[0][1],
                        h: +data[0][2],
                        l: +data[0][3],
                        c: +data[0][4]
                    },
                    {
                        t: data[1][0],
                        o: +data[1][1],
                        h: +data[1][2],
                        l: +data[1][3],
                        c: +data[1][4]
                    }
                ];
                self.connected = true;
                self.demoMode  = false;
                /* FIX: agar pehle demo chal raha tha to usay band karo */
                if(self.demoTimer){
                    clearInterval(self.demoTimer);
                    self.demoTimer = null;
                }
                if(self.retryTimer){
                    clearInterval(self.retryTimer);
                    self.retryTimer = null;
                }
                self.connectBinance();
            })
            .fail(function(){
                self.restHost++;
                if(self.restHost < self.restHosts.length){
                    setTimeout(self.loadBinance, 800);
                }
                else{
                    self.startDemo();
                }
            });
        };
        /* ====================================================
           BINANCE LAYER — WEBSOCKET (LIVE KLINE STREAM)
           ==================================================== */
        self.connectBinance = function(){
            var stream =
                self.binanceSymbol().toLowerCase() +
                "@kline_" +
                self.binanceInterval();
            try{
                self.ws =
                    new WebSocket(
                        "wss://stream.binance.com:9443/ws/" + stream
                    );
            }
            catch(e){
                self.startDemo();
                return;
            }
            self.ws.onopen = function(){
                self.wsFails = 0;
            };
            self.ws.onmessage = function(event){
                var msg;
                try{
                    msg = JSON.parse(event.data);
                }
                catch(e){
                    return;
                }
                var k = msg && msg.k;
                if(!k){
                    return;
                }
                var cur = self.candles[1];
                /* NAYA CANDLE OPEN HUA -> [1] ab [0] (anchor) ban jata he */
                if(cur && k.t > cur.t){
                    self.candles = [
                        {
                            t: cur.t,
                            o: cur.o,
                            h: cur.h,
                            l: cur.l,
                            c: cur.c
                        },
                        {
                            t: k.t,
                            o: +k.o,
                            h: +k.h,
                            l: +k.l,
                            c: +k.c
                        }
                    ];
                    return;
                }
                /* CURRENT CANDLE KA LIVE UPDATE */
                if(cur && k.t === cur.t){
                    cur.o = +k.o;
                    cur.h = +k.h;
                    cur.l = +k.l;
                    cur.c = +k.c;
                }
            };
            self.ws.onclose = function(){
                if(!self.connected){
                    return;
                }
                self.wsFails++;
                if(self.wsFails <= 5){
                    setTimeout(self.connectBinance, 3000);
                }
                else{
                    self.connected = false;
                    self.startDemo();
                }
            };
        };
        /* ====================================================
           FALLBACK DEMO (agar Binance connect na ho)
           FIX: har 30s me Binance dobara try hota he,
           success per demo khud-band ho kar LIVE ho jata he
           ==================================================== */
        self.startDemo = function(){
            self.demoMode = true;
            if(self.demoTimer){
                return;
            }
            self.demoTimer = setInterval(function(){
                var c = self.candles[1];
                var movement = (Math.random() - .48) * 2.5;
                c.c += movement;
                if(c.c > c.h){
                    c.h = c.c;
                }
                if(c.c < c.l){
                    c.l = c.c;
                }
            }, 1000);
            self.retryTimer = setInterval(function(){
                self.restHost = 0;
                self.loadBinance();
            }, 30000);
        };
        /* ====================================================
           INIT
           ==================================================== */
        self.resize();
        self.draw();
        self.loadBinance();
    }
    /* ========================================================
       STORE ALL CHART INSTANCES
       ======================================================== */
    var MFJ_CHARTS = [];
    /* ========================================================
       INITIALIZE EVERY .mfj-chart
       ======================================================== */
    $(".mfj-chart").each(function(){
        var chart = new MFJChart(this);
        MFJ_CHARTS.push(chart);
    });
    /* ========================================================
       WINDOW RESIZE
       ======================================================== */
    $(window).on("resize", function(){
        $.each(MFJ_CHARTS, function(index, chart){
            chart.resize();
        });
    });
    /* ========================================================
       CLICK -> ACTIVE SWAP (col-md-8 wale slot me aa jaye)
       ======================================================== */
    var busy = false;
    $(".mfj-chart").on("click", function(){
        var $clicked = $(this);
        if(busy || $clicked.hasClass("is-active")){
            return;
        }
        var $big = $(".mfj-chart.is-active").first();
        if(!$big.length){
            $clicked.addClass("is-active");
            return;
        }
        busy = true;
        var $bigSlot   = $big.closest(".mfj-slot");      /* col-md-8 */
        var $smallSlot = $clicked.closest(".mfj-slot");  /* clicked  */
        $big.add($clicked).addClass("mfj-swap-out");
        setTimeout(function(){
            $big.appendTo($smallSlot);      /* purana bara -> chhota slot */
            $clicked.appendTo($bigSlot);    /* clicked -> bara slot       */
            $big.removeClass("is-active mfj-swap-out");
            $clicked.removeClass("mfj-swap-out").addClass("is-active");
            /* chart engine ko batao ke canvas size badal gaya */
            $(window).trigger("resize");
            setTimeout(function(){
                busy = false;
            }, 200);
        }, 180);
    });
 })(jQuery);
