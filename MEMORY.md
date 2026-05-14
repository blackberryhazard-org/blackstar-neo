
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
