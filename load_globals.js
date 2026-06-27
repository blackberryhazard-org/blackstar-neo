import config from "./config.js";

// Flatten config into global variables
for (const [sectionKey, sectionObj] of Object.entries(config)) {
  for (const [key, value] of Object.entries(sectionObj)) {
    global[key] = value;
  }
}

global.sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
