import { api } from "sawit-utils";

export default {
  command: ["claude"],
  category: "ai",
  async run(m, { sock, isPrefix, command, text }) {
    try {
      if (!text) return m.reply(`👉🏻 *Example*: ${isPrefix + command} hello`);
      m.react("🕒");

      const response = await api.lexcode("ai/claude-3-haiku", {
        text,
      });

      if (!response || !response.status)
        return m.reply("❌ Failed to get data.");
      m.reply(response.result);
    } catch (error) {
      console.error(error);
      m.reply("❌ " + error.message);
    }
  },
  limit: 1,
};
