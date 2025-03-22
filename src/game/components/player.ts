import { animate } from "../../animate";

export const initJumpBufferTime = 150;

type State = ReturnType<typeof create>;

export const playerWidth = 0.8;
export const playerHeight = 0.8;

function create() {
  return {
    x: 0,
    y: 0,

    xScale: 1,
    yScale: 1,

    dy: 0,
    timeSinceGrounded: 0,
  };
}

function update(state: State, dt: number) {
  state.xScale = animate(state.xScale, 1, dt * 0.01);
  state.yScale = animate(state.yScale, 1, dt * 0.01);

  // moveAndSlidePlayer(state, dt);
}

import { State as CameraState } from "../components/camera";

// can assume this happens inside camera
function draw(
  state: State,
  ctx: CanvasRenderingContext2D,
  camera: CameraState,
) {
  {
    ctx.fillStyle = "green";

    ctx.translate(state.x, -state.y);

    const oscillateStrength = Math.abs(camera.angle) * 2;
    console.log(oscillateStrength);
    const oscRate = 0.01;
    ctx.rotate(
      camera.angle * 4 +
        Math.sin(performance.now() * oscRate) * oscillateStrength,
    );

    ctx.scale(state.xScale, state.yScale);
    ctx.fillRect(
      -playerWidth / 2,
      -playerHeight / 2,
      playerWidth,
      playerHeight,
    );
  }
}

export const Player = { create, update, draw };
