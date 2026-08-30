/**
 * Static file serving for this prototype, in place of `python -m http.server`.
 *
 * Python's server takes its MIME types from the Windows registry, where
 * `.js` is frequently registered as `text/plain`. Chrome enforces strict MIME
 * checking on `<script type="module">`, so the whole game silently refuses to
 * load and you get a blank 300x150 canvas. This serves the handful of types
 * this page actually uses, correctly, on every platform.
 *
 * `server.mjs` reuses the handler and adds the game to it. Run this file on
 * its own if you only want the files.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const ROOT = fileURLToPath(new URL(".", import.meta.url));

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".ts": "text/plain; charset=utf-8",
};

export function staticHandler(root = ROOT) {
  return async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    let path = decodeURIComponent(url.pathname);
    if (path.endsWith("/")) path += "index.html";

    // Keep the request inside root — no `..` escapes.
    const file = resolve(root, "." + path);
    if (!file.startsWith(root)) {
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
  };
}

const invokedDirectly = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) {
  const port = Number(process.env.PORT) || 8000;
  createServer(staticHandler()).listen(port, "127.0.0.1", () => {
    console.log(`files served at http://localhost:${port}/ (no game — use server.mjs for that)`);
  });
}
