import { join } from "node:path";
import { Boom } from "@hapi/boom";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
} from "@itsliaaa/baileys";
import { eq, gt } from "drizzle-orm";
import pino from "pino";
import config from "../config.js";
import { db } from "./db/index.js";
import { users } from "./db/schema.js";
import { authMiddleware } from "./middleware.js";

const PAGE_SIZE = 10;

const sendRoleList = async (sock, remoteJid, type, page = 0, quoted) => {
  let userList = [];
  if (type === "partner") {
    userList = await db.query.users.findMany({
      where: eq(users.role, "partner"),
    });
  } else if (type === "premium") {
    userList = await db.query.users.findMany({
      where: gt(users.premiumExpiry, Date.now()),
    });
  } else {
    return sock.sendMessage(
      remoteJid,
      { text: "Invalid role type." },
      { quoted },
    );
  }

  if (userList.length === 0) {
    return sock.sendMessage(
      remoteJid,
      { text: `No users found with role ${type}.` },
      { quoted },
    );
  }

  const totalPages = Math.ceil(userList.length / PAGE_SIZE);
  const start = page * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const paginatedUsers = userList.slice(start, end);

  let text = `*List User ${type.charAt(0).toUpperCase() + type.slice(1)} (Page ${page + 1}/${totalPages})*\n\n`;
  paginatedUsers.forEach((u, i) => {
    text += `${start + i + 1}. ${u.whatsappId}\n`;
  });

  if (totalPages > 1) {
    text += `\n_Gunakan /role list ${type} {page} untuk melihat halaman lain._`;
  }

  await sock.sendMessage(remoteJid, { text }, { quoted });
};

const handleMessage = async (sock, m) => {
  const msg = m.messages[0];
  if (!msg.message || msg.key.fromMe) return;

  const messageType = Object.keys(msg.message)[0];
  const messageContent =
    messageType === "conversation"
      ? msg.message.conversation
      : messageType === "extendedTextMessage"
        ? msg.message.extendedTextMessage.text
        : "";

  if (!messageContent.startsWith("/")) return;

  const auth = await authMiddleware(sock, msg);
  if (!auth) return;

  const parts = messageContent.split(" ");
  const command = parts[0].toLowerCase().slice(1);
  const args = parts.slice(1);

  if (command === "ping") {
    return sock.sendMessage(
      msg.key.remoteJid,
      { text: "Pong!" },
      { quoted: msg },
    );
  }

  if (command === "role") {
    if (args.length < 1) {
      return sock.sendMessage(
        msg.key.remoteJid,
        {
          text: "Usage:\n/role add {partner|premium} {id} [duration]\n/role remove {partner|premium} {id}\n/role list {role} [page]",
        },
        { quoted: msg },
      );
    }

    const action = args[0].toLowerCase();

    if (action === "list") {
      const type = args[1]?.toLowerCase();
      const pageStr = args[2];
      const page = Number.parseInt(pageStr, 10) || 1;
      if (!type)
        return sock.sendMessage(
          msg.key.remoteJid,
          { text: "Usage: /role list {partner|premium} [page]" },
          { quoted: msg },
        );
      return sendRoleList(sock, msg.key.remoteJid, type, page - 1, msg);
    }

    const type = args[1]?.toLowerCase();
    let targetId = args[2];

    if (
      !targetId &&
      msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0
    ) {
      targetId = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
    }

    if (
      !targetId &&
      msg.message.extendedTextMessage?.contextInfo?.participant
    ) {
      targetId = msg.message.extendedTextMessage.contextInfo.participant;
    }

    if (!type || !targetId) {
      return sock.sendMessage(
        msg.key.remoteJid,
        { text: `Usage: /role ${action} {partner|premium} {id|mention|reply}` },
        { quoted: msg },
      );
    }

    const isPartnerOp = type === "partner";
    if (isPartnerOp && !auth.isOwner)
      return sock.sendMessage(
        msg.key.remoteJid,
        { text: `❌ Only owner can ${action} partners.` },
        { quoted: msg },
      );
    if (!isPartnerOp && !auth.isPartner)
      return sock.sendMessage(
        msg.key.remoteJid,
        { text: `❌ Only partners can ${action} premium users.` },
        { quoted: msg },
      );

    if (action === "add") {
      let expiry = 0;
      if (!isPartnerOp) {
        const durationStr = args[3];
        if (!durationStr)
          return sock.sendMessage(
            msg.key.remoteJid,
            { text: "Usage: /role add premium {id} {duration}" },
            { quoted: msg },
          );
        const match = durationStr.match(/^(\d+)([dhms])$/);
        if (!match)
          return sock.sendMessage(
            msg.key.remoteJid,
            { text: "Invalid duration format. Use 1d, 1h, 1m, 1s." },
            { quoted: msg },
          );
        const value = Number.parseInt(match[1], 10);
        if (Number.isNaN(value))
          return sock.sendMessage(
            msg.key.remoteJid,
            { text: "Invalid numeric value." },
            { quoted: msg },
          );
        const unit = match[2];
        const multipliers = { d: 86400000, h: 3600000, m: 60000, s: 1000 };
        expiry = Date.now() + value * multipliers[unit];
      }

      await db
        .insert(users)
        .values({
          whatsappId: targetId,
          role: isPartnerOp ? "partner" : "user",
          premiumExpiry: isPartnerOp ? 0 : expiry,
        })
        .onConflictDoUpdate({
          target: users.whatsappId,
          set: isPartnerOp ? { role: "partner" } : { premiumExpiry: expiry },
        })
        .run();

      const replyMsg = isPartnerOp
        ? `✅ User ${targetId} promoted to Partner.`
        : `✅ User ${targetId} is now Premium until ${new Date(expiry).toLocaleString()}.`;
      sock.sendMessage(msg.key.remoteJid, { text: replyMsg }, { quoted: msg });
    } else if (action === "remove") {
      if (isPartnerOp) {
        await db
          .update(users)
          .set({ role: "user" })
          .where(eq(users.whatsappId, targetId))
          .run();
        sock.sendMessage(
          msg.key.remoteJid,
          { text: `✅ User ${targetId} demoted from Partner.` },
          { quoted: msg },
        );
      } else {
        await db
          .update(users)
          .set({ premiumExpiry: 0 })
          .where(eq(users.whatsappId, targetId))
          .run();
        sock.sendMessage(
          msg.key.remoteJid,
          { text: `✅ Premium role removed from user ${targetId}.` },
          { quoted: msg },
        );
      }
    }
  }
};

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
      config.wabot.pairingCode &&
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

    if (qr && !config.wabot.pairingCode)
      console.log("🔗 Scan the QR code to connect to WhatsApp.");

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
      if (shouldReconnect) startWhatsappBot();
    } else if (connection === "open") {
      console.log(`✅ Connected to WhatsApp as ${config.wabot.botName}`);
    }
  });

  sock.ev.on("messages.upsert", (m) => handleMessage(sock, m));

  process.once("SIGTERM", () => {
    sock
      .logout()
      .catch(() => {})
      .finally(() => process.exit(0));
  });
};

await startWhatsappBot();
