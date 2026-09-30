import { useEffect, useRef, useState } from "react";
import { createLofiPlayer } from "./audio/player";
import type { PlaybackState } from "./audio/player";

type Player = ReturnType<typeof createLofiPlayer>;

export default function App() {
  const player = useRef<Player | null>(null);
  const [state, setState] = useState<PlaybackState>("paused");

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

  const playing = state === "playing";
  const label = playing ? "Pause music" : "Play music";
  const status =
    state === "blocked"
      ? "Autoplay is blocked. Press play to start music."
      : state === "error"
        ? "Audio could not start. Press play to try again."
        : playing
          ? "Music playing"
          : "Music paused";

  return (
    <main className="grid min-h-dvh place-items-center bg-white text-black dark:bg-black dark:text-white">
      <button
        type="button"
        onClick={() =>
          playing ? player.current?.pause() : player.current?.play()
        }
        aria-label={label}
        title={state === "blocked" || state === "error" ? status : label}
        className="grid size-20 cursor-pointer place-items-center rounded-full hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-current dark:hover:bg-white/10"
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          {playing ? (
            <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
          ) : (
            <path d="M7 3.5a1 1 0 0 1 1.5-.86l13 8.5a1 1 0 0 1 0 1.72l-13 8.5A1 1 0 0 1 7 20.5z" />
          )}
        </svg>
      </button>
      <span role="status" className="sr-only">
        {status}
      </span>
    </main>
  );
}
