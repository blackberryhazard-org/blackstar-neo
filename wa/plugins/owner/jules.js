import { api } from "sawit-utils";
import config from "../../../config.js";

export default {
  command: "jules",
  category: "owner",
  async run(m, { sock, args, isPrefix, command }) {
    const apiKey = config.misc?.julesApiKey || global.julesApiKey;

    if (!apiKey) {
      return m.reply(
        "❌ Jules API Key is not configured in config.js (config.misc.julesApiKey).",
      );
    }

    if (!args[0]) {
      let helpMsg = `✨ *Jules API Manager*\n\n`;
      helpMsg += `👉🏻 *Usage*:\n`;
      helpMsg += `• \`${isPrefix + command} sources\`\n`;
      helpMsg += `• \`${isPrefix + command} new <source> <prompt>\`\n`;
      helpMsg += `• \`${isPrefix + command} show\`\n`;
      helpMsg += `• \`${isPrefix + command} approve <session_id>\`\n`;
      helpMsg += `• \`${isPrefix + command} activities <session_id>\`\n`;
      helpMsg += `• \`${isPrefix + command} msg <session_id> <prompt>\`\n`;
      return m.reply(helpMsg);
    }

    const action = args[0].toLowerCase();
    m.react("🕒");

    const baseUrl = "https://jules.googleapis.com/v1alpha";
    const headers = {
      "X-Goog-Api-Key": apiKey,
      "Content-Type": "application/json",
    };

    try {
      if (action === "sources") {
        const data = await api.request(`${baseUrl}/sources`, { headers });
        if (data.sources && data.sources.length > 0) {
          let printStr = "✅ *Available Sources:*\n";
          data.sources.forEach((s, i) => {
            const id = s.name?.split("/").pop() || "(unknown)";
            printStr += `\n*${i + 1}.* ${id}`;
          });
          m.reply(printStr);
        } else {
          m.reply("✅ No sources found.");
        }
      } else if (action === "new") {
        if (args.length < 3)
          return m.reply(
            `👉🏻 *Example*: ${isPrefix + command} new sources/github/org/repo prompt text here`,
          );
        const source = args[1];
        const prompt = args.slice(2).join(" ");

        const data = await api.request(`${baseUrl}/sessions`, {
          method: "POST",
          body: JSON.stringify({
            prompt,
            sourceContext: { source },
          }),
          headers,
        });
        const id = data.name?.split("/").pop() || "(unknown)";
        m.reply(
          `✅ Successfully created new session.\n*Session ID*: ${id}\n*Source*: ${source}`,
        );
      } else if (action === "show") {
        const data = await api.request(`${baseUrl}/sessions?pageSize=5`, {
          headers,
        });
        if (data.sessions && data.sessions.length > 0) {
          let printStr = "✅ *Current Jules Sessions:*\n";
          data.sessions.forEach((s, i) => {
            const id = s.name?.split("/").pop() || "(unknown)";
            printStr += `\n*${i + 1}.* ${id}`;
            if (s.state) printStr += ` (${s.state})`;
          });
          m.reply(printStr);
        } else {
          m.reply("✅ No active sessions found.");
        }
      } else if (action === "approve") {
        if (args.length < 2)
          return m.reply(
            `👉🏻 *Example*: ${isPrefix + command} approve SESSION_ID`,
          );
        const sessionId = args[1];
        await api.request(`${baseUrl}/sessions/${sessionId}:approvePlan`, {
          method: "POST",
          headers,
        });
        m.reply(`✅ Successfully approved plan for session: ${sessionId}`);
      } else if (action === "activities") {
        if (args.length < 2)
          return m.reply(
            `👉🏻 *Example*: ${isPrefix + command} activities SESSION_ID`,
          );
        const sessionId = args[1];
        const data = await api.request(
          `${baseUrl}/sessions/${sessionId}/activities?pageSize=5`,
          { headers },
        );
        if (data.activities && data.activities.length > 0) {
          let printStr = `✅ *Recent Activities for ${sessionId}:*\n`;
          data.activities.forEach((a, i) => {
            const title =
              a.progressUpdated?.title ||
              (a.planGenerated
                ? "Plan Generated"
                : a.planApproved
                  ? "Plan Approved"
                  : "Activity");
            printStr += `\n*${i + 1}.* [${a.originator}] ${title}`;
          });
          m.reply(printStr);
        } else {
          m.reply("✅ No activities found.");
        }
      } else if (action === "msg") {
        if (args.length < 3)
          return m.reply(
            `👉🏻 *Example*: ${isPrefix + command} msg SESSION_ID prompt text here`,
          );
        const sessionId = args[1];
        const prompt = args.slice(2).join(" ");
        await api.request(`${baseUrl}/sessions/${sessionId}:sendMessage`, {
          method: "POST",
          body: JSON.stringify({ prompt }),
          headers,
        });
        m.reply(`✅ Successfully sent message to session: ${sessionId}`);
      } else {
        m.reply(`❌ Unknown action: ${action}`);
      }
    } catch (error) {
      m.reply(`❌ Error: ${error.message}`);
    }
  },
  owner: true,
};
