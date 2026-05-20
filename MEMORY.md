
### Logging Behavior
- **WhatsApp Bot**: Runs in a child process managed by `spawn` from `index.js`. It uses standard `console.log`/`console.error` (which is patched by `lib/Components/ErrorHandler.js`) and also utilizes `pino` for internal Bailey's logging.
- **Telegram Bot**: Runs in the parent process alongside `index.js`. It previously attempted to use `global.consolefy`, which caused logging issues as it was never properly defined. This has been fixed to use standard `console.log` and `console.error`.
- Parent process streams both its own logs (Telegram) and forwards standard output/error from the WhatsApp child process.

## Sawit-Utils Integration
- The project uses the `sawit-utils` package for common utility functions such as MIME checking (`isMimeImage`, etc.), URL validation (`isWhatsAppURL`), and formatting (`formatSize`, `formatTime`, `toTime`).
- Functions were deleted from `lib/Utilities.js` and instead exported directly from `sawit-utils` using the syntax: `export { ... } from 'sawit-utils'`.
- It's important to use regex accurately when modifying code via string replacement, or use exact string matching to avoid truncating unrelated code.

## API Integration
- Added wrapper for the `lexcode` API in `lib/Request.js`, available at `https://api.lexcode.biz.id/api/`.

## AI Model Integration Updates
- Updated routing in `text-generation.js` to point the `/claude` command specifically to the `lexcode` endpoint while preserving default behavior for others.
- Updated default Gemini model to `gemini-robotics-er-1.6-preview` in `Gemini.js`.
- Audited `Gemini.js` for compliance with Google AI Studio. Code conforms to current REST schemas.

## MCP Skill Generation
- Investigated tools like `uvx mcp2cli` for creating CLI representations of MCP remote servers.
- Generated a `SKILL.md` under `.agents/skills/kone_mcp/` detailing how to use `mcp2cli` against an MCP endpoint.
- Note: `https://go.kone.vc/mcp` returns a 400 Bad Request error `{"error":{"code":400,"message":"Incorrect app URL"}}`, requiring a fully-qualified app URL or correct credentials to work properly with mcp2cli.

* Architecture: The Telegram bot now runs on `telegraf-hardened` v6, integrating `tg/middleware.js` to enforce newsletter subscriptions and role limits (owner, partner, premium) seamlessly mirroring the WhatsApp bot implementations using `lib/Database.js`.
* Economy: A `/topup` command for the Telegram bot accepts native Telegram Stars payments (`XTR` currency), where successful checkouts grant users Sakuranite (`lib/Components/Economy.js`) at a ratio of 50 Sakuranite per 1 Star.

* Bug Fixes: Applied safe coercion to `escapeHtml` in AI helpers, standardized `githubStalk` helper to return explicit `{ success, data, message }` responses, secured Telegram Stars `/topup` implementation by taking the amount directly from the API rather than the insecure user-controlled payload, and extended middleware coverage safely over `callback_query` updates using optional chaining.

* Configuration: The Telegram commands now directly rely on `global.*` properties populated by `load_globals.js` from the root `config.js`, eliminating duplicate `settings.js` configurations and keeping them synced with the WhatsApp bot.

* Architecture: Added `messageLogger` execution inside Telegram's middleware (`tg/socket.js`) to ensure both WhatsApp and Telegram events print uniform connection/chat logs in the console.
