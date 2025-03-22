import { State } from "./index";
import { levelDimension } from "./tiles";

export function create() {
  return {
    width: levelDimension * 5,
    height: levelDimension * 5,
    x: 0,
    y: 0,
    shakeFactor: 1, // 0 to 1
    angle: 0, // fun juice
  };
}

export function update(state: State, dt: number) {
  // screen shake
  const shakeLength = 0.1;
  state.camera.shakeFactor *= (0.9 * shakeLength) ** (dt / 1000);

  state.camera.x = state.player.x;
  state.camera.y = state.player.y;
}

export function draw(state: State, ctx: CanvasRenderingContext2D) {}

export default { create, update, draw };

// we already scale and letterbox, so this just needs to do the translation
export function gamePosToCanvasPos(x: number, y: number) {
  return {
    x: x,
    y: -y,
  };
}

export function animate(from: number, to: number, ratio: number) {
  return from * (1 - ratio) + ratio * to;
}
