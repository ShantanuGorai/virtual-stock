// Real stock prices. This is the only file that talks to the data provider (Yahoo Finance's
// public chart endpoint, no API key needed). To switch provider later, change fetchFromProvider().

const RANGES = {
  "1D": { range: "1d", interval: "5m", ttl: 8000 },
  "5D": { range: "5d", interval: "30m", ttl: 8000 },
  "1M": { range: "1mo", interval: "1d", ttl: 15000 },
  "6M": { range: "6mo", interval: "1d", ttl: 30000 },
  "1Y": { range: "1y", interval: "1d", ttl: 30000 },
};

const SYMBOL_RE = /^[A-Z0-9.\-^]{1,12}$/;
const STALE_OK_MS = 5 * 60 * 1000; // serve old data for up to 5 minutes if the provider is down

const cache = new Map(); // "AAPL|1D" -> { at, data }

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

async function fetchFromProvider(symbol, { range, interval }) {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?range=${range}&interval=${interval}&includePrePost=false`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  let res;
  try {
    res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; VirtualStock/1.0)", Accept: "application/json" },
    });
  } catch {
    throw httpError(502, "The market data provider is not reachable right now.");
  } finally {
    clearTimeout(timer);
  }

  let json;
  try {
    json = await res.json();
  } catch {
    throw httpError(502, "The market data provider sent an unreadable answer.");
  }

  const result = json && json.chart && json.chart.result && json.chart.result[0];
  if (!result) {
    const code = json && json.chart && json.chart.error && json.chart.error.code;
    if (code === "Not Found") throw httpError(404, `Unknown stock symbol: ${symbol}`);
    throw httpError(502, "The market data provider returned no data.");
  }

  const q = (result.indicators && result.indicators.quote && result.indicators.quote[0]) || {};
  const stamps = result.timestamp || [];
  const candles = [];
  for (let i = 0; i < stamps.length; i++) {
    const o = q.open && q.open[i];
    const h = q.high && q.high[i];
    const l = q.low && q.low[i];
    const c = q.close && q.close[i];
    if ([o, h, l, c].some((x) => typeof x !== "number" || !Number.isFinite(x))) continue; // skip empty bars
    candles.push({ t: stamps[i] * 1000, o, h, l, c, v: (q.volume && q.volume[i]) || 0 });
  }
  if (!candles.length) throw httpError(502, "No price data available for this symbol right now.");

  const meta = result.meta || {};
  const last = candles[candles.length - 1];
  const price = Number.isFinite(meta.regularMarketPrice) ? meta.regularMarketPrice : last.c;
  // The newest bar may be a little behind: pin it to the latest real price
  last.c = price;
  last.h = Math.max(last.h, price);
  last.l = Math.min(last.l, price);

  return {
    symbol: meta.symbol || symbol,
    name: meta.longName || meta.shortName || symbol,
    currency: meta.currency || "USD",
    exchange: meta.fullExchangeName || meta.exchangeName || null,
    price,
    marketTime: (meta.regularMarketTime || 0) * 1000,
    candles,
  };
}

async function getCandles(symbol, rangeKey) {
  const cfg = RANGES[rangeKey];
  if (!cfg) throw httpError(400, "Range must be one of 1D, 5D, 1M, 6M, 1Y.");
  if (!SYMBOL_RE.test(symbol)) throw httpError(400, "Enter a valid stock symbol.");

  const key = `${symbol}|${rangeKey}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < cfg.ttl) return hit.data;

  try {
    const data = await fetchFromProvider(symbol, cfg);
    cache.set(key, { at: Date.now(), data });
    return data;
  } catch (err) {
    if (err.status === 502 && hit && Date.now() - hit.at < STALE_OK_MS) return { ...hit.data, stale: true };
    throw err;
  }
}

module.exports = { getCandles, RANGES };
