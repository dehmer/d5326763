export function remove(arr, obj) {
  const i = arr.indexOf(obj);
  const found = i > -1;
  if (found) {
    arr.splice(i, 1);
  }
  return found;
}
