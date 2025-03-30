import {
  justPressed,
  clearInputs,
  justLeftClicked,
  pointerPos,
} from "../input";
import { Editor } from "./editor";
import { Playing } from "./playing";
import { fontSize, PickingLevel } from "./picking-level";
import { client } from "../server";
import { Level } from "./level";

export type State = ReturnType<typeof create>;

export function create() {
  return {
    curScene: "playing" as "editor" | "playing" | "pickingLevel",
    sceneData: {
      editor: Editor.create(),
      playing: Playing.create(),
      pickingLevel: PickingLevel.create(),
    },
  };
}

export function update(state: State, dt: number) {
  if (justPressed.has("r")) {
    state.sceneData.playing.level = state.sceneData.editor.level;
    state.curScene = "playing";
    restartLevel(state);
  }

  if (justPressed.has("Enter") || justPressed.has("e")) {
    if (state.curScene === "editor") {
      state.curScene = "playing";
      state.sceneData.playing.level = state.sceneData.editor.level;
      state.sceneData.playing.player.x = state.sceneData.editor.camera.x;
      state.sceneData.playing.player.y = state.sceneData.editor.camera.y;
      state.sceneData.playing.player.dy = 0;
      state.sceneData.playing.player.alive = true;
    } else {
      state.curScene = "editor";
      state.sceneData.editor.camera.x = state.sceneData.playing.player.x;
      state.sceneData.editor.camera.y = state.sceneData.playing.player.y;
      state.sceneData.editor.camera.width =
        state.sceneData.playing.camera.width;
      state.sceneData.editor.camera.height =
        state.sceneData.playing.camera.height;
    }
  }

  // pick level!
  if (justPressed.has("p")) {
    state.curScene = "pickingLevel";
    const levels = client.levels.get();
    levels
      .then((data) => {
        state.sceneData.pickingLevel.levels = {
          state: "loaded",
          data: data.data!, // TODO: fix this case
        };
        restartLevel(state);
      })
      .catch((e) => {
        console.error(e);
      });
  }

  if (state.curScene === "editor") {
    Editor.update(state.sceneData.editor, dt);
  } else if (state.curScene === "playing") {
    Playing.update(state.sceneData.playing, dt);
  } else if (state.curScene === "pickingLevel") {
    PickingLevel.update(state.sceneData.pickingLevel, dt);
    const levels = state.sceneData.pickingLevel.levels;
    if (justLeftClicked && pointerPos && levels.state === "loaded") {
      const levelIndex = Math.floor(pointerPos.y / fontSize);
      const level = levels.data[levelIndex];
      if (level) {
        const resp = client.level({ level }).get();
        resp
          .then(({ data }) => {
            state.sceneData.playing.level.static = data.static!;
            state.sceneData.editor.level = state.sceneData.playing.level;
            state.curScene = "playing";
          })
          .catch((e) => {
            console.error(e);
          });
      }
    }
  }
  clearInputs();
}

export function draw(state: State, ctx: CanvasRenderingContext2D) {
  if (state.curScene === "editor") {
    Editor.draw(state.sceneData.editor, ctx);
  } else if (state.curScene === "playing") {
    Playing.draw(state.sceneData.playing, ctx);
  } else if (state.curScene === "pickingLevel") {
    PickingLevel.draw(state.sceneData.pickingLevel, ctx);
  }
}

function restartLevel(state: State) {
  const playing = state.sceneData.playing;
  playing.player.x = 0;
  playing.player.y = 0;
  playing.player.dy = 0;
  playing.player.alive = true;
  playing.level.ephemeral = Level.createEphemeral();
}
