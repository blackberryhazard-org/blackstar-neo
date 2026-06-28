import { eq, gt } from "drizzle-orm";
import { Telegraf } from "telegraf-hardened";
import config from "../config.js";
import { db } from "./db/index.js";
import { users } from "./db/schema.js";
import { authMiddleware, mustJoinMiddleware } from "./middleware.js";

const PAGE_SIZE = 10;

const sendRoleList = async (ctx, type, page = 0) => {
  let userList = [];
  if (type === "partner") {
    userList = await db.query.users.findMany({
      where: eq(users.role, "partner"),
    });
  } else if (type === "premium") {
    userList = await db.query.users.findMany({
      where: gt(users.premiumExpiry, Date.now()),
    });
  } else {
    return ctx.reply("Invalid role type.");
  }

  if (userList.length === 0) {
    return ctx.reply(`No users found with role ${type}.`);
  }

  const totalPages = Math.ceil(userList.length / PAGE_SIZE);
  const start = page * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const paginatedUsers = userList.slice(start, end);

  let text = `<b>List User ${type.charAt(0).toUpperCase() + type.slice(1)} (Page ${page + 1}/${totalPages})</b>\n\n`;
  paginatedUsers.forEach((u, i) => {
    text += `${start + i + 1}. <code>${u.telegramId}</code>\n`;
  });

  const buttons = [];
  if (page > 0) {
    buttons.push({
      text: "⬅️ Previous",
      callback_data: `role_list_${type}_${page - 1}`,
    });
  }
  if (end < userList.length) {
    buttons.push({
      text: "Next ➡️",
      callback_data: `role_list_${type}_${page + 1}`,
    });
  }

  const extra = {
    parse_mode: "HTML",
  };

  if (buttons.length > 0) {
    extra.reply_markup = {
      inline_keyboard: [buttons],
    };
  }

  if (ctx.callbackQuery) {
    try {
      await ctx.editMessageText(text, extra);
    } catch (e) {
      // Handle "message is not modified" error if user clicks same button
      if (!e.message.includes("message is not modified")) throw e;
    }
  } else {
    await ctx.reply(text, extra);
  }
};

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

  bot.command("start", async (ctx) => {
    const { sendMenu } = await import("./menu.js");
    await sendMenu(bot, ctx.chat.id, ctx.from.first_name);
  });

  // Role management
  bot.command("role", async (ctx) => {
    const args = ctx.message.text.split(" ");
    if (args.length < 2) {
      return ctx.reply(
        "Usage:\n/role add {partner|premium} {id} [duration]\n/role remove {partner|premium} {id}\n/role list {role}",
      );
    }

    const action = args[1].toLowerCase();

    if (action === "add") {
      if (args.length < 4)
        return ctx.reply("Usage: /role add {partner|premium} {id} [duration]");
      const type = args[2].toLowerCase();
      const targetId = args[3];

      if (type === "partner") {
        if (!ctx.state.isOwner)
          return ctx.reply("❌ Only owner can add partners.");
        await db
          .insert(users)
          .values({ telegramId: targetId, role: "partner" })
          .onConflictDoUpdate({
            target: users.telegramId,
            set: { role: "partner" },
          })
          .run();
        ctx.reply(`✅ User ${targetId} has been promoted to Partner.`);
      } else if (type === "premium") {
        if (!ctx.state.isPartner)
          return ctx.reply("❌ Only partners can add premium users.");
        if (args.length < 5)
          return ctx.reply("Usage: /role add premium {id} {duration}");
        const durationStr = args[4];
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
      }
    } else if (action === "remove") {
      if (args.length < 4)
        return ctx.reply("Usage: /role remove {partner|premium} {id}");
      const type = args[2].toLowerCase();
      const targetId = args[3];

      if (type === "partner") {
        if (!ctx.state.isOwner)
          return ctx.reply("❌ Only owner can remove partners.");
        await db
          .update(users)
          .set({ role: "user" })
          .where(eq(users.telegramId, targetId))
          .run();
        ctx.reply(`✅ User ${targetId} has been demoted from Partner.`);
      } else if (type === "premium") {
        if (!ctx.state.isPartner)
          return ctx.reply("❌ Only partners can remove premium users.");
        await db
          .update(users)
          .set({ premiumExpiry: 0 })
          .where(eq(users.telegramId, targetId))
          .run();
        ctx.reply(`✅ Premium role removed from user ${targetId}.`);
      }
    } else if (action === "list") {
      if (args.length < 3)
        return ctx.reply("Usage: /role list {partner|premium}");
      const type = args[2].toLowerCase();
      await sendRoleList(ctx, type, 0);
    }
  });

  bot.on("callback_query", async (ctx) => {
    const data = ctx.callbackQuery.data;
    if (data.startsWith("role_list_")) {
      const parts = data.split("_");
      const type = parts[2];
      const page = parseInt(parts[3], 10);
      await sendRoleList(ctx, type, page);
      await ctx.answerCbQuery();
    } else if (data === "menu") {
      const { sendMenu } = await import("./menu.js");
      await sendMenu(bot, ctx.chat.id, ctx.from.first_name);
      await ctx.answerCbQuery();
    } else if (data.startsWith("menu_")) {
      const {
        sendSearchMenu,
        sendDownloaderMenu,
        sendStalkerMenu,
        sendAiMenu,
        sendToolsMenu,
      } = await import("./menu.js");
      const sub = data.replace("menu_", "");
      if (sub === "search") await sendSearchMenu(bot, ctx.chat.id);
      else if (sub === "downloader") await sendDownloaderMenu(bot, ctx.chat.id);
      else if (sub === "stalker") await sendStalkerMenu(bot, ctx.chat.id);
      else if (sub === "ai") await sendAiMenu(bot, ctx.chat.id);
      else if (sub === "tools") await sendToolsMenu(bot, ctx.chat.id);
      await ctx.answerCbQuery();
    }
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
