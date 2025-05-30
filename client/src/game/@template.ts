type State = ReturnType<typeof create>;

export function create() {
  return {};
}

export function update(state: State, dt: number) {}

export function draw(state: State, ctx: CanvasRenderingContext2D) {}

export default { create, update, draw };
