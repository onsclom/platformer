import { update, draw, create, State } from "./game";
import { assert } from "./assert";
import { clearInputs } from "./input";
import { webglCanvas } from "./game/regl/index";

// the canvases we draw to
const ctxCanvas = new OffscreenCanvas(0, 0);
const ctx = ctxCanvas.getContext("2d")!;

// the canvas we show the user
export let mainCanvas = document.querySelector("canvas");

let previousTime = performance.now();
let timeToProcess = 0;

const DRAW_FPS_INFO = false;

let curUpdate = update;
let curDraw = draw;
export let globalState = create();
let shouldDraw2d = false;
const timeDraws = true;

if (!mainCanvas) {
  mainCanvas = document.createElement("canvas");
  mainCanvas.style.width = "100%";
  mainCanvas.style.height = "100%";
  mainCanvas.style.position = "fixed";
  mainCanvas.style.top = "0";
  mainCanvas.style.left = "0";
  document.body.appendChild(mainCanvas);

  // f to fullscreen
  document.addEventListener("keydown", (e) => {
    if (e.key === "f") {
      mainCanvas!.requestFullscreen();
    }
  });

  raf();
}

function raf() {
  assert(mainCanvas);
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

    const canvasRect = mainCanvas.getBoundingClientRect();
    mainCanvas.width = canvasRect.width * devicePixelRatio;
    mainCanvas.height = canvasRect.height * devicePixelRatio;

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

    {
      const screenCtx = mainCanvas.getContext("2d")!;

      // screenCtx.drawImage(webglCanvas, 0, 0);
      // stretch to full size
      screenCtx.drawImage(webglCanvas, 0, 0);
    }

    // draw offscreen canvas to main canvas
    {
      const screenCtx = mainCanvas.getContext("2d")!;
      screenCtx.canvas.style.imageRendering = "pixelated";
      if (shouldDraw2d) screenCtx.drawImage(ctxCanvas, 0, 0);

      const fontSize = 100;
      screenCtx.fillStyle = "blue";
      screenCtx.font = `${fontSize}px Arial`;
      screenCtx.textAlign = "left";
      screenCtx.textBaseline = "top";
      // screenCtx.fillText(shouldDraw2d ? "ctx2d" : "webgl", 50, 50);
    }
  }

  if (DRAW_FPS_INFO) {
    const screenCtx = mainCanvas.getContext("2d")!;
    const fpsText = `FPS: ${Math.round(1000 / (performance.now() - frameStart))}`;
    const frameTimeText = `frame time: ${Math.round(performance.now() - frameStart)}ms`;
    const fontSize = 30;

    screenCtx.textAlign = "left";
    screenCtx.textBaseline = "top";
    screenCtx.font = `${fontSize}px Arial`;

    screenCtx.save();
    screenCtx.translate(1.5, 1.5);
    screenCtx.fillStyle = "black";
    screenCtx.fillText(fpsText, 10, 10);
    screenCtx.fillText(frameTimeText, 10, 10 + fontSize);
    screenCtx.restore();

    screenCtx.fillStyle = "white";
    screenCtx.fillText(fpsText, 10, 10);
    screenCtx.fillText(frameTimeText, 10, 10 + fontSize);
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
