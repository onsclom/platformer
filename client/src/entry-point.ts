import { update, draw, create } from "./game";
import { assert } from "./assert";
import { clearInputs } from "./input";
import createRegl from "regl";

// the canvases we draw to
const ctxCanvas = new OffscreenCanvas(0, 0);
const ctx = ctxCanvas.getContext("2d")!;

const webglCanvas = new OffscreenCanvas(0, 0);
export const gl = webglCanvas.getContext("webgl2")!;
const regl = createRegl({ gl });

// the canvas we show the user
let canvas = document.querySelector("canvas");

let previousTime = performance.now();
let timeToProcess = 0;

const DRAW_FPS_INFO = true;

let curUpdate = update;
let curDraw = draw;
export let globalState = create();
let shouldDraw2d = true;

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
    assert(gl);

    timeToProcess += dt;
    const physicHz = 500;
    const physicTickMs = 1000 / physicHz;
    while (timeToProcess > physicTickMs) {
      timeToProcess -= physicTickMs;
      curUpdate(globalState, physicTickMs);
      clearInputs();
    }
    ctx.save();
    curDraw(globalState, ctx);
    ctx.restore();

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
      regl.poll();
      // This clears the color buffer to black and the depth buffer to 1
      regl.clear({
        color: [0, 0, 0, 1],
        depth: 1,
      });

      // In regl, draw operations are specified declaratively using. Each JSON
      // command is a complete description of all state. This removes the need to
      // .bind() things like buffers or shaders. All the boilerplate of setting up
      // and tearing down state is automated.
      regl({
        // In a draw call, we can pass the shader source code to regl
        frag: `
        precision mediump float;
        uniform vec4 color;
        void main () {
          gl_FragColor = color;
        }`,

        vert: `
        precision mediump float;
        attribute vec2 position;
        void main () {
          gl_Position = vec4(position, 0, 1);
        }`,

        attributes: {
          position: [
            [-1, 0],
            [0, -1],
            [1, 1],
          ],
        },

        uniforms: {
          color: [1, 0, 0, 1],
        },

        count: 3,
      })();
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
