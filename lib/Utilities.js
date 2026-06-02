/**
 * This file is part of the Starseed Bot WhatsApp project, solely developed and maintained by Lia Wynn.
 * https://github.com/itsliaaa/starseed
 *
 * All rights reserved.
 *
 * - You are NOT allowed to copy, rewrite, modify, redistribute, or reuse this file in any form.
 * - You are NOT allowed to claim this file or any part of this project as your own.
 * - This credit notice must NOT be removed or altered.
 * - This file may ONLY be used within the Starseed project.
 */

import { delay, isJidGroup, WA_DEFAULT_EPHEMERAL } from "@itsliaaa/baileys";
import { spawn } from "child_process";
import { once } from "events";
import {
  fileTypeFromBuffer,
  fileTypeFromFile,
  fileTypeStream,
} from "file-type";
import { createWriteStream } from "fs";
import {
  access,
  readdir,
  readFile,
  rm,
  stat,
  unlink,
  writeFile,
} from "fs/promises";
import { LRUCache } from "lru-cache";
import PQueue from "p-queue";
import { join, resolve } from "path";
import {
  formatNumber,
  formatSize,
  formatTime,
  greeting,
  isEmptyObject,
  isMimeAudio,
  isMimeGif,
  isMimeImage,
  isMimeVideo,
  isMimeWebP,
  isURL,
  isWhatsAppURL,
  levenshtein,
  medal,
  parseMentions,
  randomInteger,
  randomValue,
  shuffleArray,
  toTime,
  toTitleCase,
} from "sawit-utils";
import { PassThrough, Readable } from "stream";
import { pipeline } from "stream/promises";

export {
  formatNumber,
  formatSize,
  formatTime,
  greeting,
  isEmptyObject,
  isMimeAudio,
  isMimeGif,
  isMimeImage,
  isMimeVideo,
  isMimeWebP,
  isURL,
  isWhatsAppURL,
  levenshtein,
  medal,
  parseMentions,
  randomInteger,
  randomValue,
  shuffleArray,
  toTime,
  toTitleCase,
};

import { api } from "sawit-utils";
import {
  AUDIO_TO_MPEG,
  AUDIO_TO_OPUS,
  BRAT_GIF_ARGS,
  FFMPEG_CONCAT_ARGS,
  FONT_MAPS,
  IMAGE_TO_WEBP,
  MINUTE,
  VIDEO_TO_WEBP,
  WEBP_EXIF_HEADER,
} from "./Constants.js";
import { CommandIndex } from "./Watcher.js";

const request = api.request.bind(api);

const ProfilePictureCache = new LRUCache({
  max: 1024,
  ttl: MINUTE * 10,
  updateAgeOnGet: false,
  updateAgeOnHas: false,
  ttlAutopurge: true,
});

const FFmpegQueue = new PQueue({
  concurrency: global.ffmpegConcurrency,
});

export const HourFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: localTimezone,
  hour: "2-digit",
  hour12: false,
});

export const DateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: localTimezone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

let napiImage;

export const createFileName = () =>
  `${process.pid}_${performance.now().toString().replace(".", "")}`;

export const randomHex = () =>
  `#${((Math.random() * 0xffffff) | 0).toString(16).padStart(6, "0").toUpperCase()}`;

export const cleanUpFolder = async (path) => {
  try {
    const statistic = await stat(path);
    if (statistic.isFile()) {
      await unlink(path);
      return;
    }

    const entries = await readdir(path);
    await Promise.all(
      entries.map((name) =>
        rm(join(path, name), { recursive: true, force: true }),
      ),
    );
  } catch (error) {
    console.error("❌ ", error.message);
  }
};

export const isFileExists = async (path) => {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
};

export const fetchAsBuffer = (url) => {
  if (url instanceof Buffer) return url;

  if (typeof url !== "string") return null;

  if (isURL(url)) return request(url);

  return readFile(url);
};

export const getDiskStats = async () => {
  const df = spawn("df", ["-k"]);

  let output = "";
  df.stdout.on("data", (chunk) => {
    output += chunk;
  });

  await once(df, "close");

  const lines = output.trim().split("\n").slice(1);
  let primaryDisk = null;

  for (const line of lines) {
    const parts = line.split(/\s+/);
    const [fs, size, used, avail, , mount] = parts;

    if (
      fs.includes("tmpfs") ||
      fs.includes("devtmpfs") ||
      fs.includes("overlay") ||
      mount.startsWith("/dev") ||
      mount.startsWith("/proc")
    )
      continue;

    const totalBytes = parseInt(size) * 1024;

    if (!primaryDisk || totalBytes > primaryDisk.total)
      primaryDisk = {
        total: totalBytes,
        used: parseInt(used) * 1024,
        free: parseInt(avail) * 1024,
        mount,
      };
  }

  return primaryDisk;
};

export const ffmpeg = async (
  inputPath,
  inputArgs = [],
  outputArgs = [],
  extension,
) =>
  FFmpegQueue.add(async () => {
    if (!extension) throw new Error("Extension required");

    const fileName = createFileName() + "." + extension;
    const filePath = join(process.cwd(), global.temporaryFolder, fileName);

    const ff = spawn(
      "ffmpeg",
      [
        "-y",
        "-loglevel",
        "quiet",
        "-nostdin",
        ...inputArgs,
        "-threads",
        "0",
        "-i",
        inputPath,
        ...outputArgs,
        "-threads",
        "0",
        filePath,
      ],
      {
        stdio: "ignore",
      },
    );

    let timeout;
    const timeoutId = setTimeout(() => {
      timeout = true;
      ff.kill("SIGKILL");
    }, global.ffmpegTimeout);

    try {
      const [code] = await once(ff, "close");

      if (code !== 0) throw new Error(`FFmpeg failed (${code})`);

      return filePath;
    } catch (error) {
      if (timeout)
        throw new Error(`FFmpeg timeout after ${global.ffmpegTimeout}ms`);
      throw error;
    } finally {
      clearTimeout(timeoutId);
      ff.removeAllListeners();
    }
  });

export const persistToFile = async (source) => {
  if (typeof source === "string" && !isURL(source)) return source;

  if (source instanceof ArrayBuffer) source = Buffer.from(source);

  let readable, check;
  if (source instanceof Buffer) {
    readable = Readable.from(source);
    check = await fileTypeFromBuffer(source);
  } else if (typeof source === "string" && isURL(source)) {
    const response = await fetch(source);

    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(response.statusText);
    }

    readable = await fileTypeStream(Readable.fromWeb(response.body));
    check = readable.fileType;
  } else throw new Error("Invalid source type");

  const extension = check?.ext || "txt";
  const fileName = resolve(
    process.cwd(),
    global.temporaryFolder,
    createFileName(),
  );
  const filePath = fileName + "." + extension;

  await pipeline(readable, createWriteStream(filePath));

  return filePath;
};

export const getIndonesianTimezone = () => {
  if (localTimezone.endsWith("Jakarta")) return "WIB";
  if (localTimezone.endsWith("Makassar")) return "WIT";
  if (localTimezone.endsWith("Jayapura")) return "WITA";
  return "WIB";
};

export const getNextMidnight = () => {
  const now = new Date();

  const timezoneNow = getNowInTZ();

  const timezoneMidnight = new Date(timezoneNow);

  timezoneMidnight.setHours(24, 0, 0, 0);

  const offset = now.getTime() - timezoneNow.getTime();

  const realMidnight = timezoneMidnight.getTime() + offset;

  return realMidnight - now.getTime();
};

export const getNowInTZ = () =>
  new Date(
    new Date().toLocaleString("en-US", {
      timeZone: localTimezone,
    }),
  );

export const createExif = (json) => {
  const jsonBuffer = Buffer.from(JSON.stringify(json));
  const exif = Buffer.concat([WEBP_EXIF_HEADER, jsonBuffer]);

  exif.writeUIntLE(jsonBuffer.length, 14, 4);

  return exif;
};

/* ********** EXPERIMENTAL FUNCTIONS ********** */
export const ensureVP8X = (webpBuffer) => {
  const firstChunk = webpBuffer.toString("ascii", 12, 16);

  if (firstChunk === "VP8X") return webpBuffer;

  if (firstChunk !== "VP8 " && firstChunk !== "VP8L")
    throw new Error("Unsupported WebP format");

  const width = 512 - 1;
  const height = 512 - 1;

  const vp8xChunk = Buffer.alloc(18);
  vp8xChunk.write("VP8X", 0);
  vp8xChunk.writeUInt32LE(10, 4);

  vp8xChunk[8] = 0;

  vp8xChunk.fill(0, 9, 12);

  vp8xChunk.writeUIntLE(width, 12, 3);
  vp8xChunk.writeUIntLE(height, 15, 3);

  const before = webpBuffer.slice(0, 12);
  const after = webpBuffer.slice(12);

  const newBuffer = Buffer.concat([before, vp8xChunk, after]);
  newBuffer.writeUInt32LE(newBuffer.length - 8, 4);

  return newBuffer;
};

export const writeExif = (webpBuffer, metadataJson) => {
  webpBuffer = ensureVP8X(webpBuffer);

  const exifData = createExif(metadataJson);

  let offset = 12;
  let vp8xOffset = -1;

  while (offset < webpBuffer.length) {
    const type = webpBuffer.toString("ascii", offset, offset + 4);
    const size = webpBuffer.readUInt32LE(offset + 4);

    if (type === "VP8X") {
      vp8xOffset = offset;
      break;
    }

    offset += 8 + size + (size % 2);
  }

  webpBuffer[vp8xOffset + 8] |= 0b00001000;

  const exifChunkHeader = Buffer.alloc(8);
  exifChunkHeader.write("EXIF", 0);
  exifChunkHeader.writeUInt32LE(exifData.length, 4);

  const exifChunk = Buffer.concat([
    exifChunkHeader,
    exifData,
    exifData.length % 2 ? Buffer.from([0x00]) : Buffer.alloc(0),
  ]);

  const newBuffer = Buffer.concat([webpBuffer, exifChunk]);
  newBuffer.writeUInt32LE(newBuffer.length - 8, 4);

  return newBuffer;
};
/* ********** ********** ********** ********** */

export const resizeImage = async (
  media,
  width = 540,
  height = null,
  quality = 70,
  format = "jpeg",
) => {
  if (!(media instanceof Buffer)) media = await fetchAsBuffer(media);

  const lib = (napiImage ??= await import("@napi-rs/image"));

  const transformer = new lib.Transformer(media);

  transformer.resize(width, height > 0 ? height : null, 0);

  return transformer[format](quality);
};

export const createSticker = async (media, options = {}) => {
  if (!media) throw new Error("No media provided");

  media = await persistToFile(media);

  let mimetype = options.mimetype;
  if (!mimetype) {
    const check = await fileTypeFromFile(media);
    mimetype = check?.mime;
  }

  if (isMimeWebP(mimetype)) media = media;
  else if (isMimeVideo(mimetype) || isMimeGif(mimetype))
    media = await videoToWebP(media);
  else if (isMimeImage(mimetype)) media = await imageToWebP(media);
  else throw new Error("Invalid media input");

  media = await fetchAsBuffer(media);

  return writeExif(media, {
    "sticker-pack-id": "itsliaaa",
    "sticker-pack-name": options.stickerPackName ?? stickerPackName,
    "sticker-pack-publisher": options.stickerPackPublisher,
    "android-app-store-link": "https://github.com/itsliaaa",
    "ios-app-store-link": "https://github.com/itsliaaa",
    emojis: ["✨"],
    "accessibility-text": botName,
  });
};

export const bratSticker = async (text = "Hi") =>
  persistToFile(`https://aqul-brat.hf.space/?text=${encodeURIComponent(text)}`);

export const bratVideoSticker = async (text = "Hi") => {
  const texts = text.trim().split(" ");
  const temporaryDirectory = resolve(process.cwd(), global.temporaryFolder);

  const files = await Promise.all(
    texts.map((_, index) =>
      persistToFile(
        `https://aqul-brat.hf.space/?text=${encodeURIComponent(texts.slice(0, index + 1).join(" "))}`,
      ),
    ),
  );

  const list =
    files
      .map(
        (file) => `file '${resolve(temporaryDirectory, file)}'\nduration 0.4`,
      )
      .join("\n") +
    `\nfile '${resolve(temporaryDirectory, files[files.length - 1])}'\nduration 3\n`;

  const listPath = resolve(temporaryDirectory, `${createFileName()}.txt`);
  await writeFile(listPath, list);

  return ffmpeg(listPath, FFMPEG_CONCAT_ARGS, BRAT_GIF_ARGS, "gif");
};

export const findTopSuggestions = (input) => {
  const inputLength = input.length;
  const maxDistance = Math.max(2, inputLength >> 1);

  let c1 = "",
    s1 = 0;
  let c2 = "",
    s2 = 0;
  let c3 = "",
    s3 = 0;

  for (const command of CommandIndex.keys()) {
    const lenDiff = command.length - inputLength;
    if (lenDiff > maxDistance || lenDiff < -maxDistance) continue;

    if (command[0] !== input[0]) continue;

    const distance = levenshtein(input, command, maxDistance);
    if (distance > maxDistance) continue;

    const similarity = (1 - distance / inputLength) * 100;

    if (similarity > s1) {
      c3 = c2;
      s3 = s2;
      c2 = c1;
      s2 = s1;
      c1 = command;
      s1 = similarity;
    } else if (similarity > s2) {
      c3 = c2;
      s3 = s2;
      c2 = command;
      s2 = similarity;
    } else if (similarity > s3) {
      c3 = command;
      s3 = similarity;
    }
  }

  const out = [];
  if (c1)
    out.push({
      command: c1,
      similarity: s1,
    });
  if (c2)
    out.push({
      command: c2,
      similarity: s2,
    });
  if (c3)
    out.push({
      command: c3,
      similarity: s3,
    });

  return out;
};

export const style = (text, style = 0) => {
  const map = FONT_MAPS[Number(style)] || FONT_MAPS[0];

  let result = "";
  for (const char of text) result += map[char] || char;

  return result;
};

export const frame = (title, lines = [], icon = "✦") => {
  const top = "╭" + "─".repeat(1) + `✦ ${icon} *${style(title)}*`;

  const content = lines.map((l) => `│ ${l}`);

  const bottom = "╰" + "─".repeat(5) + "✦";

  return [top, ...content, bottom].join("\n");
};

export const messageLogger = (message) =>
  console.log(
    "\n" +
      `🔔 Received ${message.type} from ${message.sender?.split("@")[0] || "-"} (${message.pushName || message.verifiedBizName}) in ${message.chat}` +
      "\n" +
      message.body,
  );

export const applySchema = (target, schema) => {
  for (const key in schema) if (!(key in target)) target[key] = schema[key];
};

export const toArray = (value) =>
  typeof value === "string" ? [value] : Array.isArray(value) ? value : [];

export const fetchThumbnail = () => fetchAsBuffer(botThumbnail);

export const imageToWebP = (media) => ffmpeg(media, [], IMAGE_TO_WEBP, "webp");

export const videoToWebP = (media) => ffmpeg(media, [], VIDEO_TO_WEBP, "webp");

export const toAudio = (media) => ffmpeg(media, [], AUDIO_TO_MPEG, "mp3");

export const toPTT = (media) => ffmpeg(media, [], AUDIO_TO_OPUS, "opus");

export const ExtendSocket = (
  sock,
  { updatePresence, delayWithPresence, secureMetaServiceLabel },
) => {
  const originalSendMessage = sock.sendMessage;
  sock.sendMessage = async (jid, content, options) => {
    if (updatePresence && !Array.isArray(jid)) {
      const presenceType = content.ptt ? "recording" : "composing";

      await sock.sendPresenceUpdate(presenceType, jid);
    }

    if (delayWithPresence)
      await delay(randomInteger(global.minDelay, global.maxDelay));

    content.secureMetaServiceLabel = secureMetaServiceLabel;

    return originalSendMessage(jid, content, options);
  };

  sock.sendText = (jid, text = "", quoted, content = {}, options = {}) => {
    text = typeof text === "string" ? text : JSON.stringify(text, null, 3);

    content.text = text;
    content.mentions = parseMentions(text);

    options.ephemeralExpiration = !isJidGroup(jid) && WA_DEFAULT_EPHEMERAL;
    options.quoted = quoted;

    return sock.sendMessage(jid, content, options);
  };

  sock.sendMedia = async (
    jid,
    source,
    caption = "",
    quoted,
    content = {},
    options = {},
  ) => {
    try {
      source = await persistToFile(source);

      caption =
        typeof caption === "string"
          ? caption
          : JSON.stringify(caption, null, 3);

      let media, mimetype;
      if (content.sticker) {
        content.stickerPackPublisher ??= stickerPackPublisher;
        media = await createSticker(source, content);
        mimetype = "image/webp";
      } else if (content.ptt) {
        media = {
          url: await toPTT(source),
        };
        mimetype = "audio/ogg; codecs=opus";
      } else if (content.audio) {
        media = {
          url: await toAudio(source),
        };
        mimetype = "audio/mpeg";
      } else {
        const check = content.mimetype
          ? { mime: content.mimetype }
          : await fileTypeFromFile(source);

        media = { url: source };
        mimetype = check?.mime || "text/plain";

        content.caption = caption;
        content.gifPlayback = isMimeGif(mimetype);
      }

      const method = content.document
        ? "document"
        : isMimeWebP(mimetype)
          ? "sticker"
          : isMimeAudio(mimetype)
            ? "audio"
            : isMimeImage(mimetype)
              ? "image"
              : isMimeVideo(mimetype)
                ? "video"
                : "document";

      delete content.audio;
      delete content.document;
      delete content.sticker;
      delete content.stickerPackName;
      delete content.stickerPackPublisher;

      content[method] = media;
      content.mimetype = mimetype;
      content.mentions = parseMentions(caption);

      options.ephemeralExpiration = !isJidGroup(jid) && WA_DEFAULT_EPHEMERAL;
      options.quoted = quoted;

      return sock.sendMessage(jid, content, options);
    } catch (error) {
      console.error(error);
      return sock.sendText(
        jid,
        "❌ Failed to get data : " + error.message,
        quoted,
      );
    }
  };

  sock.profilePicture = async (jid) => {
    if (ProfilePictureCache.has(jid)) return ProfilePictureCache.get(jid);

    let url;
    try {
      url = await sock.profilePictureUrl(jid);
    } catch {
      url = "./media/Image/profile.jpg";
    }

    ProfilePictureCache.set(jid, url);
    return url;
  };

  return sock;
};
