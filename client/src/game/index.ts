import { Editor } from "./editor";
import { Playing } from "./playing";
import { OnlineLevelPicker } from "./online-picking-level";
import { OfflineLevelPicker } from "./offline-level-picker";
import { clearInputs } from "../input";

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
    ...(typedFromEntries(
      typedKeys(scenes).map((key) => [key, scenes[key].create()]),
    ) as SceneData),
  };
}

export function update(state: State, dt: number) {
  // @ts-expect-error don't feel like convincing TS this is valid
  scenes[state.curScene].update(state[state.curScene], dt);
  clearInputs();
}

export function draw(state: State, ctx: CanvasRenderingContext2D) {
  // @ts-expect-error don't feel like convincing TS this is valid
  scenes[state.curScene].draw(state[state.curScene], ctx);
}

// shoved the typescript magic i don't really understand here
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
