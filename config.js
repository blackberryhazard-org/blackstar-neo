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

const wabot = {
  botname: "BOT_NAME",
  botNumber: "BOT_NUMBER",
  pairingCode: true,
};

const tgbot = {
  botname: "BOT_NAME",
  botfatherToken: env.BOTFATHER_TOKEN ?? "BOTFATHER_TOKEN",
};

const apikey = {
  bayargg: env.BAYARGG_APIKEY ?? "BAYARGG_APIKEY",
  gemini: env.GEMINI_APIKEY ?? "GEMINI_APIKEY",
  groq: env.GROQ_APIKEY ?? "GROQ_APIKEY",
}

export default { system, wabot, tgbot, apikey };
