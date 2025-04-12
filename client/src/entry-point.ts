import { update, draw, create, reglDraw } from "./game";
import { clearInputs } from "./input";
import { webglCanvas } from "./game/regl/index";

let previousTime = performance.now();
let timeToProcess = 0;

let curUpdate = update;
let curDraw = draw;
export let globalState = create();
let shouldDraw2d = true;
const timeDraws = true;

raf();

function raf() {
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

    // const canvasRect = webglCanvas.getBoundingClientRect();
    // webglCanvas.width = canvasRect.width * devicePixelRatio;
    // webglCanvas.height = canvasRect.height * devicePixelRatio;

    timeToProcess += dt;
    const physicHz = 500;
    const physicTickMs = 1000 / physicHz;
    while (timeToProcess > physicTickMs) {
      timeToProcess -= physicTickMs;
      curUpdate(globalState, physicTickMs);
      clearInputs();
    }

    {
      // if (timeDraws) console.time("regl draw");
      reglDraw(webglCanvas);
      // if (timeDraws) console.timeEnd("regl draw");
    }

    // draw offscreen canvas to main canvas
    {
      // const screenCtx = canvas.getContext("2d")!;
      // if (shouldDraw2d) screenCtx.drawImage(ctxCanvas, 0, 0);
    }

    // frame time
    const frameTime = performance.now() - frameStart;
    console.log(`Frame time: ${frameTime.toFixed(2)}ms`);
    const theoreticalFps = 1000 / frameTime;
    console.log(`Theoretical FPS: ${theoreticalFps.toFixed(2)}`);
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key === "j") {
    shouldDraw2d = !shouldDraw2d;
  }
  if (e.key === "f") {
    webglCanvas.requestFullscreen();
  }
});

// if (import.meta.hot) {
//   import.meta.hot.accept("./game/index", (newModule) => {
//     if (newModule) {
//       curUpdate = newModule.update;
//       curDraw = newModule.draw;
//       const oldState = globalState;
//       globalState = newModule.create();
//       Object.assign(globalState, oldState);
//     }
//   });
// }
