export function circleVsRect(
  circle: {
    cx: number;
    cy: number;
    radius: number;
  },
  rect: {
    cx: number;
    cy: number;
    width: number;
    height: number;
  },
) {
  // get closest point inside rect
  let closestX = rect.cx;
  if (circle.cx > rect.cx) {
    const diff = circle.cx - rect.cx;
    closestX += Math.min(diff, rect.width / 2);
  } else {
    const diff = rect.cx - circle.cx;
    closestX -= Math.min(diff, rect.width / 2);
  }

  let closestY = rect.cy;
  if (circle.cy > rect.cy) {
    const diff = circle.cy - rect.cy;
    closestY += Math.min(diff, rect.height / 2);
  } else {
    const diff = rect.cy - circle.cy;
    closestY -= Math.min(diff, rect.height / 2);
  }

  const dist = Math.hypot(circle.cx - closestX, circle.cy - closestY);
  return dist <= circle.radius;
}

// TODO: refactor rect vs rect collision code to here
