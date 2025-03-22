export const keysDown = new Set<string>();
export const justReleased = new Set<string>();
export const justPressed = new Set<string>();

export function clearInputs() {
  justReleased.clear();
  justPressed.clear();
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
