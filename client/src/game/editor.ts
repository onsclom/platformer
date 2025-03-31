import { playSound } from "../audio";
import {
  justLeftClicked,
  justPressed,
  keysDown,
  leftClickDown,
  pointerPos,
  rightClickDown,
} from "../input";
import { client } from "../server";
import { Camera } from "./camera";
import { drawTile, Level, Tile } from "./level";
import { playerColor, playerHeight, playerWidth } from "./player";
import { updateIntervalBlocksOnLastFrame } from "./playing";
import { gridSize } from "./top-level-constants";

export function create() {
  const state = {
    level: Level.create(),
    camera: Camera.create(),
    hoveredTile: null as { x: number; y: number } | null,
    placingType: "solid" as Tile["type"],
  };
  return state;
}
type State = ReturnType<typeof create>;

const hotkeyToPlacingType: Record<string, Tile["type"]> = {
  "1": "solid",
  "2": "lava",
  "3": "cannon",
  "4": "jumpToken",
  "5": "intervalBlock",
};

export function update(state: State, dt: number) {
  for (const [hotkey, placingType] of Object.entries(hotkeyToPlacingType)) {
    if (justPressed.has(hotkey)) {
      state.placingType = placingType;
    }
  }

  Camera.update(state.camera, dt);

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

  const posToTileMap = new Map(
    state.level.static.tiles.map((tile) => [`${tile.x},${tile.y}`, tile]),
  );

  if (leftClickDown && state.hoveredTile) {
    const existingTile = posToTileMap.get(
      `${state.hoveredTile.x},${state.hoveredTile.y}`,
    );
    if (state.placingType === "cannon") {
      if (existingTile?.type === "cannon" && justLeftClicked) {
        const indexToDir = ["up", "right", "down", "left"] as const;
        const currentIndex = indexToDir.indexOf(existingTile.dir);
        posToTileMap.set(`${state.hoveredTile.x},${state.hoveredTile.y}`, {
          type: "cannon",
          x: state.hoveredTile.x,
          y: state.hoveredTile.y,
          dir: indexToDir[(currentIndex + 1) % indexToDir.length]!,
        });
      } else {
        if (existingTile?.type !== "cannon") {
          posToTileMap.set(`${state.hoveredTile.x},${state.hoveredTile.y}`, {
            type: state.placingType,
            x: state.hoveredTile.x,
            y: state.hoveredTile.y,
            dir: "up",
          });
        }
      }
    } else if (state.placingType === "intervalBlock") {
      if (existingTile?.type === "intervalBlock" && justLeftClicked) {
        posToTileMap.set(`${state.hoveredTile.x},${state.hoveredTile.y}`, {
          type: state.placingType,
          x: state.hoveredTile.x,
          y: state.hoveredTile.y,
          start: existingTile.start === "on" ? "off" : "on",
        });
      } else if (existingTile?.type !== "intervalBlock") {
        posToTileMap.set(`${state.hoveredTile.x},${state.hoveredTile.y}`, {
          type: state.placingType,
          x: state.hoveredTile.x,
          y: state.hoveredTile.y,
          start: "on",
        });
      }
    } else {
      // remaining are simple cases
      posToTileMap.set(`${state.hoveredTile.x},${state.hoveredTile.y}`, {
        type: state.placingType,
        x: state.hoveredTile.x,
        y: state.hoveredTile.y,
      });
    }
  }

  // CAMERA CONTROLS
  //////////////////

  if (keysDown.has("-")) {
    state.camera.width *= 1 + dt * 0.001;
    state.camera.height *= 1 + dt * 0.001;
  }
  if (keysDown.has("=")) {
    state.camera.width *= 1 - dt * 0.001;
    state.camera.height *= 1 - dt * 0.001;
  }

  const panSpeed = 0.016;
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
    posToTileMap.delete(tileToRemove);
  }

  state.level.static.tiles = Array.from(posToTileMap.values());

  Level.update(state.level, dt);

  updateIntervalBlocksOnLastFrame(state.level);

  if (justPressed.has("l")) {
    // copy level to clipboard
    const level = {
      static: state.level.static,
    };
    console.log(level);
    navigator.clipboard.writeText(JSON.stringify(level)).then(() => {
      playSound("death");
    });
  }

  // upload level to server!
  if (justPressed.has("u")) {
    client.level.create
      .post(JSON.stringify({ static: state.level.static }))
      .then((uuid) => {
        console.log(uuid);
        playSound("death");
      });
  }
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
      ctx.lineWidth = 0.075;
      ctx.strokeStyle = "black";
      // do dashed line and animated
      ctx.setLineDash([0.2, 0.1]);
      ctx.lineDashOffset = performance.now() * 0.001;
      ctx.strokeRect(0, 0, gridSize, gridSize);

      ctx.restore();
    }

    // draw player centered at camera
    ctx.fillStyle = playerColor;
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

  // put "editing" at top
  ctx.fillStyle = "black";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = `${canvasRect.width * 0.025}px Arial`;
  ctx.fillText(`${state.placingType}`, canvasRect.width / 2, 0);

  const itemSquareSize = 50;

  const itemAmount = Object.keys(hotkeyToPlacingType).length;

  const toolbarRect = {
    left: canvasRect.width / 2 - (itemSquareSize * itemAmount) / 2,
    top: canvasRect.height - itemSquareSize,
    width: itemSquareSize * itemAmount,
    height: itemSquareSize,
  };

  ctx.fillStyle = "black";
  ctx.fillRect(
    toolbarRect.left,
    toolbarRect.top,
    toolbarRect.width,
    toolbarRect.height,
  );

  for (let i = 0; i < itemAmount; i++) {
    const placingType = hotkeyToPlacingType[`${i + 1}`]!;
    ctx.strokeStyle = "white";
    ctx.strokeRect(
      toolbarRect.left + i * itemSquareSize,
      toolbarRect.top,
      itemSquareSize,
      itemSquareSize,
    );

    const cx = toolbarRect.left + i * itemSquareSize + itemSquareSize / 2;
    const cy = toolbarRect.top + itemSquareSize / 2;

    ctx.beginPath();
    ctx.arc(cx, cy, itemSquareSize / 4, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = "white";
    ctx.fill();
  }
}

export const Editor = { create, update, draw };
