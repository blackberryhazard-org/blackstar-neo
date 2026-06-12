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

// TODO: new config section
const system = {
  localTimezone: "Asia/Jakarta",
  temporaryFileInterval: 1_000 * 60 * 30,
  dataInterval: 1_000 * 60 * 10,
  requestTimeout: 1_000 * 60 * 1.5,
  ffmpegTimeout: 1_000 * 60,
  minDelay: 100,
  maxDelay: 1_000 * 3,
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

const wabot = {
  ownerName: "OWNER_NAME",
  ownerNumber: "OWNER_NUMBER",
  botName: "BOT_NAME",
  footer: "✦ Whatsapp Bot",
  botNumber: "BOT_NUMBER",
  pairingCode: true,
  defaultLimit: 15,
  stickerPackName: "📦 Sakurabot Sticker",
  stickerPackPublisher: "GitHub: indra87g",

  // TODO: should be moved to the "misc" section 
  apiUser: env.SIGHTENGINE_API_USER ?? "", // sightengineUser
  apiSecret: env.SIGHTENGINE_API_SECRET ?? "", // sightengineSecret
  // -----------------------------------------
  
  botThumbnail: "./media/Image/thumbnail.jpg", // TODO: It would be better to make owner can fill it with "random" if the owner wants the bot to use random thumbnails from picsum.photos 
  botMenuMusic: "./media/Audio/music.mp3",
  gcInterval: 1_000 * 60 * 60,
  ignoreOldMessageTS: 30,
};

const tgbot = {
  ownerId: "OWNER_ID",
  newsletterId: "NEWSLETTER_ID",
  botname: "BOT_NAME",
  footer: "✦ Telegram Bot",
  botfatherToken: env.TELEGRAM_BOT_TOKEN ?? "BOTFATHER_TOKEN",
  botThumbnail: "./media/Image/thumbnail.jpg",
  botMenuMusic: "./media/Audio/music.mp3", // TODO: menu music on telegram bot — why not
};

const misc = {
  sightengineUser: env.SIGHTENGNE_API_USER ?? "",
  sightengineSecret: env.SIGHTENGINE_API_SECRET ?? "",
  geminiApiKey: env.GEMINI_API_KEY ?? "GEMINI_APIKEY",
  julesApiKey: env.JULES_API_KEY ?? "",
};

export default { wabot, tgbot, misc };
