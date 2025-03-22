import { gridSize } from "../scenes/editor";

type State = ReturnType<typeof create>;

export function create() {
  return {
    solidTiles: [
      { x: 0, y: 0 },
      { x: 2, y: 1 },
    ],
    lavaTiles: [{ x: 1, y: 0 }],
  };
}

export function update(state: State, dt: number) {}

export function draw(level: State, ctx: CanvasRenderingContext2D) {
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
  level.lavaTiles.forEach((tile) => {
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
  ctx.fillStyle = "red";
  level.lavaTiles.forEach((tile) => {
    ctx.save();
    ctx.translate(
      tile.x * gridSize - gridSize / 2,
      -tile.y * gridSize - gridSize / 2,
    );
    ctx.fillRect(0, 0, gridSize, gridSize);
    ctx.restore();
  });
}

export const Level = { create, update, draw };
