// Money is stored as whole "minor units" (1.00 coin = 100) so decimals never drift.
const REWARD_MINOR = 100000; // 1,000.00 virtual coins, given once when the reward is claimed
const toUnits = (minor) => (minor ?? 0) / 100;

module.exports = { REWARD_MINOR, toUnits };
