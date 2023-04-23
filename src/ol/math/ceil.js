import { toFixed } from './toFixed'

export function ceil(n, decimals) {
  return Math.ceil(toFixed(n, decimals));
}
