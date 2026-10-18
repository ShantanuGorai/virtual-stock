require("dotenv").config();
const connectDB = require("./config/db");
const app = require("./app");

for (const key of ["MONGODB_URI", "JWT_SECRET", "GMAIL_USER", "GMAIL_APP_PASSWORD"]) {
  if (!process.env[key]) {
    console.error(`Missing ${key} in backend/.env (see .env.example)`);
    process.exit(1);
  }
}

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`)))
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
