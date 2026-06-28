import { spawn } from "node:child_process";
import { createConsola } from "consola";

const logger = createConsola({
  defaults: {
    tag: "Blackstar",
  },
});

const startServices = () => {
  logger.info("🚀 Starting services with PM2...");
  const pm2 = spawn("npx", ["pm2", "start", "ecosystem.config.cjs"], {
    stdio: "inherit",
    shell: false,
  });

  pm2.on("close", (code) => {
    if (code === 0) {
      logger.success(
        "✅ Services started. Use 'npx pm2 list' to check status.",
      );
    } else {
      logger.error(`❌ PM2 exited with code ${code}`);
    }
  });

  pm2.on("error", (err) => {
    logger.error("❌ Failed to start PM2 process:", err.message);
  });
};

startServices();
