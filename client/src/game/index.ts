import {
  justPressed,
  clearInputs,
  justLeftClicked,
  pointerPos,
} from "../input";
import { Editor } from "./editor";
import { Playing, restartLevel } from "./playing";
import { fontSize, OnlineLevelPicker } from "./online-picking-level";
import { client } from "../server";
import { OfflineLevelPicker } from "./offline-level-picker";

const scenes = {
  editor: Editor,
  playing: Playing,
  onlineLevelPicker: OnlineLevelPicker,
  offlineLevelPicker: OfflineLevelPicker,
} as const;

const startingScene = "offlineLevelPicker";

export function create() {
  return {
    curScene: startingScene as keyof typeof scenes,
    sceneData: typedFromEntries(
      typedKeys(scenes).map((key) => [key, scenes[key].create()]),
    ) as SceneData,
  };
}

export function update(state: State, dt: number) {
  // TODO: move a lot of this logic OUTTA HERE
  if (justPressed.has("KeyR")) {
    state.sceneData.playing.level = state.sceneData.editor.level;
    state.curScene = "playing";
    restartLevel(state.sceneData.playing);
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
    state.sceneData.offlineLevelPicker.animatedLevelIndex =
      state.sceneData.offlineLevelPicker.levelIndex;
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
      restartLevel(state.sceneData.playing);
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
    OfflineLevelPicker.update(state.sceneData.offlineLevelPicker, dt);
  }

  clearInputs();
}

export function draw(state: State, ctx: CanvasRenderingContext2D) {
  const curData = state.sceneData[state.curScene]!;
  // @ts-expect-error don't feel like convincing TS this is valid
  scenes[state.curScene].draw(curData, ctx);
}

// i shoved the typescript magic i don't really understand here
export type State = ReturnType<typeof create>;
const typedKeys = <T extends object>(obj: T) => Object.keys(obj) as (keyof T)[];
function typedFromEntries<T extends readonly (readonly [PropertyKey, any])[]>(
  entries: T,
): { [K in T[number] as K[0]]: K[1] } {
  return Object.fromEntries(entries) as any;
}
type SceneData = {
  [K in keyof typeof scenes]: (typeof scenes)[K] extends {
    create: () => infer R;
  }
    ? R
    : never;
};
