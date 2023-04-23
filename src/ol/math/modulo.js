export function modulo(a, b) {
  const r = a % b;
  return r * b < 0 ? r + b : r;
}
