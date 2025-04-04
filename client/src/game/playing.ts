import { animate } from "../animate";
import { playSound } from "../audio";
import { justPressed, keysDown } from "../input";
import { Camera } from "./camera";
import { circleVsRect } from "./collision";
import { cannonBallRadius, Level, timeSpentOnPhase } from "./level";
import {
  jumpBufferTime,
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
const maxFallSpeed = 20;

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
  const intervalAOn = Boolean(
    Math.floor(performance.now() / timeSpentOnPhase) % 2,
  );
  const solidTiles = state.level.static.tiles.filter((tile) => {
    if (tile.type === "solid") return true;
    if (tile.type === "intervalBlock") {
      const shouldBeOnBasedOnTime = intervalAOn === (tile.start === "on");
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

  for (const tile of state.level.static.tiles) {
    if (tile.type !== "lava") continue;
    // see if touching player
    const leniency = 0.2;
    const xTouching =
      Math.abs(state.player.x - tile.x) <
      playerWidth * 0.5 + tileSize * 0.5 - leniency;
    const yTouching =
      Math.abs(state.player.y - tile.y) <
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
      Level.spawnCannonBallExplosion(state.level, ball.x, ball.y);
      ball.dx = 0;
      ball.dy = 0;
    }
  }

  // check if jump token colliding with player
  const trampolines = state.level.static.tiles.filter(
    (tile) => tile.type === "trampoline",
  );
  for (const trampoline of trampolines) {
    const xTouching =
      Math.abs(state.player.x - trampoline.x) <
      playerWidth * 0.5 + tileSize * 0.5;
    const yTouching =
      Math.abs(state.player.y - trampoline.y) <
      playerHeight * 0.5 + tileSize * 0.5;

    if (xTouching && yTouching) {
      // make player do unskippable jump
      // state.player.timeSinceGrounded = coyote

      playerJump(state.player);
      state.level.ephemeral.trampolinesTouched.set(
        `${trampoline.x},${trampoline.y}`,
        performance.now(),
      );
      state.player.canHalveJump = false;
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
  const intervalAOn = Boolean(
    Math.floor(performance.now() / timeSpentOnPhase) % 2,
  );
  for (const tile of level.static.tiles) {
    if (tile.type !== "intervalBlock") continue;
    const shouldBeOnBasedOnTime = intervalAOn === (tile.start === "on");
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
      const playerOnTile =
        Math.abs(player.y - playerHeight * 0.5 - (tile.y + tileSize * 0.5)) <
        0.1;
      if (!touching || playerOnTile) {
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

  const momentumStop = 0.01;
  if (Math.abs(state.player.xMomentum) < Math.abs(momentumStop)) {
    state.player.xMomentum = 0;
  }

  state.player.timeSinceGrounded += dt;
  state.player.timeSinceTouchedWall += dt;

  const easeFactor = 0.0125;
  state.player.xMomentum = animate(
    state.player.xMomentum,
    0,
    dt ** 2 * easeFactor,
  );

  // handle X-axis
  let pdx = 0;
  if (keysDown.has("a")) pdx -= 1;
  if (keysDown.has("d")) pdx += 1;
  let dx = pdx;
  dx += state.player.xMomentum * (dt / 1000);

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

        const wallSlidingMaxSpeed = 4;

        if (yOverlap > 0.001) {
          if (dx > 0) {
            if (pdx == 1) {
              state.player.timeSinceTouchedWall = 0;
              state.player.wallJumpDir = 1;
              state.player.dy = Math.max(state.player.dy, -wallSlidingMaxSpeed);
            }
            state.player.x = tileTopLeft.x - playerWidth * 0.5;
          } else {
            if (pdx == -1) {
              state.player.timeSinceTouchedWall = 0;
              state.player.wallJumpDir = -1;
              state.player.dy = Math.max(state.player.dy, -wallSlidingMaxSpeed);
            }
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
          state.player.canHalveJump = false;
        } else {
          state.player.y = tileBottomRight.y - playerHeight * 0.5;
          state.player.dy = 0;
        }
      }
    }
  }

  state.player.timeSinceJumpBuffered += dt;
  if (justPressed.has(" ") || justPressed.has("w")) {
    state.player.timeSinceJumpBuffered = 0;
  }

  if (
    state.player.timeSinceJumpBuffered < jumpBufferTime &&
    state.player.timeSinceGrounded < coyoteTime
  ) {
    playerJump(state.player);

    const particleAmount = 20;
    for (let i = 0; i < particleAmount; i++) {
      Player.spawnParticle(state.player, 1.5);
    }
  }

  if (
    state.player.timeSinceJumpBuffered < jumpBufferTime &&
    state.player.timeSinceTouchedWall < coyoteTime
  ) {
    playerJump(state.player);
    const wallJumpMomentum = 2500;
    state.player.xMomentum = -state.player.wallJumpDir * wallJumpMomentum;

    // TODO: sideways particles?
    // const particleAmount = 20;
    // for (let i = 0; i < particleAmount; i++) {
    //   Player.spawnParticle(state.player, 1.5);
    // }
  }

  return Math.abs(dx) > 0 && state.player.timeSinceGrounded === 0;
}

function playerJump(player: State["player"]) {
  if (player.dy <= 0) {
    playSound("jump");
  }

  player.dy = jumpStrength;
  player.timeSinceGrounded = coyoteTime;
  player.canHalveJump = true;
  player.timeSinceJumpBuffered = jumpBufferTime;

  const jumpStretch = 0.25;
  player.xScale = 1 - jumpStretch;
  player.yScale = 1 + jumpStretch;
}

function killPlayer(state: State) {
  if (state.player.alive) {
    playSound("death");
    state.player.alive = false;
    state.camera.shakeFactor = 1;
  }
}
