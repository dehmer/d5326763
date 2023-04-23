export function stableSort(arr, compareFnc) {
  const length = arr.length;
  const tmp = Array(arr.length);
  let i;
  for (i = 0; i < length; i++) {
    tmp[i] = {index: i, value: arr[i]};
  }
  tmp.sort(function (a, b) {
    return compareFnc(a.value, b.value) || a.index - b.index;
  });
  for (i = 0; i < arr.length; i++) {
    arr[i] = tmp[i].value;
  }
}
