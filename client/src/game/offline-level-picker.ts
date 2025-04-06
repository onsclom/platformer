import { restartLevel } from ".";
import { animate } from "../animate";
import { justPressed } from "../input";
import { globalState } from "../main";
import a from "./saved-levels/a";
import b from "./saved-levels/b";
import basic from "./saved-levels/basic";
import HARD from "./saved-levels/HARD";

type State = ReturnType<typeof create>;

const levels = [
  { name: "asdfk", level: a },
  { name: "dskfj", level: b },
  { name: "hard", level: HARD },
];

const fontSize = 30;

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
    dt ** 2 * 0.005,
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
    globalState.sceneData.playing.level.static =
      levels[state.levelIndex]!.level.static;
    restartLevel(globalState);
  }
}

export function draw(state: State, ctx: CanvasRenderingContext2D) {
  const drawRect = ctx.canvas.getBoundingClientRect();

  // i want circles for each level connected by lines

  const levelCircleRadius = 25;
  const xSpaceBetweenLevels = 100;
  const ySpaceBetweenLevels = 50;

  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, drawRect.width, drawRect.height);

  // ctx.font = `${fontSize}px Arial`;
  // ctx.textAlign = "center";
  // ctx.textBaseline = "middle";

  ctx.save();
  ctx.translate(
    -state.animatedLevelIndex * xSpaceBetweenLevels,
    -state.animatedLevelIndex * ySpaceBetweenLevels,
  );
  ctx.lineWidth = 5;

  ctx.strokeStyle = "white";
  // draw line between levels
  ctx.beginPath();
  ctx.moveTo(drawRect.width / 2, drawRect.height / 2);
  ctx.lineTo(
    drawRect.width / 2 + (levels.length - 1) * xSpaceBetweenLevels,
    drawRect.height / 2 + (levels.length - 1) * ySpaceBetweenLevels,
  );
  ctx.stroke();

  ctx.strokeStyle = "blue";

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
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    levels[state.levelIndex]!.name,
    drawRect.width / 2,
    drawRect.height / 2 - levelCircleRadius - fontSize * 2,
  );
}

export const OfflineLevelPicker = { create, update, draw };
