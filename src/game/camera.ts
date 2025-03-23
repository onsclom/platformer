/*
TODO: make this an actually good reuseable camera
- support other aspect ratios besides 1/1
- use matrix math to quickly go from:
  - canvas coords to game coords (mouse input)
  - game coords to canvas coords (rendering)
*/

export type State = ReturnType<typeof create>;
function create() {
  return {
    width: 25,
    height: 25,
    x: 0,
    y: 0,
    shakeFactor: 0, // 0 to 1
    angle: 0,
  };
}

function update(camera: State, dt: number) {
  // screen shake
  const shakeLength = 0.1;
  camera.shakeFactor *= (0.9 * shakeLength) ** (dt / 1000);
}

// todo: think about -y axis problem and solve better?
// - maybe make my own ctx rendering funcs that flip y for me?
function drawWithLetterBoxedCamera(
  camera: State,
  ctx: CanvasRenderingContext2D,
  draw: (ctx: CanvasRenderingContext2D) => void,
) {
  const canvasRect = ctx.canvas.getBoundingClientRect();
  ctx.fillStyle = "#8af";
  ctx.fillRect(0, 0, canvasRect.width, canvasRect.height);

  const aspectRatio = 1;
  const minSide = Math.min(canvasRect.width, canvasRect.height);

  const letterBoxed = {
    x: (canvasRect.width - minSide * aspectRatio) / 2,
    y: (canvasRect.height - minSide) / 2,
    width: minSide,
    height: minSide,
  };

  // LETTERBOX SPACE
  //////////////////
  ctx.save();
  ctx.translate(letterBoxed.x, letterBoxed.y);
  // ctx.beginPath();
  // ctx.rect(0, 0, minSide, minSide);
  // ctx.clip();

  // light blue background
  ctx.fillStyle = "#8af";
  ctx.fillRect(0, 0, minSide, minSide);
  {
    // camera space
    ctx.translate(minSide / 2, minSide / 2);
    ctx.scale(minSide / camera.width, minSide / camera.height);
    ctx.translate(-camera.x, camera.y);

    // CAMERA SHAKE
    //////////////////
    const strength = 0.5;
    const xShake =
      Math.cos(performance.now() * 0.05) * camera.shakeFactor * strength;
    const yShake =
      Math.sin(performance.now() * 0.0503) * camera.shakeFactor * strength;
    ctx.translate(xShake, yShake);

    // rotate from center
    ctx.translate(camera.x, -camera.y);
    ctx.rotate(camera.angle);
    ctx.translate(-camera.x, camera.y);

    // GAME DRAW HERE
    //////////////////
    draw(ctx);
  }
  ctx.restore();

  // UI SPACE
  //////////////////
  ctx.globalAlpha = 0.5;
  // ctx.strokeStyle = "red";
  // ctx.lineWidth = 0.005 * minSide;
  // ctx.strokeRect(
  //   letterBoxed.x,
  //   letterBoxed.y,
  //   letterBoxed.width,
  //   letterBoxed.height,
  // );
  ctx.globalAlpha = 1;
}

function canvasPosToGamePos(
  camera: State,
  canvasPos: { x: number; y: number },
  canvasRect: DOMRect,
) {
  const aspectRatio = 1;
  const minSide = Math.min(canvasRect.width, canvasRect.height);

  const letterBoxed = {
    x: (canvasRect.width - minSide * aspectRatio) / 2,
    y: (canvasRect.height - minSide) / 2,
    width: minSide,
    height: minSide,
  };

  // Step 1: Convert canvas position to letterboxed position
  const letterBoxedPos = {
    x: canvasPos.x - letterBoxed.x,
    y: canvasPos.y - letterBoxed.y,
  };

  // Step 2: Convert to normalized position (center of screen = 0,0)
  const normalizedPos = {
    x: letterBoxedPos.x - minSide / 2,
    y: letterBoxedPos.y - minSide / 2,
  };

  // Step 3: Scale to camera space
  const scaledPos = {
    x: normalizedPos.x / (minSide / camera.width),
    y: -normalizedPos.y / (minSide / camera.height), // Negate y to match game's coordinate system
  };

  // Step 4: Apply inverse rotation around camera center
  const cosAngle = Math.cos(camera.angle);
  const sinAngle = Math.sin(camera.angle);
  const rotatedPos = {
    x: scaledPos.x * cosAngle - scaledPos.y * sinAngle,
    y: scaledPos.x * sinAngle + scaledPos.y * cosAngle,
  };

  // Step 5: Apply camera position offset
  const gamePos = {
    x: rotatedPos.x + camera.x,
    y: rotatedPos.y + camera.y,
  };

  return gamePos;
}

export const Camera = {
  create,
  update,
  drawWithLetterBoxedCamera,
  canvasPosToGamePos,
};

function animate(from: number, to: number, ratio: number) {
  return from * (1 - ratio) + ratio * to;
}
