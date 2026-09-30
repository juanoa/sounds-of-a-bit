# Sounds of a Bit

A minimal React and TypeScript SPA built with Vite and Tailwind CSS.

The page contains one play/pause button on a white or black background. The theme follows the system's `prefers-color-scheme` setting, including changes while the app is open.

## Development

```sh
pnpm install
pnpm dev
```

## Checks and production build

```sh
pnpm lint
pnpm test
pnpm build
pnpm preview
```

## Audio

The original "Ventana de tarde" composition is synthesized locally with Web Audio: eight bars at 78 BPM, electric-key-style chords, bass, drums, a sparse melody, delay, and reverb. No audio assets or external services are used.

`src/audio/composition.ts` schedules the same eight-bar score directly on the audio clock. Playback begins with one bar; a rolling twelve-second queue is replenished as the track plays. Instruments synthesize their samples in real time, and delay/reverb remain connected across cycles. There is no full-song render or audio download before playback.

`src/audio/player.ts` uses the prototype's listening settings: 35% master volume, a 3400 Hz low-pass filter, and a quiet filtered-noise texture. Short-lived instrument nodes disconnect when they finish. The first pass builds its effect tails naturally instead of starting with pre-rendered tails from a previous cycle.

The app attempts audible autoplay on mount. Browsers may require a user gesture, in which case the same play button remains immediately available. A pending autoplay permission never disables the button. Once allowed, the first musical events are scheduled fifteen milliseconds ahead of the audio clock; actual audible latency also depends on the browser and output device.

Pause suspends the audio context and preserves the current position. Background playback has a twelve-second scheduling buffer; an OS-level page freeze can still interrupt web audio. Closing the page stops it. Screen-reader labels and status messages are in English.
