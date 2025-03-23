// keyboard
export const keysDown = new Set<string>();
export const justReleased = new Set<string>();
export const justPressed = new Set<string>();

// mouse and touch
export let pointerPos = null as { x: number; y: number } | null;
export let justLeftClicked = null as { x: number; y: number } | null;
export let justRightClicked = null as { x: number; y: number } | null;
export let leftClickDown = false;
export let rightClickDown = false;

export function clearInputs() {
  justReleased.clear();
  justPressed.clear();
  justLeftClicked = null;
  justRightClicked = null;
}

document.addEventListener("keydown", (event) => {
  if (keysDown.has(event.key)) return;
  keysDown.add(event.key);
  justPressed.add(event.key);
});

document.addEventListener("keyup", (event) => {
  keysDown.delete(event.key);
  justReleased.add(event.key);
});

document.addEventListener("pointermove", (event) => {
  pointerPos = { x: event.clientX, y: event.clientY };
});

document.addEventListener("pointerleave", () => {
  pointerPos = null;
});

document.addEventListener("pointerdown", (event) => {
  if (event.button === 0) {
    leftClickDown = true;
    justLeftClicked = { x: event.clientX, y: event.clientY };
  } else if (event.button === 2) {
    rightClickDown = true;
    justRightClicked = { x: event.clientX, y: event.clientY };
  }
});

document.addEventListener("pointerup", (event) => {
  if (event.button === 0) {
    leftClickDown = false;
  } else if (event.button === 2) {
    rightClickDown = false;
  }
});
