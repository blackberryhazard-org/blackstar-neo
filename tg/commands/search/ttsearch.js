import axios from "axios";
import { tiktokCache } from "../../cache.js";

export async function tiktokSearch(bot, chatId, query) {
  try {
    const apiUrl = `https://rynekoo-api.hf.space/discovery/tiktok/search?q=${encodeURIComponent(query)}`;

    const { data } = await axios.get(apiUrl);

    if (!data?.success || !data?.result?.length) {
      return await bot.telegram.sendMessage(
        chatId,
        "❌ Video TikTok tidak ditemukan.",
      );
    }

    const results = data.result;
    const random = results[Math.floor(Math.random() * results.length)];

    const caption = `<blockquote>
<strong>🎬 TIKTOK SEARCH RESULT</strong>

<strong>📝 Title</strong>
${random.title}

<strong>👤 Creator</strong>
${random.author.username}

<strong>🎵 Music</strong>
${random.music_info.title}

<strong>📊 Statistik</strong>
👀 Views  : ${random.stats.play}
♥️ Like      : ${random.stats.like}
💬 Komen : ${random.stats.comment}
🔁 Share   : ${random.stats.share}

<strong>📅 Upload</strong>
${random.create_at}
</blockquote>`;

    const cacheId = `${chatId}_${Date.now()}`;
    tiktokCache.set(cacheId, {
      videoUrl: random.videoUrl,
      musicUrl: random.musicUrl,
    });

    await bot.telegram.sendPhoto(chatId, random.cover, {
      caption,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🎥 Download Video",
              callback_data: `ttvid|${cacheId}`,
            },
            {
              text: "🎵 Download Audio",
              callback_data: `ttmusic|${cacheId}`,
            },
          ],
          [
            {
              text: "🔍 Cari Video Lainnya",
              callback_data: `ttsearch|${query}`,
            },
          ],
        ],
      },
    });
  } catch (error) {
    console.log("TT SEARCH ERROR:", error.message);

    await bot.telegram.sendMessage(
      chatId,
      "❌ Terjadi error saat mencari video TikTok.",
    );
  }
}
