import { cpus } from "node:os";

try {
  process.loadEnvFile();
} catch {
  // No .env file present — rely on process.env / defaults.
}

const env = process.env;
const CPU_COUNT = cpus().length;

const system = {
  services: {
    whatsappBot: true,
    telegramBot: true,
    server: false,
  },
  maxRAMUsage: 2000,
  maxCrash: 5,
  crashTimeout: 60000,
  localTimezone: "Asia/Jakarta",
  ffmpegConcurrency: Math.max(4, Math.floor(CPU_COUNT * 1.3)),
};

const owner = {
  ownerName: "OWNER_NAME",
  ownerNumbers: {
    whatsapp: "",
    telegram: "",
  },
  ownerTelegramId: "",
};

const wabot = {
  botName: "BOT_NAME",
  botNumber: "BOT_NUMBER",
  pairingCode: true,
  customPairingCode: "",
  thumbnail: "https://ik.imagekit.io/vmimm0jfp/blackberryhazard/blackstar.png",
};

const tgbot = {
  botName: "BOT_NAME",
  botFatherToken: env.BOTFATHER_TOKEN ?? "BOTFATHER_TOKEN",
  mustJoin: [],
  thumbnail: "https://ik.imagekit.io/vmimm0jfp/blackberryhazard/blackstar.png",
};

const apikey = {
  bayargg: env.BAYARGG_APIKEY ?? "BAYARGG_APIKEY",
  gemini: env.GEMINI_APIKEY ?? "GEMINI_APIKEY",
  groq: env.GROQ_APIKEY ?? "GROQ_APIKEY",
};

export default { system, owner, wabot, tgbot, apikey };
