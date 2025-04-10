import createRegl from "regl";

export const webglCanvas = new OffscreenCanvas(0, 0);
const gl = webglCanvas.getContext("webgl2")!;

export const regl = createRegl({ gl });

type TileUniforms = {
  tileCenter: [number, number];
  cameraPos: [number, number];
  cameraSize: [number, number];
  color: [number, number, number, number];
};

type TileAttributes = {
  position: number[][];
};

type TileProps = {
  tileCenter: [number, number];
  cameraPos: [number, number];
  cameraSize: [number, number];
  color: [number, number, number, number];
};

export const drawTile = regl<TileUniforms, TileAttributes, TileProps>({
  depth: { enable: false },
  vert: `
    precision highp float;
    attribute vec2 position;

    uniform vec2 tileCenter;
    uniform vec2 cameraPos;
    uniform vec2 cameraSize;

    void main() {
      vec2 worldPos = position + tileCenter;
      vec2 screenPos = (worldPos - cameraPos) / cameraSize;
      gl_Position = vec4(screenPos, 0, 1);
    }
   `,
  frag: `
    precision highp float;

    uniform vec4 color;

    void main() {
      gl_FragColor = color;
    }
  `,
  attributes: {
    position: [
      [-0.5, -0.5],
      [0.5, -0.5],
      [0.5, 0.5],
      [-0.5, -0.5],
      [0.5, 0.5],
      [-0.5, 0.5],
    ],
  },
  uniforms: {
    tileCenter: regl.prop<TileProps, "tileCenter">("tileCenter"),
    cameraPos: regl.prop<TileProps, "cameraPos">("cameraPos"),
    cameraSize: regl.prop<TileProps, "cameraSize">("cameraSize"),
    color: regl.prop<TileProps, "color">("color"),
  },
  count: 6,
});

type CircleUniforms = {
  center: [number, number]; // world-space position of the circle
  radius: number;
  cameraPos: [number, number];
  cameraSize: [number, number];
  color: [number, number, number, number];
};

type CircleAttributes = {
  position: [number, number][];
};

type CircleProps = {
  center: [number, number];
  radius: number;
  cameraPos: [number, number];
  cameraSize: [number, number];
  color: [number, number, number, number];
};

export const drawCircle = regl<CircleUniforms, CircleAttributes, CircleProps>({
  depth: { enable: false },

  vert: `
    precision highp float;
    attribute vec2 position;

    uniform vec2 center;
    uniform float radius;
    uniform vec2 cameraPos;
    uniform vec2 cameraSize;

    varying vec2 localPos;

    void main() {
      // Local square: -0.5 to 0.5
      localPos = position;

      // Scale and translate to world space
      vec2 worldPos = center + position * radius * 2.0;

      // Convert to screen space
      vec2 screenPos = (worldPos - cameraPos) / cameraSize;
      gl_Position = vec4(screenPos, 0.0, 1.0);
    }
  `,

  frag: `
    precision highp float;

    uniform vec4 color;
    varying vec2 localPos;

    void main() {
      float dist = length(localPos);
      if (dist > 0.5) discard; // outside the unit circle
      gl_FragColor = color;
    }
  `,

  attributes: {
    position: [
      [-0.5, -0.5],
      [0.5, -0.5],
      [0.5, 0.5],
      [-0.5, -0.5],
      [0.5, 0.5],
      [-0.5, 0.5],
    ],
  },

  uniforms: {
    center: regl.prop<CircleProps, "center">("center"),
    radius: regl.prop<CircleProps, "radius">("radius"),
    cameraPos: regl.prop<CircleProps, "cameraPos">("cameraPos"),
    cameraSize: regl.prop<CircleProps, "cameraSize">("cameraSize"),
    color: regl.prop<CircleProps, "color">("color"),
  },

  count: 6,
});

type RectUniforms = {
  center: [number, number];
  size: [number, number];
  cameraPos: [number, number];
  cameraSize: [number, number];
  color: [number, number, number, number];
};

type RectAttributes = {
  position: [number, number][];
};

type RectProps = {
  center: [number, number];
  size: [number, number];
  cameraPos: [number, number];
  cameraSize: [number, number];
  color: [number, number, number, number];
};

export const drawRect = regl<RectUniforms, RectAttributes, RectProps>({
  depth: { enable: false },

  vert: `
    precision highp float;
    attribute vec2 position;

    uniform vec2 center;
    uniform vec2 size;
    uniform vec2 cameraPos;
    uniform vec2 cameraSize;

    void main() {
      // Local positions are from -0.5 to 0.5, then scaled to size
      vec2 worldPos = center + position * size;
      vec2 screenPos = (worldPos - cameraPos) / cameraSize;
      gl_Position = vec4(screenPos, 0.0, 1.0);
    }
  `,

  frag: `
    precision highp float;

    uniform vec4 color;

    void main() {
      gl_FragColor = color;
    }
  `,

  attributes: {
    position: [
      [-0.5, -0.5],
      [0.5, -0.5],
      [0.5, 0.5],
      [-0.5, -0.5],
      [0.5, 0.5],
      [-0.5, 0.5],
    ],
  },

  uniforms: {
    center: regl.prop<RectProps, "center">("center"),
    size: regl.prop<RectProps, "size">("size"),
    cameraPos: regl.prop<RectProps, "cameraPos">("cameraPos"),
    cameraSize: regl.prop<RectProps, "cameraSize">("cameraSize"),
    color: regl.prop<RectProps, "color">("color"),
  },

  count: 6,
});

type PlayerUniforms = {
  center: [number, number];
  size: [number, number];
  rotation: number;
  xscale: number;
  yscale: number;
  cameraPos: [number, number];
  cameraSize: [number, number];
  color: [number, number, number, number];
};

type PlayerAttributes = {
  position: [number, number][];
};

type PlayerProps = {
  center: [number, number];
  size: [number, number];
  rotation: number;
  xscale: number;
  yscale: number;
  cameraPos: [number, number];
  cameraSize: [number, number];
  color: [number, number, number, number];
};

export const drawPlayer = regl<PlayerUniforms, PlayerAttributes, PlayerProps>({
  depth: { enable: false },

  vert: `
    precision highp float;
    attribute vec2 position;

    uniform vec2 center;
    uniform vec2 size;
    uniform float rotation;
    uniform float xscale;
    uniform float yscale;
    uniform vec2 cameraPos;
    uniform vec2 cameraSize;

    void main() {
      // Start with local space quad: [-0.5, -0.5] to [0.5, 0.5]
      vec2 scaled = position * size * vec2(xscale, yscale);

      // Apply rotation
      float s = sin(rotation);
      float c = cos(rotation);
      vec2 rotated = vec2(
        scaled.x * c - scaled.y * s,
        scaled.x * s + scaled.y * c
      );

      // Move to world space
      vec2 worldPos = center + rotated;

      // Convert to screen space
      vec2 screenPos = (worldPos - cameraPos) / cameraSize;
      gl_Position = vec4(screenPos, 0.0, 1.0);
    }
  `,

  frag: `
    precision highp float;
    uniform vec4 color;

    void main() {
      gl_FragColor = color;
    }
  `,

  attributes: {
    position: [
      [-0.5, -0.5],
      [0.5, -0.5],
      [0.5, 0.5],
      [-0.5, -0.5],
      [0.5, 0.5],
      [-0.5, 0.5],
    ],
  },

  uniforms: {
    center: regl.prop<PlayerProps, "center">("center"),
    size: regl.prop<PlayerProps, "size">("size"),
    rotation: regl.prop<PlayerProps, "rotation">("rotation"),
    xscale: regl.prop<PlayerProps, "xscale">("xscale"),
    yscale: regl.prop<PlayerProps, "yscale">("yscale"),
    cameraPos: regl.prop<PlayerProps, "cameraPos">("cameraPos"),
    cameraSize: regl.prop<PlayerProps, "cameraSize">("cameraSize"),
    color: regl.prop<PlayerProps, "color">("color"),
  },

  count: 6,
});
