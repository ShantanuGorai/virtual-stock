const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/auth");
const rewardRoutes = require("./routes/reward");
const walletRoutes = require("./routes/wallet");

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/reward", rewardRoutes);
app.use("/api/wallet", walletRoutes);

app.use((req, res) => res.status(404).json({ message: "Not found." }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (!err.status) console.error(err);
  res.status(err.status || 500).json({ message: err.status ? err.message : "Something went wrong. Please try again." });
});

module.exports = app;
