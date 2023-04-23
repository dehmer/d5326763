export function multiply(transform1, transform2) {
  const a1 = transform1[0];
  const b1 = transform1[1];
  const c1 = transform1[2];
  const d1 = transform1[3];
  const e1 = transform1[4];
  const f1 = transform1[5];
  
  const a2 = transform2[0];
  const b2 = transform2[1];
  const c2 = transform2[2];
  const d2 = transform2[3];
  const e2 = transform2[4];
  const f2 = transform2[5];

  transform1[0] = a1 * a2 + c1 * b2;
  transform1[1] = b1 * a2 + d1 * b2;
  transform1[2] = a1 * c2 + c1 * d2;
  transform1[3] = b1 * c2 + d1 * d2;
  transform1[4] = a1 * e2 + c1 * f2 + e1;
  transform1[5] = b1 * e2 + d1 * f2 + f1;

  return transform1;
}
