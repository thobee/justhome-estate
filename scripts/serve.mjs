import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const port = Number(process.env.PORT || 4173);
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".txt": "text/plain",
  ".xml": "application/xml",
};
http
  .createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://localhost");
      const pathname = decodeURIComponent(url.pathname);
      const filename = path.resolve(
        root,
        "." + (pathname === "/" ? "/index.html" : pathname),
      );
      const relative = path.relative(root, filename);
      if (
        relative.startsWith("..") ||
        path.isAbsolute(relative) ||
        relative
          .split(path.sep)
          .some((part) => part.startsWith(".") || part === "node_modules") ||
        !types[path.extname(filename)]
      ) {
        response.writeHead(404).end("Not found");
        return;
      }
      const body = await fs.readFile(filename);
      response.writeHead(200, {
        "Content-Type":
          types[path.extname(filename)] +
          ([".html", ".js", ".css"].includes(path.extname(filename))
            ? "; charset=utf-8"
            : ""),
        "X-Content-Type-Options": "nosniff",
      });
      response.end(body);
    } catch {
      response.writeHead(404).end("Not found");
    }
  })
  .listen(port, "127.0.0.1", () =>
    console.log("JustHome preview: http://localhost:" + port),
  );
