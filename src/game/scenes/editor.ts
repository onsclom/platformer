import { assert } from "../../assert";
import {
  justPressed,
  keysDown,
  leftClickDown,
  pointerPos,
  rightClickDown,
} from "../../input";
import { Camera } from "../components/camera";
import { Level } from "../components/level";
import { playerHeight, playerWidth } from "../components/player";

export const gridSize = 1;

export function create() {
  const state = {
    level: Level.create(),
    camera: Camera.create(),
    hoveredTile: null as { x: number; y: number } | null,

    placingType: "solid" as "solid" | "lava",
  };
  return state;
}
type State = ReturnType<typeof create>;

export function update(state: State, dt: number) {
  if (justPressed.has("1")) {
    state.placingType = "solid";
  }
  if (justPressed.has("2")) {
    state.placingType = "lava";
  }

  {
    const canvas = document.querySelector("canvas")!;
    const hoverPos = pointerPos
      ? Camera.canvasPosToGamePos(
          state.camera,
          pointerPos,
          canvas.getBoundingClientRect(),
        )
      : null;
    if (hoverPos) {
      state.hoveredTile = {
        x: Math.round(hoverPos.x / gridSize),
        y: Math.round(hoverPos.y / gridSize),
      };
      // normalize -0 to 0
      if (state.hoveredTile.x === 0) state.hoveredTile.x = 0;
      if (state.hoveredTile.y === 0) state.hoveredTile.y = 0;
    } else {
      state.hoveredTile = null;
    }
  }

  const uniqueSolidTiles = new Set(
    state.level.solidTiles.map((tile) => `${tile.x},${tile.y}`),
  );
  const uniqueLavaTiles = new Set(
    state.level.lavaTiles.map((tile) => `${tile.x},${tile.y}`),
  );

  if (leftClickDown && state.hoveredTile) {
    // TODO: toggle hovered tile
    if (state.placingType === "solid") {
      uniqueLavaTiles.delete(`${state.hoveredTile.x},${state.hoveredTile.y}`);
      uniqueSolidTiles.add(`${state.hoveredTile.x},${state.hoveredTile.y}`);
    } else if (state.placingType === "lava") {
      uniqueSolidTiles.delete(`${state.hoveredTile.x},${state.hoveredTile.y}`);
      uniqueLavaTiles.add(`${state.hoveredTile.x},${state.hoveredTile.y}`);
    }
  }

  // CAMERA CONTROLS
  //////////////////

  if (keysDown.has("q")) {
    state.camera.angle -= dt * 0.001;
  }
  if (keysDown.has("e")) {
    state.camera.angle += dt * 0.001;
  }
  if (keysDown.has("-")) {
    state.camera.width *= 1 + dt * 0.001;
    state.camera.height *= 1 + dt * 0.001;
  }
  if (keysDown.has("=")) {
    state.camera.width *= 1 - dt * 0.001;
    state.camera.height *= 1 - dt * 0.001;
  }

  const panSpeed = 0.008;
  if (keysDown.has("w")) {
    state.camera.y += dt * panSpeed;
  }
  if (keysDown.has("s")) {
    state.camera.y -= dt * panSpeed;
  }
  if (keysDown.has("a")) {
    state.camera.x -= dt * panSpeed;
  }
  if (keysDown.has("d")) {
    state.camera.x += dt * panSpeed;
  }

  if (rightClickDown && state.hoveredTile) {
    const tileToRemove = `${state.hoveredTile.x},${state.hoveredTile.y}`;
    uniqueSolidTiles.delete(tileToRemove);
  }
  state.level.solidTiles = Array.from(uniqueSolidTiles).map((tile) => {
    const [x, y] = tile.split(",").map(Number);
    assert(x !== undefined && y !== undefined);
    return { x, y };
  });

  if (rightClickDown && state.hoveredTile) {
    const tileToRemove = `${state.hoveredTile.x},${state.hoveredTile.y}`;
    uniqueLavaTiles.delete(tileToRemove);
  }
  state.level.lavaTiles = Array.from(uniqueLavaTiles).map((tile) => {
    const [x, y] = tile.split(",").map(Number);
    assert(x !== undefined && y !== undefined);
    return { x, y };
  });

  Level.update(state.level, dt);
}

export function draw(state: State, ctx: CanvasRenderingContext2D) {
  Camera.drawWithLetterBoxedCamera(state.camera, ctx, (ctx) => {
    Level.draw(state.level, ctx);

    // draw hovered
    if (state.hoveredTile) {
      ctx.save();
      ctx.translate(
        state.hoveredTile.x * gridSize - gridSize / 2,
        -state.hoveredTile.y * gridSize - gridSize / 2,
      );
      ctx.lineWidth = 0.1;
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = "black";
      ctx.strokeRect(0, 0, gridSize, gridSize);

      ctx.restore();
    }

    // draw player centered at camera
    ctx.fillStyle = "green";
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.translate(state.camera.x, -state.camera.y);
    ctx.fillRect(
      -playerWidth / 2,
      -playerHeight / 2,
      playerWidth,
      playerHeight,
    );
    ctx.restore();
  });

  // UI
  //////////////////

  const canvasRect = ctx.canvas.getBoundingClientRect();

  ctx.fillStyle = "black";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.font = `${canvasRect.width * 0.05}px Arial`;
  ctx.fillText(state.placingType, canvasRect.width / 2, canvasRect.height);
}

export const Editor = { create, update, draw };
