/** OKX-style SVG candlestick chart (client-side). */
window.AlphaXChart = (function () {
  function render(container, candles, height) {
    if (!container) return;
    height = height || 180;
    if (!candles || !candles.length) {
      container.innerHTML =
        '<p class="hint" style="padding:1rem">No chart data.</p>';
      return;
    }

    var width = 640;
    var pad = { t: 12, r: 12, b: 20, l: 44 };
    var lows = candles.map(function (c) {
      return c.l;
    });
    var highs = candles.map(function (c) {
      return c.h;
    });
    var min = Math.min.apply(null, lows);
    var max = Math.max.apply(null, highs);
    var span = Math.max(0.01, max - min);
    var innerW = width - pad.l - pad.r;
    var innerH = height - pad.t - pad.b;
    var slot = innerW / candles.length;
    var bodyW = Math.max(2, slot * 0.55);

    function y(price) {
      return pad.t + ((max - price) / span) * innerH;
    }

    var last = candles[candles.length - 1];
    var first = candles[0];
    var up = last.c >= first.o;
    var ticks = [max, (max + min) / 2, min];

    var parts = [];
    parts.push(
      '<svg viewBox="0 0 ' +
        width +
        " " +
        height +
        '" class="candle-svg" role="img" aria-label="Fund candlestick chart" style="width:100%;height:auto;display:block">'
    );
    parts.push(
      '<rect x="0" y="0" width="' +
        width +
        '" height="' +
        height +
        '" fill="transparent"/>'
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
          '" stroke="var(--grid-line)" stroke-width="1"/>'
      );
      parts.push(
        '<text x="' +
          (pad.l - 6) +
          '" y="' +
          (yy + 3) +
          '" text-anchor="end" fill="var(--muted)" font-size="10" font-family="var(--font-mono)">' +
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
          '" stroke-width="1"/>' +
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
          '"/></g>'
      );
    });

    parts.push(
      '<text x="' +
        (width - pad.r) +
        '" y="' +
        (height - 4) +
        '" text-anchor="end" fill="' +
        (up ? "var(--good)" : "var(--bad)") +
        '" font-size="11" font-family="var(--font-mono)">' +
        last.c.toFixed(2) +
        "</text>"
    );
    parts.push("</svg>");
    container.innerHTML = parts.join("");
  }

  return { render: render };
})();
