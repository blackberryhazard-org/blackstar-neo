import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  telegramId: text("telegram_id").primaryKey(),
  role: text("role").default("user"), // 'user', 'partner'
  premiumExpiry: integer("premium_expiry").default(0),
});
