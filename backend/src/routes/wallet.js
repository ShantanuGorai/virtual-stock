const express = require("express");
const User = require("../models/User");
const requireAuth = require("../middleware/requireAuth");
const { REWARD_MINOR, toUnits } = require("../config/wallet");

const router = express.Router();
router.use(requireAuth);

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// GET /api/wallet -> { balance: 1000 }
router.get(
  "/",
  wrap(async (req, res) => {
    let user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ message: "Please sign in." });

    // Accounts that claimed the reward before wallets existed have no balance yet.
    // Credit them once. The filter makes sure it can never be applied twice.
    if (user.rewardClaimedAt && user.balanceMinor == null) {
      const credited = await User.findOneAndUpdate(
        { _id: user._id, rewardClaimedAt: { $ne: null }, balanceMinor: { $exists: false } },
        { $set: { balanceMinor: REWARD_MINOR } },
        { new: true }
      );
      user = credited || (await User.findById(req.userId));
    }

    res.json({ balance: toUnits(user.balanceMinor) });
  })
);

module.exports = router;
