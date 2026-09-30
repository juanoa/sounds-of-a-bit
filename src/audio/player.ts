import { createComposition, createNoiseBuffer } from "./composition";

export type PlaybackState = "playing" | "paused" | "blocked" | "error";

// Schedule a small rolling window on the audio clock. JavaScript timers only
// replenish the queue; they do not determine when individual notes sound.
const LOOKAHEAD_SECONDS = 12;
const SCHEDULER_INTERVAL_MS = 1000;

export function createLofiPlayer(
  onStateChange: (state: PlaybackState) => void,
) {
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let analyser: AnalyserNode | null = null;
  let composition: ReturnType<typeof createComposition> | null = null;
  let scheduler: ReturnType<typeof setInterval> | null = null;
  let nextBar = 0;
  let startedAt = 0;
  let initialized = false;
  let wantsPlayback = false;
  let disposed = false;

  function clearScheduler() {
    if (scheduler !== null) clearInterval(scheduler);
    scheduler = null;
  }

  function scheduleAhead() {
    if (!context || !composition || context.state !== "running") return;
    const duration = composition.barDuration;
    // If the OS froze the page longer than the queue, skip missed bars rather
    // than playing all overdue notes at once.
    if (startedAt + nextBar * duration < context.currentTime) {
      nextBar = Math.ceil((context.currentTime - startedAt) / duration);
    }
    while (
      startedAt + nextBar * duration <
      context.currentTime + LOOKAHEAD_SECONDS
    ) {
      composition.scheduleBar(nextBar % 8, startedAt + nextBar * duration);
      nextBar++;
    }
  }

  function startWhenAllowed() {
    if (disposed || !wantsPlayback || !context || !master) return;
    if (context.state !== "running") {
      onStateChange("blocked");
      return;
    }
    if (!initialized) {
      initialized = true;
      startedAt = context.currentTime + 0.015;
      // Only one bar is scheduled on the first call; the rest is queued after
      // the context is already playing. No full-song buffer or async render.
      composition!.scheduleBar(0, startedAt);
      nextBar = 1;
    }
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setTargetAtTime(0.35, context.currentTime, 0.008);
    if (scheduler === null) {
      scheduler = setInterval(scheduleAhead, SCHEDULER_INTERVAL_MS);
    }
    onStateChange("playing");
  }

  function releaseContext() {
    clearScheduler();
    if (context) {
      context.onstatechange = null;
      void context.close().catch(() => {});
    }
    context = null;
    master = null;
    analyser = null;
    composition = null;
    initialized = false;
    nextBar = 0;
  }

  function initialize() {
    if (context) return context;
    const audio = new AudioContext({
      latencyHint: "interactive",
      sampleRate: 44100,
    });
    context = audio;
    master = audio.createGain();
    master.gain.value = 0;
    analyser = audio.createAnalyser();
    analyser.fftSize = 2048;
    master.connect(analyser).connect(audio.destination);

    const warmth = audio.createBiquadFilter();
    warmth.type = "lowpass";
    warmth.Q.value = 0.4;
    warmth.frequency.value = 3400;
    warmth.connect(master);
    composition = createComposition(audio, warmth);

    const texture = audio.createBufferSource();
    texture.buffer = createNoiseBuffer(audio, 3, 17);
    texture.loop = true;
    const textureFilter = audio.createBiquadFilter();
    textureFilter.type = "lowpass";
    textureFilter.frequency.value = 1900;
    const textureGain = audio.createGain();
    textureGain.gain.value = 0.0012;
    texture.connect(textureFilter).connect(textureGain).connect(master);
    texture.start();

    audio.onstatechange = () => {
      if (disposed || context !== audio) return;
      if (audio.state === "running") {
        if (wantsPlayback) startWhenAllowed();
        else void audio.suspend().catch(handleError);
      } else {
        clearScheduler();
        onStateChange(wantsPlayback ? "blocked" : "paused");
      }
    };
    return audio;
  }

  function handleError() {
    if (disposed) return;
    wantsPlayback = false;
    releaseContext();
    onStateChange("error");
  }

  return {
    getAnalyser() {
      return analyser;
    },
    // This method also handles autoplay. A blocked resume promise can remain
    // pending until a gesture, so it must never disable the play button.
    play() {
      if (disposed) return;
      wantsPlayback = true;
      try {
        const audio = initialize();
        startWhenAllowed();
        void audio
          .resume()
          .then(() => {
            if (context === audio) startWhenAllowed();
          })
          .catch(handleError);
      } catch {
        handleError();
      }
    },
    pause() {
      if (!context || !master || disposed) return;
      wantsPlayback = false;
      clearScheduler();
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setValueAtTime(0, context.currentTime);
      onStateChange("paused");
      void context.suspend().catch(handleError);
      // Suspended audio time preserves scheduled notes and effect tails.
    },
    dispose() {
      disposed = true;
      wantsPlayback = false;
      releaseContext();
    },
  };
}
