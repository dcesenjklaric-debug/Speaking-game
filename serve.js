/* Quick Wit — tiny zero-dependency static server for local play.
 *
 * Serving over http://localhost (rather than opening index.html as a file)
 * matters: the browser only grants microphone access on a secure origin, and
 * localhost counts as one.
 *
 * Usage:  node serve.js [port]
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const ROOT = __dirname;
const PORT = parseInt(process.argv[2], 10) || 8422;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".webm": "audio/webm",
  ".mp3": "audio/mpeg",
  ".woff2": "font/woff2",
};

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch {
    res.writeHead(400).end("Bad request");
    return;
  }
  if (urlPath === "/") urlPath = "/index.html";

  // The AI-coach proxy only exists on Vercel. The game probes it at startup and
  // falls back to the bring-your-own-key path, so a clean 404 is the right answer.
  if (urlPath.startsWith("/api/")) {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "No proxy when running locally — add your key in Settings." }));
    return;
  }

  const filePath = path.join(ROOT, urlPath);
  if (!filePath.startsWith(ROOT + path.sep)) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not found: " + urlPath);
      return;
    }
    res.writeHead(200, {
      "content-type": TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "cache-control": "no-cache",
    });
    res.end(data);
  });
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `\nPort ${PORT} is already in use — the game may already be running.\n` +
        `Open http://localhost:${PORT} , or start on another port:  node serve.js 8423\n`
    );
  } else {
    console.error("\nServer error:", err.message);
  }
  process.exit(1);
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n  Quick Wit is running at ${url}`);
  console.log("  Keep this window open while playing. Press Ctrl+C to stop.\n");
  // Opened only once the server is actually listening, so the browser never
  // races ahead and lands on "can't reach this page".
  if (!process.env.NO_OPEN) {
    const cmd =
      process.platform === "win32" ? `start "" "${url}"`
      : process.platform === "darwin" ? `open "${url}"`
      : `xdg-open "${url}"`;
    exec(cmd);
  }
});
