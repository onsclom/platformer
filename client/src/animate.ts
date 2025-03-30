export function animate(from: number, to: number, ratio: number) {
  return from * (1 - ratio) + ratio * to;
}
