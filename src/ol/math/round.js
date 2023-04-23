import { toFixed } from './toFixed'

export function round(n, decimals) {
  return Math.round(toFixed(n, decimals));
}
