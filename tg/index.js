import { Telegraf } from "telegraf-hardened";
import config from "../config.js";

const startTelegramBot = async () => {
  const token = config.tgbot?.botfatherToken;

  if (!token || token === "BOTFATHER_TOKEN") {
    console.log(
      "⚠️ Telegram bot token not provided or is default. Skipping Telegram bot initialization.",
    );
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
      console.log(`✅ Connected to Telegram as ${config.tgbot.botname}`);
      global.tgBot = bot;
    })
    .catch((err) => {
      console.error("❌ Failed to start Telegram bot:", err);
    });

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
};

await startTelegramBot();
