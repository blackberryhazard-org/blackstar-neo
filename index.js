import "./load_globals.js";
import { createConsola } from "consola";
import pm2 from "pm2";
import config from "./config.js";

const logger = createConsola({
  defaults: {
    tag: "Blackstar",
  },
});

const startServices = () => {
  logger.info("🚀 Connecting to PM2...");
  pm2.connect((err) => {
    if (err) {
      logger.error("❌ Failed to connect to PM2:", err.message);
      process.exit(2);
    }

    const apps = [];

    if (config.system.services.telegramBot) {
      apps.push({
        name: "telegram-bot",
        script: "./tg/index.js",
        node_args: "--import ./loader.js --max-old-space-size=320 --expose-gc",
        env: {
          NODE_ENV: "production",
        },
      });
    }

    if (config.system.services.whatsappBot) {
      apps.push({
        name: "whatsapp-bot",
        script: "./wa/index.js",
        node_args: "--import ./loader.js --max-old-space-size=320 --expose-gc",
        env: {
          NODE_ENV: "production",
        },
      });
    }

    if (apps.length === 0) {
      logger.warn("⚠️ No services enabled in config.js.");
      pm2.disconnect();
      return;
    }

    logger.info(`🚀 Starting ${apps.length} services...`);

    let started = 0;
    for (const app of apps) {
      pm2.start(app, (err) => {
        if (err) {
          logger.error(`❌ Failed to start ${app.name}:`, err.message);
        } else {
          logger.success(`✅ Service ${app.name} started.`);
        }

        started++;
        if (started === apps.length) {
          pm2.disconnect();
          logger.info("Use 'npx pm2 list' to monitor your bots.");
        }
      });
    }
  });
};

startServices();
