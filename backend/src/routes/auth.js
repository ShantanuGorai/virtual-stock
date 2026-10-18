const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");

const User = require("../models/User");
const PendingSignup = require("../models/PendingSignup");
const { sendVerificationEmail } = require("../utils/mailer");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

const CODE_TTL_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 30;
const MAX_CODE_ATTEMPTS = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests. Please try again in a few minutes." },
  })
);

// ---------- helpers ----------
const normEmail = (v) => String(v || "").trim().toLowerCase();

function makeCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

function hashCode(email, code) {
  return crypto.createHmac("sha256", process.env.JWT_SECRET).update(`${email}:${code}`).digest("hex");
}

function safeEqual(a, b) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function setSession(res, user, remember) {
  const token = jwt.sign({ sub: String(user._id) }, process.env.JWT_SECRET, {
    expiresIn: remember ? "30d" : "1d",
  });
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    ...(remember ? { maxAge: 30 * 24 * 60 * 60 * 1000 } : {}),
  });
}

const publicUser = (u) => ({ id: String(u._id), name: u.name, email: u.email });

// Wraps async handlers so errors reach the error middleware.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Creates a fresh code for a pending signup and emails it.
async function issueCode(pending) {
  const code = makeCode();
  pending.codeHash = hashCode(pending.email, code);
  pending.attempts = 0;
  pending.lastSentAt = new Date();
  pending.expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);
  await pending.save();
  try {
    await sendVerificationEmail(pending.email, pending.name, code, CODE_TTL_MINUTES);
  } catch (err) {
    console.error("Email send failed:", err.message);
    await PendingSignup.deleteOne({ _id: pending._id });
    const e = new Error("We could not send the verification email. Check the address and try again.");
    e.status = 502;
    throw e;
  }
}

// ---------- POST /api/auth/signup ----------
// Validates, stores a pending signup, emails a 6 digit code. Does NOT create the account.
router.post(
  "/signup",
  wrap(async (req, res) => {
    const name = String(req.body.name || "").trim();
    const email = normEmail(req.body.email);
    const password = String(req.body.password || "");

    if (name.length < 2 || name.length > 80) return res.status(400).json({ message: "Enter your name (2 to 80 characters)." });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ message: "Enter a valid email address." });
    if (password.length < 8 || password.length > 72)
      return res.status(400).json({ message: "Password must be 8 to 72 characters long." });

    if (await User.exists({ email }))
      return res.status(409).json({ message: "An account with this email already exists. Sign in instead." });

    let pending = await PendingSignup.findOne({ email });
    if (pending) {
      const wait = RESEND_COOLDOWN_SECONDS - (Date.now() - pending.lastSentAt.getTime()) / 1000;
      if (wait > 0) return res.status(429).json({ message: `Please wait ${Math.ceil(wait)} seconds before trying again.` });
    } else {
      pending = new PendingSignup({ email });
    }
    pending.name = name;
    pending.passwordHash = await bcrypt.hash(password, 12);

    await issueCode(pending);
    res.json({ message: "Verification code sent.", email });
  })
);

// ---------- POST /api/auth/resend ----------
router.post(
  "/resend",
  wrap(async (req, res) => {
    const email = normEmail(req.body.email);
    const pending = await PendingSignup.findOne({ email });
    if (!pending) return res.status(400).json({ message: "Your code has expired. Please sign up again." });

    const wait = RESEND_COOLDOWN_SECONDS - (Date.now() - pending.lastSentAt.getTime()) / 1000;
    if (wait > 0) return res.status(429).json({ message: `Please wait ${Math.ceil(wait)} seconds before requesting a new code.` });

    await issueCode(pending);
    res.json({ message: "A new code has been sent." });
  })
);

// ---------- POST /api/auth/verify ----------
// Only a correct code creates the real account.
router.post(
  "/verify",
  wrap(async (req, res) => {
    const email = normEmail(req.body.email);
    const code = String(req.body.code || "").trim();

    if (!/^\d{6}$/.test(code)) return res.status(400).json({ message: "Enter the 6 digit code." });

    const pending = await PendingSignup.findOne({ email });
    if (!pending || pending.expiresAt < new Date())
      return res.status(400).json({ message: "That code has expired. Please sign up again." });

    if (pending.attempts >= MAX_CODE_ATTEMPTS) {
      await PendingSignup.deleteOne({ _id: pending._id });
      return res.status(429).json({ message: "Too many wrong codes. Please sign up again." });
    }

    if (!safeEqual(pending.codeHash, hashCode(email, code))) {
      pending.attempts += 1;
      await pending.save();
      const left = MAX_CODE_ATTEMPTS - pending.attempts;
      return res.status(400).json({
        message: left > 0 ? `That code is not right. ${left} ${left === 1 ? "try" : "tries"} left.` : "Too many wrong codes. Please sign up again.",
      });
    }

    let user;
    try {
      user = await User.create({ name: pending.name, email, passwordHash: pending.passwordHash, emailVerified: true });
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ message: "An account with this email already exists. Sign in instead." });
      throw err;
    }
    await PendingSignup.deleteOne({ _id: pending._id });

    setSession(res, user, false);
    res.status(201).json({ user: publicUser(user) });
  })
);

// ---------- POST /api/auth/login ----------
router.post(
  "/login",
  wrap(async (req, res) => {
    const email = normEmail(req.body.email);
    const password = String(req.body.password || "");
    const remember = Boolean(req.body.remember);

    const user = await User.findOne({ email });
    const ok = user && (await bcrypt.compare(password, user.passwordHash));
    if (!ok) return res.status(401).json({ message: "That email and password don't match. Try again or reset your password." });

    setSession(res, user, remember);
    res.json({ user: publicUser(user) });
  })
);

// ---------- GET /api/auth/me ----------
router.get(
  "/me",
  requireAuth,
  wrap(async (req, res) => {
    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ message: "Please sign in." });
    res.json({ user: publicUser(user) });
  })
);

// ---------- POST /api/auth/logout ----------
router.post("/logout", (req, res) => {
  res.clearCookie("token", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  res.json({ message: "Signed out." });
});

module.exports = router;
