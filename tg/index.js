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
    reply_markup:
      buttons.length > 0 ? { inline_keyboard: [buttons] } : undefined,
  };

  if (ctx.callbackQuery) {
    try {
      await ctx.editMessageText(text, extra);
    } catch (e) {
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
  bot.use(authMiddleware);
  bot.use(mustJoinMiddleware);

  bot.command("ping", (ctx) => ctx.reply("Pong!"));

  bot.command("start", async (ctx) => {
    const { sendMenu } = await import("./menu.js");
    await sendMenu(bot, ctx.chat.id, ctx.from.first_name);
  });

  bot.command("role", async (ctx) => {
    const args = ctx.message.text.split(" ");
    if (args.length < 2) {
      return ctx.reply(
        "Usage:\n/role add {partner|premium} {id} [duration]\n/role remove {partner|premium} {id}\n/role list {role}",
      );
    }

    const action = args[1].toLowerCase();
    const type = args[2]?.toLowerCase();
    const targetId = args[3];

    if (action === "list") {
      if (!type) return ctx.reply("Usage: /role list {partner|premium}");
      return sendRoleList(ctx, type, 0);
    }

    if (!type || !targetId)
      return ctx.reply(
        `Usage: /role ${action} {partner|premium} {id} [duration]`,
      );

    const isPartnerOp = type === "partner";
    if (isPartnerOp && !ctx.state.isOwner)
      return ctx.reply(`❌ Only owner can ${action} partners.`);
    if (!isPartnerOp && !ctx.state.isPartner)
      return ctx.reply(`❌ Only partners can ${action} premium users.`);

    if (action === "add") {
      let expiry = 0;
      if (!isPartnerOp) {
        if (args.length < 5)
          return ctx.reply("Usage: /role add premium {id} {duration}");
        const match = args[4].match(/^(\d+)([dhms])$/);
        if (!match)
          return ctx.reply("Invalid duration format. Use 1d, 1h, 1m, 1s.");
        const value = parseInt(match[1], 10);
        const unit = match[2];
        const multipliers = { d: 86400000, h: 3600000, m: 60000, s: 1000 };
        expiry = Date.now() + value * multipliers[unit];
      }

      await db
        .insert(users)
        .values({
          telegramId: targetId,
          role: isPartnerOp ? "partner" : "user",
          premiumExpiry: isPartnerOp ? 0 : expiry,
        })
        .onConflictDoUpdate({
          target: users.telegramId,
          set: isPartnerOp ? { role: "partner" } : { premiumExpiry: expiry },
        })
        .run();

      const msg = isPartnerOp
        ? `✅ User ${targetId} promoted to Partner.`
        : `✅ User ${targetId} is now Premium until ${new Date(expiry).toLocaleString()}.`;
      ctx.reply(msg);
    } else if (action === "remove") {
      if (isPartnerOp) {
        await db
          .update(users)
          .set({ role: "user" })
          .where(eq(users.telegramId, targetId))
          .run();
        ctx.reply(`✅ User ${targetId} demoted from Partner.`);
      } else {
        await db
          .update(users)
          .set({ premiumExpiry: 0 })
          .where(eq(users.telegramId, targetId))
          .run();
        ctx.reply(`✅ Premium role removed from user ${targetId}.`);
      }
    }
  });

  bot.on("callback_query", async (ctx) => {
    const data = ctx.callbackQuery.data;
    const menuModule = await import("./menu.js");

    if (data.startsWith("role_list_")) {
      const [, , type, page] = data.split("_");
      await sendRoleList(ctx, type, parseInt(page, 10));
    } else if (data === "menu") {
      await menuModule.sendMenu(bot, ctx.chat.id, ctx.from.first_name);
    } else if (data.startsWith("menu_")) {
      const sub = data.replace("menu_", "");
      const menuFuncs = {
        search: menuModule.sendSearchMenu,
        downloader: menuModule.sendDownloaderMenu,
        stalker: menuModule.sendStalkerMenu,
        ai: menuModule.sendAiMenu,
        tools: menuModule.sendToolsMenu,
      };
      if (menuFuncs[sub]) await menuFuncs[sub](bot, ctx.chat.id);
    }
    await ctx.answerCbQuery().catch(() => {});
  });

  bot.catch((err, ctx) =>
    console.error(`❌ Ooops, encountered an error for ${ctx.updateType}`, err),
  );

  bot
    .launch({ polling: { retryOnConflict: true, maxRetryDelay: 30000 } })
    .then(() =>
      console.log(`✅ Connected to Telegram as ${config.tgbot.botName}`),
    )
    .catch((err) => console.error("❌ Failed to start Telegram bot:", err));

  const stopBot = (signal) => {
    try {
      if (bot) bot.stop(signal);
    } catch (e) {
      console.error(`❌ Error stopping bot:`, e);
    }
  };
  process.once("SIGINT", () => stopBot("SIGINT"));
  process.once("SIGTERM", () => stopBot("SIGTERM"));
};

await startTelegramBot();
