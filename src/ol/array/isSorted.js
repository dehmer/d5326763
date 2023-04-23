export function isSorted(arr, func, strict) {
  const compare = func || ascending;
  return arr.every(function (currentVal, index) {
    if (index === 0) {
      return true;
    }
    const res = compare(arr[index - 1], currentVal);
    return !(res > 0 || (strict && res === 0));
  });
}
