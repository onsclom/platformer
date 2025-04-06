export default {
  static: {
    end: { x: 100, y: 100 },
    tiles: [
      { type: "solid", x: -1, y: -1 },
      { type: "solid", x: 0, y: -1 },
      { type: "solid", x: 1, y: -1 },
    ],
  } as const,
};
