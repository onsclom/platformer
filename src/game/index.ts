import { justPressed, clearInputs } from "../input";
import Player from "./player";
import Tiles from "./tiles";
import Camera from "./camera";
import WobbleEffect from "./wobble-effect";

export type State = ReturnType<typeof create>;

export function create() {
  const state = {
    camera: Camera.create(),
    player: Player.create(),
    level: Tiles.create(),
    wobbleEffect: WobbleEffect.create(),
  };
  return state;
}

export function update(state: State, dt: number) {
  WobbleEffect.update(state, dt);
  Camera.update(state, dt);
  Player.update(state, dt);
  Camera.update(state, dt);

  clearInputs();
}

export function draw(state: State, ctx: CanvasRenderingContext2D) {
  const canvasRect = ctx.canvas.getBoundingClientRect();
  const aspectRatio = 1;
  const minSide = Math.min(canvasRect.width, canvasRect.height);

  const letterBoxed = {
    x: (canvasRect.width - minSide * aspectRatio) / 2,
    y: (canvasRect.height - minSide) / 2,
    width: minSide,
    height: minSide,
  };
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvasRect.width, canvasRect.height);

  // LETTERBOX SPACE
  //////////////////
  ctx.save();
  ctx.translate(letterBoxed.x, letterBoxed.y);

  ctx.globalAlpha = 1;
  {
    // camera space
    ctx.save();
    ctx.translate(minSide / 2, minSide / 2);
    ctx.scale(minSide / state.camera.width, minSide / state.camera.height);
    ctx.translate(-state.camera.x, state.camera.y);

    // CAMERA SHAKE
    //////////////////
    const strength = 0.5;
    const xShake =
      Math.cos(performance.now() * 0.05) * state.camera.shakeFactor * strength;
    const yShake =
      Math.sin(performance.now() * 0.0503) *
      state.camera.shakeFactor *
      strength;
    ctx.translate(xShake, yShake);

    // rotate from center
    ctx.translate(state.camera.x, -state.camera.y);
    ctx.rotate(state.camera.angle);
    ctx.translate(-state.camera.x, state.camera.y);

    Tiles.draw(state, ctx);
    Player.draw(state, ctx);
    ctx.restore();
  }

  // UI SPACE
  //////////////////

  ctx.restore();
}
