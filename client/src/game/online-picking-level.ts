import { pointerPos } from "../input";
type State = ReturnType<typeof create>;

export const fontSize = 30;

export function create() {
  return {
    levels: { state: "loading" } as
      | { state: "loading" }
      | { state: "loaded"; data: string[] }
      | { state: "error"; error: Error },
  };
}

export function update(state: State, dt: number) {}

export function draw(state: State, ctx: CanvasRenderingContext2D) {
  const rect = ctx.canvas.getBoundingClientRect();
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, rect.width, rect.height);

  ctx.fillStyle = "white";
  ctx.font = `${fontSize}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // if levels is null or still loading, show loading
  if (state.levels.state === "loading") {
    ctx.fillText("Loading...", rect.width / 2, rect.height / 2);
    return;
  } else if (state.levels.state === "loaded") {
    // draw in top left going down
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    for (let i = 0; i < state.levels.data.length; i++) {
      ctx.fillStyle = "white";
      if (pointerPos) {
        const mouseOverY =
          pointerPos.y >= i * fontSize && pointerPos.y <= (i + 1) * fontSize;
        if (mouseOverY) {
          ctx.fillStyle = "yellow";
        }
      }
      const level = state.levels.data[i]!;
      ctx.fillText(level, 10, i * fontSize);
    }
  } else {
  }
}

export const OnlineLevelPicker = { create, update, draw };
