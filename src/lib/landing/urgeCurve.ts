// The "urge is loud, then it fades" curve on the landing page. It is an
// illustration of the finding (a wait of about a day lowered both the urge to
// buy and the intent to buy), not plotted data, and the page says so. The
// shape: a sharp rise, then a slow exponential fade over 25 hours.

export const CURVE_WIDTH = 1000;
export const CURVE_HEIGHT = 300;
const BASELINE = 280;
const PEAK_HEIGHT = 256;
const PEAK_AT = 0.06;
const DECAY = 4.2;
const STEPS = 100;

// Urge at time t (0 = the moment of wanting it, 1 = 25 hours later), 0..1.
export function urgeAt(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return clamped < PEAK_AT ? clamped / PEAK_AT : Math.exp(-(clamped - PEAK_AT) * DECAY);
}

export function curvePoint(t: number): { x: number; y: number } {
  return { x: t * CURVE_WIDTH, y: BASELINE - urgeAt(t) * PEAK_HEIGHT };
}

export function curvePath(): string {
  const points: string[] = [];
  for (let i = 0; i <= STEPS; i += 1) {
    const { x, y } = curvePoint(i / STEPS);
    points.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return points.join(" ");
}

export const CURVE_BASELINE = BASELINE;

// The hour labels under the chart. `at` is the fraction of the way along the
// curve at which each one lights up while it draws.
export const URGE_MARKS = [
  { at: 0, hour: "Hour 0", thought: "I need this." },
  { at: 0.24, hour: "Hour 6", thought: "Do I, though?" },
  { at: 0.6, hour: "Hour 15", thought: "Maybe not." },
  { at: 0.999, hour: "Hour 25", thought: "Eh." },
] as const;

// How many marks are lit when the curve is `progress` (0..1) drawn.
export function litMarks(progress: number): number {
  return URGE_MARKS.filter((mark) => progress >= mark.at).length;
}
