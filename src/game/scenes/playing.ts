import { animate } from "../../animate";
import { playSound } from "../../audio";
import { justPressed, justReleased, keysDown } from "../../input";
import { Camera } from "../components/camera";
import { Level } from "../components/level";
import {
  initJumpBufferTime,
  Player,
  playerHeight,
  playerWidth,
} from "../components/player";

type State = ReturnType<typeof create>;

export function create() {
  return {
    camera: Camera.create(),
    level: Level.create(),
    player: Player.create(),
  };
}

export function update(state: State, dt: number) {
  {
    // center camera on player
    state.camera.x = state.player.x;
    state.camera.y = state.player.y;
  }

  moveAndSlidePlayer(state, dt);
  Level.update(state.level, dt);
}

export function draw(state: State, ctx: CanvasRenderingContext2D) {
  Camera.drawWithLetterBoxedCamera(state.camera, ctx, () => {
    // draw solid tiles
    Level.draw(state.level, ctx);

    Player.draw(state.player, ctx);
  });
}

export const Playing = { create, update, draw };

const tileSize = 1;
const gravity = 20;

const speed = 5;
const jumpStrength = 10;
const coyoteTime = 50;

function moveAndSlidePlayer(state: State, dt: number) {
  if (justReleased.has(" ") || justReleased.has("w")) {
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
    for (const tile of state.level.solidTiles) {
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
  state.player.y += state.player.dy * (dt / 1000);
  {
    for (const tile of state.level.solidTiles) {
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
            playSound("land");
          }
          state.player.y = tileTopLeft.y + playerHeight * 0.5;
          state.player.dy = 0;
          state.player.timeSinceGrounded = 0;
        } else {
          state.player.y = tileBottomRight.y - playerHeight * 0.5;
          state.player.dy = 0;
        }
      }
    }
  }

  // allow jumping when grounded
  if (
    (keysDown.has(" ") || keysDown.has("w")) &&
    state.player.timeSinceGrounded < coyoteTime
  ) {
    state.player.dy = jumpStrength;
    state.player.timeSinceGrounded = coyoteTime;
    playSound("jump");
  }
}
