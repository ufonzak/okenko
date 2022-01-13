export function delay(time: number) {
  return new Promise(r => setTimeout(r, time));
}

export function isCloseTo(value: number, expected: number, delta = 0.001) {
  return Math.abs(value - expected) < delta;
}

export function pn(n: number) {
  return n.toFixed(2);
}
