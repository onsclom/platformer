import { Editor } from "./editor";
import { Playing, tileSize } from "./playing";
import { OnlineLevelPicker } from "./online-picking-level";
import { OfflineLevelPicker } from "./offline-level-picker";
import { clearInputs } from "../input";
import {
  drawCircle,
  drawLavaTile,
  drawLine,
  drawPlayer,
  drawTile,
  drawTileRegl,
  drawWithCamera,
  regl,
} from "./regl";
import { globalState } from "../entry-point";
import { cannonBallRadius, Tile, timeSpentOnPhase } from "./level";
import { playerHeight, playerWidth } from "./player";
import { assert } from "../assert";

const scenes = {
  editor: Editor,
  playing: Playing,
  onlineLevelPicker: OnlineLevelPicker,
  offlineLevelPicker: OfflineLevelPicker,
} as const;

const startingScene = "playing";

export function create() {
  return {
    curScene: startingScene as keyof typeof scenes,
    ...(typedFromEntries(
      typedKeys(scenes).map((key) => [key, scenes[key].create()]),
    ) as SceneData),
  };
}

export function update(state: State, dt: number) {
  // @ts-expect-error don't feel like convincing TS this is valid
  scenes[state.curScene].update(state[state.curScene], dt);
  clearInputs();
}

export function draw(
  state: State,
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
) {
  // @ts-expect-error don't feel like convincing TS this is valid
  scenes[state.curScene].draw(state[state.curScene], ctx);

  const timeDraws = true;
  if (timeDraws) console.time("webgl draw");
  // @ts-expect-error
  reglDraw(ctx.canvas);
  if (timeDraws) console.timeEnd("webgl draw");
}

// shoved the typescript magic i don't really understand here
export type State = ReturnType<typeof create>;
const typedKeys = <T extends object>(obj: T) => Object.keys(obj) as (keyof T)[];
function typedFromEntries<T extends readonly (readonly [PropertyKey, any])[]>(
  entries: T,
): { [K in T[number] as K[0]]: K[1] } {
  return Object.fromEntries(entries) as any;
}
type SceneData = {
  [K in keyof typeof scenes]: (typeof scenes)[K] extends {
    create: () => infer R;
  }
    ? R
    : never;
};

// === REGL STUFf

function reglDraw(canvas: OffscreenCanvas) {
  regl.poll();
  regl.clear({
    color: [0.2, 0.2, 0.2, 1],
    depth: 1,
  });

  const playing = globalState.playing;

  const camera = {
    x: playing.camera.x,
    y: playing.camera.y,
    minWidth: 25 / 2,
    minHeight: 25 / 2,
  };

  assert(canvas);
  const aspect = canvas.width / canvas.height;
  const minW = camera.minWidth;
  const minH = camera.minHeight;
  let width = minW;
  let height = minH;
  if (aspect > minW / minH) {
    width = minH * aspect;
  } else {
    height = minW / aspect;
  }

  const cameraPos = [camera.x, camera.y] as [number, number];
  const cameraSize = [width, height] as [number, number];

  drawWithCamera({ cameraPos, cameraSize }, () => {
    {
      const color: [number, number, number, number] = [0.7, 0.7, 0.7, 1];
      playing.level.ephemeral.background.tiles.forEach((tile) => {
        drawTileRegl({ tileCenter: [tile.x, tile.y], color });
      });
    }

    const intervalAOn = Boolean(
      Math.floor(performance.now() / timeSpentOnPhase) % 2,
    );

    playing.level.static.tiles.forEach((tile) => {
      if (tile.type === "solid") {
        {
          const color: [number, number, number, number] = [1, 1, 1, 1];
          drawTile([tile.x, tile.y], color);
        }
      } else if (tile.type === "lava") {
      } else if (tile.type === "cannon") {
        const color: [number, number, number, number] = [0, 1, 0, 1];
        drawTile([tile.x, tile.y], color);
      } else if (tile.type === "trampoline") {
        const color: [number, number, number, number] = [0, 1, 1, 1];
        drawTile([tile.x, tile.y], color);
      } else if (tile.type === "interval") {
        const color: [number, number, number, number] =
          (tile.start === "on") === intervalAOn ? [1, 1, 0, 1] : [1, 1, 0, 0.5];
        drawTile([tile.x, tile.y], color);
      }
    });
  });

  const time = performance.now() * 0.005;
  for (const tile of playing.level.static.tiles) {
    if (tile.type === "lava") {
      drawLavaTile({
        tileCenter: [tile.x, tile.y],
        cameraPos,
        cameraSize,
        time,
      });
    }
  }

  drawOutlines(playing, cameraPos, cameraSize);

  const color = [1, 0, 0, 1] as [number, number, number, number];
  playing.level.ephemeral.cannonBalls.instances.forEach((cannonBall) => {
    if (cannonBall.dx === 0 && cannonBall.dy === 0) return;
    drawCircle({
      center: [cannonBall.x, cannonBall.y],
      radius: cannonBallRadius,
      cameraPos,
      cameraSize,
      color,
    });
  });

  drawPlayer({
    center: [playing.player.x, playing.player.y],
    cameraPos,
    cameraSize,
    color: [0, 0, 1, 1],
    yscale: playing.player.yScale,
    xscale: playing.player.xScale,
    size: [playerWidth, playerHeight],
    rotation: -playing.camera.angle * 8,
  });
}

function drawOutlines(
  playing: State["playing"],
  cameraPos: [number, number],
  cameraSize: [number, number],
) {
  let linesDrawn = 0;
  const borderThickness = 0.1;
  const color = [0, 0, 0, 1] as [number, number, number, number];
  const tileMap = new Map<string, Tile>();
  for (const tile of playing.level.static.tiles) {
    tileMap.set(`${tile.x},${tile.y}`, tile);
  }
  const halfTile = tileSize / 2;
  for (const tile of playing.level.static.tiles) {
    const dirs = [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ];

    {
      // above
      const aboveTile = tileMap.get(`${tile.x},${tile.y + 1}`);
      if (!aboveTile || aboveTile.type !== tile.type) {
        // draw border between
        drawLine({
          thickness: borderThickness,
          start: [tile.x - halfTile, tile.y + halfTile],
          end: [tile.x + halfTile, tile.y + halfTile],
          color,
          cameraPos,
          cameraSize,
        });
        linesDrawn++;
      }
    }

    {
      // left
      const leftTile = tileMap.get(`${tile.x - 1},${tile.y}`);
      if (!leftTile || leftTile.type !== tile.type) {
        // draw border between
        drawLine({
          thickness: borderThickness,
          start: [tile.x - halfTile, tile.y - halfTile],
          end: [tile.x - halfTile, tile.y + halfTile],
          color,
          cameraPos,
          cameraSize,
        });
        linesDrawn++;
      }
    }

    {
      // right
      const rightTile = tileMap.get(`${tile.x + 1},${tile.y}`);
      if (!rightTile) {
        // draw border between
        drawLine({
          thickness: borderThickness,
          start: [tile.x + halfTile, tile.y - halfTile],
          end: [tile.x + halfTile, tile.y + halfTile],
          color,
          cameraPos,
          cameraSize,
        });
        linesDrawn++;
      }
    }

    {
      // below
      const belowTile = tileMap.get(`${tile.x},${tile.y - 1}`);
      if (!belowTile) {
        // draw border between
        drawLine({
          thickness: borderThickness,
          start: [tile.x - halfTile, tile.y - halfTile],
          end: [tile.x + halfTile, tile.y - halfTile],
          color,
          cameraPos,
          cameraSize,
        });
        linesDrawn++;
      }
    }
  }

  // TODO: instance lines prob??
  // console.log(linesDrawn);
}
