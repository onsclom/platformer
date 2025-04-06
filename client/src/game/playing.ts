import { animate } from "../animate";
import { playSound, stopSound } from "../audio";
import { justPressed, keysDown } from "../input";
import { globalState } from "../main";
import { Camera } from "./camera";
import { circleVsRect, rectVsRectCollision } from "./collision";
import { cannonBallRadius, Level, timeSpentOnPhase } from "./level";
import {
  jumpBufferTime,
  Player,
  playerHeight,
  playerParticleSpawnRateWhileWalking,
  playerWidth,
} from "./player";

type State = ReturnType<typeof create>;

export const tileSize = 1;

const gameSpeed = 0.9;

const gravity = 60 * gameSpeed;
const jumpStrength = 25 * gameSpeed;
export const playerSpeed = 10 * gameSpeed;
const maxFallSpeed = 25 * gameSpeed;
const coyoteTime = 75;

export function create() {
  return {
    won: false,
    timeSinceWon: 0,

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

  const intervalAOn = Boolean(
    Math.floor(performance.now() / timeSpentOnPhase) % 2,
  );
  const solidTiles = state.level.static.tiles.filter((tile) => {
    if (tile.type === "solid") return true;
    if (tile.type === "interval") {
      const shouldBeOnBasedOnTime = intervalAOn === (tile.start === "on");
      return (
        shouldBeOnBasedOnTime &&
        state.level.ephemeral.intervalOnLastFrame.has(`${tile.x},${tile.y}`)
      );
    }
    return false;
  });

  if (state.player.alive) {
    const { walking, wallSliding, wallSlidedir } = moveAndSlidePlayer(
      state,
      dt,
      solidTiles,
    );

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

    if (wallSliding) {
      state.player.particles.spawnTimer += dt;
      while (
        state.player.particles.spawnTimer >
        1000 / playerParticleSpawnRateWhileWalking
      ) {
        state.player.particles.spawnTimer -=
          1000 / playerParticleSpawnRateWhileWalking;
        Player.spawnParticle(state.player, 0, wallSlidedir);
      }
    }
  }

  if (state.player.alive) {
    state.player.timeSinceDead = 0;
  } else {
    state.player.timeSinceDead += dt;
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

  Level.update(state.level, dt, state.player);

  // check if cannon ball colliding with player
  for (const ball of state.level.ephemeral.cannonBalls.instances) {
    if (ball.dx === 0 && ball.dy === 0) continue; // inactive cannonball

    const leniency = 0.2;
    const colliding = circleVsRect(
      { cx: ball.x, cy: ball.y, radius: cannonBallRadius - leniency },
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

  // check if bullets collide with player
  for (const bullet of state.level.ephemeral.turretBullets.instances) {
    if (bullet.dx === 0 && bullet.dy === 0) continue; // inactive bullet

    const colliding = circleVsRect(
      { cx: bullet.x, cy: bullet.y, radius: 0 },
      {
        cx: state.player.x,
        cy: state.player.y,
        width: playerWidth,
        height: playerHeight,
      },
    );

    if (colliding) {
      killPlayer(state);
      // Level.spawnBulletExplosion(state.level, bullet.x, bullet.y);
      bullet.dx = 0;
      bullet.dy = 0;
    }
  }

  // check if trampoline colliding with player
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

  // check if player colliding with end
  {
    const xTouching =
      Math.abs(state.player.x - state.level.static.end.x) <
      playerWidth * 0.5 + tileSize * 0.5;
    const yTouching =
      Math.abs(state.player.y - state.level.static.end.y) <
      playerHeight * 0.5 + tileSize * 0.5;
    if (xTouching && yTouching && !state.won) {
      state.camera.shakeFactor = 1;
      state.won = true;
    }
  }

  if (state.won) {
    state.timeSinceWon += dt;
  } else {
    state.timeSinceWon = 0;
  }

  const timeSpentOnWin = 1000;
  if (state.timeSinceWon > timeSpentOnWin) {
    // go to level select screen
    globalState.curScene = "offlineLevelPicker";
  }
}

export function draw(state: State, ctx: CanvasRenderingContext2D) {
  Camera.drawWithLetterBoxedCamera(state.camera, ctx, () => {
    // draw solid tiles
    Level.draw(state.level, ctx, state.player);
    Player.draw(state.player, ctx, state.camera);
  });

  // draw win screen
  const drawRect = ctx.canvas.getBoundingClientRect();
  if (state.won) {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, drawRect.width, drawRect.height);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "white";
    ctx.font = "50px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("LEVEL COMPLETE", drawRect.width / 2, drawRect.height / 2);
  }
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
    if (tile.type !== "interval") continue;
    const shouldBeOnBasedOnTime = intervalAOn === (tile.start === "on");
    if (shouldBeOnBasedOnTime) {
      if (!player) {
        level.ephemeral.intervalOnLastFrame.add(`${tile.x},${tile.y}`);
        continue;
      }

      const playerTouchingInterval = rectVsRectCollision(
        { x: player.x, y: player.y, width: playerWidth, height: playerHeight },
        { x: tile.x, y: tile.y, width: tileSize, height: tileSize },
      );

      if (!playerTouchingInterval) {
        level.ephemeral.intervalOnLastFrame.add(`${tile.x},${tile.y}`);
      }
    } else {
      level.ephemeral.intervalOnLastFrame.delete(`${tile.x},${tile.y}`);
    }
  }
}

// x and y are center

function moveAndSlidePlayer(
  state: State,
  dt: number,
  collidableTiles: {
    x: number;
    y: number;
  }[],
) {
  if (
    !keysDown.has("Space") &&
    !keysDown.has("KeyW") &&
    state.player.canHalveJump
  ) {
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
  if (keysDown.has("KeyA")) pdx -= 1;
  if (keysDown.has("KeyD")) pdx += 1;
  let dx = pdx;
  dx += state.player.xMomentum * (dt / 1000);

  const extraRepel = 0.000001;

  let wallSliding = false;
  state.camera.angle = animate(state.camera.angle, dx * 0.02, dt * 0.02);
  {
    state.player.x += dx * (dt / 1000) * playerSpeed;
    for (const tile of collidableTiles) {
      // collision
      const colliding = rectVsRectCollision(
        {
          x: state.player.x,
          y: state.player.y,
          width: playerWidth,
          height: playerHeight,
        },
        {
          x: tile.x,
          y: tile.y,
          width: tileSize,
          height: tileSize,
        },
      );
      if (colliding) {
        // IS WALL SLIDING
        const wallSlidingMaxSpeed = 4;
        if (dx > 0) {
          if (pdx == 1) {
            state.player.timeSinceTouchedWall = 0;
            state.player.wallJumpDir = 1;
            if (state.player.dy < -wallSlidingMaxSpeed) {
              wallSliding = true;
              state.player.dy = Math.max(state.player.dy, -wallSlidingMaxSpeed);
            }
          }
          state.player.x =
            tile.x - tileSize * 0.5 - playerWidth * 0.5 - extraRepel;
        } else if (dx < 0) {
          if (pdx == -1) {
            state.player.timeSinceTouchedWall = 0;
            state.player.wallJumpDir = -1;
            if (state.player.dy < -wallSlidingMaxSpeed) {
              wallSliding = true;
              state.player.dy = Math.max(state.player.dy, -wallSlidingMaxSpeed);
            }
          }
          state.player.x =
            tile.x + tileSize * 0.5 + playerWidth * 0.5 + extraRepel;
        } else {
          // moving platform otouching player??
        }
        // }
      }
    }
  }
  if (wallSliding) {
    playSound("slide");
  } else {
    stopSound("slide");
  }

  state.player.dy -= gravity * (dt / 1000);
  if (state.player.dy < -maxFallSpeed) {
    state.player.dy = -maxFallSpeed;
  }
  state.player.y += state.player.dy * (dt / 1000);
  {
    for (const tile of collidableTiles) {
      const colliding = rectVsRectCollision(
        {
          x: state.player.x,
          y: state.player.y,
          width: playerWidth,
          height: playerHeight,
        },
        {
          x: tile.x,
          y: tile.y,
          width: tileSize,
          height: tileSize,
        },
      );
      if (colliding) {
        // resolve against y
        if (state.player.dy < 0) {
          const landSoundThreshold = -5;
          if (state.player.dy < landSoundThreshold) {
            const landSquash = 0.25;
            state.player.xScale = 1 + landSquash;
            state.player.yScale = 1 - landSquash;
            playSound("land");

            const particleAmount = 10;
            for (let i = 0; i < particleAmount; i++) {
              Player.spawnParticle(state.player, 1.5);
            }
          }
          state.player.y =
            tile.y + tileSize * 0.5 + playerHeight * 0.5 + extraRepel;
          state.player.dy = 0;
          state.player.timeSinceGrounded = 0;
          state.player.canHalveJump = false;
        } else if (state.player.dy > 0) {
          state.player.y =
            tile.y - tileSize * 0.5 - playerHeight * 0.5 - extraRepel;
          state.player.dy = 0;
        } else {
          // moving platform touching player??
        }
      }
    }
  }

  state.player.timeSinceJumpBuffered += dt;
  if (justPressed.has("Space") || justPressed.has("KeyW")) {
    state.player.timeSinceJumpBuffered = 0;
  }

  if (
    state.player.timeSinceJumpBuffered < jumpBufferTime &&
    state.player.timeSinceGrounded < coyoteTime
  ) {
    playerJump(state.player);

    const particleAmount = 10;
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
    const particleAmount = 10;
    for (let i = 0; i < particleAmount; i++) {
      Player.spawnParticle(state.player, 1.5, state.player.wallJumpDir);
    }
  }

  return {
    walking: Math.abs(dx) > 0 && state.player.timeSinceGrounded === 0,
    wallSliding: wallSliding,
    wallSlidedir: state.player.wallJumpDir,
  };
}

function playerJump(player: State["player"]) {
  if (player.dy <= jumpStrength / 2) {
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
