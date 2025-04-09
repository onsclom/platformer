import { animate } from "../animate";
import { justPressed } from "../input";
import { globalState } from "../entry-point";
import a from "./saved-levels/a";
import b from "./saved-levels/b";
import HARD from "./saved-levels/HARD";
import { restartLevel } from "./playing";

type State = ReturnType<typeof create>;

const levels = [
  { name: "asdfk", level: a },
  { name: "dskfj", level: b },
  { name: "hard", level: HARD },
];

export function create() {
  return {
    levelIndex: 0,
    animatedLevelIndex: 0,
  };
}

export function update(state: State, dt: number) {
  state.animatedLevelIndex = state.animatedLevelIndex = animate(
    state.animatedLevelIndex,
    state.levelIndex,
    dt ** 2 * 0.01,
  );

  if (justPressed.has("KeyD") || justPressed.has("KeyS")) {
    state.levelIndex = (state.levelIndex + 1) % levels.length;
  }
  if (justPressed.has("KeyA") || justPressed.has("KeyW")) {
    state.levelIndex = (state.levelIndex - 1 + levels.length) % levels.length;
  }

  if (justPressed.has("Space") || justPressed.has("Enter")) {
    globalState.curScene = "playing";
    // @ts-expect-error
    globalState.playing.level.static = levels[state.levelIndex]!.level.static;
    restartLevel(globalState.playing);
  }
}

export function draw(state: State, ctx: CanvasRenderingContext2D) {
  const drawRect = {
    width: ctx.canvas.width / devicePixelRatio,
    height: ctx.canvas.height / devicePixelRatio,
  };

  const levelCircleRadius = 25;
  const xSpaceBetweenLevels = 100;
  const ySpaceBetweenLevels = 50;
  const fontSize = 30;

  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, drawRect.width, drawRect.height);

  ctx.fillStyle = "white";
  ctx.font = `${fontSize * 1.2}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("LEVEL SELECT", drawRect.width / 2, fontSize * 2);

  ctx.save();
  ctx.translate(
    -state.animatedLevelIndex * xSpaceBetweenLevels,
    -state.animatedLevelIndex * ySpaceBetweenLevels,
  );
  ctx.lineWidth = 3;
  ctx.strokeStyle = "white";
  // draw line between levels
  ctx.beginPath();
  ctx.moveTo(drawRect.width / 2, drawRect.height / 2);
  ctx.lineTo(
    drawRect.width / 2 + (levels.length - 1) * xSpaceBetweenLevels,
    drawRect.height / 2 + (levels.length - 1) * ySpaceBetweenLevels,
  );
  ctx.stroke();

  ctx.lineWidth = 5 + Math.sin(performance.now() * 0.005) * 0.5;
  ctx.strokeStyle = "#66f";

  for (let i = 0; i < levels.length; i++) {
    ctx.beginPath();
    ctx.arc(
      // (i - state.levelIndex) * xSpaceBetweenLevels,
      drawRect.width / 2 + i * xSpaceBetweenLevels,
      drawRect.height / 2 + i * ySpaceBetweenLevels,
      levelCircleRadius,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = "white";
    ctx.fill();

    if (i === state.levelIndex) {
      ctx.stroke();
    }
  }
  ctx.restore();

  // draw level title
  ctx.fillStyle = "white";
  ctx.font = `${fontSize}px Arial`;
  ctx.translate(
    drawRect.width / 2,
    drawRect.height / 2 - levelCircleRadius - fontSize * 2,
  );
  ctx.translate(0, Math.sin(performance.now() * 0.004) * 2);
  ctx.rotate(Math.sin(performance.now() * 0.007) * 0.05);
  ctx.fillText(levels[state.levelIndex]!.name, 0, 0);
}

export const OfflineLevelPicker = { create, update, draw };
