import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
const root = process.cwd(),
  docs = path.join(root, "docs/experience-implementation/browser"),
  publicRoot = path.join(root, "public");
const mime = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".jsx": "text/javascript",
  ".webp": "image/webp",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};
http
  .createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      if (pathname === "/") {
        res.writeHead(302, {
          Location: "/docs/experience-implementation/browser/",
        });
        res.end();
        return;
      }
      const inDocs = pathname.startsWith(
        "/docs/experience-implementation/browser/",
      );
      const base = inDocs ? docs : publicRoot;
      const relative = inDocs
        ? pathname.slice("/docs/experience-implementation/browser/".length)
        : pathname.slice(1);
      const file = path.resolve(
        base,
        relative + (pathname.endsWith("/") ? "index.html" : ""),
      );
      if (!file.startsWith(base + path.sep)) throw Error();
      const data = await fs.readFile(file);
      res.writeHead(200, {
        "Content-Type": mime[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(4180, "127.0.0.1", () =>
    console.log(
      "Component fixtures: http://127.0.0.1:4180/docs/experience-implementation/browser/",
    ),
  );
