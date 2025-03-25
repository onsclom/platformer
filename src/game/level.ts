import { gridSize } from "./editor";

type State = ReturnType<typeof create>;

const maxLavaParticles = 1000;
const lavaParticleSpawnHz = 20;
const lavaParticleLifetime = 500;
const fadeInTime = 20;

const maxCannonBalls = 1000;
const cannonSpawnHz = 0.5;

export type Tile = {
  x: number;
  y: number;
} & (
  | {
      type: "solid";
    }
  | {
      type: "lava";
    }
  | {
      type: "cannon";
      dir: "up" | "down" | "left" | "right";
    }
  | {
      type: "jumpToken";
    }
);

export function create() {
  return {
    // saved data for a level
    static: {
      tiles: [] as Tile[],
    },
    // stuff that doesn't need to be saved
    ephemeral: {
      lavaParticles: {
        instances: Array.from({ length: maxLavaParticles }, () => ({
          lifetime: 0,
          x: 0,
          y: 0,
          dx: 0,
          dy: 0,
        })),
        nextParticle: 0,
        spawnTimer: 0,
      },
      cannonBalls: {
        instances: Array.from({ length: maxCannonBalls }, () => ({
          x: 0,
          y: 0,
          dx: 0,
          dy: 0,
        })),
        nextBall: 0,
        spawnTimer: 0,
      },
    },
  };
}

export function update(state: State, dt: number) {
  // update lava particles
  state.ephemeral.lavaParticles.spawnTimer += dt;
  const lavaTiles = state.static.tiles.filter((tile) => tile.type === "lava");
  while (
    state.ephemeral.lavaParticles.spawnTimer >
    1000 / lavaParticleSpawnHz
  ) {
    state.ephemeral.lavaParticles.spawnTimer -= 1000 / lavaParticleSpawnHz;
    for (const tile of lavaTiles) {
      const particle =
        state.ephemeral.lavaParticles.instances[
          state.ephemeral.lavaParticles.nextParticle
        ]!;

      particle.lifetime = lavaParticleLifetime;
      particle.x = tile.x - gridSize / 2 + Math.random() * gridSize;
      particle.y = tile.y - gridSize / 2 + Math.random() * gridSize;

      particle.dx = Math.random() * 0.1;
      particle.dy = 1 + Math.random() * 0.1;

      state.ephemeral.lavaParticles.nextParticle =
        (state.ephemeral.lavaParticles.nextParticle + 1) % maxLavaParticles;
    }
  }
  for (const particle of state.ephemeral.lavaParticles.instances) {
    if (particle.lifetime > 0) {
      particle.lifetime -= dt;
      particle.x += (particle.dx * dt) / 1000;
      particle.y += (particle.dy * dt) / 1000;
    }
  }

  // update cannon balls
  state.ephemeral.cannonBalls.spawnTimer += dt;
  while (state.ephemeral.cannonBalls.spawnTimer > 1000 / cannonSpawnHz) {
    state.ephemeral.cannonBalls.spawnTimer -= 1000 / cannonSpawnHz;
    for (const tile of state.static.tiles) {
      if (tile.type === "cannon") {
        const ball =
          state.ephemeral.cannonBalls.instances[
            state.ephemeral.cannonBalls.nextBall
          ]!;
        ball.x = tile.x;
        ball.y = tile.y;
        ball.dx = 0;
        ball.dy = 0;
        const cannonBallSpeed = 8;
        switch (tile.dir) {
          case "up":
            ball.dy = cannonBallSpeed;
            break;
          case "down":
            ball.dy = -cannonBallSpeed;
            break;
          case "left":
            ball.dx = -cannonBallSpeed;
            break;
          case "right":
            ball.dx = cannonBallSpeed;
            break;
        }
        state.ephemeral.cannonBalls.nextBall =
          (state.ephemeral.cannonBalls.nextBall + 1) % maxCannonBalls;
      }
    }
  }
  for (const ball of state.ephemeral.cannonBalls.instances) {
    ball.x += (ball.dx * dt) / 1000;
    ball.y += (ball.dy * dt) / 1000;
  }
}

export function draw(level: State, ctx: CanvasRenderingContext2D) {
  // draw tile shadows
  ctx.fillStyle = "#aaa";
  level.static.tiles.forEach((tile) => {
    if (tile.type === "cannon") {
      ctx.save();
      ctx.translate(tile.x + 0.1, -tile.y + 0.1);
      drawCannonShape(ctx, tile.dir);
      ctx.restore();
    } else {
      ctx.save();
      ctx.translate(
        tile.x * gridSize - gridSize / 2 + 0.1,
        -tile.y * gridSize - gridSize / 2 + 0.1,
      );
      ctx.fillRect(0, 0, gridSize, gridSize);
      ctx.restore();
    }
  });

  for (const tile of level.static.tiles) {
    if (tile.type === "solid") {
      ctx.fillStyle = "white";
      ctx.save();
      ctx.translate(
        tile.x * gridSize - gridSize / 2,
        -tile.y * gridSize - gridSize / 2,
      );
      ctx.fillRect(0, 0, gridSize, gridSize);
      ctx.restore();
    } else if (tile.type === "lava") {
      ctx.fillStyle = "red";
      ctx.save();
      ctx.translate(tile.x, -tile.y);
      ctx.fillRect(-gridSize / 2, -gridSize / 2, gridSize, gridSize);
      ctx.restore();
    } else if (tile.type === "cannon") {
      ctx.fillStyle = "purple";
      ctx.save();
      ctx.translate(tile.x, -tile.y);
      drawCannonShape(ctx, tile.dir);
      ctx.restore();
    }
  }

  // draw cannon balls
  ctx.fillStyle = "red";
  for (const ball of level.ephemeral.cannonBalls.instances) {
    if (ball.dx === 0 && ball.dy === 0) continue; // not active
    ctx.save();
    ctx.translate(ball.x, -ball.y);
    ctx.beginPath();
    const rad = (gridSize / 2) * 0.9;
    ctx.arc(0, 0, rad, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // draw lava particles
  ctx.fillStyle = "orange";
  for (const particle of level.ephemeral.lavaParticles.instances) {
    if (particle.lifetime > 0) {
      ctx.save();
      ctx.translate(particle.x, -particle.y);
      ctx.scale(
        (particle.lifetime * 0.2) / lavaParticleLifetime,
        (particle.lifetime * 0.2) / lavaParticleLifetime,
      );
      const timeAlive = lavaParticleLifetime - particle.lifetime;
      ctx.globalAlpha = timeAlive / fadeInTime;
      ctx.beginPath();
      ctx.arc(0, 0, gridSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

function drawCannonShape(
  ctx: CanvasRenderingContext2D,
  dir: "up" | "down" | "left" | "right",
) {
  ctx.save();
  const rad = (gridSize / 2) * 0.9;
  const rotation = ["up", "right", "down", "left"].indexOf(dir) * (Math.PI / 2);
  ctx.rotate(rotation);
  ctx.beginPath();
  ctx.arc(0, 0, rad, 0, Math.PI * 2);
  ctx.fill();
  const tubeSize = 0.5;
  ctx.translate(0, -0.5 + tubeSize / 2);
  ctx.fillRect(-tubeSize / 2, -tubeSize / 2, tubeSize, tubeSize);
  ctx.restore();
}

export const Level = { create, update, draw };
