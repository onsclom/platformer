import { Editor } from "./editor";
import { Playing, tileSize } from "./playing";
import { OnlineLevelPicker } from "./online-picking-level";
import { OfflineLevelPicker } from "./offline-level-picker";
import { clearInputs } from "../input";
import {
  drawBackground,
  drawCircle,
  drawLavaTile,
  drawLine,
  drawPlayer,
  drawTile,
  drawTileRegl,
  drawWithCamera,
  regl,
  webglCanvas,
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

const sceneFBO = regl.framebuffer({
  color: regl.texture({
    width: 0,
    height: 0,
    wrap: "clamp",
    min: "nearest",
    mag: "nearest",
  }),
  depth: false,
});

const drawPost = regl({
  vert: `
    precision highp float;
    attribute vec2 position;
    varying vec2 vUv;
    void main() {
      vUv = 0.5 * (position + 1.0);  // [0,1] screen UVs
      gl_Position = vec4(position, 0, 1);
    }
  `,
  frag: `
  precision highp float;

  varying vec2 vUv;

  uniform sampler2D sceneTex;
  uniform float uTime;
  uniform vec2 cameraPos;
  uniform vec2 cameraSize;
  uniform vec2 resolution;

  // Hash function for noise
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  // 2D Value noise
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) +
           (c - a) * u.y * (1.0 - u.x) +
           (d - b) * u.x * u.y;
  }

  // Fake 3D noise by projecting time into 2D noise space
  float noise3D(vec2 p, float t) {
    float n1 = noise(p + vec2(sin(t), cos(t)) * 3.0);
    float n2 = noise(p + vec2(sin(t * 0.7 + 3.0), cos(t * 0.5 + 1.0)) * 5.0);
    return mix(n1, n2, 0.5);
  }

  void main() {
    // Convert screen UV [0,1] to normalized device coordinates [-1,1]
    vec2 ndc = vUv * 2.0 - 1.0;

    // Convert to world position using camera
    vec2 worldPos = ndc * cameraSize + cameraPos;

    // Apply animated noise distortion in world space
    float speed = 5.0;
    float magnitude = 0.175;

    float n1 = noise3D(worldPos * 2.0, uTime * speed);
    float n2 = noise3D(worldPos * 2.0 + vec2(4.2, 1.3), uTime * speed);
    worldPos += (vec2(n1, n2) - 0.5) * magnitude;

    // Project back to UV space for sampling the scene texture
    vec2 screenPos = (worldPos - cameraPos) / cameraSize;
    vec2 uv = screenPos * 0.5 + 0.5;

    // Sample the original scene with distorted UV
    gl_FragColor = texture2D(sceneTex, uv);
  }
  `,
  attributes: {
    position: [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, -1],
      [1, 1],
      [-1, 1],
    ],
  },
  uniforms: {
    sceneTex: sceneFBO,
    uTime: regl.context("time"),
    cameraPos: regl.prop<"cameraPos">("cameraPos"),
    cameraSize: regl.prop<"cameraSize">("cameraSize"),
    resolution: ({ viewportWidth, viewportHeight }) => [
      viewportWidth,
      viewportHeight,
    ],
  },
  count: 6,
  depth: { enable: false },
});

export function draw(
  state: State,
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
) {
  // @ts-expect-error don't feel like convincing TS this is valid
  scenes[state.curScene].draw(state[state.curScene], ctx);

  const timeDraws = true;
  if (timeDraws) console.time("webgl draw");
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

export function reglDraw(canvas: HTMLCanvasElement) {
  const playing = globalState.playing;

  const camera = {
    x: playing.camera.x,
    y: playing.camera.y,
    minWidth: 20 / 2,
    minHeight: 20 / 2,
  };

  const canvasRect = canvas.getBoundingClientRect();
  const aspect = canvasRect.width / canvasRect.height;
  const minW = camera.minWidth;
  const minH = camera.minHeight;
  let width = minW;
  let height = minH;
  if (aspect > minW / minH) {
    width = minH * aspect;
  } else {
    height = minW / aspect;
  }

  assert(canvas);

  const cameraPos = [camera.x, camera.y] as [number, number];
  const cameraSize = [width, height] as [number, number];

  const targetWidth = cameraSize[0] * 25;
  const targetHeight = cameraSize[1] * 25;
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  canvas.style.imageRendering = "pixelated";

  sceneFBO.resize(canvas.width, canvas.height);
  regl.poll();
  regl({ framebuffer: sceneFBO })(() => {
    drawScene(cameraPos, cameraSize, playing);
  });
  drawPost({ cameraPos, cameraSize });
}

function drawScene(
  cameraPos: [number, number],
  cameraSize: [number, number],
  playing: State["playing"],
) {
  drawWithCamera({ cameraPos, cameraSize }, () => {
    drawBackground();
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

  // drawOutlines(playing, cameraPos, cameraSize);
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
