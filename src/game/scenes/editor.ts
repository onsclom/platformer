import { assert } from "../../assert";
import {
  justLeftClicked,
  justPressed,
  keysDown,
  leftClickDown,
  pointerPos,
  rightClickDown,
} from "../../input";
import { Camera } from "../components/camera";

const gridSize = 1;

export function create() {
  const state = {
    level: {
      solidTiles: [
        { x: 0, y: 0 },
        { x: 2, y: 1 },
      ],
      lavaTiles: [],
      spawn: { x: 0, y: 5 },
    },
    camera: Camera.create(),

    hoveredTile: { x: 0, y: 0 },
  };
  return state;
}
type State = ReturnType<typeof create>;

export function update(state: State, dt: number) {
  {
    const canvas = document.querySelector("canvas")!;
    const hoverPos = Camera.canvasPosToGamePos(
      state.camera,
      pointerPos,
      canvas.getBoundingClientRect(),
    );
    state.hoveredTile.x = Math.round(hoverPos.x / gridSize);
    state.hoveredTile.y = Math.round(hoverPos.y / gridSize);
    // normalize -0 to 0
    if (state.hoveredTile.x === 0) state.hoveredTile.x = 0;
    if (state.hoveredTile.y === 0) state.hoveredTile.y = 0;
  }

  if (leftClickDown) {
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

  if (rightClickDown) {
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
    ctx.fillStyle = "white";
    state.level.solidTiles.forEach((tile) => {
      ctx.save();
      ctx.translate(
        tile.x * gridSize - gridSize / 2,
        -tile.y * gridSize - gridSize / 2,
      );
      ctx.fillRect(0, 0, gridSize, gridSize);
      ctx.restore();
    });

    // draw hovered
    ctx.save();
    ctx.translate(
      state.hoveredTile.x * gridSize - gridSize / 2,
      -state.hoveredTile.y * gridSize - gridSize / 2,
    );
    ctx.lineWidth = 0.1;
    ctx.strokeStyle = "green";
    ctx.strokeRect(0, 0, gridSize, gridSize);

    ctx.restore();
  });
}

export default { create, update, draw };
