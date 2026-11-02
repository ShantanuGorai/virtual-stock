const express = require("express");
const rateLimit = require("express-rate-limit");
const requireAuth = require("../middleware/requireAuth");
const { getCandles, getQuotes, QUOTE_BATCH_LIMIT } = require("../utils/marketData");

const router = express.Router();
router.use(requireAuth);
router.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests. Please slow down." },
  })
);

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// GET /api/market/candles?symbol=AAPL&range=1D  (range: 1D, 5D, 1M, 6M, 1Y)
router.get(
  "/candles",
  wrap(async (req, res) => {
    const symbol = String(req.query.symbol || "AAPL").trim().toUpperCase();
    const range = String(req.query.range || "1D").trim().toUpperCase();
    res.json(await getCandles(symbol, range));
  })
);

// GET /api/market/quotes?symbols=AAPL,MSFT,...  -> { quotes: { AAPL: { price, previousClose, changePct } } }
// Symbols the provider can not find are simply left out of the answer.
router.get(
  "/quotes",
  wrap(async (req, res) => {
    const symbols = [
      ...new Set(
        String(req.query.symbols || "")
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .filter((s) => /^[A-Z0-9.\-^]{1,12}$/.test(s))
      ),
    ].slice(0, QUOTE_BATCH_LIMIT);
    if (!symbols.length) return res.status(400).json({ message: "Give at least one stock symbol." });
    res.json({ quotes: await getQuotes(symbols) });
  })
);

module.exports = router;
