import { spawn } from "child_process";
import { fileURLToPath } from "url";

const CWD = fileURLToPath(new URL(".", import.meta.url));
const LOADER = fileURLToPath(new URL("./loader.js", import.meta.url));

const BOT_CONFIGS = [
  {
    name: "Whatsapp Bot",
    scriptPath: fileURLToPath(new URL("./wa/index.js", import.meta.url)),
    args: process.argv.slice(2)
  },
  {
    name: "Telegram Bot",
    scriptPath: fileURLToPath(new URL("./tg/index.js", import.meta.url)), 
    args: []
  }
];

const startBotProcess = (bot) => {
  console.log(`🚀 Starting ${bot.name} service...`);

  const instance = spawn(
    process.execPath,
    [
      "--import",
      LOADER,
      ...process.execArgv,
      bot.scriptPath,
      ...bot.args,
    ],
    {
      cwd: CWD,
      stdio: ["inherit", "inherit", "inherit", "ipc"],
    }
  );

  instance.on("message", (data) => {
    if (data === "leak" || data === "reset") {
      console[data === "leak" ? "warn" : "log"](
        data === "leak"
          ? `⚠️ [${bot.name}] RAM limit reached, restarting...`
          : `🔃 [${bot.name}] Restarting...`,
      );
      instance.kill("SIGTERM");
    }
  });

  instance.once("exit", (code) => {
    console.error(`⚠️ [${bot.name}] Exited with code/signal ${code}`);
    
    setTimeout(() => startBotProcess(bot), 2000);
  });
};

BOT_CONFIGS.forEach((bot) => {
  startBotProcess(bot);
});