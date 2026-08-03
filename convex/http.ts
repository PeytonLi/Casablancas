import { httpRouter } from "convex/server";

import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import {
  handleAsk,
  handleNextShow,
  handleTts,
} from "./httpHandlers";
import { preflightResponse } from "./lib";

declare const process: {
  env: {
    OPENAI_API_KEY?: string;
    ELEVENLABS_API_KEY?: string;
    ELEVENLABS_VOICE_ID?: string;
  };
};

const http = httpRouter();

for (const path of ["/ask", "/tts", "/nextshow"]) {
  http.route({
    path,
    method: "OPTIONS",
    handler: httpAction(async () => preflightResponse()),
  });
}

http.route({
  path: "/ask",
  method: "POST",
  handler: httpAction(async (_ctx, request) => {
    return await handleAsk(request, {
      apiKey: process.env.OPENAI_API_KEY ?? "",
    });
  }),
});

http.route({
  path: "/tts",
  method: "POST",
  handler: httpAction(async (_ctx, request) => {
    return await handleTts(request, {
      apiKey: process.env.ELEVENLABS_API_KEY ?? "",
      voiceId: process.env.ELEVENLABS_VOICE_ID ?? "",
    });
  }),
});

http.route({
  path: "/nextshow",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    return await handleNextShow(request, {
      ensureDemoShow: () => ctx.runMutation(internal.shows.ensureDemo, {}),
      findNextShow: (args: { artist: string; today: string }) =>
        ctx.runQuery(internal.shows.next, args),
    });
  }),
});

export default http;
