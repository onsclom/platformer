import { State } from "./index";
import { levelDimension } from "./tiles";

export function create() {
  return {
    changesPerSecond: 10,
    timeSinceLastChange: 0,
    corners: Array.from({
      length: (levelDimension + 1) ** 2,
    }).map(() => ({
      x: Math.random() - 0.5,
      y: Math.random() - 0.5,
    })),
  };
}

export function update(state: State, dt: number) {
  // random wobble effect on tiles
  state.wobbleEffect.timeSinceLastChange += dt;
  const timePerChange = 1000 / state.wobbleEffect.changesPerSecond;
  if (state.wobbleEffect.timeSinceLastChange > timePerChange) {
    state.wobbleEffect.timeSinceLastChange -= timePerChange;
    state.wobbleEffect.corners.forEach((corner) => {
      corner.x = Math.random() - 0.5;
      corner.y = Math.random() - 0.5;
    });
  }
}

export function draw(state: State, ctx: CanvasRenderingContext2D) {}

export default { create, update, draw };
