import { eq } from "drizzle-orm";
import config from "../config.js";
import { db } from "./db/index.js";
import { users } from "./db/schema.js";

export const authMiddleware = async (_sock, msg) => {
  if (!msg.key.remoteJid) return null;

  const userId = msg.key.participant || msg.key.remoteJid;
  const cleanedId = userId.split("@")[0];
  const ownerNumbers = config.owner.ownerNumbers.whatsapp
    .split(",")
    .map((n) => n.trim());

  let user = await db.query.users.findFirst({
    where: eq(users.whatsappId, userId),
  });

  if (!user) {
    await db
      .insert(users)
      .values({
        whatsappId: userId,
        role: "user",
        premiumExpiry: 0,
      })
      .run();

    user = await db.query.users.findFirst({
      where: eq(users.whatsappId, userId),
    });
  }

  const isOwner = ownerNumbers.includes(cleanedId);
  const isPartner = user.role === "partner" || isOwner;
  const isPremium = user.premiumExpiry > Date.now() || isPartner;

  return {
    user,
    isOwner,
    isPartner,
    isPremium,
  };
};
