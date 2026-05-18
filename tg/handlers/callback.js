import axios from "axios";
import { sendMenu } from "../commands/menu.js";
import { sendSearchMenu } from "../commands/menu.js";
import { sendDownloaderMenu } from "../commands/menu.js";
import { sendStalkerMenu } from "../commands/menu.js";
import { sendAiMenu } from "../commands/menu.js";
import { sendToolsMenu } from "../commands/menu.js";
import { sendInfo } from "../commands/info.js";
import { sendPing } from "../commands/ping.js";
import { ytSearchCommand } from "../commands/search/ytsearch.js";
import { playStoreSearchCommand } from "../commands/search/playstore.js";
import { pinterestSearchCommand } from "../commands/search/pin.js";
import { tiktokSearch } from "../commands/search/ttsearch.js";
import { ytPlayCommand } from "../commands/downloader/ytplay.js";
import { tiktokCache } from "../cache.js";

export async function handleCallback(bot, query, totalCommands, botStartTime) {
  const chatId = query.message.chat.id;
  const user = query.from;
  const data = query.data;

  if (data.startsWith("ytsearch|")) {
    const searchQuery = data.split("|")[1];

    await ytSearchCommand(bot, query.message.chat.id, searchQuery);

    return await bot.telegram.answerCbQuery(query.id);
  }

  if (data.startsWith("apksearch|")) {
    const searchQuery = data.split("|")[1];

    await playStoreSearchCommand(bot, chatId, searchQuery);

    return await bot.telegram.answerCbQuery(query.id);
  }

  if (data.startsWith("pinsearch|")) {
    const searchQuery = data.split("|")[1];

    await pinterestSearchCommand(bot, chatId, searchQuery);

    return await bot.telegram.answerCbQuery(query.id);
  }

  if (data.startsWith("ttsearch|")) {
    const queryText = data.split("|")[1];

    await tiktokSearch(bot, chatId, queryText);

    return await bot.telegram.answerCbQuery(query.id);
  }

  if (data.startsWith("ttvid|")) {
    const cacheId = data.split("|")[1];
    const cached = tiktokCache.get(cacheId);

    if (!cached) {
      return await bot.telegram.sendMessage(
        chatId,
        "❌ Session expired, silakan cari ulang.",
      );
    }

    await bot.telegram.sendVideo(chatId, cached.videoUrl, {
      caption: "🎥 Video berhasil diunduh",
      supports_streaming: true,
    });

    return await bot.telegram.answerCbQuery(query.id);
  }

  if (data.startsWith("ttmusic|")) {
    const cacheId = data.split("|")[1];
    const cached = tiktokCache.get(cacheId);

    if (!cached) {
      return await bot.telegram.sendMessage(
        chatId,
        "❌ Session expired, silakan cari ulang.",
      );
    }

    await bot.telegram.sendAudio(chatId, cached.musicUrl, {
      caption: "🎵 Audio berhasil diunduh",
    });

    return await bot.telegram.answerCbQuery(query.id);
  }

  if (data.startsWith("ytvid|")) {
    const videoUrl = decodeURIComponent(data.split("|")[1]);

    await bot.telegram.sendVideo(chatId, videoUrl, {
      caption: "🎥 Video berhasil diunduh",
      supports_streaming: true,
    });

    return await bot.telegram.answerCbQuery(query.id);
  }

  if (data.startsWith("ytaudio|")) {
    const audioUrl = decodeURIComponent(data.split("|")[1]);

    await bot.telegram.sendAudio(chatId, audioUrl, {
      caption: "🎵 Audio berhasil diunduh",
    });

    return await bot.telegram.answerCbQuery(query.id);
  }

  switch (data) {
    case "menu":
      await sendMenu(bot, chatId, user.first_name);
      break;

    case "info":
      await sendInfo(bot, chatId, user, totalCommands.value, botStartTime);
      break;

    case "ping":
      await sendPing(bot, chatId, botStartTime);
      break;

    case "menu_search":
      await sendSearchMenu(bot, chatId);
      break;

    case "menu_downloader":
      await sendDownloaderMenu(bot, chatId);
      break;

    case "menu_stalker":
      await sendStalkerMenu(bot, chatId);
      break;

    case "menu_ai":
      await sendAiMenu(bot, chatId);
      break;

    case "menu_tools":
      await sendToolsMenu(bot, chatId);
      break;

    default:
      await bot.telegram.sendMessage(chatId, "❌ Menu tidak dikenali.");
  }

  await bot.telegram.answerCbQuery(query.id);
}
