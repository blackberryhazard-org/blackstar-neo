import { Telegraf } from "telegraf-hardened";
import config from "../config.js";

const startTelegramBot = async () => {
  const token = config.tgbot?.botFatherToken;

  if (!token || token === "BOTFATHER_TOKEN") {
    console.log(
      "⚠️ Telegram bot token not provided or is default. Skipping Telegram bot initialization.",
    );
    if (process.send) process.send("ready");
    return;
  }

  const bot = new Telegraf(token);

  bot.command("ping", (ctx) => {
    ctx.reply("Pong!");
  });

  bot.catch((err, ctx) => {
    console.error(`❌ Ooops, encountered an error for ${ctx.updateType}`, err);
  });

  bot
    .launch({
      polling: {
        retryOnConflict: true,
        maxRetryDelay: 30000,
      },
    })
    .then(() => {
      console.log(`✅ Connected to Telegram as ${config.tgbot.botName}`);
      global.tgBot = bot;
      if (process.send) process.send("ready");
    })
    .catch((err) => {
      console.error("❌ Failed to start Telegram bot:", err);
      // Even if it fails, we should signal manager to continue or handle error
      if (process.send) process.send("ready");
    });

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
};

await startTelegramBot();
