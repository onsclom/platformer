import { update, draw, create } from "./game";
import { assert } from "./assert";
import { clearInputs } from "./input";

let canvas = document.querySelector("canvas");

let previousTime = performance.now();
let timeToProcess = 0;
const LOG_FRAME_TIMES = false;

let curUpdate = update;
let curDraw = draw;
let state = create();

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
  if (LOG_FRAME_TIMES) console.time("frame");
  {
    requestAnimationFrame(raf);

    const now = performance.now();
    const dt = now - previousTime;
    previousTime = now;

    // if returning to tab after some time, ignore that
    if (dt > 100) return;

    const canvasRect = canvas.getBoundingClientRect();
    canvas.width = canvasRect.width * devicePixelRatio;
    canvas.height = canvasRect.height * devicePixelRatio;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    timeToProcess += dt;
    const physicHz = 1000;
    const physicTickMs = 1000 / physicHz;
    while (timeToProcess > physicTickMs) {
      timeToProcess -= physicTickMs;
      const dt = physicTickMs;
      curUpdate(state, dt);
      clearInputs();
    }

    curDraw(state, ctx);
  }
  if (LOG_FRAME_TIMES) console.timeEnd("frame");
}

if (import.meta.hot) {
  import.meta.hot.accept("./game/index", (newModule) => {
    if (newModule) {
      curUpdate = newModule.update;
      curDraw = newModule.draw;
      const oldState = state;
      state = newModule.create();
      Object.assign(state, oldState);
    }
  });
}

document.addEventListener("contextmenu", function (event) {
  event.preventDefault();
});
