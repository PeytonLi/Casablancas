const DEFAULT_TTS_ENDPOINT = "https://healthy-goshawk-628.convex.site/tts";
const VOICE_ERROR = "Charlie voice is unavailable.";
const BUNDLED_AUDIO = {};

export function createCharlieVoicePlayer({
  endpoint = DEFAULT_TTS_ENDPOINT,
  audioByText = BUNDLED_AUDIO,
  fetchImpl = globalThis.fetch,
  createObjectURL = (blob) => URL.createObjectURL(blob),
  revokeObjectURL = (url) => URL.revokeObjectURL(url),
  audioFactory = (url) => new Audio(url),
} = {}) {
  let currentAudio = null;
  let currentUrl = "";

  function stop() {
    currentAudio?.pause?.();
    if (currentUrl) revokeObjectURL(currentUrl);
    currentAudio = null;
    currentUrl = "";
  }

  return {
    stop,

    async speak(text) {
      stop();

      try {
        const bundledUrl = audioByText[text];
        if (bundledUrl) {
          const audio = audioFactory(bundledUrl);
          currentAudio = audio;
          const release = () => {
            if (currentAudio === audio) currentAudio = null;
          };
          audio.onended = release;
          audio.onerror = release;
          await audio.play();
          return;
        }

        const response = await fetchImpl(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (!response.ok) throw new Error(VOICE_ERROR);

        const blob = await response.blob();
        if (!blob.size) throw new Error(VOICE_ERROR);

        const url = createObjectURL(blob);
        const audio = audioFactory(url);
        currentUrl = url;
        currentAudio = audio;

        const release = () => {
          if (currentAudio !== audio) return;
          revokeObjectURL(url);
          currentAudio = null;
          currentUrl = "";
        };
        audio.onended = release;
        audio.onerror = release;
        await audio.play();
      } catch {
        stop();
        throw new Error(VOICE_ERROR);
      }
    },
  };
}
