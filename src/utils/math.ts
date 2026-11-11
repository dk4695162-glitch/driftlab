/**
 * Driftlab mathematical helpers and timeline easing functions
 */

export const clamp = (x: number, a = 0, b = 1): number =>
  Math.min(b, Math.max(a, x));

export const smooth = (a: number, b: number, x: number): number => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export const ease = (x: number): number =>
  x * x * x * (x * (6 * x - 15) + 10);

export interface WordLayoutItem {
  len: number;
  c: number;
  u: number;
  top: number;
  bot: number;
}

export function computeWordLayout(
  words: readonly string[],
  measureTextWidth: (word: string) => number,
  em = 440,
  atlasWidth = 4096,
  gap = 3.4
): WordLayoutItem[] {
  let c = 0;
  const layout: WordLayoutItem[] = [];
  const n = words.length;

  for (let i = 0; i < n; i++) {
    const w = words[i];
    const m = measureTextWidth(w) + 16;
    const uW = (m / em) * 0.86;
    layout.push({
      len: uW,
      c: c + uW / 2,
      u: m / atlasWidth,
      top: i / n,
      bot: (i + 1) / n,
    });
    c += uW + gap;
  }

  return layout;
}

export interface TimelineState {
  k: number;
  wordIndex: number;
  wordFraction: number;
  head: number;
  sink: number;
  grow: number;
  side: number;
  caption1Opacity: number;
  caption2Opacity: number;
  goggleOpacity: number;
  panel1Opacity: number;
  panel2Opacity: number;
}

export function evaluateTimeline(
  s: number,
  layout: WordLayoutItem[],
  step = 0.14
): TimelineState {
  const n = layout.length;
  const span = step * (n - 1);
  const k = clamp(s / span) * (n - 1);
  const i = Math.min(n - 2, Math.floor(k));
  const f = k - i;

  const c0 = layout[i]?.c ?? 0;
  const c1 = layout[i + 1]?.c ?? c0;
  const head = c0 + (c1 - c0) * ease(f);

  const sink = ease(smooth(span + 0.015, span + 0.105, s)) * 6;
  const grow = ease(smooth(span + 0.08, span + 0.22, s));
  const side = smooth(0.76, 0.82, s) - 2 * smooth(0.88, 0.94, s);

  const op = (a: number, b: number, c: number, d: number) =>
    smooth(a, b, s) * (1 - smooth(c, d, s));

  const c1Op = 1 - smooth(0.04, 0.08, s);
  const c2Op = op(0.08, 0.12, 0.56, 0.62);
  const p1Op = op(0.72, 0.77, 0.84, 0.88);
  const p2Op = op(0.9, 0.95, 1.1, 1.2);

  return {
    k,
    wordIndex: i,
    wordFraction: f,
    head,
    sink,
    grow,
    side,
    caption1Opacity: c1Op,
    caption2Opacity: c2Op,
    goggleOpacity: Math.max(c1Op, c2Op),
    panel1Opacity: p1Op,
    panel2Opacity: p2Op,
  };
}
