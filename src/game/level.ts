import { playSound } from "../audio";
import defaultLevel from "./default-level";
import { gridSize } from "./top-level-constants";

type State = ReturnType<typeof create>;

const maxLavaParticles = 1000;
const lavaParticleSpawnHz = 20;
const lavaParticleLifetime = 500;
const fadeInTime = 20;

const maxExplosionParticles = 1000;
const explosionParticleLifetime = 1000;

const maxCannonBalls = 1000;
const cannonSpawnHz = 0.5;

export const jumpTokenRadius = 0.2;
export const cannonBallRadius = (gridSize / 2) * 0.9;

export const timeToRespawnJumpToken = 1000;

export const timeSpentOnPhase = 1000;

export type Tile = {
  x: number;
  y: number;
} & (
  | { type: "solid" }
  | { type: "lava" }
  | {
      type: "cannon";
      dir: "up" | "down" | "left" | "right";
    }
  | { type: "jumpToken" }
  | { type: "intervalBlock"; start: "on" | "off" }
);

export function create() {
  return {
    ...(defaultLevel as { static: { tiles: Tile[] } }),
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
      explosionParticles: {
        instances: Array.from({ length: maxExplosionParticles }, () => ({
          lifetime: 0,
          x: 0,
          y: 0,
          dx: 0,
          dy: 0,
        })),
        nextParticle: 0,
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
      grabbedJumpTokens: new Map<string, { grabTime: number }>(),
      intervalBlocksOnLastTick: new Set<string>(),
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

  // update explosion particles
  for (const particle of state.ephemeral.explosionParticles.instances) {
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
    let foundCannon = false;
    for (const tile of state.static.tiles) {
      if (tile.type === "cannon") {
        foundCannon = true;
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
    if (foundCannon) {
      playSound("shoot");
    }
  }
  let shouldPlayExplodeSound = false;
  for (const ball of state.ephemeral.cannonBalls.instances) {
    if (ball.dx === 0 && ball.dy === 0) continue; // not active
    ball.x += (ball.dx * dt) / 1000;
    ball.y += (ball.dy * dt) / 1000;
    // check if colliding with solid tiles
    const solidTiles = state.static.tiles.filter(
      (tile) => tile.type === "solid",
    );
    for (const tile of solidTiles) {
      // we can treat cannonballs like a square and get same results
      const xDist = Math.abs(ball.x - tile.x);
      const yDist = Math.abs(ball.y - tile.y);
      if (
        xDist < gridSize / 2 + cannonBallRadius &&
        yDist < gridSize / 2 + cannonBallRadius
      ) {
        spawnCannonBallExplosion(state, ball.x, ball.y);
        ball.dx = 0;
        ball.dy = 0;
        shouldPlayExplodeSound = true;
      }
    }
  }
  if (shouldPlayExplodeSound) {
    playSound("cannonball-explosion");
  }

  // respawn jump tokens
  const now = performance.now();
  for (const [key, token] of state.ephemeral.grabbedJumpTokens.entries()) {
    if (now - token.grabTime > timeToRespawnJumpToken) {
      state.ephemeral.grabbedJumpTokens.delete(key);
    }
  }
}

export function draw(level: State, ctx: CanvasRenderingContext2D) {
  // draw tile shadows
  ctx.fillStyle = "#aaa";
  level.static.tiles.forEach((tile) => {
    if (tile.type === "cannon") {
      ctx.save();
      ctx.translate(tile.x + 0.1, -tile.y + 0.1);
      drawCannonShape(level, ctx, tile.dir);
      ctx.restore();
    } else if (tile.type === "jumpToken") {
    } else if (tile.type === "solid" || tile.type === "lava") {
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
      ctx.fillStyle = "white";
      ctx.save();
      ctx.translate(tile.x, -tile.y);
      drawCannonShape(level, ctx, tile.dir);

      ctx.fillStyle = "red";
      ctx.globalAlpha = 0.25;

      const nextBallProgress =
        (level.ephemeral.cannonBalls.spawnTimer / (1000 / cannonSpawnHz)) ** 2;
      ctx.scale(nextBallProgress, nextBallProgress); // scale to show the progress of the cannonball spawn
      ctx.beginPath();
      ctx.arc(0, 0, cannonBallRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (tile.type === "jumpToken") {
      // make sure it's not captured
      const tokenExists = !level.ephemeral.grabbedJumpTokens.get(
        `${tile.x},${tile.y}`,
      );

      ctx.save();
      if (!tokenExists) {
        ctx.globalAlpha = 0.5;
      }
      ctx.fillStyle = "yellow";
      ctx.translate(tile.x, -tile.y);
      ctx.beginPath();
      ctx.arc(0, 0, jumpTokenRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (tile.type === "intervalBlock") {
      const shouldBeOnBasedOnTime =
        Boolean(Math.floor(performance.now() / timeSpentOnPhase) % 2) ===
        (tile.start === "on");
      const wasOnLastFrame = level.ephemeral.intervalBlocksOnLastTick.has(
        `${tile.x},${tile.y}`,
      );
      const isOn = shouldBeOnBasedOnTime && wasOnLastFrame;
      ctx.save();
      if (!isOn) ctx.globalAlpha = 0.5;
      ctx.fillStyle = "green";
      ctx.translate(
        tile.x * gridSize - gridSize / 2,
        -tile.y * gridSize - gridSize / 2,
      );
      ctx.fillRect(0, 0, gridSize, gridSize);
      ctx.restore();
    }
  }

  // draw explosion particles
  ctx.fillStyle = "gray";
  const explosionParticleRadius = cannonBallRadius;
  for (const particle of level.ephemeral.explosionParticles.instances) {
    if (particle.lifetime > 0) {
      ctx.save();
      ctx.translate(particle.x, -particle.y);
      ctx.scale(
        (particle.lifetime * explosionParticleRadius) /
          explosionParticleLifetime,
        (particle.lifetime * explosionParticleRadius) /
          explosionParticleLifetime,
      );
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, Math.PI * 2);
      ctx.fill();
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
    ctx.arc(0, 0, cannonBallRadius, 0, Math.PI * 2);
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
  state: State,
  ctx: CanvasRenderingContext2D,
  dir: "up" | "down" | "left" | "right",
) {
  ctx.save();
  const rotation = ["up", "right", "down", "left"].indexOf(dir) * (Math.PI / 2);
  ctx.rotate(rotation);

  const nextBallProgress =
    (state.ephemeral.cannonBalls.spawnTimer / (1000 / cannonSpawnHz)) ** 2;
  const shakeFactor = Math.max(1 - nextBallProgress - 0.5, 0);
  ctx.rotate(Math.sin(performance.now() * 0.02) * shakeFactor * 0.4);

  ctx.beginPath();
  ctx.arc(0, 0, cannonBallRadius, 0, Math.PI * 2);
  ctx.fill();
  const tubeSize = 0.5;
  ctx.translate(0, -0.5 + tubeSize / 2);
  ctx.fillRect(-tubeSize / 2, -tubeSize / 2, tubeSize, tubeSize);
  ctx.restore();
}

const explosionAmount = 10;
function spawnCannonBallExplosion(level: State, x: number, y: number) {
  for (let i = 0; i < explosionAmount; i++) {
    const randAng = Math.random() * Math.PI * 2; // random angle for explosion
    const randSpeed = Math.random();
    level.ephemeral.explosionParticles.instances[
      level.ephemeral.explosionParticles.nextParticle
    ] = {
      lifetime: explosionParticleLifetime,
      x,
      y,
      dx: Math.cos(randAng) * randSpeed,
      dy: Math.sin(randAng) * randSpeed,
    };
    level.ephemeral.explosionParticles.nextParticle =
      (level.ephemeral.explosionParticles.nextParticle + 1) %
      maxExplosionParticles;
  }
}

export const Level = { create, update, draw };
