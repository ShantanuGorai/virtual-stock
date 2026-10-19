const express = require("express");
const User = require("../models/User");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();
router.use(requireAuth);

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// GET /api/reward/status -> { claimed: boolean }
router.get(
  "/status",
  wrap(async (req, res) => {
    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ message: "Please sign in." });
    res.json({ claimed: Boolean(user.rewardClaimedAt) });
  })
);

// POST /api/reward/claim
// The update only matches while rewardClaimedAt is still null, so two requests at the same
// time (two tabs, double click) can never both succeed. Each Gmail inbox has one account,
// so each Gmail can claim the reward once.
router.post(
  "/claim",
  wrap(async (req, res) => {
    const updated = await User.findOneAndUpdate(
      { _id: req.userId, rewardClaimedAt: null },
      { $set: { rewardClaimedAt: new Date() } }
    );
    if (!updated) return res.status(409).json({ message: "This reward has already been claimed for your Gmail account." });
    res.json({ claimed: true });
  })
);

module.exports = router;
