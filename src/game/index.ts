import { justPressed, clearInputs } from "../input";
import Editor from "./scenes/editor";

export type State = ReturnType<typeof create>;

export function create() {
  return {
    curScene: "editor" as "editor" | "playing",
    sceneData: {
      editor: Editor.create(),
    },
  };
}

export function update(state: State, dt: number) {
  if (justPressed.has("r")) {
    Object.assign(state, create());
  }

  if (state.curScene === "editor") {
    Editor.update(state.sceneData.editor, dt);
  } else if (state.curScene === "playing") {
  }

  clearInputs();
}

export function draw(state: State, ctx: CanvasRenderingContext2D) {
  if (state.curScene === "editor") {
    Editor.draw(state.sceneData.editor, ctx);
  } else if (state.curScene === "playing") {
  }
}
