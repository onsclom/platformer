import { assert } from "../../assert";
import {
  keysDown,
  leftClickDown,
  pointerPos,
  rightClickDown,
} from "../../input";
import { Camera } from "../components/camera";
import { playerHeight, playerWidth } from "../components/player";

const gridSize = 1;

export function create() {
  const state = {
    level: {
      solidTiles: [
        { x: 0, y: 0 },
        { x: 2, y: 1 },
      ],
    },
    camera: Camera.create(),
    hoveredTile: null as { x: number; y: number } | null,
  };
  return state;
}
type State = ReturnType<typeof create>;

export function update(state: State, dt: number) {
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

  if (leftClickDown && state.hoveredTile) {
    // TODO: toggle hovered tile
    state.level.solidTiles.push({ ...state.hoveredTile });
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

  // remove duplicates from solidTiles
  const uniqueTiles = new Set(
    state.level.solidTiles.map((tile) => `${tile.x},${tile.y}`),
  );

  if (rightClickDown && state.hoveredTile) {
    const tileToRemove = `${state.hoveredTile.x},${state.hoveredTile.y}`;
    uniqueTiles.delete(tileToRemove);
  }

  state.level.solidTiles = Array.from(uniqueTiles).map((tile) => {
    const [x, y] = tile.split(",").map(Number);
    assert(x !== undefined && y !== undefined);
    return { x, y };
  });
}

export function draw(state: State, ctx: CanvasRenderingContext2D) {
  Camera.drawWithLetterBoxedCamera(state.camera, ctx, (ctx) => {
    drawLevel(state.level, ctx);

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
}

export const Editor = { create, update, draw };

// TODO: move this somewhere else?
export function drawLevel(
  level: State["level"],
  ctx: CanvasRenderingContext2D,
) {
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
}
