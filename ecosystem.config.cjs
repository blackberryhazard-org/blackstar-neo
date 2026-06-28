const config = require("./config.js").default;

const apps = [];

if (config.system.services.telegramBot) {
  apps.push({
    name: "telegram-bot",
    script: "./tg/index.js",
    node_args: "--import ./loader.js --max-old-space-size=320 --expose-gc",
    env: {
      NODE_ENV: "production",
    },
  });
}

if (config.system.services.whatsappBot) {
  apps.push({
    name: "whatsapp-bot",
    script: "./wa/index.js",
    node_args: "--import ./loader.js --max-old-space-size=320 --expose-gc",
    env: {
      NODE_ENV: "production",
    },
  });
}

module.exports = {
  apps,
};
