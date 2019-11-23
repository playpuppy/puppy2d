/**
 * @jest-environment jsdom
 */

import { PuppyVM } from '../src/puppy2d';

const puppy = new PuppyVM(document.body, { jest: true });

test('puppy.eval()', () => {
  expect(puppy.eval('x = 1', 'x')).toBe(1);
});

test('puppy.Rectangle(10,10,100,50)', () => {
  expect(puppy.eval('c = Rectangle(10,10,100,50,opacity=1)', 'c')).toMatchObject({ width: 100, height: 50 });
});

test('puppy.Rectangle(10,10,100)', () => {
  expect(puppy.eval('c = Rectangle(10,10,100, opacity=1)', 'c')).toMatchObject({ width: 100, height: 100 });
});

test('puppy.Rectangle(10,10)', () => {
  expect(puppy.eval('c = Rectangle(10,10, opacity=1)', 'c')).toMatchObject({ width: 100, height: 100 });
});

test('puppy.Circle(10,10)', () => {
  expect(puppy.eval('c = Circle(10,10, opacity=1)', 'c')).toMatchObject({ circleRadius: 50 });
});

test('puppy.Circle(10,10,100)', () => {
  expect(puppy.eval('c = Circle(10,10,100,opacity=1)', 'c')).toMatchObject({ circleRadius: 50 });
});

test('def __keyup__)', () => {
  expect(puppy.eval(`
def __keyup__(key, time):
  print(key)
`, '__keyup__')).toBeDefined();
});
