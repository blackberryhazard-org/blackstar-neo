import { api } from "sawit-utils";

export default {
  command: "emojito",
  hidden: "emogif",
  category: "tools",
  async run(m, { sock, isPrefix, command, args }) {
    try {
      if (!args[0]) return m.reply(`👉🏻 *Example*: ${isPrefix + command} 😁`);
      m.react("🕒");
      const data = await api.nexray("tools/emojigif", {
        emoji: args[0],
      });
      if (!Buffer.isBuffer(data)) return m.reply("❌ Failed to get data.");
      sock.sendMedia(m.chat, data, "", m, {
        sticker: true,
        mimetype: "image/webp",
      });
    } catch (error) {
      console.error(error);
      m.reply("❌ " + error.message);
    }
  },
  limit: 1,
};
