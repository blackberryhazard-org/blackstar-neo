try {
  process.loadEnvFile();
} catch {
  // No .env file present — rely on process.env / defaults.
}

const env = process.env;

const system = {
  services: {
    whatsappBot: true,
    telegramBot: true,
    server: false,
  },
  maxRAMUsage: 2000,
  maxCrash: 5,
  crashTimeout: 60000,
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
}

export default { system, owner, wabot, tgbot, apikey };
