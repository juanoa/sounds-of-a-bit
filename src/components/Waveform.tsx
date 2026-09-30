import { useEffect, useRef } from "react";

type WaveformProps = {
  playing: boolean;
  getAnalyser: () => AnalyserNode | null;
};

export function Waveform({ playing, getAnalyser }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const pen = canvas?.getContext("2d");
    if (!canvas || !pen) return;

    const darkMode = window.matchMedia("(prefers-color-scheme: dark)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const samples = new Float32Array(2048);
    let width = 0;
    let height = 0;
    let frame = 0;
    let lastDraw = 0;
    let snapshot: ReturnType<typeof setTimeout> | undefined;

    function draw() {
      if (!canvas || !pen) return;
      const analyser = getAnalyser();
      if (playing && analyser) analyser.getFloatTimeDomainData(samples);
      else samples.fill(0);

      pen.clearRect(0, 0, width, height);
      pen.strokeStyle = darkMode.matches ? "#ffffff" : "#1c1c1c";
      pen.lineCap = "butt";
      const bars = Math.max(32, Math.floor(width / 8));
      const spacing = width / bars;
      pen.lineWidth = Math.min(2, spacing * 0.16);
      pen.beginPath();
      for (let bar = 0; bar < bars; bar++) {
        const from = Math.floor((bar * samples.length) / bars);
        const to = Math.floor(((bar + 1) * samples.length) / bars);
        let peak = 0;
        for (let i = from; i < to; i++)
          peak = Math.max(peak, Math.abs(samples[i]));
        // Fixed visual gain keeps every bar tied to the real output amplitude.
        const amplitude = Math.max(
          1,
          Math.min(height * 0.43, peak * height * 4),
        );
        const x = (bar + 0.5) * spacing;
        pen.moveTo(x, height / 2 - amplitude);
        pen.lineTo(x, height / 2 + amplitude);
      }
      pen.stroke();
    }

    function resize() {
      if (!canvas || !pen) return;
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      pen.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw();
    }

    function animate(time: number) {
      if (time - lastDraw >= 1000 / 30) {
        draw();
        lastDraw = time;
      }
      frame = requestAnimationFrame(animate);
    }

    function updateMotion() {
      cancelAnimationFrame(frame);
      clearTimeout(snapshot);
      draw();
      if (!playing) return;
      if (reducedMotion.matches) {
        // Capture a real audio frame without a continuously moving waveform.
        snapshot = setTimeout(draw, 200);
      } else {
        frame = requestAnimationFrame(animate);
      }
    }

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    darkMode.addEventListener("change", draw);
    reducedMotion.addEventListener("change", updateMotion);
    resize();
    updateMotion();

    return () => {
      observer.disconnect();
      darkMode.removeEventListener("change", draw);
      reducedMotion.removeEventListener("change", updateMotion);
      cancelAnimationFrame(frame);
      clearTimeout(snapshot);
    };
  }, [playing, getAnalyser]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="Live waveform of the music"
      className="block h-10 w-full min-w-0 sm:h-12"
    />
  );
}
