import { State } from "./index";

export function create() {
  return {
    width: 100 * 1.1,
    height: 100 * 1.1,
    x: 0,
    y: 3,
    shakeFactor: 1, // 0 to 1
    angle: 0, // fun juice
  };
}

export function update(state: State, dt: number) {
  // screen shake
  const shakeLength = 0.1;
  state.camera.shakeFactor *= (0.9 * shakeLength) ** (dt / 1000);

  if (state.player.alive === false) {
    state.player.timeDead += dt;
    // animate camera to player and zoom in
    state.camera.x = animate(state.camera.x, state.player.x, dt * 0.01);
    state.camera.y = animate(state.camera.y, state.player.y, dt * 0.01);
    state.camera.width = animate(state.camera.width, 50, dt * 0.01);
    state.camera.height = animate(state.camera.height, 50, dt * 0.01);

    const wobbleBuildUpTime = 1000;
    const wobbleFactor =
      (Math.min(wobbleBuildUpTime, state.player.timeDead) /
        wobbleBuildUpTime) **
      2;
    state.camera.angle =
      Math.sin(performance.now() * 0.005) * wobbleFactor * 0.1;
  }
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
