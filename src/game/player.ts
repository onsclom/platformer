import { playSound } from "../audio";
import { justPressed, justReleased, keysDown } from "../input";
import { animate, gamePosToCanvasPos } from "./camera";
import { State } from "./index";
import { levelDimension, tileSize, topLeftTileOnMap } from "./tiles";

const initJumpBufferTime = 150;
const gravity = 250;
const cornerCorrection = 1.5;

function create() {
  return {
    // center
    x: 0,
    y: 0,

    width: 4,
    height: 4,

    jumpStrength: 120,

    dy: 0,
    speed: 50,

    alive: true,
    timeDead: 0,

    coyoteTime: 50,
    timeSinceGrounded: 0,

    jumpBufferTime: initJumpBufferTime,
    timeSinceJumpBuffered: initJumpBufferTime,
  };
}

function update(state: State, dt: number) {
  moveAndSlidePlayer(state, dt);
}

function draw(state: State, ctx: CanvasRenderingContext2D) {
  const { x, y } = gamePosToCanvasPos(
    state.player.x - state.player.width / 2,
    state.player.y + state.player.height / 2,
  );
  {
    ctx.fillStyle = "#99f";
    ctx.fillRect(x, y, state.player.width, state.player.height);
  }

  ctx.fillStyle = "black";
  ctx.lineWidth = 0.3;
  ctx.strokeRect(x, y, state.player.width, state.player.height);

  ctx.globalAlpha = 1;
}

export default { create, update, draw };

function moveAndSlidePlayer(state: State, dt: number) {
  if (justReleased.has(" ") || justReleased.has("w")) {
    if (state.player.dy > 0) {
      state.player.dy /= 2;
    }
  }

  state.player.timeSinceGrounded += dt;
  state.player.timeSinceJumpBuffered += dt;

  // handle X-axis
  let dx = 0;

  if (keysDown.has("a")) dx -= 1;
  if (keysDown.has("d")) dx += 1;

  state.camera.angle = animate(state.camera.angle, dx * 0.02, dt * 0.02);
  {
    state.player.x += dx * (dt / 1000) * state.player.speed;
    for (let i = 0; i < levelDimension ** 2; i++) {
      const tx = i % levelDimension;
      const ty = Math.floor(i / levelDimension);
      const tile = state.level[ty * levelDimension + tx];
      if (tile === "solid") {
        // collision
        const tileTopLeft = {
          x: topLeftTileOnMap.x + tx * tileSize,
          y: topLeftTileOnMap.y - ty * tileSize,
        };
        const tileBottomRight = {
          x: tileTopLeft.x + tileSize,
          y: tileTopLeft.y - tileSize,
        };
        const playerBottomRight = {
          x: state.player.x + state.player.width * 0.5,
          y: state.player.y - state.player.height * 0.5,
        };
        const playerTopLeft = {
          x: state.player.x - state.player.width * 0.5,
          y: state.player.y + state.player.height * 0.5,
        };
        if (
          playerBottomRight.x > tileTopLeft.x &&
          playerBottomRight.y < tileTopLeft.y &&
          playerTopLeft.x < tileBottomRight.x &&
          playerTopLeft.y > tileBottomRight.y
        ) {
          // resolve against x
          if (dx > 0) {
            state.player.x = tileTopLeft.x - state.player.width * 0.5;
          } else {
            state.player.x = tileBottomRight.x + state.player.width * 0.5;
          }
        }
      }
    }
  }

  state.player.dy -= gravity * (dt / 1000);
  state.player.y += state.player.dy * (dt / 1000);
  {
    for (let i = 0; i < levelDimension ** 2; i++) {
      const tx = i % levelDimension;
      const ty = Math.floor(i / levelDimension);
      const tile = state.level[ty * levelDimension + tx];
      if (tile === "solid") {
        // collision
        const tileTopLeft = {
          x: topLeftTileOnMap.x + tx * tileSize,
          y: topLeftTileOnMap.y - ty * tileSize,
        };
        const tileBottomRight = {
          x: tileTopLeft.x + tileSize,
          y: tileTopLeft.y - tileSize,
        };
        const playerBottomRight = {
          x: state.player.x + state.player.width * 0.5,
          y: state.player.y - state.player.height * 0.5,
        };
        const playerTopLeft = {
          x: state.player.x - state.player.width * 0.5,
          y: state.player.y + state.player.height * 0.5,
        };
        if (
          playerBottomRight.x > tileTopLeft.x &&
          playerBottomRight.y < tileTopLeft.y &&
          playerTopLeft.x < tileBottomRight.x &&
          playerTopLeft.y > tileBottomRight.y
        ) {
          const xOverlapAmount = Math.min(
            playerBottomRight.x - tileTopLeft.x,
            tileBottomRight.x - playerTopLeft.x,
          );
          // if x overlap is small, lets just resolve that

          let corrected = false;
          if (state.player.dy > 0) {
            if (xOverlapAmount < cornerCorrection) {
              if (playerTopLeft.x < tileTopLeft.x) {
                const tileToLeft = state.level[ty * levelDimension + tx - 1];
                if (tileToLeft !== "solid") {
                  state.player.x = tileTopLeft.x - state.player.width * 0.5;
                  corrected = true;
                }
              } else {
                const tileToRight = state.level[ty * levelDimension + tx + 1];
                if (tileToRight !== "solid") {
                  state.player.x = tileBottomRight.x + state.player.width * 0.5;
                  corrected = true;
                }
              }
            }
          }

          if (!corrected) {
            // resolve against y
            if (state.player.dy <= 0) {
              const landSoundThreshold = -5;
              if (state.player.dy < landSoundThreshold) {
                playSound("land");
              }

              state.player.y = tileTopLeft.y + state.player.height * 0.5;
              state.player.dy = 0;
              state.player.timeSinceGrounded = 0;
            } else {
              state.player.y = tileBottomRight.y - state.player.height * 0.5;
              state.player.dy = 0;
            }
          }
        }
      }
    }
  }

  // allow jumping when grounded
  if (
    justPressed.has(" ") ||
    justPressed.has("w") ||
    state.player.timeSinceJumpBuffered < state.player.jumpBufferTime
  ) {
    if (state.player.timeSinceGrounded < state.player.coyoteTime) {
      state.player.dy = state.player.jumpStrength;
      state.player.timeSinceJumpBuffered = initJumpBufferTime;
      playSound("jump");
    } else {
      if (justPressed.has(" ") || justPressed.has("w")) {
        state.player.timeSinceJumpBuffered = 0;
      }
    }
  }
}
