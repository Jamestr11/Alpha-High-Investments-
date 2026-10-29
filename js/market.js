/**
 * Client-side synthetic market ticks for AlphaX (GitHub Pages demo).
 * Dense OKX-style bars — Yahoo chart API is CORS-blocked in browsers.
 */
window.AlphaXMarket = (function () {
  function hash(n) {
    var x = Math.sin(n * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }

  function seedFrom(name) {
    var s = 0;
    for (var i = 0; i < name.length; i++) s += name.charCodeAt(i) * (i + 1);
    return s;
  }

  function buildFallbackMarketWeeks(count) {
    count = count || 52;
    var weeks = [];
    var price = 100;
    var now = Date.now();
    var weekMs = 7 * 24 * 60 * 60 * 1000;
    for (var i = count - 1; i >= 0; i--) {
      var noise = (hash(9001 + i * 13) - 0.48) * 0.04;
      var drift = 0.0015;
      var r = drift + noise;
      var open = price;
      var close = Math.max(1, open * (1 + r));
      weeks.push({
        t: now - i * weekMs,
        close: Math.round(close * 100) / 100,
        marketReturn: (close - open) / open,
      });
      price = close;
    }
    return weeks;
  }

  function fundWeeklyReturns(opts) {
    var fundName = opts.fundName;
    var expectedDriftPct = opts.expectedDriftPct;
    var beta = opts.beta;
    var volatility = opts.volatility;
    var projectHealth = opts.projectHealth == null ? 0 : opts.projectHealth;
    var popularityBumpPct = opts.popularityBumpPct || 0;
    var marketWeeks = opts.marketWeeks;
    var minWeek = opts.minWeek == null ? -0.1 : opts.minWeek;
    var maxWeek = opts.maxWeek == null ? 0.14 : opts.maxWeek;

    var seed = seedFrom(fundName);
    var drift = Math.max(0.002, (expectedDriftPct / 100) * 0.35);
    var pop = popularityBumpPct / 100;
    var vol = Math.max(0.15, volatility);
    var health = Math.max(-2, Math.min(2, projectHealth)) * 0.006;

    return marketWeeks.map(function (w, i) {
      var marketBit = beta * w.marketReturn;
      var noise = (hash(seed + i * 19) - 0.5) * 0.028 * vol;
      var wobble = (hash(seed * 3 + i * 7) - 0.5) * 0.01 * vol;
      var r = drift + marketBit + noise + wobble + health + pop;
      r = Math.max(minWeek, Math.min(maxWeek, r));
      return { t: w.t, r: r, marketReturn: w.marketReturn };
    });
  }

  function returnsToCandles(returns, startPrice) {
    startPrice = startPrice == null ? 100 : startPrice;
    var price = startPrice;
    var seed = 42;
    return returns.map(function (w, i) {
      var open = price;
      var close = Math.max(0.5, open * (1 + w.r));
      var wickUp = hash(seed + i * 31) * open * 0.008;
      var wickDown = hash(seed + i * 47) * open * 0.008;
      var high = Math.max(open, close) + wickUp;
      var low = Math.min(open, close) - wickDown;
      price = close;
      return {
        t: w.t,
        o: Math.round(open * 100) / 100,
        h: Math.round(high * 100) / 100,
        l: Math.round(Math.max(0.5, low) * 100) / 100,
        c: Math.round(close * 100) / 100,
      };
    });
  }

  /** Dense intraday-feeling bars for live OKX-style charts. */
  function buildLiveCandles(fund, bars, popularityBumpPct) {
    bars = bars || 48;
    var seed = seedFrom(fund.symbol || fund.name);
    var vol = Math.max(0.2, fund.volatility || 1);
    var beta = fund.beta || 1;
    var drift = ((fund.baseGrowthRate || 2) / 100) * 0.0008;
    var health = (fund.projectHealth || 0) * 0.0004;
    var pop = (popularityBumpPct || 0) / 100 / 40;
    var price = 100 + hash(seed) * 40;
    var now = Date.now();
    var step = 60 * 1000; // 1-min feel
    var candles = [];
    for (var i = bars - 1; i >= 0; i--) {
      var n = hash(seed + i * 17 + Math.floor(now / 8000));
      var n2 = hash(seed * 5 + i * 23);
      var r =
        drift +
        health +
        pop +
        (n - 0.5) * 0.012 * vol +
        (n2 - 0.5) * 0.004 * beta;
      var open = price;
      var close = Math.max(1, open * (1 + r));
      var wickUp = hash(seed + i * 41) * open * 0.004 * vol;
      var wickDown = hash(seed + i * 53) * open * 0.004 * vol;
      candles.push({
        t: now - i * step,
        o: Math.round(open * 100) / 100,
        h: Math.round((Math.max(open, close) + wickUp) * 100) / 100,
        l: Math.round(Math.max(0.5, Math.min(open, close) - wickDown) * 100) / 100,
        c: Math.round(close * 100) / 100,
      });
      price = close;
    }
    return candles;
  }

  /**
   * Mutate the last candle (and occasionally roll a new bar) for live feel.
   */
  function tickCandles(candles, fund, tickIndex) {
    if (!candles || !candles.length) return candles;
    var last = candles[candles.length - 1];
    var vol = Math.max(0.2, (fund && fund.volatility) || 1);
    var seed = seedFrom((fund && (fund.symbol || fund.name)) || "αX");
    var n = hash(seed + tickIndex * 97 + Date.now() * 0.001);
    var delta = (n - 0.48) * 0.35 * vol;
    var next = Math.max(0.5, last.c + delta);
    last.c = Math.round(next * 100) / 100;
    last.h = Math.round(Math.max(last.h, last.c, last.o) * 100) / 100;
    last.l = Math.round(Math.min(last.l, last.c, last.o) * 100) / 100;

    // Roll a fresh bar every ~8 ticks so the strip marches like OKX
    if (tickIndex % 8 === 0) {
      var open = last.c;
      candles.push({
        t: Date.now(),
        o: open,
        h: open,
        l: open,
        c: open,
      });
      if (candles.length > 56) candles.shift();
    }
    return candles;
  }

  function seriesChangePct(candles) {
    if (!candles || candles.length < 2) return 0;
    var first = candles[0].o;
    var last = candles[candles.length - 1].c;
    return Math.round(((last - first) / first) * 10000) / 100;
  }

  function compoundThroughWeeks(amount, returns, startDate, endDate, maxWeeks) {
    var startMs = startDate.getTime();
    var endMs = endDate.getTime();
    var value = amount;
    var applied = 0;
    for (var i = 0; i < returns.length; i++) {
      var w = returns[i];
      if (w.t <= startMs) continue;
      if (w.t > endMs) break;
      if (maxWeeks != null && applied >= maxWeeks) break;
      value *= 1 + w.r;
      applied += 1;
    }
    return { value: Math.round(value * 100) / 100, weeksApplied: applied };
  }

  var cachedWeeks = null;

  function getMarketWeeks(weeks) {
    weeks = weeks || 52;
    if (!cachedWeeks || cachedWeeks.length !== weeks) {
      cachedWeeks = buildFallbackMarketWeeks(weeks);
    }
    return {
      weeks: cachedWeeks,
      source: "fallback",
      symbol: "SPY*",
    };
  }

  function buildFundChart(fund, weeks, popularityBumpPct) {
    weeks = weeks || 26;
    var market = getMarketWeeks(52);
    var slice = market.weeks.slice(-weeks);
    var returns = fundWeeklyReturns({
      fundName: fund.symbol || fund.name,
      expectedDriftPct: fund.baseGrowthRate,
      beta: fund.beta,
      volatility: fund.volatility,
      projectHealth: fund.projectHealth,
      popularityBumpPct: popularityBumpPct || 0,
      marketWeeks: slice,
    });
    var candles = returnsToCandles(returns);
    return {
      candles: candles,
      returns: returns,
      changePct: seriesChangePct(candles),
      marketSource: market.source,
      marketSymbol: market.symbol,
    };
  }

  function buildLiveChart(fund, bars, popularityBumpPct) {
    var candles = buildLiveCandles(fund, bars || 48, popularityBumpPct);
    return {
      candles: candles,
      changePct: seriesChangePct(candles),
      live: true,
    };
  }

  return {
    getMarketWeeks: getMarketWeeks,
    fundWeeklyReturns: fundWeeklyReturns,
    returnsToCandles: returnsToCandles,
    seriesChangePct: seriesChangePct,
    compoundThroughWeeks: compoundThroughWeeks,
    buildFundChart: buildFundChart,
    buildLiveCandles: buildLiveCandles,
    buildLiveChart: buildLiveChart,
    tickCandles: tickCandles,
  };
})();
