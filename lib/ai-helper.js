export function escapeHtml(text = "") {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function looksLikeCode(text = "") {
  const codePatterns = [
    /```/,
    /\bfunction\b/,
    /\bconst\b/,
    /\blet\b/,
    /\bvar\b/,
    /\bclass\b/,
    /=>/,
    /console\.log/,
    /<\/?[a-z][\s\S]*>/i,
  ];

  return codePatterns.some((r) => r.test(text));
}
