import { justPressed, clearInputs } from "../input";
import { Editor } from "./scenes/editor";
import { Playing } from "./scenes/playing";

export type State = ReturnType<typeof create>;

export function create() {
  return {
    curScene: "editor" as "editor" | "playing",
    sceneData: {
      editor: Editor.create(),
      playing: Playing.create(),
    },
  };
}

export function update(state: State, dt: number) {
  if (justPressed.has("r")) {
    Object.assign(state, create());
  }

  // toggle between editor and playing
  if (justPressed.has("Enter")) {
    if (state.curScene === "editor") {
      state.curScene = "playing";
      state.sceneData.playing.level = state.sceneData.editor.level;
      state.sceneData.playing.player.x = state.sceneData.editor.camera.x;
      state.sceneData.playing.player.y = state.sceneData.editor.camera.y;
      state.sceneData.playing.player.dy = 0;
    } else {
      state.curScene = "editor";
      state.sceneData.editor.camera.x = state.sceneData.playing.player.x;
      state.sceneData.editor.camera.y = state.sceneData.playing.player.y;
    }
  }

  if (state.curScene === "editor") {
    Editor.update(state.sceneData.editor, dt);
  } else if (state.curScene === "playing") {
    Playing.update(state.sceneData.playing, dt);
  }

  clearInputs();
}

export function draw(state: State, ctx: CanvasRenderingContext2D) {
  if (state.curScene === "editor") {
    Editor.draw(state.sceneData.editor, ctx);
  } else if (state.curScene === "playing") {
    Playing.draw(state.sceneData.playing, ctx);
  }
}
