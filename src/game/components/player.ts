export const initJumpBufferTime = 150;

type State = ReturnType<typeof create>;

export const playerWidth = 0.8;
export const playerHeight = 0.8;

function create() {
  return {
    x: 0,
    y: 0,

    dy: 0,

    timeSinceGrounded: 0,
  };
}

function update(state: State, dt: number) {
  // moveAndSlidePlayer(state, dt);
}

// can assume this happens inside camera
function draw(state: State, ctx: CanvasRenderingContext2D) {
  {
    ctx.fillStyle = "green";
    ctx.fillRect(
      state.x - playerWidth / 2,
      -state.y - playerHeight / 2,
      playerWidth,
      playerHeight,
    );
  }
}

export const Player = { create, update, draw };
