import createRegl from "regl";

export const webglCanvas = new OffscreenCanvas(0, 0);
export const gl = webglCanvas.getContext("webgl2")!;

export const regl = createRegl({ gl });
