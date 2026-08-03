import { cp, mkdir, rm } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
await Promise.all([
  mkdir("dist/server", { recursive: true }),
  mkdir("dist/client/experience", { recursive: true }),
]);

await Promise.all([
  cp("worker/index.js", "dist/server/index.js"),
  cp("site/index.html", "dist/client/index.html"),
  cp("site/site.css", "dist/client/site.css"),
  cp("index.html", "dist/client/experience/index.html"),
  cp("src", "dist/client/src", { recursive: true }),
  cp("data", "dist/client/data", { recursive: true }),
  cp("assets", "dist/client/assets", { recursive: true }),
  cp("public", "dist/client/public", { recursive: true }),
]);

console.log("Casablancas Sites build is ready in dist/.");
