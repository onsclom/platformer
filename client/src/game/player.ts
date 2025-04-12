import { animate } from "../animate";
import { State as CameraState } from "./camera";
import { lineWidth } from "./level";
import { createParticle } from "./particles";

export const playerColor = "hsl(55, 100%, 85%)";
export const jumpBufferTime = 150;

type State = ReturnType<typeof create>;

export const playerWidth = 0.8;
export const playerHeight = 1.2;

export const playerParticleSpawnRateWhileWalking = 15;
const playerParticleLifetime = 500;

function create() {
  return {
    alive: true,
    timeSinceDead: 0,

    x: 0,
    y: 0,

    xScale: 1,
    yScale: 1,

    xMomentum: 0,

    dy: 0,
    timeSinceGrounded: 0,

    timeSinceTouchedWall: 0,
    wallJumpDir: 0,

    timeSinceJumpBuffered: jumpBufferTime,
    hasExtraJump: false,
    canHalveJump: false,

    particles: {
      spawnTimer: 0,
    },
  };
}

function update(state: State, dt: number) {
  state.xScale = animate(state.xScale, 1, dt * 0.01);
  state.yScale = animate(state.yScale, 1, dt * 0.01);
}

// draw happens inside camera
function draw(
  state: State,
  ctx: CanvasRenderingContext2D,
  camera: CameraState,
) {
  {
    ctx.save();
    ctx.translate(state.x, -state.y);
    const oscillateStrength = Math.abs(camera.angle) * 1;
    const oscRate = 0.02;
    if (state.timeSinceGrounded === 0) {
      ctx.translate(
        0,
        oscillateStrength * -Math.abs(Math.sin(performance.now() * 0.015) * 3),
      );
    }
    ctx.rotate(
      camera.angle * 8 +
        Math.sin(performance.now() * oscRate) * oscillateStrength,
    );

    ctx.scale(state.xScale, state.yScale);
    ctx.fillStyle = state.alive ? playerColor : "gray";
    ctx.fillRect(
      -playerWidth / 2,
      -playerHeight / 2,
      playerWidth,
      playerHeight,
    );

    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = "black";
    ctx.strokeRect(
      -playerWidth / 2,
      -playerHeight / 2,
      playerWidth,
      playerHeight,
    );

    ctx.restore();
  }
}

function spawnParticle(player: State, agitationFactor = 0.5, onSide?: number) {
  const lifetime = playerParticleLifetime;

  let x = 0;
  let y = 0;
  if (onSide === undefined) {
    x = player.x + (Math.random() - 0.5) * playerWidth;
    y =
      player.y -
      playerHeight * 0.5 +
      (Math.random() - 0.5) * playerHeight * 0.25;
  } else {
    x =
      player.x +
      onSide * playerWidth * 0.5 +
      (Math.random() - 0.5) * playerHeight * 0.25;
    y = player.y - playerHeight * 0.5 + (Math.random() - 0.5) * playerHeight;
  }

  createParticle({
    lifetime,
    totalTime: playerParticleLifetime,
    x,
    y,
    active: true,
    color: [1, 0, 0],
    type: "shrink",
    radius: 0.4,
    dx: (Math.random() - 0.5) * agitationFactor * 0.001,
    dy: (Math.random() - 0.5) * agitationFactor * 0.001,
  });
}

export const Player = { create, update, draw, spawnParticle };
