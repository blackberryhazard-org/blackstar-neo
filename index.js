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
          logger.info(
            "Keep-alive active. Monitoring services for Pterodactyl...",
          );

          // Monitor processes every 15 seconds
          setInterval(() => {
            pm2.list((err, list) => {
              if (err) return;

              const managedAppNames = apps.map((a) => a.name);
              const managedApps = list.filter((a) =>
                managedAppNames.includes(a.name),
              );

              const allRunning = managedApps.every(
                (a) => a.pm2_env.status === "online",
              );

              if (!allRunning) {
                logger.warn("⚠️ Some services are not online. Current status:");
                for (const a of managedApps) {
                  logger.info(`- ${a.name}: ${a.pm2_env.status}`);
                }
              }
            });
          }, 15000);
        }
      });
    }
  });

  // Handle graceful shutdown
  const handleShutdown = () => {
    logger.warn("🛑 Shutdown signal received. Stopping services...");
    pm2.connect((err) => {
      if (err) {
        process.exit(1);
      }
      pm2.delete("all", () => {
        pm2.disconnect();
        logger.success("✅ All services stopped. Exiting.");
        process.exit(0);
      });
    });
  };

  process.on("SIGINT", handleShutdown);
  process.on("SIGTERM", handleShutdown);
};

startServices();
