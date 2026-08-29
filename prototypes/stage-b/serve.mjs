/**
 * A static file server for this prototype, in place of `python -m http.server`.
 *
 * Python's server takes its MIME types from the Windows registry, where
 * `.js` is frequently registered as `text/plain`. Chrome enforces strict MIME
 * checking on `<script type="module">`, so the whole game silently refuses to
 * load and you get a blank 300x150 canvas. This serves the handful of types
 * this page actually uses, correctly, on every platform.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.PORT) || 8000;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".ts": "text/plain; charset=utf-8",
};

createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  let path = decodeURIComponent(url.pathname);
  if (path.endsWith("/")) path += "index.html";

  // Keep the request inside ROOT — no `..` escapes.
  const file = resolve(ROOT, "." + path);
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end("forbidden");
    return;
  }

  try {
    const body = await readFile(file);
    res.writeHead(200, {
      "content-type": TYPES[extname(file)] ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(body);
  } catch {
    console.error(`404 ${path}`);
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end(`404 ${path}\n`);
  }
}).listen(PORT, "127.0.0.1", () => {
  console.log(`the Verge is served at http://localhost:${PORT}/`);
});
