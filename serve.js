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

// `done` matters when the caller exits straight afterwards: exec is async, so
// exiting immediately kills the shell before it can launch the browser.
function openBrowser(url, done = () => {}) {
  if (process.env.NO_OPEN) return done();
  const cmd =
    process.platform === "win32" ? `start "" "${url}"`
    : process.platform === "darwin" ? `open "${url}"`
    : `xdg-open "${url}"`;
  let settled = false;
  const finish = () => { if (!settled) { settled = true; done(); } };
  exec(cmd, finish);
  setTimeout(finish, 3000).unref(); // don't hang the window if the shell never reports back
}

// Is something already serving Quick Wit on this port? A stray server left
// running from an earlier session used to make every later launch bail out
// without ever opening a browser, which just looks like the game is broken.
function probe(port) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (v) => {
      if (!settled) { settled = true; resolve(v); }
    };
    const req = http.get(
      { host: "localhost", port, path: "/", timeout: 1500 },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        // Match while streaming. The page is ~220KB, so waiting for "end"
        // after aborting the read would mean waiting for an event that
        // never arrives — the title is in the first KB anyway.
        res.on("data", (c) => {
          body += c;
          if (body.includes("Quick Wit")) { finish(true); req.destroy(); }
          else if (body.length > 65536) { finish(false); req.destroy(); }
        });
        res.on("end", () => finish(body.includes("Quick Wit")));
      }
    );
    req.on("timeout", () => { finish(false); req.destroy(); });
    req.on("error", () => finish(false));
    req.on("close", () => finish(false));
  });
}

server.on("error", async (err) => {
  if (err.code !== "EADDRINUSE") {
    console.error("\nServer error:", err.message);
    process.exit(1);
  }
  const url = `http://localhost:${PORT}`;
  if (await probe(PORT)) {
    // already running and healthy — just show it
    console.log(`\n  Quick Wit is already running at ${url} — opening it.`);
    console.log("  (That server lives in another window; close it to stop the game.)\n");
    openBrowser(url, () => process.exit(0));
    return;
  }
  // port taken by something else entirely: step aside rather than give up
  const next = PORT + 1;
  console.log(`\n  Port ${PORT} is taken by another program — starting on ${next} instead.`);
  server.listen(next);
});

server.listen(PORT, () => {
  const url = `http://localhost:${server.address().port}`;
  console.log(`\n  Quick Wit is running at ${url}`);
  console.log("  Keep this window open while playing. Press Ctrl+C to stop.\n");
  // Opened only once the server is actually listening, so the browser never
  // races ahead and lands on "can't reach this page".
  openBrowser(url);
});
