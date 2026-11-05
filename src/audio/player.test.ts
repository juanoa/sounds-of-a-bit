import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLofiPlayer } from "./player";
import type { PlaybackState } from "./player";
import { TRACKS } from "./tracks";

class MockParam {
  value = 0;
  setValueAtTime() {}
  setTargetAtTime() {}
  linearRampToValueAtTime() {}
  exponentialRampToValueAtTime() {}
  cancelScheduledValues() {}
}
class MockNode {
  gain = new MockParam();
  frequency = new MockParam();
  detune = new MockParam();
  pan = new MockParam();
  Q = new MockParam();
  threshold = new MockParam();
  knee = new MockParam();
  ratio = new MockParam();
  attack = new MockParam();
  release = new MockParam();
  delayTime = new MockParam();
  type = "";
  buffer: unknown = null;
  loop = false;
  onended: (() => void) | null = null;
  disconnect = vi.fn();
  starts: number[] = [];
  connect(next: MockNode) {
    return next;
  }
  start(time = 0) {
    this.starts.push(time);
  }
  stop() {}
}
class MockAudioContext {
  static autoplayAllowed = true;
  static instances: MockAudioContext[] = [];
  sampleRate = 44100;
  state: "running" | "suspended" | "closed";
  allowed: boolean;
  onstatechange: (() => void) | null = null;
  destination = new MockNode();
  oscillators: MockNode[] = [];
  private elapsed = 0;
  private epoch = Date.now();
  constructor() {
    this.allowed = MockAudioContext.autoplayAllowed;
    this.state = this.allowed ? "running" : "suspended";
    MockAudioContext.instances.push(this);
  }
  get currentTime() {
    return (
      this.elapsed +
      (this.state === "running" ? (Date.now() - this.epoch) / 1000 : 0)
    );
  }
  createAnalyser() {
    return new MockNode();
  }
  createGain() {
    return new MockNode();
  }
  createBiquadFilter() {
    return new MockNode();
  }
  createDynamicsCompressor() {
    return new MockNode();
  }
  createDelay() {
    return new MockNode();
  }
  createConvolver() {
    return new MockNode();
  }
  createStereoPanner() {
    return new MockNode();
  }
  createBufferSource() {
    return new MockNode();
  }
  createOscillator() {
    const node = new MockNode();
    this.oscillators.push(node);
    return node;
  }
  createBuffer(channels: number, length: number) {
    const data = Array.from(
      { length: channels },
      () => new Float32Array(length),
    );
    return { getChannelData: (channel: number) => data[channel] };
  }
  resume() {
    if (!this.allowed) return new Promise<void>(() => {});
    if (this.state !== "running") {
      this.epoch = Date.now();
      this.state = "running";
      this.onstatechange?.();
    }
    return Promise.resolve();
  }
  suspend() {
    this.elapsed = this.currentTime;
    this.state = "suspended";
    this.onstatechange?.();
    return Promise.resolve();
  }
  close() {
    this.state = "closed";
    return Promise.resolve();
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  MockAudioContext.autoplayAllowed = true;
  MockAudioContext.instances = [];
  vi.stubGlobal("AudioContext", MockAudioContext);
  vi.stubGlobal(
    "OfflineAudioContext",
    class {
      constructor() {
        throw new Error("Playback must not render the full track");
      }
    },
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("instant lo-fi playback", () => {
  it.each(TRACKS)("plays the score and tempo of $title", (track) => {
    const player = createLofiPlayer(() => {}, track);
    player.play();
    const audio = MockAudioContext.instances[0];
    const bass = audio.oscillators.find((node) => node.starts[0] === 0.015);
    expect(bass?.frequency.value).toBeCloseTo(440 * 2 ** ((track.roots[0] - 69) / 12));
    const initialVoices = audio.oscillators.length;
    vi.advanceTimersByTime(1000);
    expect(audio.oscillators[initialVoices].starts[0]).toBeCloseTo(0.025 + 4 * 60 / track.tempo);
    vi.advanceTimersByTime(60000);
    expect(Math.max(...audio.oscillators.flatMap((node) => node.starts))).toBeGreaterThan(70);
    player.dispose();
  });

  it("replaces playing tracks immediately and clears the previous queue", () => {
    const states: PlaybackState[] = [];
    const player = createLofiPlayer((state) => states.push(state));
    player.play();
    vi.advanceTimersByTime(2000);
    const previous = MockAudioContext.instances[0];
    const previousVoiceCount = previous.oscillators.length;
    player.selectTrack(TRACKS[1]);
    expect(previous.state).toBe("closed");
    expect(states.at(-1)).toBe("playing");
    const current = MockAudioContext.instances[1];
    expect(Math.min(...current.oscillators.flatMap((node) => node.starts))).toBeCloseTo(0.015);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(3000);
    expect(previous.oscillators).toHaveLength(previousVoiceCount);
    player.dispose();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps track changes paused until play is pressed", () => {
    const states: PlaybackState[] = [];
    const player = createLofiPlayer((state) => states.push(state));
    player.play();
    player.pause();
    player.selectTrack(TRACKS[1]);
    player.selectTrack(TRACKS[2]);
    expect(states.at(-1)).toBe("paused");
    expect(MockAudioContext.instances).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
    player.play();
    const audio = MockAudioContext.instances[1];
    const bass = audio.oscillators.find((node) => node.starts[0] === 0.015);
    expect(bass?.frequency.value).toBeCloseTo(440 * 2 ** ((TRACKS[2].roots[0] - 69) / 12));
    expect(states.at(-1)).toBe("playing");
    player.dispose();
  });

  it("ignores a stale autoplay rejection after changing tracks", async () => {
    MockAudioContext.autoplayAllowed = false;
    let rejectResume!: (reason: Error) => void;
    vi.spyOn(MockAudioContext.prototype, "resume").mockImplementationOnce(
      () => new Promise<void>((_, reject) => { rejectResume = reject; }),
    );
    const states: PlaybackState[] = [];
    const player = createLofiPlayer((state) => states.push(state));
    player.play();
    MockAudioContext.autoplayAllowed = true;
    player.selectTrack(TRACKS[1]);
    rejectResume(new Error("Old context closed"));
    await Promise.resolve();
    await Promise.resolve();
    expect(states.at(-1)).toBe("playing");
    expect(MockAudioContext.instances[1].state).toBe("running");
    player.dispose();
  });

  it("leaves blocked autoplay retryable while resume is pending", async () => {
    MockAudioContext.autoplayAllowed = false;
    const states: PlaybackState[] = [];
    const player = createLofiPlayer((state) => states.push(state));
    player.play();
    const audio = MockAudioContext.instances[0];
    expect(states.at(-1)).toBe("blocked");
    expect(audio.oscillators).toHaveLength(0);
    audio.allowed = true;
    player.play();
    await Promise.resolve();
    expect(states.at(-1)).toBe("playing");
    expect(audio.oscillators.length).toBeGreaterThan(0);
    expect(MockAudioContext.instances).toHaveLength(1);
    player.dispose();
  });

  it("schedules the first bar immediately and progressively queues later bars", () => {
    const player = createLofiPlayer(() => {});
    player.play();
    const audio = MockAudioContext.instances[0];
    const firstStarts = audio.oscillators.flatMap((node) => node.starts);
    expect(Math.min(...firstStarts)).toBeCloseTo(0.015);
    expect(Math.max(...firstStarts)).toBeLessThan((60 / 78) * 4);
    vi.advanceTimersByTime(1000);
    const laterStarts = audio.oscillators.flatMap((node) => node.starts);
    expect(Math.max(...laterStarts)).toBeGreaterThan(10);
    expect(Math.max(...laterStarts)).toBeLessThan(1 + 12 + (60 / 78) * 4);
    player.dispose();
  });

  it("continues scheduling across multiple complete loops", () => {
    const states: PlaybackState[] = [];
    const player = createLofiPlayer((state) => states.push(state));
    player.play();
    vi.advanceTimersByTime(60000);
    const starts = MockAudioContext.instances[0].oscillators.flatMap(
      (node) => node.starts,
    );
    expect(Math.max(...starts)).toBeGreaterThan(70);
    expect(states.at(-1)).toBe("playing");
    player.dispose();
  });

  it("pauses the audio clock and resumes without rebuilding the song", async () => {
    const player = createLofiPlayer(() => {});
    player.play();
    vi.advanceTimersByTime(2500);
    const audio = MockAudioContext.instances[0];
    player.pause();
    const position = audio.currentTime;
    const count = audio.oscillators.length;
    vi.advanceTimersByTime(10000);
    expect(audio.currentTime).toBe(position);
    expect(audio.oscillators).toHaveLength(count);
    player.play();
    await Promise.resolve();
    expect(audio.currentTime).toBe(position);
    expect(audio.oscillators).toHaveLength(count);
    expect(MockAudioContext.instances).toHaveLength(1);
    player.dispose();
  });

  it("disconnects finished voices and releases the context on disposal", async () => {
    const player = createLofiPlayer(() => {});
    player.play();
    const audio = MockAudioContext.instances[0];
    const voice = audio.oscillators[0];
    voice.onended?.();
    expect(voice.disconnect).toHaveBeenCalled();
    player.dispose();
    await Promise.resolve();
    expect(audio.state).toBe("closed");
    expect(vi.getTimerCount()).toBe(0);
  });
});
