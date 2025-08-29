// backend/utils/config.js
import dotenv from "dotenv";

dotenv.config();

const REQUIRED_VARS = ["GEMINI_API_KEY"];

function validateEnv() {
  const missing = REQUIRED_VARS.filter((k) => !process.env[k]);
  if (missing.length) {
    const msg = `Missing required environment variables: ${missing.join(", ")}`;
    // Throwing here fails fast in non-test environments
    // In CI/local dev, this helps surface misconfiguration early
    throw new Error(msg);
  }
}

// Run validation at module load to fail fast
validateEnv();

export const config = {
  port: Number(process.env.PORT) || 5000,
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  geminiApiKey: process.env.GEMINI_API_KEY,
  serperApiKey: process.env.SERPER_API_KEY || "",
};
