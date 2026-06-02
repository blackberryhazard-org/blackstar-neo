import { LRUCache } from "lru-cache";
import { cpus } from "os";

// Load secrets from .env (Node native, no dependency). Optional: falls back to
// defaults below when .env is absent or a variable is unset.
try {
  process.loadEnvFile();
} catch {
  // No .env file present — rely on process.env / defaults.
}

const env = process.env;
const CPU_COUNT = cpus().length;

const wabot = {
  ownerName: "OWNER_NAME",
  ownerNumber: "OWNER_NUMBER",
  botName: "BOT_NAME",
  footer: "✦ Sakurabot",
  botNumber: "BOT_NUMBER",
  pairingCode: true,
  defaultLimit: 15,
  stickerPackName: "📦 Sakurabot Sticker",
  stickerPackPublisher: "GitHub: indra87g",
  apiUser: env.SIGHTENGINE_API_USER ?? "",
  apiSecret: env.SIGHTENGINE_API_SECRET ?? "",
  localTimezone: "Asia/Jakarta",
  botThumbnail: "./media/Image/thumbnail.jpg",
  botMenuMusic: "./media/Audio/music.mp3",
  temporaryFileInterval: 1_000 * 60 * 30,
  dataInterval: 1_000 * 60 * 10,
  gcInterval: 1_000 * 60 * 60,
  requestTimeout: 1_000 * 60 * 1.5,
  ffmpegTimeout: 1_000 * 60,
  minDelay: 100,
  maxDelay: 1_000 * 3,
  ignoreOldMessageTS: 30,
  rssLimit: 1_024 * 1_024 * 384,
  ffmpegConcurrency: Math.max(4, Math.floor(CPU_COUNT * 1.3)),
  maxNSFWScore: 0.75,
  maxHistoryChatSize: 20,
  ResultCache: new LRUCache({
    max: 1_024,
    ttl: 1_000 * 60 * 1.5,
    updateAgeOnGet: false,
    updateAgeOnHas: false,
    ttlAutopurge: true,
  }),
};

const tgbot = {
  ownerId: "OWNER_ID",
  newsletterId: "NEWSLETTER_ID",
  botname: "BOT_NAME",
  botfatherToken: env.TELEGRAM_BOT_TOKEN ?? "BOTFATHER_TOKEN",
};

const misc = {
  pluginsFolder: "wa/plugins",
  geminiApiKey: env.GEMINI_API_KEY ?? "GEMINI_APIKEY",
  julesApiKey: env.JULES_API_KEY ?? "",
};

export default { wabot, tgbot, misc };
