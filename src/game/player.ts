import { animate } from "../animate";
import { State as CameraState } from "./camera";

export const playerColor = "hsl(55, 100%, 85%)";
export const initJumpBufferTime = 1000;

type State = ReturnType<typeof create>;

export const playerWidth = 0.8;
export const playerHeight = 0.8;

const maxPlayerParticles = 1000;

export const playerParticleSpawnRateWhileWalking = 30;
const playerParticleLifetime = 500;
const fadeInTime = 50;

function create() {
  return {
    alive: true,

    x: 0,
    y: 0,

    xScale: 1,
    yScale: 1,

    dy: 0,
    timeSinceGrounded: 0,
    timeSinceJumpBuffered: initJumpBufferTime,
    hasExtraJump: false,
    canHalveJump: false,

    particles: {
      instances: Array.from({ length: maxPlayerParticles }, () => ({
        lifetime: 0,
        x: 0,
        y: 0,
        dx: 0,
        dy: 0,
      })),
      nextParticle: 0,
      spawnTimer: 0,
    },
  };
}

function update(state: State, dt: number) {
  state.xScale = animate(state.xScale, 1, dt * 0.01);
  state.yScale = animate(state.yScale, 1, dt * 0.01);

  // update particles
  for (const particle of state.particles.instances) {
    if (particle.lifetime > 0) {
      particle.lifetime -= dt;
      particle.x += (particle.dx * dt) / 1000;
      particle.y += (particle.dy * dt) / 1000;
    }
  }
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
    const oscillateStrength = Math.abs(camera.angle) * 2.5;
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
    ctx.restore();
  }

  ctx.fillStyle = "#bbb";
  for (const particle of state.particles.instances) {
    if (particle.lifetime > 0) {
      ctx.save();
      ctx.translate(particle.x, -particle.y);
      ctx.scale(
        (particle.lifetime * 0.2) / playerParticleLifetime,
        (particle.lifetime * 0.2) / playerParticleLifetime,
      );

      const timeAlive = playerParticleLifetime - particle.lifetime;
      ctx.globalAlpha = (timeAlive / fadeInTime) ** 2;

      ctx.beginPath();
      ctx.arc(0, 0, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

function spawnParticle(player: State, agitationFactor: number = 1) {
  const particle = player.particles.instances[player.particles.nextParticle]!;

  particle.lifetime = playerParticleLifetime;

  particle.x = player.x + (Math.random() - 0.5) * playerWidth;
  particle.y =
    player.y - playerHeight * 0.5 + (Math.random() - 0.5) * playerHeight * 0.25;

  particle.dx = (Math.random() - 0.5) * agitationFactor;
  particle.dy = (Math.random() - 0.5) * agitationFactor;
  player.particles.nextParticle =
    (player.particles.nextParticle + 1) % maxPlayerParticles;
}

export const Player = { create, update, draw, spawnParticle };
