import { gridSize } from "./editor";
import defaultLevel from "./default-level";

type State = ReturnType<typeof create>;

const maxLavaParticles = 1000;
const lavaParticleSpawnHz = 20;
const lavaParticleLifetime = 500;
const fadeInTime = 100;

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
    },
  };
}

export function update(state: State, dt: number) {
  state.ephemeral.lavaParticles.spawnTimer += dt;

  // update lava particles
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

  // update particles
  for (const particle of state.ephemeral.lavaParticles.instances) {
    if (particle.lifetime > 0) {
      particle.lifetime -= dt;
      particle.x += (particle.dx * dt) / 1000;
      particle.y += (particle.dy * dt) / 1000;
    }
  }
}

export function draw(level: State, ctx: CanvasRenderingContext2D) {
  // draw tile shadows
  ctx.fillStyle = "#aaa";
  level.static.tiles.forEach((tile) => {
    ctx.save();
    ctx.translate(
      tile.x * gridSize - gridSize / 2 + 0.1,
      -tile.y * gridSize - gridSize / 2 + 0.1,
    );
    ctx.fillRect(0, 0, gridSize, gridSize);
    ctx.restore();
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
    }
    if (tile.type === "lava") {
      ctx.fillStyle = "red";
      ctx.save();
      ctx.translate(tile.x, -tile.y);
      ctx.fillRect(-gridSize / 2, -gridSize / 2, gridSize, gridSize);
      ctx.restore();
    }
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

export const Level = { create, update, draw };
