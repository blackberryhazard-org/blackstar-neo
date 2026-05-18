import axios from "axios";
import { escapeHtml, looksLikeCode } from "../../../lib/ai-helper.js";

export async function geminiCommand(bot, chatId, prompt) {
  try {
    if (!prompt) {
      return await bot.telegram.sendMessage(
        chatId,
        "❌ Gunakan format:\n/gemini <pertanyaan>",
      );
    }

    const apiUrl = `https://api.lexcode.biz.id/api/ai/gemini-2-5-flash?text=${encodeURIComponent(prompt)}`;

    const { data } = await axios.get(apiUrl);

    if (!data?.success) {
      return await bot.telegram.sendMessage(
        chatId,
        "❌ Gagal mendapatkan response AI.",
      );
    }

    const result = data.result || "-";

    let caption = "";

    if (looksLikeCode(result)) {
      caption = `<blockquote><strong>GEMINI 2.5 FLASH RESPONSE</strong></blockquote>

<pre>${escapeHtml(result)}</pre>`;
    } else {
      caption = `<blockquote><strong>GEMINI 2.5 FLASH RESPONSE</strong>

➜ ${escapeHtml(result)}
</blockquote>`;
    }

    await bot.telegram.sendMessage(chatId, caption, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "💡 Jelaskan",
              switch_inline_query_current_chat:
                "/gemini Jelaskan topik ini secara lengkap",
            },
            {
              text: "💻 Code",
              switch_inline_query_current_chat:
                "/gemini Buatkan kode simple untuk javascript",
            },
          ],
          [
            {
              text: "📚 Tips",
              switch_inline_query_current_chat:
                "/gemini Berikan tips dan trik terbaik",
            },
            {
              text: "🧠 Ringkas",
              switch_inline_query_current_chat:
                "/gemini Ringkas penjelasan ini",
            },
          ],
          [
            {
              text: "🛠 Debug",
              switch_inline_query_current_chat:
                "/gemini Bantu debug kode javascript ini",
            },
          ],
        ],
      },
    });
  } catch (error) {
    console.log("GEMINI ERROR:", error.message);

    await bot.telegram.sendMessage(chatId, "❌ Gagal memproses AI.");
  }
}
