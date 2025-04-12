import createRegl from "regl";

export const webglCanvas = document.createElement("canvas");
document.body.appendChild(webglCanvas);
webglCanvas.style.width = "100%";
webglCanvas.style.height = "100%";
webglCanvas.style.position = "absolute";
webglCanvas.style.top = "0";
webglCanvas.style.left = "0";

const gl = webglCanvas.getContext("webgl", { antialias: false })!;
export const regl = createRegl({ gl });

type DrawWithCameraProps = {
  cameraPos: [number, number];
  cameraSize: [number, number];
};

type DrawWithCameraContext = {
  cameraPos: [number, number];
  cameraSize: [number, number];
};

export const drawWithCamera = regl<
  {},
  {},
  DrawWithCameraProps,
  DrawWithCameraContext
>({
  context: {
    cameraPos: (_ctx, props) => props.cameraPos,
    cameraSize: (_ctx, props) => props.cameraSize,
  },
});

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
  color: [number, number, number, number];
};

type TileContext = {
  cameraSize: [number, number];
  cameraPos: [number, number];
};

export const drawTileRegl = regl<
  TileUniforms,
  TileAttributes,
  TileProps,
  TileContext
>({
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
    tileCenter: (_ctx, props) => props.tileCenter,
    color: (_ctx, props) => props.color,
    cameraPos: (ctx, _props) => ctx.cameraPos,
    cameraSize: (ctx, _props) => ctx.cameraSize,
  },
  count: 6,
});

export const drawTile = (
  tileCenter: [number, number],
  color: [number, number, number, number],
) => {
  drawTileRegl({
    tileCenter,
    color,
  });
};

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

type LineUniforms = {
  start: [number, number];
  end: [number, number];
  thickness: number;
  cameraPos: [number, number];
  cameraSize: [number, number];
  color: [number, number, number, number];
};

type LineAttributes = {
  position: [number, number][];
};

type LineProps = {
  start: [number, number];
  end: [number, number];
  thickness: number;
  cameraPos: [number, number];
  cameraSize: [number, number];
  color: [number, number, number, number];
};

export const drawLine = regl<LineUniforms, LineAttributes, LineProps>({
  depth: { enable: false },

  vert: `
    precision highp float;
    attribute vec2 position;

    uniform vec2 start;
    uniform vec2 end;
    uniform float thickness;
    uniform vec2 cameraPos;
    uniform vec2 cameraSize;

    varying vec2 localPos;
    varying float halfLen;
    varying float radius;

    void main() {
      vec2 dir = end - start;
      float len = length(dir);
      vec2 norm = normalize(dir);
      vec2 perp = vec2(-norm.y, norm.x);

      radius = thickness * 0.5;
      halfLen = len * 0.5;

      // Expand geometry in X from -0.5 to 0.5 + room for caps
      float totalLen = len + thickness; // add room for both caps

      // localPos in geometry space
      localPos = vec2(position.x * totalLen * 0.5, position.y * radius);

      vec2 center = 0.5 * (start + end);
      vec2 offset = norm * localPos.x + perp * localPos.y;
      vec2 worldPos = center + offset;

      vec2 screenPos = (worldPos - cameraPos) / cameraSize;
      gl_Position = vec4(screenPos, 0.0, 1.0);
    }
  `,

  frag: `
    precision highp float;
    varying vec2 localPos;
    varying float halfLen;
    varying float radius;

    uniform vec4 color;

    void main() {
      vec2 p = localPos;

      // Main body
      if (abs(p.x) <= halfLen) {
        if (abs(p.y) > radius) discard;
      }
      // Left cap
      else if (p.x < -halfLen) {
        if (length(p - vec2(-halfLen, 0.0)) > radius) discard;
      }
      // Right cap
      else if (p.x > halfLen) {
        if (length(p - vec2(halfLen, 0.0)) > radius) discard;
      }

      gl_FragColor = color;
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
    start: regl.prop<LineProps, "start">("start"),
    end: regl.prop<LineProps, "end">("end"),
    thickness: regl.prop<LineProps, "thickness">("thickness"),
    cameraPos: regl.prop<LineProps, "cameraPos">("cameraPos"),
    cameraSize: regl.prop<LineProps, "cameraSize">("cameraSize"),
    color: regl.prop<LineProps, "color">("color"),
  },

  count: 6,
});

type LavaTileUniforms = {
  tileCenter: [number, number];
  cameraPos: [number, number];
  cameraSize: [number, number];
  time: number;
};

type LavaTileAttributes = {
  position: number[][];
};

type LavaTileProps = {
  tileCenter: [number, number];
  cameraPos: [number, number];
  cameraSize: [number, number];
  time: number;
};

const lavaFragShader = `precision highp float;

  varying vec2 worldPos;
  uniform float time;

  // 3D hash based on IQ’s method
  vec3 hash3(vec3 p) {
    p = vec3(
      dot(p, vec3(127.1, 311.7, 74.7)),
      dot(p, vec3(269.5, 183.3, 246.1)),
      dot(p, vec3(113.5, 271.9, 124.6))
    );
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }

  // 3D Perlin noise
  float perlin3(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);

    float n000 = dot(hash3(i + vec3(0, 0, 0)), f - vec3(0, 0, 0));
    float n100 = dot(hash3(i + vec3(1, 0, 0)), f - vec3(1, 0, 0));
    float n010 = dot(hash3(i + vec3(0, 1, 0)), f - vec3(0, 1, 0));
    float n110 = dot(hash3(i + vec3(1, 1, 0)), f - vec3(1, 1, 0));
    float n001 = dot(hash3(i + vec3(0, 0, 1)), f - vec3(0, 0, 1));
    float n101 = dot(hash3(i + vec3(1, 0, 1)), f - vec3(1, 0, 1));
    float n011 = dot(hash3(i + vec3(0, 1, 1)), f - vec3(0, 1, 1));
    float n111 = dot(hash3(i + vec3(1, 1, 1)), f - vec3(1, 1, 1));

    float nx00 = mix(n000, n100, u.x);
    float nx10 = mix(n010, n110, u.x);
    float nx01 = mix(n001, n101, u.x);
    float nx11 = mix(n011, n111, u.x);

    float nxy0 = mix(nx00, nx10, u.y);
    float nxy1 = mix(nx01, nx11, u.y);

    return mix(nxy0, nxy1, u.z);
  }

  // Lava color ramp
  vec3 lavaRamp(float t) {
    vec3 black  = vec3(0.0, 0.0, 0.0);
    vec3 red    = vec3(1.0, 0.0, 0.0);
    vec3 orange = vec3(1.0, 0.5, 0.0);
    vec3 yellow = vec3(.8, .8, 0.0);
    t *= 1.;

    vec3 color;

    if (t < 0.4) {
      color = red;
    } else if (t < 0.6) {
      color = orange;
    } else {
      color = yellow;
    }

    return color;
  }

  void main() {
    float scale = .5;
    vec3 pos3D = vec3(worldPos * scale, time * 0.1); // time as 3rd axis

    float n = perlin3(pos3D);
    n = 0.5 + 0.5 * n;

    vec3 color = lavaRamp(n);
    gl_FragColor = vec4(color, 1.0);
  }`;

export const drawLavaTile = regl<
  LavaTileUniforms,
  LavaTileAttributes,
  LavaTileProps
>({
  depth: { enable: false },
  vert: `
    precision highp float;
    attribute vec2 position;

    uniform vec2 tileCenter;
    uniform vec2 cameraPos;
    uniform vec2 cameraSize;

    varying vec2 worldPos;

    void main() {
      worldPos = position + tileCenter;
      vec2 screenPos = (worldPos - cameraPos) / cameraSize;
      gl_Position = vec4(screenPos, 0, 1);
    }
  `,
  frag: lavaFragShader,
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
    tileCenter: regl.prop<LavaTileProps, "tileCenter">("tileCenter"),
    cameraPos: regl.prop<LavaTileProps, "cameraPos">("cameraPos"),
    cameraSize: regl.prop<LavaTileProps, "cameraSize">("cameraSize"),
    time: regl.prop<LavaTileProps, "time">("time"),
  },
  count: 6,
});

// checkerboard shader
type BackgroundUniforms = {
  cameraPos: [number, number];
  cameraSize: [number, number];
  resolution: [number, number];
};

type BackgroundAttributes = {
  position: number[][];
};

type BackgroundProps = {};

type BackgroundCtx = {
  cameraPos: [number, number];
  cameraSize: [number, number];
};

export const drawBackground = regl<
  BackgroundUniforms,
  BackgroundAttributes,
  BackgroundProps,
  BackgroundCtx
>({
  depth: { enable: false },
  vert: `
    precision highp float;
    attribute vec2 position;

    void main() {
      gl_Position = vec4(position, 0, 1);
    }
   `,
  frag: `
  precision highp float;

  uniform vec2 cameraPos;
  uniform vec2 cameraSize;
  uniform vec2 resolution;

  void main() {
    vec2 fragUV = gl_FragCoord.xy / resolution;

    vec2 uv = fragUV + cameraPos * 0.25 / cameraSize;

    vec2 scaled = floor(uv * cameraSize * 2.0);
    float check = mod(scaled.x + scaled.y, 2.0);

    gl_FragColor = vec4(vec3(mix(
      .2,
      .3,
      check
    )), 1.0);
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
    cameraPos: (ctx, _props) => ctx.cameraPos,
    cameraSize: (ctx, _props) => ctx.cameraSize,
    resolution: (ctx, _props) => [ctx.viewportWidth, ctx.viewportHeight],
  },
  count: 6,
});
