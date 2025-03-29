import { animate } from "../animate";
import { playSound } from "../audio";
import { justPressed, justReleased, keysDown } from "../input";
import { Camera } from "./camera";
import { circleVsRect } from "./collision";
import {
  cannonBallRadius,
  jumpTokenRadius,
  Level,
  timeSpentOnPhase,
} from "./level";
import {
  Player,
  playerHeight,
  playerParticleSpawnRateWhileWalking,
  playerWidth,
} from "./player";

type State = ReturnType<typeof create>;

const tileSize = 1;
const gravity = 40;
const speed = 8;
const jumpStrength = 20;
const coyoteTime = 75;
const maxFallSpeed = 15;

export function create() {
  return {
    camera: Camera.create(),
    level: Level.create(),
    player: Player.create(),
  };
}

export function update(state: State, dt: number) {
  Camera.update(state.camera, dt);

  {
    // center camera on player
    state.camera.x = state.player.x;
    state.camera.y = state.player.y;
  }

  let walking = false;
  const solidTiles = state.level.static.tiles.filter((tile) => {
    if (tile.type === "solid") return true;
    if (tile.type === "intervalBlock") {
      const shouldBeOnBasedOnTime =
        Boolean(Math.floor(performance.now() / timeSpentOnPhase) % 2) ===
        (tile.start === "on");
      return (
        shouldBeOnBasedOnTime &&
        state.level.ephemeral.intervalBlocksOnLastTick.has(
          `${tile.x},${tile.y}`,
        )
      );
    }
    return false;
  });

  if (state.player.alive) {
    walking = moveAndSlidePlayer(state, dt, solidTiles);
  }

  updateIntervalBlocksOnLastFrame(state.level, state.player);

  Player.update(state.player, dt);
  if (walking) {
    state.player.particles.spawnTimer += dt;
    while (
      state.player.particles.spawnTimer >
      1000 / playerParticleSpawnRateWhileWalking
    ) {
      state.player.particles.spawnTimer -=
        1000 / playerParticleSpawnRateWhileWalking;
      Player.spawnParticle(state.player);
    }
  }

  const lavas = state.level.static.tiles.filter((tile) => tile.type === "lava");
  for (const lava of lavas) {
    // see if touching player
    const leniency = 0.2;
    const xTouching =
      Math.abs(state.player.x - lava.x) <
      playerWidth * 0.5 + tileSize * 0.5 - leniency;
    const yTouching =
      Math.abs(state.player.y - lava.y) <
      playerHeight * 0.5 + tileSize * 0.5 - leniency;
    if (xTouching && yTouching) {
      killPlayer(state);
    }
  }

  Level.update(state.level, dt);

  // check if cannon ball colliding with player
  for (const ball of state.level.ephemeral.cannonBalls.instances) {
    if (ball.dx === 0 && ball.dy === 0) continue; // inactive cannonball

    const colliding = circleVsRect(
      { cx: ball.x, cy: ball.y, radius: cannonBallRadius },
      {
        cx: state.player.x,
        cy: state.player.y,
        width: playerWidth,
        height: playerHeight,
      },
    );

    if (colliding) {
      killPlayer(state);
      // Level.spawnExplosion(state.level, ball.x, ball.y);
    }
  }

  // check if jump token colliding with player
  const jumpTokens = state.level.static.tiles.filter(
    (tile) => tile.type === "jumpToken",
  );
  for (const jumpToken of jumpTokens) {
    if (
      !state.level.ephemeral.grabbedJumpTokens.get(
        `${jumpToken.x},${jumpToken.y}`,
      )
    ) {
      const colliding = circleVsRect(
        {
          cx: jumpToken.x,
          cy: jumpToken.y,
          radius: jumpTokenRadius,
        },
        {
          cx: state.player.x,
          cy: state.player.y,
          width: playerWidth,
          height: playerHeight,
        },
      );
      if (
        colliding &&
        !state.player.hasExtraJump &&
        state.player.timeSinceGrounded > 0
      ) {
        state.level.ephemeral.grabbedJumpTokens.set(
          `${jumpToken.x},${jumpToken.y}`,
          { grabTime: performance.now() },
        );
        playSound("jump-token");
        state.player.hasExtraJump = true;
      }
    }
  }
}

export function draw(state: State, ctx: CanvasRenderingContext2D) {
  Camera.drawWithLetterBoxedCamera(state.camera, ctx, () => {
    // draw solid tiles
    Level.draw(state.level, ctx);
    Player.draw(state.player, ctx, state.camera);
  });
}

export const Playing = { create, update, draw };

export function updateIntervalBlocksOnLastFrame(
  level: State["level"],
  player?: State["player"],
) {
  // update interval blocks on last frame
  const intervalTiles = level.static.tiles.filter(
    (tile) => tile.type === "intervalBlock",
  );
  for (const tile of intervalTiles) {
    const shouldBeOnBasedOnTime =
      Boolean(Math.floor(performance.now() / timeSpentOnPhase) % 2) ===
      (tile.start === "on");
    if (shouldBeOnBasedOnTime) {
      if (!player) {
        level.ephemeral.intervalBlocksOnLastTick.add(`${tile.x},${tile.y}`);
        continue;
      }
      const touchingPlayerX =
        Math.abs(player.x - tile.x) < playerWidth * 0.5 + tileSize * 0.5;
      const touchingPlayerY =
        Math.abs(player.y - tile.y) < playerHeight * 0.5 + tileSize * 0.5;
      const touching = touchingPlayerX && touchingPlayerY;
      if (!touching) {
        level.ephemeral.intervalBlocksOnLastTick.add(`${tile.x},${tile.y}`);
      }
    } else {
      level.ephemeral.intervalBlocksOnLastTick.delete(`${tile.x},${tile.y}`);
    }
  }
}

function moveAndSlidePlayer(
  state: State,
  dt: number,
  collidableTiles: {
    x: number;
    y: number;
  }[],
) {
  if (!keysDown.has(" ") && !keysDown.has("w") && state.player.canHalveJump) {
    state.player.canHalveJump = false;
    if (state.player.dy > 0) {
      state.player.dy /= 2;
    }
  }

  state.player.timeSinceGrounded += dt;

  // handle X-axis
  let dx = 0;

  if (keysDown.has("a")) dx -= 1;
  if (keysDown.has("d")) dx += 1;

  state.camera.angle = animate(state.camera.angle, dx * 0.02, dt * 0.02);
  {
    state.player.x += dx * (dt / 1000) * speed;
    for (const tile of collidableTiles) {
      // collision
      const tileTopLeft = {
        x: tile.x - tileSize * 0.5,
        y: tile.y + tileSize * 0.5,
      };
      const tileBottomRight = {
        x: tileTopLeft.x + tileSize,
        y: tileTopLeft.y - tileSize,
      };
      const playerBottomRight = {
        x: state.player.x + playerWidth * 0.5,
        y: state.player.y - playerHeight * 0.5,
      };
      const playerTopLeft = {
        x: state.player.x - playerWidth * 0.5,
        y: state.player.y + playerHeight * 0.5,
      };
      if (
        playerBottomRight.x > tileTopLeft.x &&
        playerBottomRight.y < tileTopLeft.y &&
        playerTopLeft.x < tileBottomRight.x &&
        playerTopLeft.y > tileBottomRight.y
      ) {
        const yOverlap = Math.min(
          Math.abs(playerBottomRight.y - tileTopLeft.y),
          Math.abs(tileBottomRight.y - playerTopLeft.y),
        );

        if (yOverlap > 0.001) {
          if (dx > 0) {
            state.player.x = tileTopLeft.x - playerWidth * 0.5;
          } else {
            state.player.x = tileBottomRight.x + playerWidth * 0.5;
          }
        }
      }
    }
  }

  state.player.dy -= gravity * (dt / 1000);
  if (state.player.dy < -maxFallSpeed) {
    state.player.dy = -maxFallSpeed;
  }
  state.player.y += state.player.dy * (dt / 1000);
  {
    for (const tile of collidableTiles) {
      // collision
      const tileTopLeft = {
        x: tile.x - tileSize * 0.5,
        y: tile.y + tileSize * 0.5,
      };
      const tileBottomRight = {
        x: tileTopLeft.x + tileSize,
        y: tileTopLeft.y - tileSize,
      };
      const playerBottomRight = {
        x: state.player.x + playerWidth * 0.5,
        y: state.player.y - playerHeight * 0.5,
      };
      const playerTopLeft = {
        x: state.player.x - playerWidth * 0.5,
        y: state.player.y + playerHeight * 0.5,
      };
      if (
        playerBottomRight.x > tileTopLeft.x &&
        playerBottomRight.y < tileTopLeft.y &&
        playerTopLeft.x < tileBottomRight.x &&
        playerTopLeft.y > tileBottomRight.y
      ) {
        // resolve against y
        if (state.player.dy <= 0) {
          const landSoundThreshold = -5;
          if (state.player.dy < landSoundThreshold) {
            const landSquash = 0.25;
            state.player.xScale = 1 + landSquash;
            state.player.yScale = 1 - landSquash;
            playSound("land");

            const particleAmount = 20;
            for (let i = 0; i < particleAmount; i++) {
              Player.spawnParticle(state.player, 1.5);
            }
          }
          state.player.y = tileTopLeft.y + playerHeight * 0.5;
          state.player.dy = 0;
          state.player.timeSinceGrounded = 0;
          state.player.hasExtraJump = false;
          state.player.canHalveJump = false;
        } else {
          state.player.y = tileBottomRight.y - playerHeight * 0.5;
          state.player.dy = 0;
        }
      }
    }
  }

  if (
    (justPressed.has(" ") || justPressed.has("w")) &&
    (state.player.timeSinceGrounded < coyoteTime || state.player.hasExtraJump)
  ) {
    state.player.dy = jumpStrength;
    state.player.timeSinceGrounded = coyoteTime;
    state.player.hasExtraJump = false;
    state.player.canHalveJump = true;

    playSound("jump");
    const jumpStretch = 0.25;
    state.player.xScale = 1 - jumpStretch;
    state.player.yScale = 1 + jumpStretch;

    const particleAmount = 20;
    for (let i = 0; i < particleAmount; i++) {
      Player.spawnParticle(state.player, 1.5);
    }
  }

  return Math.abs(dx) > 0 && state.player.timeSinceGrounded === 0;
}

function killPlayer(state: State) {
  if (state.player.alive) {
    playSound("death");
    state.player.alive = false;
    state.camera.shakeFactor = 1;
  }
}
