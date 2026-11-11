import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clamp,
  smooth,
  ease,
  computeWordLayout,
  evaluateTimeline,
} from './math';

test('clamp clamps value within boundaries', () => {
  assert.equal(clamp(-5, 0, 1), 0);
  assert.equal(clamp(0.5, 0, 1), 0.5);
  assert.equal(clamp(1.5, 0, 1), 1);
});

test('smooth produces smooth Hermite interpolation between 0 and 1', () => {
  assert.equal(smooth(0, 1, 0), 0);
  assert.equal(smooth(0, 1, 1), 1);
  assert.equal(smooth(0, 1, 0.5), 0.5);
  assert.equal(smooth(0.2, 0.8, 0.1), 0);
  assert.equal(smooth(0.2, 0.8, 0.9), 1);
});

test('ease produces quintic ease curve with dwell at bounds', () => {
  assert.equal(ease(0), 0);
  assert.equal(ease(1), 1);
  // Midpoint is 0.5
  assert.equal(ease(0.5), 0.5);
  // Derivative is flat near 0 and 1
  assert.ok(ease(0.1) < 0.1);
  assert.ok(ease(0.9) > 0.9);
});

test('computeWordLayout calculates width, center, and texture bounds', () => {
  const words = ['DRIFTLAB', 'DESIGN TO', 'DELIGHT', 'INSPIRE', 'AND ENGAGE'];
  // mock measureTextWidth
  const layout = computeWordLayout(words, (w) => w.length * 20);
  assert.equal(layout.length, 5);
  assert.ok(layout[0].len > 0);
  assert.ok(layout[0].c > 0);
  assert.equal(layout[0].top, 0);
  assert.equal(layout[0].bot, 0.2);
  assert.equal(layout[4].bot, 1.0);
  // Centers must strictly increase
  for (let i = 1; i < layout.length; i++) {
    assert.ok(layout[i].c > layout[i - 1].c);
  }
});

test('evaluateTimeline computes key timeline phase opacities and values', () => {
  const words = ['DRIFTLAB', 'DESIGN TO', 'DELIGHT', 'INSPIRE', 'AND ENGAGE'];
  const layout = computeWordLayout(words, () => 200);

  // At s = 0: first word, caption 1 visible, caption 2 and panels hidden
  const t0 = evaluateTimeline(0, layout);
  assert.equal(t0.k, 0);
  assert.equal(t0.caption1Opacity, 1);
  assert.equal(t0.caption2Opacity, 0);
  assert.equal(t0.panel1Opacity, 0);
  assert.equal(t0.panel2Opacity, 0);
  assert.equal(t0.sink, 0);
  assert.equal(t0.grow, 0);

  // At s = 0.10: caption 1 faded out, caption 2 faded in
  const t1 = evaluateTimeline(0.1, layout);
  assert.equal(t1.caption1Opacity, 0);
  assert.ok(t1.caption2Opacity > 0.5);

  // At s = 0.75: left panel visible (0.72-0.77 in)
  const t2 = evaluateTimeline(0.75, layout);
  assert.ok(t2.panel1Opacity > 0.3);
  assert.equal(t2.panel2Opacity, 0);

  // At s = 0.95: right panel visible (0.90-0.95 in)
  const t3 = evaluateTimeline(0.95, layout);
  assert.equal(t3.panel1Opacity, 0);
  assert.ok(t3.panel2Opacity > 0.9);
});
