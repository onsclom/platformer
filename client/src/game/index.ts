import {
  justPressed,
  clearInputs,
  justLeftClicked,
  pointerPos,
} from "../input";
import { Editor } from "./editor";
import { Playing } from "./playing";
import { fontSize, OnlineLevelPicker } from "./online-picking-level";
import { client } from "../server";
import { Level } from "./level";
import { OfflineLevelPicker } from "./offline-level-picker";

export type State = ReturnType<typeof create>;

export function create() {
  const state = {
    curScene: "offlineLevelPicker" as
      | "editor"
      | "playing"
      | "onlineLevelPicker"
      | "offlineLevelPicker",
    sceneData: {
      editor: Editor.create(),
      playing: Playing.create(),
      onlineLevelPicker: OnlineLevelPicker.create(),
      OfflineLevelPicker: OfflineLevelPicker.create(),
    },
  };
  return state;
}

export function update(state: State, dt: number) {
  if (justPressed.has("KeyR")) {
    state.sceneData.playing.level = state.sceneData.editor.level;
    state.curScene = "playing";
    restartLevel(state);
  }

  if (import.meta.env.DEV && justPressed.has("KeyE")) {
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
      state.sceneData.editor.level = state.sceneData.playing.level;
    }
  }

  if (justPressed.has("KeyO")) {
    state.curScene = "offlineLevelPicker";
    state.sceneData.OfflineLevelPicker.animatedLevelIndex =
      state.sceneData.OfflineLevelPicker.levelIndex;
  }

  // if (justPressed.has("p")) {
  //   state.curScene = "onlineLevelPicker";
  //   const levels = client.levels.get();
  //   levels
  //     .then((data) => {
  //       state.sceneData.onlineLevelPicker.levels = {
  //         state: "loaded",
  //         data: data.data!, // TODO: fix this case
  //       };
  //       restartLevel(state);
  //     })
  //     .catch((e) => {
  //       console.error(e);
  //     });
  // }

  if (state.curScene === "editor") {
    Editor.update(state.sceneData.editor, dt);
  } else if (state.curScene === "playing") {
    Playing.update(state.sceneData.playing, dt);

    const timeToResetAfterDeath = 1000;
    if (state.sceneData.playing.player.timeSinceDead > timeToResetAfterDeath) {
      restartLevel(state);
    }
  } else if (state.curScene === "onlineLevelPicker") {
    OnlineLevelPicker.update(state.sceneData.onlineLevelPicker, dt);
    const levels = state.sceneData.onlineLevelPicker.levels;
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
  } else if (state.curScene === "offlineLevelPicker") {
    OfflineLevelPicker.update(state.sceneData.OfflineLevelPicker, dt);
  }

  clearInputs();
}

export function draw(state: State, ctx: CanvasRenderingContext2D) {
  if (state.curScene === "editor") {
    Editor.draw(state.sceneData.editor, ctx);
  } else if (state.curScene === "playing") {
    Playing.draw(state.sceneData.playing, ctx);
  } else if (state.curScene === "onlineLevelPicker") {
    OnlineLevelPicker.draw(state.sceneData.onlineLevelPicker, ctx);
  } else if (state.curScene === "offlineLevelPicker") {
    OfflineLevelPicker.draw(state.sceneData.OfflineLevelPicker, ctx);
  }
}

export function restartLevel(state: State) {
  const playing = state.sceneData.playing;
  playing.player.x = 0;
  playing.player.y = 1;
  playing.player.dy = 0;
  playing.player.xMomentum = 0;
  playing.player.alive = true;
  playing.level.ephemeral = Level.createEphemeral();

  playing.won = false;
  playing.timeSinceWon = 0;
}
