import { useCallback, useEffect, useRef, useState } from "react";
import {
  PauseIcon,
  PlayIcon,
  SkipBackIcon,
  SkipForwardIcon,
} from "@phosphor-icons/react";
import { createLofiPlayer } from "./audio/player";
import type { PlaybackState } from "./audio/player";
import { TRACKS } from "./audio/tracks";
import { Waveform } from "./components/Waveform";

type Player = ReturnType<typeof createLofiPlayer>;

export default function App() {
  const player = useRef<Player | null>(null);
  const [state, setState] = useState<PlaybackState>("paused");
  const [trackIndex, setTrackIndex] = useState(0);
  const track = TRACKS[trackIndex];
  const getAnalyser = useCallback(
    () => player.current?.getAnalyser() ?? null,
    [],
  );

  useEffect(() => {
    const audio = createLofiPlayer((next) => {
      if (player.current === audio) setState(next);
    });
    player.current = audio;
    audio.play();
    return () => {
      audio.dispose();
      if (player.current === audio) player.current = null;
    };
  }, []);

  function changeTrack(direction: -1 | 1) {
    const nextIndex = (trackIndex + direction + TRACKS.length) % TRACKS.length;
    player.current?.selectTrack(TRACKS[nextIndex]);
    setTrackIndex(nextIndex);
  }

  const playing = state === "playing";
  const label = playing ? "Pause music" : "Play music";
  const status =
    state === "blocked"
      ? "Autoplay is blocked. Press play to start music."
      : state === "error"
        ? "Audio could not start. Press play to try again."
        : playing
          ? `Playing ${track.title}`
          : `Paused: ${track.title}`;

  return (
    <main className="relative flex min-h-dvh items-center justify-center bg-white p-6 text-neutral-900 sm:p-10 dark:bg-black dark:text-white">
      <section
        aria-label="Lo-fi player"
        className="max-w-[min(360px,calc(50svh-90px))] flex flex-col items-start bg-neutral-100 p-6 rounded-md shadow-md gap-6"
      >
        <h1 className="sr-only">Sounds of a Bit</h1>
        <img
          src="/sounds-of-a-bit.webp"
          alt="A pink iridescent Sounds of a Bit disc"
          width="300"
          height="300"
          draggable={false}
          className="block aspect-square select-none animate-spin [animation-duration:10s] motion-reduce:animate-none self-center"
          style={{ animationPlayState: playing ? "running" : "paused" }}
        />
        <div className="flex flex-col gap-0.5">
          <h2 className="text-lg font-extrabold">{track.title}</h2>
          <p className="text-xs">{track.artist}</p>
        </div>
        <div className="flex items-center gap-2.5 sm:gap-3.5 w-full">
          <button
            type="button"
            onClick={() =>
              playing ? player.current?.pause() : player.current?.play()
            }
            aria-label={label}
            className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {playing ? (
              <PauseIcon size={24} aria-hidden="true" />
            ) : (
              <PlayIcon size={24} aria-hidden="true" />
            )}
          </button>
          <Waveform key={track.id} playing={playing} getAnalyser={getAnalyser} />
        </div>
        <div
          role="group"
          aria-label="Change song"
          className="flex w-full items-center justify-center gap-4"
        >
          <button
            type="button"
            onClick={() => changeTrack(-1)}
            aria-label="Previous song"
            className="flex size-11 cursor-pointer items-center justify-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <SkipBackIcon size={24} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => changeTrack(1)}
            aria-label="Next song"
            className="flex size-11 cursor-pointer items-center justify-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <SkipForwardIcon size={24} aria-hidden="true" />
          </button>
        </div>
        <span role="status" className="sr-only">
          {status}
        </span>
      </section>
      <footer className="absolute inset-x-4 bottom-4 text-left text-xs text-neutral-500 dark:text-neutral-400">
        This sound is generated using the browser. No audio files downloaded.
      </footer>
    </main>
  );
}
