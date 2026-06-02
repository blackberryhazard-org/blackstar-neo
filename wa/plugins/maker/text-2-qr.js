import { api } from "sawit-utils";

const faa = (path = "", params = {}, options) =>
  api.request(
    `https://api-faa.my.id/faa/${path}?${new URLSearchParams(params)}`,
    options,
  );

export default {
  command: "text2qr",
  category: "maker",
  async run(m, { sock, isPrefix, command, text }) {
    try {
      if (!text)
        return m.reply(
          `👉🏻 *Example*: ${isPrefix + command} I love you, big brother.`,
        );
      m.react("🕒");
      const data = await faa("qr-create", {
        text,
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
