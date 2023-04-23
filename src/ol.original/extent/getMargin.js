import {getWidth} from './getWidth'
import {getHeight} from './getHeight'

export function getMargin(extent) {
  return getWidth(extent) + getHeight(extent);
}
