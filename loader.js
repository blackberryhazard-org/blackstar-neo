import "./load_globals.js";
import { createConsola } from "consola";

const workerLogger = createConsola({
  defaults: {
    tag: "Worker",
  },
});

const MAX_RAM_MB = global.maxRAMUsage || 2000;

setInterval(() => {
  const memoryUsage = process.memoryUsage();
  const rssMB = Math.round(memoryUsage.rss / 1024 / 1024);

  if (rssMB > 250 && global.gc) {
    workerLogger.info(
      `Triggering manual Garbage Collection (curent RAM: ${rssMB}MB)...`,
    );
    global.gc();

    const postGcRss = Math.round(process.memoryUsage().rss / 1024 / 1024);
    workerLogger.info(`RAM after Garbage Collection: ${postGcRss}MB`);
  }

  if (rssMB > MAX_RAM_MB && process.send) {
    workerLogger.warn(
      `RAM remains in crisis: ${rssMB}MB. Requesting restart...`,
    );
    process.send("leak");
  }
}, 60000);

global.Logger = workerLogger;

process.on("uncaughtException", (err) => {
  workerLogger.fatal("An Uncaught Exception occurred in the Worker:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  workerLogger.error(
    "An Unhandled Rejection occured in Promise:",
    promise,
    "Reason:",
    reason,
  );
  process.exit(1);
});

process.on("SIGTERM", () => {
  workerLogger.info("Receive SIGTERM command. Stopping process gracefully...");
  setTimeout(() => {
    process.exit(0);
  }, 500);
});
