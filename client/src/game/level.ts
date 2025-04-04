import { assert } from "../assert";
import { playSound } from "../audio";
import defaultLevel from "./saved-levels/default";
import { gridSize } from "./top-level-constants";
import { createNoise3D } from "simplex-noise";
const noise3D = createNoise3D();

type State = ReturnType<typeof create>;

const maxLavaParticles = 1000;
const lavaParticleSpawnHz = 20;
const lavaParticleLifetime = 500;
const fadeInTime = 20;

const maxExplosionParticles = 1000;
const explosionParticleLifetime = 1000;

const maxCannonBalls = 500;
const cannonSpawnHz = 0.5;

export const lineWidth = 0.1;

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
  | { type: "trampoline" }
  | { type: "intervalBlock"; start: "on" | "off" }
);

function createEphemeral() {
  return {
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
    trampolinesTouched: new Map<string, number>(),
    intervalBlocksOnLastTick: new Set<string>(),

    background: {
      tiles: [] as { x: number; y: number }[],
    },
  };
}

function create() {
  return {
    // static: { tiles: [] as Tile[] },
    static: defaultLevel.static as { tiles: Tile[] },

    // stuff that doesn't need to be saved
    ephemeral: createEphemeral(),
  };
}

const spawn = {
  x: 0,
  y: 0,
};
const backgroundLimit = 10000;

export function update(state: State, dt: number) {
  if (state.ephemeral.background.tiles.length === 0) {
    const background = new Set<string>(); // ${x},${y}
    const tiles = new Map(
      state.static.tiles.map((tile) => [`${tile.x},${tile.y}`, tile]),
    );
    const queue = [spawn];
    while (queue.length > 0 && background.size < backgroundLimit) {
      const cur = queue.shift()!;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const x = cur.x + dx;
        const y = cur.y + dy;
        const tileString = `${x},${y}`;
        const tile = tiles.get(tileString);
        if (background.has(tileString)) continue; // already added
        if (!tile || tile.type !== "solid") {
          // add to background
          background.add(tileString);
          // add to queue
          queue.push({ x, y });
        }
      }
    }
    state.ephemeral.background.tiles = [...background.keys()].map(
      (tileString) => {
        const [x, y] = tileString.split(",").map(Number);
        assert(x !== undefined && y !== undefined);
        return { x, y };
      },
    );
    console.log("background tiles", background.size);
  }

  // update lava particles
  state.ephemeral.lavaParticles.spawnTimer += dt;
  while (
    state.ephemeral.lavaParticles.spawnTimer >
    1000 / lavaParticleSpawnHz
  ) {
    state.ephemeral.lavaParticles.spawnTimer -= 1000 / lavaParticleSpawnHz;
    for (const tile of state.static.tiles) {
      if (tile.type !== "lava") continue;
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
  // check if colliding with solid tiles
  const solidTiles = state.static.tiles.filter((tile) => tile.type === "solid");
  for (const ball of state.ephemeral.cannonBalls.instances) {
    if (ball.dx === 0 && ball.dy === 0) continue; // not active
    ball.x += (ball.dx * dt) / 1000;
    ball.y += (ball.dy * dt) / 1000;
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
}

export function draw(level: State, ctx: CanvasRenderingContext2D) {
  // draw level background
  ctx.fillStyle = "#ccc";
  for (const tile of level.ephemeral.background.tiles) {
    ctx.save();
    ctx.translate(tile.x * gridSize, -tile.y * gridSize);
    drawStaticTile(ctx);
    ctx.restore();
  }

  const intervalAOn = Boolean(
    Math.floor(performance.now() / timeSpentOnPhase) % 2,
  );
  for (const tile of level.static.tiles) {
    ctx.save();
    ctx.translate(tile.x * gridSize, -tile.y * gridSize);
    if (tile.type === "solid") {
      ctx.fillStyle = "white";
      drawStaticTile(ctx);
    } else if (tile.type === "lava") {
      ctx.fillStyle = "#f33";
      drawStaticTile(ctx);
    } else if (tile.type === "cannon") {
      ctx.fillStyle = "white";
      drawCannon(level, ctx, tile.dir);

      ctx.save();
      ctx.fillStyle = "#f33";
      ctx.globalAlpha = 0.25;
      const nextBallProgress =
        (level.ephemeral.cannonBalls.spawnTimer / (1000 / cannonSpawnHz)) ** 2;
      ctx.scale(nextBallProgress, nextBallProgress); // scale to show the progress of the cannonball spawn
      ctx.beginPath();
      ctx.arc(0, 0, cannonBallRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (tile.type === "trampoline") {
      ctx.save();

      const scaleAnimationTime = 350;
      const timeSinceLastTouched =
        level.ephemeral.trampolinesTouched.get(`${tile.x},${tile.y}`) ?? 0;

      const animationProgress =
        Math.min(
          1,
          (performance.now() - timeSinceLastTouched) / scaleAnimationTime,
        ) ** 2;
      ctx.save();
      // ctx.scale(0.5, 0.5);
      ctx.lineWidth = 0.1;
      ctx.beginPath();

      ctx.strokeStyle = "";
      const touchScaleAmt = 0.4 * (1 + (1 - animationProgress)) + 0.4;
      ctx.translate(
        0,
        Math.sin(performance.now() * 0.01 + tile.x + tile.y) * 0.05,
      );
      const scaleAmt = 0.5 * touchScaleAmt;
      ctx.moveTo(-gridSize * 0.5 * scaleAmt, gridSize * 0.5 * scaleAmt);
      ctx.lineTo(0, -gridSize * 0.5 * scaleAmt);
      ctx.lineTo(gridSize * 0.5 * scaleAmt, gridSize * 0.5 * scaleAmt);
      ctx.stroke();
      ctx.restore();

      ctx.restore();
    } else if (tile.type === "intervalBlock") {
      const shouldBeOnBasedOnTime = intervalAOn === (tile.start === "on");
      const wasOnLastFrame = level.ephemeral.intervalBlocksOnLastTick.has(
        `${tile.x},${tile.y}`,
      );
      const isOn = shouldBeOnBasedOnTime && wasOnLastFrame;
      if (!isOn) ctx.globalAlpha = 0.25;
      ctx.fillStyle = "#f3f";
      drawStaticTile(ctx);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  ctx.strokeStyle = "black";
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  const tiles = new Map(
    level.static.tiles.map((tile) => [`${tile.x},${tile.y}`, tile]),
  );
  for (const tile of level.static.tiles) {
    ctx.save();
    ctx.translate(tile.x * gridSize, -tile.y * gridSize);
    if (tile.type === "cannon") {
      // strokeCannonShape(level, ctx, tile.dir);
    } else if (tile.type === "lava") {
      drawWigglyTileBorders(ctx, tile, tiles);
    } else {
      drawWigglyTileBorders(ctx, tile, tiles);
    }
    ctx.restore();
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
  ctx.fillStyle = "#f33";
  ctx.strokeStyle = "black";
  ctx.lineWidth = lineWidth;
  for (const ball of level.ephemeral.cannonBalls.instances) {
    if (ball.dx === 0 && ball.dy === 0) continue; // not active
    ctx.save();
    ctx.translate(ball.x, -ball.y);
    ctx.beginPath();
    ctx.arc(0, 0, cannonBallRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
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

const amt = 0.04;
const spd = 0.005;

function drawWigglyTile(
  ctx: CanvasRenderingContext2D,
  tile: { x: number; y: number },
  // player: { x: number; y: number },
) {
  // const distToPlayer = Math.hypot(tile.x - player.x / 2, tile.y - player.y / 2);
  // const amt = Math.max(0, 1 - distToPlayer / 10.0);

  ctx.beginPath();
  const p1x = noise3D(tile.x, tile.y, performance.now() * spd) * amt;
  const p2x = noise3D(tile.x + 1, tile.y, performance.now() * spd) * amt;
  const p3x = noise3D(tile.x + 1, tile.y - 1, performance.now() * spd) * amt;
  const p4x = noise3D(tile.x, tile.y - 1, performance.now() * spd) * amt;

  const p1y = noise3D(tile.x, tile.y, performance.now() * spd) * amt;
  const p2y = noise3D(tile.x + 1, tile.y, performance.now() * spd) * amt;
  const p3y = noise3D(tile.x + 1, tile.y - 1, performance.now() * spd) * amt;
  const p4y = noise3D(tile.x, tile.y - 1, performance.now() * spd) * amt;

  ctx.save();

  const size = 0.99;
  ctx.scale(size, size);
  ctx.moveTo(-gridSize * 0.5 + p1x, -gridSize * 0.5 + p1y); // top-left
  ctx.lineTo(gridSize * 0.5 + p2x, -gridSize * 0.5 + p2y); // top-right
  ctx.lineTo(gridSize * 0.5 + p3x, gridSize * 0.5 + p3y); // bottom-right
  ctx.lineTo(-gridSize * 0.5 + p4x, gridSize * 0.5 + p4y); // bottom-left
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawStaticTile(ctx: CanvasRenderingContext2D) {
  const size = 1.01;
  ctx.save();
  ctx.scale(size, size);
  ctx.fillRect(-gridSize / 2, -gridSize / 2, gridSize, gridSize);
  ctx.restore();
}

function drawWigglyTileBorders(
  ctx: CanvasRenderingContext2D,
  tile: { x: number; y: number; type: string },
  tiles: Map<string, Tile>,
) {
  const p1x = noise3D(tile.x, tile.y, performance.now() * spd) * amt;
  const p2x = noise3D(tile.x + 1, tile.y, performance.now() * spd) * amt;
  const p3x = noise3D(tile.x + 1, tile.y - 1, performance.now() * spd) * amt;
  const p4x = noise3D(tile.x, tile.y - 1, performance.now() * spd) * amt;
  const p1y = noise3D(tile.x, tile.y, performance.now() * spd) * amt;
  const p2y = noise3D(tile.x + 1, tile.y, performance.now() * spd) * amt;
  const p3y = noise3D(tile.x + 1, tile.y - 1, performance.now() * spd) * amt;
  const p4y = noise3D(tile.x, tile.y - 1, performance.now() * spd) * amt;

  const tileAbove = tiles.get(`${tile.x},${tile.y + 1}`);
  if (!tileAbove || tileAbove.type !== tile.type) {
    ctx.beginPath();
    ctx.moveTo(-gridSize * 0.5 + p1x, -gridSize * 0.5 + p1y);
    ctx.lineTo(gridSize * 0.5 + p2x, -gridSize * 0.5 + p2y);
    ctx.stroke();
  }

  const tileRight = tiles.get(`${tile.x + 1},${tile.y}`);
  if (!tileRight || tileRight.type !== tile.type) {
    ctx.beginPath();
    ctx.moveTo(gridSize * 0.5 + p2x, -gridSize * 0.5 + p2y);
    ctx.lineTo(gridSize * 0.5 + p3x, gridSize * 0.5 + p3y);
    ctx.stroke();
  }

  const tileBelow = tiles.get(`${tile.x},${tile.y - 1}`);
  if (!tileBelow || tileBelow.type !== tile.type) {
    ctx.beginPath();
    ctx.moveTo(gridSize * 0.5 + p3x, gridSize * 0.5 + p3y);
    ctx.lineTo(-gridSize * 0.5 + p4x, gridSize * 0.5 + p4y);
    ctx.stroke();
  }

  const tileLeft = tiles.get(`${tile.x - 1},${tile.y}`);
  if (!tileLeft || tileLeft.type !== tile.type) {
    ctx.beginPath();
    ctx.moveTo(-gridSize * 0.5 + p4x, gridSize * 0.5 + p4y);
    ctx.lineTo(-gridSize * 0.5 + p1x, -gridSize * 0.5 + p1y);
    ctx.stroke();
  }
}

function drawStaticTileBorders(
  ctx: CanvasRenderingContext2D,
  tile: { x: number; y: number; type: string },
  tiles: Map<string, Tile>,
) {
  const tileAbove = tiles.get(`${tile.x},${tile.y + 1}`);
  if (!tileAbove || tileAbove.type !== tile.type) {
    ctx.beginPath();
    ctx.moveTo(-gridSize * 0.5, -gridSize * 0.5);
    ctx.lineTo(gridSize * 0.5, -gridSize * 0.5);
    ctx.stroke();
  }

  const tileRight = tiles.get(`${tile.x + 1},${tile.y}`);
  if (!tileRight || tileRight.type !== tile.type) {
    ctx.beginPath();
    ctx.moveTo(gridSize * 0.5, -gridSize * 0.5);
    ctx.lineTo(gridSize * 0.5, gridSize * 0.5);
    ctx.stroke();
  }

  const tileBelow = tiles.get(`${tile.x},${tile.y - 1}`);
  if (!tileBelow || tileBelow.type !== tile.type) {
    ctx.beginPath();
    ctx.moveTo(gridSize * 0.5, gridSize * 0.5);
    ctx.lineTo(-gridSize * 0.5, gridSize * 0.5);
    ctx.stroke();
  }

  const tileLeft = tiles.get(`${tile.x - 1},${tile.y}`);
  if (!tileLeft || tileLeft.type !== tile.type) {
    ctx.beginPath();
    ctx.moveTo(-gridSize * 0.5, gridSize * 0.5);
    ctx.lineTo(-gridSize * 0.5, -gridSize * 0.5);
    ctx.stroke();
  }
}

function drawCannon(
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

  ctx.lineWidth = lineWidth;
  ctx.save();
  const tubeSize = 0.5;
  ctx.translate(0, -0.5 + tubeSize / 2);
  ctx.beginPath();
  ctx.rect(-tubeSize / 2, -tubeSize / 2, tubeSize, tubeSize);
  ctx.stroke();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(0, 0, cannonBallRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  {
    const newTubeSize = tubeSize - lineWidth;
    ctx.lineWidth = lineWidth;
    ctx.save();
    ctx.translate(0, -0.5 + tubeSize / 2);
    ctx.beginPath();
    ctx.rect(-newTubeSize / 2, -newTubeSize / 2, newTubeSize, newTubeSize);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

function strokeCannonShape(
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
  const tubeSize = 0.5;
  ctx.translate(0, -0.5 + tubeSize / 2);
  ctx.rect(-tubeSize / 2, -tubeSize / 2, tubeSize, tubeSize);
  ctx.stroke();

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

export const Level = {
  create,
  update,
  draw,
  spawnCannonBallExplosion,
  createEphemeral,
};
