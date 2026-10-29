/** OKX-style SVG candlestick chart with live tick updates. */
window.AlphaXChart = (function () {
  var liveTimers = [];

  function clearLive() {
    while (liveTimers.length) {
      clearInterval(liveTimers.pop());
    }
  }

  function render(container, candles, height, opts) {
    if (!container) return;
    height = height || 180;
    opts = opts || {};
    if (!candles || !candles.length) {
      container.innerHTML =
        '<p class="hint" style="padding:1rem">No chart data.</p>';
      return;
    }

    var width = 640;
    var pad = { t: 10, r: 14, b: 18, l: 42 };
    var lows = candles.map(function (c) {
      return c.l;
    });
    var highs = candles.map(function (c) {
      return c.h;
    });
    var min = Math.min.apply(null, lows);
    var max = Math.max.apply(null, highs);
    var span = Math.max(0.01, max - min);
    // Pad range slightly so live ticks don't clip
    var padAmt = span * 0.08;
    min -= padAmt;
    max += padAmt;
    span = max - min;
    var innerW = width - pad.l - pad.r;
    var innerH = height - pad.t - pad.b;
    var slot = innerW / candles.length;
    var bodyW = Math.max(1.5, Math.min(6, slot * 0.62));

    function y(price) {
      return pad.t + ((max - price) / span) * innerH;
    }

    var last = candles[candles.length - 1];
    var first = candles[0];
    var up = last.c >= first.o;
    var ticks = [max, (max + min) / 2, min];
    var changePct =
      opts.changePct != null
        ? opts.changePct
        : ((last.c - first.o) / first.o) * 100;

    var parts = [];
    parts.push(
      '<svg viewBox="0 0 ' +
        width +
        " " +
        height +
        '" class="candle-svg" role="img" aria-label="Market candlestick chart" style="width:100%;height:auto;display:block">'
    );
    parts.push(
      '<defs><linearGradient id="chartFade" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="' +
        (up ? "rgba(46,189,133,0.12)" : "rgba(246,70,93,0.1)") +
        '"/>' +
        '<stop offset="100%" stop-color="transparent"/></linearGradient></defs>'
    );
    parts.push(
      '<rect x="0" y="0" width="' +
        width +
        '" height="' +
        height +
        '" fill="transparent"/>'
    );
    parts.push(
      '<rect x="' +
        pad.l +
        '" y="' +
        pad.t +
        '" width="' +
        innerW +
        '" height="' +
        innerH +
        '" fill="url(#chartFade)"/>'
    );

    ticks.forEach(function (t) {
      var yy = y(t);
      parts.push(
        '<line x1="' +
          pad.l +
          '" x2="' +
          (width - pad.r) +
          '" y1="' +
          yy +
          '" y2="' +
          yy +
          '" stroke="var(--grid-line)" stroke-width="1" stroke-dasharray="3 4"/>'
      );
      parts.push(
        '<text x="' +
          (pad.l - 5) +
          '" y="' +
          (yy + 3) +
          '" text-anchor="end" fill="var(--muted)" font-size="9" font-family="var(--font-mono)">' +
          t.toFixed(1) +
          "</text>"
      );
    });

    candles.forEach(function (c, i) {
      var x = pad.l + i * slot + slot / 2;
      var bull = c.c >= c.o;
      var color = bull ? "var(--good)" : "var(--bad)";
      var top = y(Math.max(c.o, c.c));
      var bot = y(Math.min(c.o, c.c));
      var bodyH = Math.max(1, bot - top);
      parts.push(
        '<g><line x1="' +
          x +
          '" x2="' +
          x +
          '" y1="' +
          y(c.h) +
          '" y2="' +
          y(c.l) +
          '" stroke="' +
          color +
          '" stroke-width="1.2"/>' +
          '<rect x="' +
          (x - bodyW / 2) +
          '" y="' +
          top +
          '" width="' +
          bodyW +
          '" height="' +
          bodyH +
          '" fill="' +
          color +
          '" rx="0.5"/></g>'
      );
    });

    // Last price + live pulse line
    var ly = y(last.c);
    parts.push(
      '<line x1="' +
        pad.l +
        '" x2="' +
        (width - pad.r) +
        '" y1="' +
        ly +
        '" y2="' +
        ly +
        '" stroke="' +
        (up ? "var(--good)" : "var(--bad)") +
        '" stroke-width="1" stroke-dasharray="2 3" opacity="0.55"/>'
    );
    parts.push(
      '<text x="' +
        (width - pad.r) +
        '" y="' +
        (pad.t + 11) +
        '" text-anchor="end" fill="' +
        (changePct >= 0 ? "var(--good)" : "var(--bad)") +
        '" font-size="11" font-family="var(--font-mono)" font-weight="600">' +
        last.c.toFixed(2) +
        " · " +
        (changePct >= 0 ? "+" : "") +
        changePct.toFixed(2) +
        "%</text>"
    );
    if (opts.live) {
      parts.push(
        '<circle cx="' +
          (width - pad.r - 4) +
          '" cy="' +
          ly +
          '" r="3" fill="' +
          (up ? "var(--good)" : "var(--bad)") +
          '"><animate attributeName="opacity" values="1;0.25;1" dur="1.1s" repeatCount="indefinite"/></circle>'
      );
    }
    parts.push("</svg>");
    container.innerHTML = parts.join("");
  }

  /**
   * Keep a chart alive with frequent client-side ticks (OKX feel).
   * Returns a stop() function.
   */
  function live(container, fund, height, popularityBumpPct) {
    if (!container || !window.AlphaXMarket) return function () {};
    var Market = window.AlphaXMarket;
    var candles = Market.buildLiveCandles(fund, 48, popularityBumpPct || 0);
    var tick = 1;
    var intervalMs = 450 + Math.floor(Math.random() * 200);

    function paint() {
      render(container, candles, height || 168, {
        live: true,
        changePct: Market.seriesChangePct(candles),
      });
      var priceEl = container.parentElement
        ? container.parentElement.querySelector("[data-live-price]")
        : null;
      if (priceEl && candles.length) {
        var last = candles[candles.length - 1];
        var pct = Market.seriesChangePct(candles);
        priceEl.textContent =
          last.c.toFixed(2) +
          " · " +
          (pct >= 0 ? "+" : "") +
          pct.toFixed(2) +
          "%";
        priceEl.className =
          "mono live-price " + (pct >= 0 ? "up" : "down");
      }
    }

    paint();
    var id = setInterval(function () {
      candles = Market.tickCandles(candles, fund, tick++);
      paint();
    }, intervalMs);
    liveTimers.push(id);
    return function stop() {
      clearInterval(id);
    };
  }

  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", clearLive);
  }

  return { render: render, live: live, clearLive: clearLive };
})();
