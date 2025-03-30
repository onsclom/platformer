export function assert<T>(value: T): asserts value {
  if (!value) {
    throw new Error("assertion failed");
  }
}
