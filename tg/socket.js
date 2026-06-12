import { Telegraf } from "telegraf-hardened";
import fs from "fs/promises";
import path from "path";

// We keep Blackstar imports instead of the payload ones

import { sendMenu } from "./commands/menu.js";
import { sendInfo } from "./commands/info.js";
import { sendPing } from "./commands/ping.js";
import { sendDeveloperInfo } from "./commands/dev.js";
import { handleCallback } from "./handlers/callback.js";
import { tiktokDownloader } from "./commands/downloader/tt.js";
import { ytSearchCommand } from "./commands/search/ytsearch.js";
import { movieSearchCommand } from "./commands/search/movie.js";
import { playStoreSearchCommand } from "./commands/search/playstore.js";
import { pinterestSearchCommand } from "./commands/search/pin.js";
import { tiktokSearch } from "./commands/search/ttsearch.js";
import { mediafireDownloader } from "./commands/downloader/mediafire.js";
import { ytPlayCommand } from "./commands/downloader/ytplay.js";
import { tiktokStalk } from "./commands/stalker/ttstalk.js";
import { githubStalk } from "./commands/stalker/githubstalk.js";
import { geminiCommand } from "./commands/ai/gemini.js";
import { claudeCommand } from "./commands/ai/claude.js";

import { forceSubscribeMiddleware, roleLimitMiddleware } from "./middleware.js";

const startTelegramBot = async (config) => {
  if (
    !config.tgbot ||
    !config.tgbot.botfatherToken ||
    config.tgbot.botfatherToken === "BOTFATHER_TOKEN"
  ) {
    console.log(
      "Telegram bot token not provided, skipping Telegram bot initialization.",
    );
    return null;
  }

  const bot = new Telegraf(config.tgbot.botfatherToken);

  // Setup Database
  const { TelegramDatabase } = await import("../lib/TelegramDatabase.js");
  const db = TelegramDatabase();
  await db.readFromFile();

  bot.context.db = db;
  bot.context.config = config;

  // Middlewares

  bot.use(async (ctx, next) => {
    if (ctx.message) {
      const { messageLogger } = await import("../lib/Utilities.js");

      const logMessage = {
        type: "Telegram",
        sender: String(ctx.from?.id),
        pushName: ctx.from?.first_name || ctx.from?.username || "Unknown",
        chat: String(ctx.chat?.id),
        body: ctx.message.text || "(Media/Non-text)",
      };

      messageLogger(logMessage);
    }
    await next();
  });

  bot.use(forceSubscribeMiddleware(config.tgbot.newsletterId));
  bot.use(roleLimitMiddleware(db, config));

  const botStartTime = Date.now();
  const stats = { value: 0 };

  bot.on("message", async (ctx, next) => {
    if (!ctx.message || !ctx.message.text) return next();

    const chatId = ctx.message.chat.id;
    const user = ctx.from;
    const text = ctx.message.text.trim().toLowerCase();

    if (text === "/dev") return await sendDeveloperInfo(bot, chatId);
    if (text.startsWith("/gemini "))
      return await geminiCommand(
        bot,
        chatId,
        ctx.message.text.replace("/gemini", "").trim(),
      );
    if (text.startsWith("/claude "))
      return await claudeCommand(
        bot,
        chatId,
        ctx.message.text.replace("/claude", "").trim(),
      );
    if (text.startsWith("/ttsearch "))
      return await tiktokSearch(bot, chatId, ctx.message.text.slice(10).trim());
    if (text.startsWith("/ttstalk "))
      return await tiktokStalk(
        bot,
        chatId,
        ctx.message.text.replace("/ttstalk", "").trim(),
      );
    if (text.startsWith("/ghstalk "))
      return await githubStalk(
        bot,
        chatId,
        ctx.message.text.replace("/ghstalk", "").trim(),
      );
    if (ctx.message.text.trim().startsWith("/tt")) {
      const args = ctx.message.text.trim().split(" ");
      if (args.length >= 2)
        return await tiktokDownloader(
          bot,
          chatId,
          args.slice(1).join(" ").trim(),
        );
    }
    if (ctx.message.text.trim().startsWith("/ytsearch")) {
      const args = ctx.message.text.trim().split(" ");
      if (args.length >= 2)
        return await ytSearchCommand(bot, chatId, args.slice(1).join(" "));
    }
    if (text.startsWith("/movie "))
      return await movieSearchCommand(
        bot,
        chatId,
        ctx.message.text.slice(7).trim(),
      );
    if (ctx.message.text.startsWith("/playstore "))
      return await playStoreSearchCommand(
        bot,
        chatId,
        ctx.message.text.slice(11).trim(),
      );
    if (ctx.message.text.startsWith("/pin "))
      return await pinterestSearchCommand(
        bot,
        chatId,
        ctx.message.text.slice(5).trim(),
      );
    if (text.startsWith("/mf "))
      return await mediafireDownloader(
        bot,
        chatId,
        ctx.message.text.slice(4).trim(),
      );
    if (text.startsWith("/ytplay "))
      return await ytPlayCommand(bot, chatId, ctx.message.text.slice(8).trim());

    switch (text) {
      case "/start":
      case "/menu":
        stats.value++;
        await sendMenu(bot, chatId, user.first_name);
        break;
      case "/info":
        stats.value++;
        await sendInfo(bot, chatId, user, stats.value, botStartTime);
        break;
      case "/ping":
        stats.value++;
        await sendPing(bot, chatId, botStartTime);
        break;
    }
    return next();
  });

  bot.on("callback_query", async (ctx) => {
    stats.value++;
    await handleCallback(bot, ctx.callbackQuery, stats, botStartTime);
  });

  bot.catch((err, ctx) => {
    console.error(`Ooops, encountered an error for ${ctx.updateType}`, err);
  });

  bot.use(async (ctx, next) => {
    if (ctx.callbackQuery) {
      ctx.answerCbQuery().catch((e) => {
        console.error("Error during answerCbQuery:", e);
      });
    }
    await next();
  });

  bot.command("start", (ctx) => {
    ctx.reply(
      `✦ Blackstar ✦\n\nWelcome to Blackstar Bot, ${ctx.from.first_name}!\n\nYour Role: ${ctx.blackstar.isOwner ? "Owner" : ctx.blackstar.isPartner ? "Partner" : ctx.blackstar.isPremium ? "Premium" : "Member"}\nLimits remaining: ${ctx.blackstar.isPremium || ctx.blackstar.isOwner ? "Unlimited" : ctx.blackstar.user.limit}`,
    );
  });

  // Topup command for Telegram Stars
  bot.command("topup", (ctx) => {
    const amountStr = ctx.message.text.split(" ")[1];
    const amount = parseInt(amountStr);

    if (!amount || amount <= 0) {
      return ctx.reply(
        "✦ Blackstar ✦\n\nPlease specify the amount of Telegram Stars to spend.\nExample: /topup 10\n\n(1 Star = 50 Sakuranite)",
      );
    }

    // Telegram Stars requires XTR. Price is in smallest units (1 Star = 1 unit).
    return ctx.replyWithInvoice({
      title: "Buy Sakuranite",
      description: `Purchase ${amount * 50} Sakuranite`,
      payload: `sakuranite_topup_${ctx.from.id}_${amount}`,
      provider_token: "", // Empty for Telegram Stars
      currency: "XTR",
      prices: [{ label: "Stars", amount: amount }],
    });
  });

  bot.on("pre_checkout_query", async (ctx) => {
    // Approve all checkouts
    await ctx.answerPreCheckoutQuery(true);
  });

  bot.on("successful_payment", async (ctx) => {
    const payment = ctx.message.successful_payment;
    const payload = payment.invoice_payload;

    if (payload.startsWith("sakuranite_topup_")) {
      const payerId = String(ctx.from.id);
      const starsSpent = payment.total_amount;
      const sakuraniteEarned = starsSpent * 50;

      // Ensure user exists in db before crediting
      if (!db.hasUser(payerId)) {
        db.updateUser(payerId, {
          premiumExpiry: 0,
          limit: config.wabot.defaultLimit || 15,
        });
      }

      const { Economy } = await import("../lib/Components/Economy.js");
      const economy = Economy(db);
      economy.addSakuranite(payerId, sakuraniteEarned);
      await db.writeToFile();

      return ctx.reply(
        `✦ Blackstar ✦\n\nPayment successful! You purchased ${sakuraniteEarned} Sakuranite with ${starsSpent} Telegram Stars.\nThank you for supporting Blackstar!`,
      );
    }
  });

  bot
    .launch({
      polling: {
        retryOnConflict: true,
        maxRetryDelay: 30000,
      },
    })
    .then(() => {
      console.log("✅ Telegram bot started successfully.");
      global.tgBot = bot;
    })
    .catch((err) => {
      console.error("❌ Failed to start Telegram bot:", err);
    });

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));

  return bot;
};

export default startTelegramBot;
