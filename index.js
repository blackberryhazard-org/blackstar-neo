import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createConsola } from "consola";

import config from "./config.js";

const logger = createConsola({
  level: 3,
  defaults: {
    tag: "Blackstar",
  },
});

const CWD = fileURLToPath(new URL(".", import.meta.url));
const LOADER = fileURLToPath(new URL("./loader.js", import.meta.url));

const ALL_SERVICES = [
  {
    key: "whatsappBot",
    name: "whatsappBot",
    scriptPath: fileURLToPath(new URL("./wa/index.js", import.meta.url)),
  },
  {
    key: "telegramBot",
    name: "telegramBot",
    scriptPath: fileURLToPath(new URL("./tg/index.js", import.meta.url)),
  },
];

const activeProcesses = new Map();
const crashLogs = new Map();

const MAX_CRASHES = config.system.maxCrash;
const CRASH_WINDOW_MS = config.system.crashTimeout;

const startService = (service) => {
  const now = Date.now();
  let crashes = crashLogs.get(service.key) || [];
  crashes = crashes.filter((timestamp) => now - timestamp < CRASH_WINDOW_MS);

  if (crashes.length >= MAX_CRASHES) {
    logger.fatal(
      `${service.name} serial crash detected ! disabling auto-restart.`,
    );
    config.system.services[service.key] = false;
    return;
  }

  const botLogger = logger.withTag(service.name);

  botLogger.info(`Starting service...`);

  const instance = spawn(
    process.execPath,
    ["--import", LOADER, ...process.execArgv, service.scriptPath],
    {
      cwd: CWD,
      stdio: ["inherit", "pipe", "pipe", "ipc"],
    },
  );

  activeProcesses.set(service.key, instance);

  instance.stdout.on("data", (data) => {
    const lines = data.toString().trim().split("\n");
    lines.forEach((line) => {
      if (line) botLogger.log(line);
    });
  });

  instance.stderr.on("data", (data) => {
    const lines = data.toString().trim().split("\n");
    lines.forEach((line) => {
      if (line) botLogger.error(line);
    });
  });

  instance.on("message", (data) => {
    if (data === "leak" || data === "reset") {
      botLogger.warn(`Memory leak detected.`);
      instance.kill("SIGTERM");
    }
  });

  instance.once("exit", (code) => {
    activeProcesses.delete(service.key);

    if (code !== 0 && code !== null) {
      crashes.push(Date.now());
      crashLogs.set(service.key, crashes);
      botLogger.error(`Exited abnormally with code ${code}`);
    } else {
      botLogger.success(`Stopped normally.`);
    }

    if (config.system.services[service.key]) {
      setTimeout(() => startService(service), 2000);
    }
  });
};

export const updateServiceState = (key, isActive) => {
  config.system.services[key] = isActive;
  const service = ALL_SERVICES.find((s) => s.key === key);
  const isRunning = activeProcesses.has(key);

  if (isActive && !isRunning) {
    startService(service);
  } else if (!isActive && isRunning) {
    logger.info(`Stopping ${service.name} dynamically...`);
    activeProcesses.get(key).kill("SIGTERM");
  }
};

["SIGINT", "SIGTERM"].forEach((signal) => {
  process.on(signal, () => {
    logger.warn(
      `Accepting signal ${signal}. Stopping all services gracefully...`,
    );
    for (const [key, instance] of activeProcesses.entries()) {
      logger.info(`Stopping child process: ${key}...`);
      instance.kill("SIGTERM");
    }
    setTimeout(() => {
      logger.success("Service Manager stopped.");
      process.exit(0);
    }, 1000);
  });
});

ALL_SERVICES.forEach((service) => {
  if (config.system.services[service.key]) startService(service);
});
