import { LRUCache } from "lru-cache";

/**
 * tiktokCache is an LRU cache to store TikTok video/music details temporarily
 * so they can be retrieved efficiently without re-fetching from APIs.
 *
 * It uses LRUCache to hold up to 1,024 items.
 * Items will expire after 5 minutes (300,000 ms).
 */
export const tiktokCache = new LRUCache({
  max: 1024,
  ttl: 1000 * 60 * 5, // 5 minutes TTL
  updateAgeOnGet: false,
  updateAgeOnHas: false,
  ttlAutopurge: true,
});
