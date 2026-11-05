export type Track = {
  id: string;
  title: string;
  artist: string;
  tempo: number;
  chords: number[][];
  roots: number[];
  melodies: [offset: number, note: number][][];
  swing: number;
  melodyVoice: OscillatorType;
};

export const TRACKS: readonly Track[] = [
  {
    id: "the-beginning",
    title: "The beginning of sth",
    artist: "Nothing was recorded",
    tempo: 78,
    chords: [
      [57, 60, 64, 67, 71],
      [53, 57, 60, 64, 69],
      [55, 59, 60, 64, 74],
      [55, 59, 62, 64, 69],
    ],
    roots: [33, 29, 36, 31],
    melodies: [
      [[0.5, 76], [2.75, 71]],
      [[1.5, 72]],
      [[0.75, 69], [3, 72]],
      [[2.5, 76]],
      [[0.5, 74], [2, 71]],
      [[1.5, 67]],
      [[0.75, 69], [2.75, 71]],
      [[1.5, 67], [3, 64]],
    ],
    swing: 0.075,
    melodyVoice: "triangle",
  },
  {
    id: "late-night-pixels",
    title: "Late night pixels",
    artist: "Nothing was recorded",
    tempo: 68,
    chords: [
      [62, 65, 69, 72, 76],
      [58, 62, 65, 69, 72],
      [60, 64, 67, 71, 74],
      [57, 61, 67, 71, 74],
    ],
    roots: [38, 34, 36, 33],
    melodies: [
      [[0.75, 77], [2.5, 76]],
      [[1.25, 72], [3.25, 69]],
      [[0.5, 74], [2.75, 77]],
      [[2, 76]],
      [[0.75, 79], [2.25, 76]],
      [[1.5, 74], [3, 71]],
      [[0.5, 73], [2.5, 71]],
      [[1.75, 69], [3.25, 73]],
    ],
    swing: 0.11,
    melodyVoice: "sine",
  },
  {
    id: "soft-reset",
    title: "Soft reset",
    artist: "Nothing was recorded",
    tempo: 88,
    chords: [
      [60, 64, 67, 71, 74],
      [59, 62, 66, 69, 73],
      [57, 60, 64, 67, 71],
      [55, 59, 62, 66, 69],
    ],
    roots: [36, 35, 33, 31],
    melodies: [
      [[0.5, 79], [1.75, 76], [3, 74]],
      [[1, 71], [2.5, 74]],
      [[0.25, 78], [1.5, 76], [3.25, 73]],
      [[0.75, 74], [2.75, 71]],
      [[0.5, 76], [1.75, 72], [3, 71]],
      [[1.25, 69], [2.5, 72]],
      [[0.75, 74], [2, 71], [3.25, 69]],
      [[1.5, 66], [3, 67]],
    ],
    swing: 0.045,
    melodyVoice: "triangle",
  },
];
