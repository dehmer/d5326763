import {toString} from './toString'
import {compose} from './compose'
import {create} from './create'

export function composeCssTransform(dx1, dy1, sx, sy, angle, dx2, dy2) {
  return toString(compose(create(), dx1, dy1, sx, sy, angle, dx2, dy2));
}
