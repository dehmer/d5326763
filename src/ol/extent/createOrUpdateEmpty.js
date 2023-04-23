import {createOrUpdate} from './createOrUpdate'

export function createOrUpdateEmpty(dest) {
  return createOrUpdate(Infinity, Infinity, -Infinity, -Infinity, dest);
}
