import { update, draw, create } from "./game";
import { assert } from "./assert";
import { clearInputs } from "./input";

let canvas = document.querySelector("canvas");

let previousTime = performance.now();
let timeToProcess = 0;

const DRAW_FPS_INFO = true;

let curUpdate = update;
let curDraw = draw;
export let globalState = create();

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

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    timeToProcess += dt;
    const physicHz = 500;
    const physicTickMs = 1000 / physicHz;
    while (timeToProcess > physicTickMs) {
      timeToProcess -= physicTickMs;
      curUpdate(globalState, physicTickMs);
      clearInputs();
    }
    curDraw(globalState, ctx);

    if (DRAW_FPS_INFO) {
      // const fpsText = `FPS: ${Math.round(1000 / (performance.now() - frameStart))}`;
      // const frameTimeText = `frame time: ${Math.round(performance.now() - frameStart)}ms`;
      // const fontSize = 30;

      // ctx.textAlign = "left";
      // ctx.textBaseline = "top";
      // ctx.font = `${fontSize}px Arial`;

      // ctx.save();
      // ctx.translate(1.5, 1.5);
      // ctx.fillStyle = "black";
      // ctx.fillText(fpsText, 10, 10);
      // ctx.fillText(frameTimeText, 10, 10 + fontSize);
      // ctx.restore();

      // ctx.fillStyle = "white";
      // ctx.fillText(fpsText, 10, 10);
      // ctx.fillText(frameTimeText, 10, 10 + fontSize);
      const frameTime = performance.now() - frameStart;
      const fps = Math.round(1000 / frameTime);
      console.log(`theoretical fps: ${fps}`);
    }
  }
}

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
