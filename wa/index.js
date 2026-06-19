import { join } from "node:path";
import { Boom } from "@hapi/boom";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
} from "@itsliaaa/baileys";
import pino from "pino";
import config from "../config.js";

const startWhatsappBot = async () => {
  const authFolder = join(process.cwd(), "data", "wa", "auth");
  const { state, saveCreds } = await useMultiFileAuthState(authFolder);

  const sock = makeWASocket({
    logger: pino({ level: "silent" }),
    printQRInTerminal: !config.wabot.pairingCode,
    auth: state,
    browser: ["Windows", "Chrome", "20.0.04"],
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (
      connection === "connecting" &&
      config.wabot.pairingCode === true &&
      !sock.authState.creds.registered
    ) {
      const phoneNumber = config.wabot.botNumber.replace(/\D/g, "");

      setTimeout(async () => {
        try {
          const code = await sock.requestPairingCode(phoneNumber);
          const prettyCode = `${code.substring(0, 4)}-${code.substring(4)}`;
          console.log(`🔗 Pairing code for WhatsApp: ${prettyCode}`);
        } catch (error) {
          console.error("Failed to request pairing code", error);
        }
      }, 3000);
    }

    if (qr && !config.wabot.pairingCode) {
      console.log("🔗 Scan the QR code to connect to WhatsApp.");
    }

    if (connection === "close") {
      const shouldReconnect =
        new Boom(lastDisconnect?.error)?.output?.statusCode !==
        DisconnectReason.loggedOut;

      console.log(
        "❌ WhatsApp connection closed due to",
        lastDisconnect?.error,
        ", reconnecting:",
        shouldReconnect,
      );

      if (shouldReconnect) {
        startWhatsappBot();
      } else {
        console.log(
          "⚠️ You are logged out. Please remove the auth folder and restart to login again.",
        );
      }
    } else if (connection === "open") {
      console.log(`✅ Connected to WhatsApp as ${config.wabot.botname}`);
    }
  });

  sock.ev.on("messages.upsert", async (m) => {
    const msg = m.messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const messageType = Object.keys(msg.message)[0];
    const messageContent =
      messageType === "conversation"
        ? msg.message.conversation
        : messageType === "extendedTextMessage"
          ? msg.message.extendedTextMessage.text
          : "";

    if (messageContent.trim().toLowerCase() === "/ping") {
      await sock.sendMessage(
        msg.key.remoteJid,
        { text: "Pong!" },
        { quoted: msg },
      );
    }
  });
};

await startWhatsappBot();
