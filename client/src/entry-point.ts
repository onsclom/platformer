import { update, draw, create } from "./game";
import { assert } from "./assert";
import { clearInputs } from "./input";
import {
  drawCircle,
  drawPlayer,
  drawTile,
  regl,
  webglCanvas,
} from "./game/regl/index";
import { cannonBallRadius, timeSpentOnPhase } from "./game/level";
import { playerHeight, playerWidth } from "./game/player";

// the canvases we draw to
const ctxCanvas = new OffscreenCanvas(0, 0);
const ctx = ctxCanvas.getContext("2d")!;

// the canvas we show the user
let canvas = document.querySelector("canvas");

let previousTime = performance.now();
let timeToProcess = 0;

const DRAW_FPS_INFO = true;

let curUpdate = update;
let curDraw = draw;
export let globalState = create();
let shouldDraw2d = true;
const timeDraws = true;

if (!canvas) {
  canvas = document.createElement("canvas");
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";
  document.body.appendChild(canvas);

  // f to fullscreen
  document.addEventListener("keydown", (e) => {
    if (e.key === "f") {
      canvas!.requestFullscreen();
    }
  });

  raf();
}

function raf() {
  assert(canvas);
  const frameStart = performance.now();
  {
    requestAnimationFrame(raf);

    const now = performance.now();
    const dt = now - previousTime;
    previousTime = now;

    // if returning to tab after some time, or some other weirdness, dt can be
    // very big. let's just ignore these cases and wait for the next frame
    const dtTooBig = dt > 100;
    if (dtTooBig) return;

    const canvasRect = canvas.getBoundingClientRect();
    canvas.width = canvasRect.width * devicePixelRatio;
    canvas.height = canvasRect.height * devicePixelRatio;

    ctxCanvas.width = canvasRect.width * devicePixelRatio;
    ctxCanvas.height = canvasRect.height * devicePixelRatio;

    webglCanvas.width = canvasRect.width * devicePixelRatio;
    webglCanvas.height = canvasRect.height * devicePixelRatio;

    assert(ctx);
    ctx.scale(devicePixelRatio, devicePixelRatio);

    timeToProcess += dt;
    const physicHz = 500;
    const physicTickMs = 1000 / physicHz;
    while (timeToProcess > physicTickMs) {
      timeToProcess -= physicTickMs;
      curUpdate(globalState, physicTickMs);
      clearInputs();
    }
    if (timeDraws) console.time("ctx2d draw");
    ctx.save();
    curDraw(globalState, ctx);
    ctx.restore();
    if (timeDraws) console.timeEnd("ctx2d draw");

    if (DRAW_FPS_INFO) {
      const fpsText = `FPS: ${Math.round(1000 / (performance.now() - frameStart))}`;
      const frameTimeText = `frame time: ${Math.round(performance.now() - frameStart)}ms`;
      const fontSize = 30;

      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.font = `${fontSize}px Arial`;

      ctx.save();
      ctx.translate(1.5, 1.5);
      ctx.fillStyle = "black";
      ctx.fillText(fpsText, 10, 10);
      ctx.fillText(frameTimeText, 10, 10 + fontSize);
      ctx.restore();

      ctx.fillStyle = "white";
      ctx.fillText(fpsText, 10, 10);
      ctx.fillText(frameTimeText, 10, 10 + fontSize);
    }

    {
      if (timeDraws) console.time("webgl draw");
      reglDraw();
      if (timeDraws) console.timeEnd("webgl draw");

      const screenCtx = canvas.getContext("2d")!;
      screenCtx.drawImage(webglCanvas, 0, 0);
    }

    // draw offscreen canvas to main canvas
    {
      const screenCtx = canvas.getContext("2d")!;
      if (shouldDraw2d) screenCtx.drawImage(ctxCanvas, 0, 0);
    }
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key === "j") {
    shouldDraw2d = !shouldDraw2d;
  }
});

if (import.meta.hot) {
  import.meta.hot.accept("./game/index", (newModule) => {
    if (newModule) {
      curUpdate = newModule.update;
      curDraw = newModule.draw;
      const oldState = globalState;
      globalState = newModule.create();
      Object.assign(globalState, oldState);
    }
  });
}

function reglDraw() {
  regl.poll();
  regl.clear({
    color: [0, 0, 0, 1],
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

  const cameraPos = [camera.x, camera.y] as const;
  const cameraSize = [width, height] as const;

  {
    const color = [0.7, 0.7, 0.7, 1] as const;
    globalState.playing.level.ephemeral.background.tiles.forEach((tile) => {
      drawTile({
        tileCenter: [tile.x, tile.y],
        cameraPos,
        cameraSize,
        color,
      });
    });
  }

  const intervalAOn = Boolean(
    Math.floor(performance.now() / timeSpentOnPhase) % 2,
  );
  globalState.playing.level.static.tiles.forEach((tile) => {
    if (tile.type === "solid") {
      {
        const color = [1, 1, 1, 1] as const;
        drawTile({
          tileCenter: [tile.x, tile.y],
          cameraPos,
          cameraSize,
          color,
        });
      }
    } else if (tile.type === "lava") {
      const color = [1, 0, 0, 1];
      drawTile({
        tileCenter: [tile.x, tile.y],
        cameraPos,
        cameraSize,
        color,
      });
    } else if (tile.type === "cannon") {
      const color = [0, 1, 0, 1];
      drawTile({
        tileCenter: [tile.x, tile.y],
        cameraPos,
        cameraSize,
        color,
      });
    } else if (tile.type === "trampoline") {
      const color = [0, 1, 1, 1];
      drawTile({
        tileCenter: [tile.x, tile.y],
        cameraPos,
        cameraSize,
        color,
      });
    } else if (tile.type === "interval") {
      ctx.restore();
      const color =
        (tile.start === "on") === intervalAOn ? [1, 1, 0, 1] : [1, 1, 0, 0.5];
      drawTile({
        tileCenter: [tile.x, tile.y],
        cameraPos,
        cameraSize,
        color,
      });
    }
  });

  // drawTile({
  //   tileCenter: [playing.player.x, playing.player.y],
  //   cameraPos: [camera.x, camera.y],
  //   cameraSize,
  //   color: [0, 0, 1, 0.5],
  // });

  const color = [1, 0, 0, 1];
  globalState.playing.level.ephemeral.cannonBalls.instances.forEach(
    (cannonBall) => {
      if (cannonBall.dx === 0 && cannonBall.dy === 0) return;
      drawCircle({
        center: [cannonBall.x, cannonBall.y],
        radius: cannonBallRadius,
        cameraPos,
        cameraSize,
        color,
      });
    },
  );

  drawPlayer({
    center: [globalState.playing.player.x, globalState.playing.player.y],
    cameraPos,
    cameraSize,
    color: [0, 0, 1, 1],
    yscale: globalState.playing.player.yScale,
    xscale: globalState.playing.player.xScale,
    size: [playerWidth, playerHeight],
    rotation: -globalState.playing.camera.angle * 8,
  });
}
