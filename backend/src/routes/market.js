const express = require("express");
const rateLimit = require("express-rate-limit");
const requireAuth = require("../middleware/requireAuth");
const { getCandles } = require("../utils/marketData");

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

module.exports = router;
