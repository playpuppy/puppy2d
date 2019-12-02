import { Vector } from '../src/matter-ts/geometry'

var v = new Vector();
var v2 = new Vector(1, 2);

test('Vector', () => {
  expect(v.x).toBe(0);
});

test('Vector', () => {
  expect(v.y).toBe(0);
});

test('Vector', () => {
  expect(v2.x).toBe(1);
});

test('Vector', () => {
  expect(v2.y).toBe(2);
});
