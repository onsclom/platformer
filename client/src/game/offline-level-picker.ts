import { restartLevel } from ".";
import { justPressed } from "../input";
import { globalState } from "../main";
import basic from "./saved-levels/basic";
import HARD from "./saved-levels/HARD";

type State = ReturnType<typeof create>;

const levels = [
  { name: "tutorial", level: basic },
  { name: "very hard level lol", level: HARD },
];

const fontSize = 30;

export function create() {
  return {
    levelIndex: 0,
  };
}

export function update(state: State, dt: number) {
  if (justPressed.has("KeyD") || justPressed.has("KeyS")) {
    state.levelIndex = (state.levelIndex + 1) % levels.length;
  }
  if (justPressed.has("KeyA") || justPressed.has("KeyW")) {
    state.levelIndex = (state.levelIndex - 1 + levels.length) % levels.length;
  }

  if (justPressed.has("Space") || justPressed.has("Enter")) {
    globalState.curScene = "playing";
    globalState.sceneData.playing.level.static =
      levels[state.levelIndex]!.level.static;
    restartLevel(globalState);
  }
}

export function draw(state: State, ctx: CanvasRenderingContext2D) {
  const drawRect = ctx.canvas.getBoundingClientRect();

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, drawRect.width, drawRect.height);

  ctx.font = `${fontSize}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < levels.length; i++) {
    ctx.globalAlpha = state.levelIndex === i ? 1 : 0.5;
    ctx.fillStyle = "white";
    ctx.fillText(
      levels[i]!.name,
      drawRect.width / 2,
      drawRect.height / 2 + i * fontSize - state.levelIndex * fontSize,
    );
  }
  ctx.globalAlpha = 1;
}

export const OfflineLevelPicker = { create, update, draw };
