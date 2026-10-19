const mongoose = require("mongoose");

// A real account. It is only created after the email code has been verified.
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Same Gmail inbox written in different ways (dots, +tags) maps to one key
    canonicalEmail: { type: String, unique: true, sparse: true },
    // Set once when the reward is claimed. null means not claimed yet.
    rewardClaimedAt: { type: Date, default: null },
    passwordHash: { type: String, required: true },
    emailVerified: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
