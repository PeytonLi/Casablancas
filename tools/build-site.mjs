import { cp, mkdir, rm } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
await Promise.all([
  mkdir("dist/server", { recursive: true }),
  mkdir("dist/static/experience", { recursive: true }),
]);

await Promise.all([
  cp("worker/index.js", "dist/server/index.js"),
  cp("site/index.html", "dist/static/index.html"),
  cp("site/site.css", "dist/static/site.css"),
  cp("index.html", "dist/static/experience/index.html"),
  cp("src", "dist/static/src", { recursive: true }),
  cp("data", "dist/static/data", { recursive: true }),
  cp("assets", "dist/static/assets", { recursive: true }),
  cp("public", "dist/static/public", { recursive: true }),
]);

console.log("Casablancas Sites build is ready in dist/.");
