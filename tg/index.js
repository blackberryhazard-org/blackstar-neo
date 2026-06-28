import { eq } from "drizzle-orm";
import { Telegraf } from "telegraf-hardened";
import config from "../config.js";
import { db } from "./db/index.js";
import { users } from "./db/schema.js";
import { authMiddleware, mustJoinMiddleware } from "./middleware.js";

const startTelegramBot = async () => {
  const token = config.tgbot.botFatherToken;

  if (!token || token === "BOTFATHER_TOKEN") {
    console.warn(
      "⚠️ Telegram bot token not provided or is default. Skipping Telegram bot initialization.",
    );
    return;
  }

  const bot = new Telegraf(token);

  // Middlewares - order matters: auth first to set ctx.state.isOwner etc
  bot.use(authMiddleware);
  bot.use(mustJoinMiddleware);

  bot.command("ping", (ctx) => {
    ctx.reply("Pong!");
  });

  // Partner management (Owner only)
  bot.command("+partner", async (ctx) => {
    if (!ctx.state.isOwner) return;
    const args = ctx.message.text.split(" ");
    if (args.length < 2) return ctx.reply("Usage: /+partner {id_telegram}");
    const targetId = args[1];

    await db
      .insert(users)
      .values({ telegramId: targetId, role: "partner" })
      .onConflictDoUpdate({
        target: users.telegramId,
        set: { role: "partner" },
      })
      .run();

    ctx.reply(`✅ User ${targetId} has been promoted to Partner.`);
  });

  bot.command("-partner", async (ctx) => {
    if (!ctx.state.isOwner) return;
    const args = ctx.message.text.split(" ");
    if (args.length < 2) return ctx.reply("Usage: /-partner {id_telegram}");
    const targetId = args[1];

    await db
      .update(users)
      .set({ role: "user" })
      .where(eq(users.telegramId, targetId))
      .run();

    ctx.reply(`✅ User ${targetId} has been demoted from Partner.`);
  });

  // Premium management (Owner & Partner)
  bot.command("+premium", async (ctx) => {
    if (!ctx.state.isPartner) return;
    const args = ctx.message.text.split(" ");
    if (args.length < 3)
      return ctx.reply("Usage: /+premium {id_telegram} {durasi}");

    const targetId = args[1];
    const durationStr = args[2];

    const match = durationStr.match(/^(\d+)([dhms])$/);
    if (!match)
      return ctx.reply("Invalid duration format. Use 1d, 1h, 1m, 1s.");

    const value = parseInt(match[1], 10);
    const unit = match[2];
    let durationMs = 0;

    if (unit === "d") durationMs = value * 24 * 60 * 60 * 1000;
    else if (unit === "h") durationMs = value * 60 * 60 * 1000;
    else if (unit === "m") durationMs = value * 60 * 1000;
    else if (unit === "s") durationMs = value * 1000;

    const expiry = Date.now() + durationMs;

    await db
      .insert(users)
      .values({ telegramId: targetId, premiumExpiry: expiry })
      .onConflictDoUpdate({
        target: users.telegramId,
        set: { premiumExpiry: expiry },
      })
      .run();

    ctx.reply(
      `✅ User ${targetId} is now Premium until ${new Date(expiry).toLocaleString()}.`,
    );
  });

  bot.command("-premium", async (ctx) => {
    if (!ctx.state.isPartner) return;
    const args = ctx.message.text.split(" ");
    if (args.length < 2) return ctx.reply("Usage: /-premium {id_telegram}");
    const targetId = args[1];

    await db
      .update(users)
      .set({ premiumExpiry: 0 })
      .where(eq(users.telegramId, targetId))
      .run();

    ctx.reply(`✅ Premium role removed from user ${targetId}.`);
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
    })
    .catch((err) => {
      console.error("❌ Failed to start Telegram bot:", err);
    });

  const stopBot = (signal) => {
    try {
      if (bot) {
        bot.stop(signal);
      }
    } catch (e) {
      console.error(`❌ Error stopping bot with signal ${signal}:`, e);
    }
  };

  process.once("SIGINT", () => stopBot("SIGINT"));
  process.once("SIGTERM", () => stopBot("SIGTERM"));
};

await startTelegramBot();
