import { cp, mkdir, rm } from "node:fs/promises";

const generated = ["public/experience", "public/src", "public/data", "public/assets"];

await Promise.all(generated.map((path) => rm(path, { recursive: true, force: true })));
await mkdir("public/experience", { recursive: true });
await Promise.all([
  cp("index.html", "public/experience/index.html"),
  cp("src", "public/src", { recursive: true }),
  cp("data", "public/data", { recursive: true }),
  cp("assets", "public/assets", { recursive: true }),
]);
