import { eq } from "drizzle-orm";
import config from "../config.js";
import { db } from "./db/index.js";
import { users } from "./db/schema.js";

export const mustJoinMiddleware = async (ctx, next) => {
  const mustJoin = config.tgbot.mustJoin;
  if (!mustJoin || mustJoin.length === 0 || !ctx.from) return next();

  // Skip for /start and /help and owner
  const text = ctx.message?.text || ctx.callbackQuery?.data || "";
  if (
    text.startsWith("/start") ||
    text.startsWith("/help") ||
    ctx.state.isOwner
  ) {
    return next();
  }

  for (const channelId of mustJoin) {
    try {
      const member = await ctx.telegram.getChatMember(channelId, ctx.from.id);
      if (["left", "kicked", "restricted"].includes(member.status)) {
        const replyText =
          "✦ Blackstar ✦\n\nUntuk menggunakan bot ini, Anda harus bergabung dengan semua channel/grup kami.";
        const keyboard = {
          reply_markup: {
            inline_keyboard: mustJoin.map((id) => [
              {
                text: "Join Channel",
                url: `https://t.me/${id.replace("@", "")}`,
              },
            ]),
          },
        };

        if (ctx.callbackQuery) {
          await ctx.answerCbQuery(
            "Anda harus bergabung dengan channel kami terlebih dahulu!",
            { show_alert: true },
          );
          return ctx.reply(replyText, keyboard);
        }
        return ctx.reply(replyText, keyboard);
      }
    } catch (err) {
      console.error(`Error checking membership for ${channelId}:`, err);
    }
  }

  return next();
};

export const authMiddleware = async (ctx, next) => {
  if (!ctx.from) return next();

  const userId = String(ctx.from.id);
  const ownerId = String(config.owner.ownerTelegramId);

  let user = await db.query.users.findFirst({
    where: eq(users.telegramId, userId),
  });

  if (!user) {
    await db
      .insert(users)
      .values({
        telegramId: userId,
        role: "user",
        premiumExpiry: 0,
      })
      .run();

    user = await db.query.users.findFirst({
      where: eq(users.telegramId, userId),
    });
  }

  const isOwner = userId === ownerId;
  const isPartner = user.role === "partner" || isOwner;
  const isPremium = user.premiumExpiry > Date.now() || isPartner;

  ctx.state.user = user;
  ctx.state.isOwner = isOwner;
  ctx.state.isPartner = isPartner;
  ctx.state.isPremium = isPremium;

  return next();
};
