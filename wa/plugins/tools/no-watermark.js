import { api } from "sawit-utils";
import { uguu } from "../../../lib/Scraper.js";
import { isMimeImage } from "../../../lib/Utilities.js";

export default {
  command: "removewm",
  hidden: "nowatermark",
  category: "tools",
  async run(m, { sock, isPrefix, command }) {
    try {
      const q = m.quoted?.url ? m.quoted : m;
      const mimetype = (q.msg || q).mimetype;
      if (!isMimeImage(mimetype))
        return m.reply("💭 Provide an image to remove watermark.");
      m.react("🕒");
      const upload = await uguu(await q.download());
      const data = await api.nexray("tools/dewatermark", {
        url: upload,
      });
      if (!Buffer.isBuffer(data)) return m.reply("❌ Failed to get data.");
      sock.sendMedia(m.chat, data, "", m);
    } catch (error) {
      console.error(error);
      m.reply("❌ " + error.message);
    }
  },
  limit: 1,
};
