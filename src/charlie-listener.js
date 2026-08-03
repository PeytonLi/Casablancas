const ERROR_MESSAGES = {
  "audio-capture": "Charlie can't access the microphone.",
  "not-allowed": "Allow microphone access, then tap Ask Charlie again.",
  "service-not-allowed": "Allow microphone access, then tap Ask Charlie again.",
  "no-speech": "Charlie didn't hear anything. Tap Ask Charlie and try again.",
};

function microphoneError(error) {
  if (["NotAllowedError", "PermissionDeniedError", "SecurityError"].includes(error?.name)) {
    return new Error(ERROR_MESSAGES["not-allowed"]);
  }
  if (["NotFoundError", "DevicesNotFoundError"].includes(error?.name)) {
    return new Error("No microphone was found on this device.");
  }
  return new Error(ERROR_MESSAGES["audio-capture"]);
}

export function createCharlieListener({
  SpeechRecognitionCtor = globalThis.SpeechRecognition ?? globalThis.webkitSpeechRecognition,
  requestMicrophone = globalThis.navigator?.mediaDevices?.getUserMedia
    ? (constraints) => globalThis.navigator.mediaDevices.getUserMedia(constraints)
    : null,
  listenTimeoutMs = 10_000,
  microphoneTimeoutMs = 10_000,
} = {}) {
  return {
    async listen() {
      if (!SpeechRecognitionCtor) {
        throw new Error("Voice input isn't supported in this browser.");
      }

      if (requestMicrophone) {
        let stream;
        let microphoneTimer;
        let microphoneTimedOut = false;
        const microphoneRequest = Promise.resolve().then(() => requestMicrophone({ audio: true }));
        const microphoneTimeout = new Promise((_, reject) => {
          microphoneTimer = globalThis.setTimeout?.(() => {
            microphoneTimedOut = true;
            reject(new Error("Microphone permission timed out. Tap Ask Charlie and try again."));
          }, microphoneTimeoutMs);
        });
        void microphoneRequest.then((lateStream) => {
          if (microphoneTimedOut) {
            lateStream?.getTracks?.().forEach((track) => track.stop?.());
          }
        }).catch(() => {});
        try {
          stream = await Promise.race([microphoneRequest, microphoneTimeout]);
        } catch (error) {
          if (microphoneTimedOut) throw error;
          throw microphoneError(error);
        } finally {
          globalThis.clearTimeout?.(microphoneTimer);
        }
        stream?.getTracks?.().forEach((track) => track.stop?.());
      }

      return new Promise((resolve, reject) => {
        const recognition = new SpeechRecognitionCtor();
        let settled = false;
        let timeoutId;

        const settle = (action, value) => {
          if (settled) return;
          settled = true;
          globalThis.clearTimeout?.(timeoutId);
          action(value);
        };

        recognition.lang = "en-US";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.continuous = false;

        recognition.onresult = (event) => {
          const transcript = event.results?.[0]?.[0]?.transcript?.trim();
          if (!transcript) return;
          settle(resolve, transcript);
        };

        recognition.onerror = (event) => {
          settle(
            reject,
            new Error(ERROR_MESSAGES[event.error] ?? "Charlie couldn't hear you. Try again."),
          );
        };

        recognition.onend = () => {
          settle(reject, new Error("Charlie didn't hear anything. Tap Ask Charlie and try again."));
        };

        try {
          recognition.start();
          timeoutId = globalThis.setTimeout?.(() => {
            if (settled) return;
            settled = true;
            recognition.abort?.();
            reject(new Error("Charlie didn't hear anything. Tap Ask Charlie and try again."));
          }, listenTimeoutMs);
        } catch {
          settle(reject, new Error("Charlie couldn't start listening. Try again."));
        }
      });
    },
  };
}
