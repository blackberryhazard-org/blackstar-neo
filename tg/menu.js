import config from "../config.js";

const BACK_BUTTON = [[{ text: "⬅️ Back", callback_data: "menu" }]];

async function sendSubMenu(
  bot,
  chatId,
  title,
  content,
  footer = `Powered by ${config.tgbot.botName || "Blackstar"}`,
) {
  const text = `<blockquote>
<strong>${title}</strong>

${content}

<i>${footer}</i>
</blockquote>`;
  await bot.telegram.sendMessage(chatId, text, {
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: BACK_BUTTON },
  });
}

export async function sendMenu(bot, chatId, name = "User") {
  const now = new Date();
  const tz = config.system.localTimezone || "Asia/Jakarta";
  const tanggal = now.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: tz,
  });
  const waktu = `${now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: tz })} WIB`;

  const caption = `<blockquote>
<b>👋 Hello, ${name}</b>

Selamat datang di ${config.tgbot.botName || "Blackstar"}
Ketik <code>/info</code> untuk melihat informasi bot

<b>Developer</b> : ${config.owner.ownerName || "Developer"}
<b>Version</b>   : "0.1.0"
<b>Tanggal</b>   : ${tanggal}
<b>Waktu</b>     : ${waktu}

┌  <b>INFORMATION MENU</b>
│  ⌁ /info => Informasi Bot
│  ⌁ /dev  => Informasi Developer
│  ⌁ /help => Help / Panduan
└  ⌁ ${config.tgbot.botName || "Blackstar"}

<b>Silahkan Pilih menu kategori dibawah ini</b>
</blockquote>`;

  await bot.telegram.sendPhoto(chatId, config.tgbot.thumbnail, {
    caption,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🔎 Search", callback_data: "menu_search" },
          { text: "🛠 Tools", callback_data: "menu_tools" },
        ],
        [
          { text: "🕵️ Stalker", callback_data: "menu_stalker" },
          { text: "🧠 AI", callback_data: "menu_ai" },
        ],
        [{ text: "📥 Downloader", callback_data: "menu_downloader" }],
      ],
    },
  });
}

export const sendSearchMenu = (bot, chatId) =>
  sendSubMenu(
    bot,
    chatId,
    "🔎 SEARCH MENU",
    "Temukan berbagai informasi dengan cepat melalui fitur pencarian yang tersedia.\n\n" +
      "┌<b> ALL SEARCH MENU</b>\n" +
      "│ /ytsearch    • Search YouTube Video\n" +
      "│ /movie       • Cari Movie di IMDB\n" +
      "│ /playstore   • Cari Apk di play store\n" +
      "│ /pin         • Cari gambar dari pinterest\n" +
      "│ /ttsearch    • Cari vidio di tiktok\n" +
      "└——————————————>",
  );

export const sendDownloaderMenu = (bot, chatId) =>
  sendSubMenu(
    bot,
    chatId,
    "📥 DOWNLOADER MENU",
    "Download video / foto dari berbagai platform dengan cepat dan mudah.\n\n" +
      "┌<b> ALL DOWNLOADER MENU</b>\n" +
      "│ /tt   • TikTok Downloader\n" +
      "│ /mf   • MediaFire Downloader\n" +
      "│ /ytplay • Play yt vidio (support download mp4/mp3)\n" +
      "└——————————————>",
  );

export const sendStalkerMenu = (bot, chatId) =>
  sendSubMenu(
    bot,
    chatId,
    "🕵️ MENU STALKER",
    "Akses fitur pencarian data akun dari berbagai platform.\n\n" +
      "┌<b> ALL STALKER MENU</b>\n" +
      "│ /ttstalk   • TikTok Stalker\n" +
      "│ /ghstalk   • Github Stalker\n" +
      "└——————————————————————————>",
    `Powered by ${config.owner.ownerName || "Developer"}`,
  );

export const sendAiMenu = (bot, chatId) =>
  sendSubMenu(
    bot,
    chatId,
    "🧠 MENU AI",
    "Pusat fitur Artificial Intelligence untuk\n" +
      "chat, coding, penjelasan, dan bantuan ide.\n\n" +
      "┌<b> ALL AI MENU</b>\n" +
      "│ /gemini   •   Gemini 2-5 Flash\n" +
      "│ /claude   •   Claude 3 Haikku\n" +
      "└——————————————————————————>",
    "",
  );

export const sendToolsMenu = (bot, chatId) =>
  sendSubMenu(
    bot,
    chatId,
    "🛠 MENU TOOLS",
    "Fitur masih dalam tahap pengembangan.",
    "",
  );
