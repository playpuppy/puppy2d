import { Vector } from '../src/matter-ts/geometry'

var v = new Vector();
console.log(v);

test('Vector', () => {
  expect(v.x).toBe(0);
});
