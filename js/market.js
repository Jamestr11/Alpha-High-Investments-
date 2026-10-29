/**
 * Client-side weekly market tick for AlphaX funds (GitHub Pages demo).
 * Uses synthetic SPY-like weeks — Yahoo chart API is CORS-blocked in browsers.
 */
window.AlphaXMarket = (function () {
  function hash(n) {
    const x = Math.sin(n * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }

  function seedFrom(name) {
    let s = 0;
    for (let i = 0; i < name.length; i++) s += name.charCodeAt(i) * (i + 1);
    return s;
  }

  function buildFallbackMarketWeeks(count) {
    count = count || 52;
    const weeks = [];
    let price = 100;
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    for (let i = count - 1; i >= 0; i--) {
      const noise = (hash(9001 + i * 13) - 0.48) * 0.04;
      const drift = 0.0015;
      const r = drift + noise;
      const open = price;
      const close = Math.max(1, open * (1 + r));
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
    const fundName = opts.fundName;
    const expectedDriftPct = opts.expectedDriftPct;
    const beta = opts.beta;
    const volatility = opts.volatility;
    const projectHealth = opts.projectHealth == null ? 0 : opts.projectHealth;
    const popularityBumpPct = opts.popularityBumpPct || 0;
    const marketWeeks = opts.marketWeeks;
    const minWeek = opts.minWeek == null ? -0.1 : opts.minWeek;
    const maxWeek = opts.maxWeek == null ? 0.14 : opts.maxWeek;

    const seed = seedFrom(fundName);
    const drift = Math.max(0.002, (expectedDriftPct / 100) * 0.35);
    const pop = popularityBumpPct / 100;
    const vol = Math.max(0.15, volatility);
    const health = Math.max(-2, Math.min(2, projectHealth)) * 0.006;

    return marketWeeks.map(function (w, i) {
      const marketBit = beta * w.marketReturn;
      const noise = (hash(seed + i * 19) - 0.5) * 0.028 * vol;
      const wobble = (hash(seed * 3 + i * 7) - 0.5) * 0.01 * vol;
      let r = drift + marketBit + noise + wobble + health + pop;
      r = Math.max(minWeek, Math.min(maxWeek, r));
      return { t: w.t, r: r, marketReturn: w.marketReturn };
    });
  }

  function returnsToCandles(returns, startPrice) {
    startPrice = startPrice == null ? 100 : startPrice;
    let price = startPrice;
    const seed = 42;
    return returns.map(function (w, i) {
      const open = price;
      const close = Math.max(0.5, open * (1 + w.r));
      const wickUp = hash(seed + i * 31) * open * 0.008;
      const wickDown = hash(seed + i * 47) * open * 0.008;
      const high = Math.max(open, close) + wickUp;
      const low = Math.min(open, close) - wickDown;
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

  function seriesChangePct(candles) {
    if (!candles || candles.length < 2) return 0;
    const first = candles[0].o;
    const last = candles[candles.length - 1].c;
    return Math.round(((last - first) / first) * 10000) / 100;
  }

  function compoundThroughWeeks(amount, returns, startDate, endDate, maxWeeks) {
    const startMs = startDate.getTime();
    const endMs = endDate.getTime();
    let value = amount;
    let applied = 0;
    for (let i = 0; i < returns.length; i++) {
      const w = returns[i];
      if (w.t <= startMs) continue;
      if (w.t > endMs) break;
      if (maxWeeks != null && applied >= maxWeeks) break;
      value *= 1 + w.r;
      applied += 1;
    }
    return { value: Math.round(value * 100) / 100, weeksApplied: applied };
  }

  let cachedWeeks = null;

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
    const market = getMarketWeeks(52);
    const slice = market.weeks.slice(-weeks);
    const returns = fundWeeklyReturns({
      fundName: fund.name,
      expectedDriftPct: fund.baseGrowthRate,
      beta: fund.beta,
      volatility: fund.volatility,
      projectHealth: fund.projectHealth,
      popularityBumpPct: popularityBumpPct || 0,
      marketWeeks: slice,
    });
    const candles = returnsToCandles(returns);
    return {
      candles: candles,
      returns: returns,
      changePct: seriesChangePct(candles),
      marketSource: market.source,
      marketSymbol: market.symbol,
    };
  }

  return {
    getMarketWeeks: getMarketWeeks,
    fundWeeklyReturns: fundWeeklyReturns,
    returnsToCandles: returnsToCandles,
    seriesChangePct: seriesChangePct,
    compoundThroughWeeks: compoundThroughWeeks,
    buildFundChart: buildFundChart,
  };
})();
