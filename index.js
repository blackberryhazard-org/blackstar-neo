import "./load_globals.js";
import { execSync } from "node:child_process";

const startServices = () => {
  console.log("🚀 Starting services with PM2...");
  try {
    execSync("npm start", { stdio: "inherit" });
    console.log("✅ Services started. Use 'npx pm2 list' to check status.");
  } catch (error) {
    console.error("❌ Failed to start services:", error.message);
  }
};

startServices();
