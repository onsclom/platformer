import { gridSize } from "../scenes/editor";

type State = ReturnType<typeof create>;

const maxLavaParticles = 1000;
const lavaParticleSpawnHz = 20; // 10 per each lava block
const lavaParticleLifetime = 500; // 1 second
const fadeInTime = 100;

export function create() {
  return {
    solidTiles: [
      { x: 0, y: 0 },
      { x: 2, y: 1 },
    ],
    lavaTiles: [{ x: 1, y: 0 }],

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
  };
}

export function update(state: State, dt: number) {
  // update lava particles
  state.lavaParticles.spawnTimer += dt;

  while (state.lavaParticles.spawnTimer > 1000 / lavaParticleSpawnHz) {
    state.lavaParticles.spawnTimer -= 1000 / lavaParticleSpawnHz;

    for (const tile of state.lavaTiles) {
      const particle =
        state.lavaParticles.instances[state.lavaParticles.nextParticle]!;

      particle.lifetime = lavaParticleLifetime;
      particle.x = tile.x - gridSize / 2 + Math.random() * gridSize;
      particle.y = tile.y - gridSize / 2 + Math.random() * gridSize;

      particle.dx = Math.random() * 0.1;
      particle.dy = 1 + Math.random() * 0.1;

      state.lavaParticles.nextParticle =
        (state.lavaParticles.nextParticle + 1) % maxLavaParticles;
    }
  }

  // update particles
  for (const particle of state.lavaParticles.instances) {
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
  level.solidTiles.forEach((tile) => {
    ctx.save();
    ctx.translate(
      tile.x * gridSize - gridSize / 2 + 0.1,
      -tile.y * gridSize - gridSize / 2 + 0.1,
    );
    ctx.fillRect(0, 0, gridSize, gridSize);
    ctx.restore();
  });
  level.lavaTiles.forEach((tile) => {
    ctx.save();
    ctx.translate(tile.x, -tile.y);
    ctx.fillRect(-gridSize / 2 + 0.1, -gridSize / 2 + 0.1, gridSize, gridSize);
    ctx.restore();
  });

  // draw top
  ctx.fillStyle = "white";
  level.solidTiles.forEach((tile) => {
    ctx.save();
    ctx.translate(
      tile.x * gridSize - gridSize / 2,
      -tile.y * gridSize - gridSize / 2,
    );
    ctx.fillRect(0, 0, gridSize, gridSize);
    ctx.restore();
  });
  ctx.fillStyle = "red";
  level.lavaTiles.forEach((tile) => {
    ctx.save();
    ctx.translate(tile.x, -tile.y);
    ctx.fillRect(-gridSize / 2, -gridSize / 2, gridSize, gridSize);
    ctx.restore();
  });

  // draw lava particles
  ctx.fillStyle = "orange";
  for (const particle of level.lavaParticles.instances) {
    if (particle.lifetime > 0) {
      ctx.save();
      ctx.translate(particle.x, -particle.y);
      ctx.scale(
        (particle.lifetime * 0.2) / lavaParticleLifetime,
        (particle.lifetime * 0.2) / lavaParticleLifetime,
      );

      const timeAlive = lavaParticleLifetime - particle.lifetime;
      ctx.globalAlpha = timeAlive / fadeInTime;

      // ctx.fillRect(-gridSize / 2, -gridSize / 2, gridSize, gridSize);a
      ctx.beginPath();
      ctx.arc(0, 0, gridSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

export const Level = { create, update, draw };
