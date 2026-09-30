// The original eight-bar composition from the browser prototype.
// Schedule notes directly on the audio clock; no song-length render is needed.
export const TEMPO = 78;
const hz = (note: number): number => 440 * 2 ** ((note - 69) / 12);

export function createNoiseBuffer(
  ac: BaseAudioContext,
  seconds: number,
  seed = 93,
): AudioBuffer {
  const b = ac.createBuffer(
      1,
      Math.ceil(ac.sampleRate * seconds),
      ac.sampleRate,
    ),
    d = b.getChannelData(0);
  let state = seed;
  for (let i = 0; i < d.length; i++) {
    state = (Math.imul(state, 1664525) + 1013904223) | 0;
    d[i] = (state >>> 0) / 2147483648 - 1;
  }
  return b;
}
export function createComposition(ac: AudioContext, output: AudioNode) {
  const beat = 60 / TEMPO;
  const sr = ac.sampleRate;
  const mix = ac.createGain();
  mix.gain.value = 0.72;
  const low = ac.createBiquadFilter();
  low.type = "lowpass";
  low.frequency.value = 5600;
  low.Q.value = 0.35;
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.knee.value = 15;
  comp.ratio.value = 3;
  comp.attack.value = 0.008;
  comp.release.value = 0.2;
  mix.connect(low).connect(comp).connect(output);
  const echo = ac.createDelay(1);
  echo.delayTime.value = beat * 0.75;
  const feedback = ac.createGain();
  feedback.gain.value = 0.23;
  const echoFilter = ac.createBiquadFilter();
  echoFilter.frequency.value = 1700;
  const wet = ac.createGain();
  wet.gain.value = 0.17;
  echo.connect(echoFilter).connect(feedback).connect(echo);
  echoFilter.connect(wet).connect(mix);
  const impulse = ac.createBuffer(2, sr * 1.4, sr);
  for (let ch = 0; ch < 2; ch++) {
    const n = createNoiseBuffer(ac, 1.4, 55 + ch).getChannelData(0),
      d = impulse.getChannelData(ch);
    for (let i = 0; i < d.length; i++)
      d[i] = n[i] * Math.exp((-i / sr) * 5) * 0.4;
  }
  const reverb = ac.createConvolver();
  reverb.buffer = impulse;
  const room = ac.createGain();
  room.gain.value = 0.12;
  reverb.connect(room).connect(mix);
  const drumNoise = createNoiseBuffer(ac, 1);
  function tone(
    note: number,
    t: number,
    duration: number,
    amp: number,
    type: OscillatorType = "sine",
    pan = 0,
    send = true,
  ) {
    const o = ac.createOscillator(),
      g = ac.createGain(),
      p = ac.createStereoPanner();
    o.type = type;
    o.frequency.value = hz(note);
    o.detune.setValueAtTime(-3, t);
    o.detune.linearRampToValueAtTime(3, t + duration);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(amp, t + 0.009);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    p.pan.value = pan;
    o.connect(g).connect(p).connect(mix);
    if (send) {
      p.connect(echo);
      p.connect(reverb);
    }
    o.onended = () => {
      o.disconnect();
      g.disconnect();
      p.disconnect();
    };
    o.start(t);
    o.stop(t + duration + 0.03);
  }
  function keys(notes: number[], t: number, length: number) {
    notes.forEach((n, i) => {
      tone(n, t + i * 0.012, length, 0.057, "sine", (i - 2) * 0.12);
      tone(n + 12, t + i * 0.012, length * 0.36, 0.008, "sine", (i - 2) * 0.12);
    });
  }
  function kick(t: number, amp = 1) {
    const o = ac.createOscillator(),
      g = ac.createGain();
    o.frequency.setValueAtTime(135, t);
    o.frequency.exponentialRampToValueAtTime(43, t + 0.12);
    g.gain.setValueAtTime(0.36 * amp, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g).connect(mix);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
    o.start(t);
    o.stop(t + 0.4);
  }
  function percussion(t: number, hat = false, amp = 1) {
    const s = ac.createBufferSource(),
      f = ac.createBiquadFilter(),
      g = ac.createGain(),
      p = ac.createStereoPanner();
    s.buffer = drumNoise;
    f.type = hat ? "highpass" : "bandpass";
    f.frequency.value = hat ? 6200 : 1700;
    f.Q.value = hat ? 0.7 : 0.6;
    p.pan.value = hat ? 0.24 : -0.1;
    g.gain.setValueAtTime((hat ? 0.055 : 0.16) * amp, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (hat ? 0.065 : 0.18));
    s.connect(f).connect(g).connect(p).connect(mix);
    if (!hat) {
      p.connect(reverb);
      tone(50, t, 0.1, 0.055, "triangle", -0.1, false);
    }
    s.onended = () => {
      s.disconnect();
      f.disconnect();
      g.disconnect();
      p.disconnect();
    };
    s.start(t, hat ? 0.25 : 0);
    s.stop(t + 0.22);
  }
  const chords = [
      [57, 60, 64, 67, 71],
      [53, 57, 60, 64, 69],
      [55, 59, 60, 64, 74],
      [55, 59, 62, 64, 69],
    ],
    roots = [33, 29, 36, 31];
  const melodies = [
    [
      [0.5, 76],
      [2.75, 71],
    ],
    [[1.5, 72]],
    [
      [0.75, 69],
      [3, 72],
    ],
    [[2.5, 76]],
    [
      [0.5, 74],
      [2, 71],
    ],
    [[1.5, 67]],
    [
      [0.75, 69],
      [2.75, 71],
    ],
    [
      [1.5, 67],
      [3, 64],
    ],
  ];
  return {
    barDuration: 4 * beat,
    scheduleBar(bar: number, t: number) {
      const k = Math.floor(bar / 2);
      keys(chords[k], t + 0.01, beat * 3.2);
      keys(chords[k], t + beat * 2.65, beat * 1.2);
      tone(roots[k], t, beat * 1.5, 0.18, "sine", 0, false);
      tone(roots[k] + 12, t + beat * 2.5, beat * 0.7, 0.1, "sine", 0, false);
      tone(roots[k], t + beat * 3.25, beat * 0.65, 0.12, "sine", 0, false);
      kick(t);
      kick(t + beat * (bar % 2 ? 2.5 : 2.25), 0.8);
      if (bar === 3 || bar === 7) kick(t + beat * 3.5, 0.48);
      percussion(t + beat + 0.017);
      percussion(t + beat * 3 + 0.023);
      for (let h = 0; h < 8; h++)
        percussion(
          t + beat * (h * 0.5 + (h % 2 ? 0.075 : 0)),
          true,
          h % 2 ? 0.66 : 0.9,
        );
      melodies[bar].forEach(([offset, n]) =>
        tone(n, t + offset * beat + 0.012, beat * 1.1, 0.026, "triangle", -0.2),
      );
    },
  };
}
