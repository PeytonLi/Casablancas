import assert from "node:assert/strict";

const base = process.env.CONVEX_SITE_URL;
assert.match(base ?? "", /^https:\/\/[^/]+\.convex\.site$/);

for (const [path, method] of [["/ask", "POST"], ["/tts", "POST"], ["/nextshow", "GET"]]) {
  const response = await fetch(`${base}${path}`, {
    method: "OPTIONS",
    headers: {
      Origin: "https://example.test",
      "Access-Control-Request-Method": method,
      "Access-Control-Request-Headers": "Content-Type",
    },
  });
  assert.equal(response.status, 204, `${path} preflight`);
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
}

const nextShow = await fetch(`${base}/nextshow?artist=The%20Strokes`);
assert.equal(nextShow.status, 200, nextShow.ok ? undefined : await nextShow.text());

const ask = await fetch(`${base}/ask`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text: "Where is water?" }),
});
assert.equal(ask.status, 200, ask.ok ? undefined : await ask.text());

const tts = await fetch(`${base}/tts`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text: "Route ready." }),
});
assert.equal(tts.status, 200, tts.ok ? undefined : await tts.text());
assert.equal(tts.headers.get("content-type"), "audio/mpeg");
assert.ok((await tts.arrayBuffer()).byteLength > 0);

console.log("Phase 0 canary passed");
