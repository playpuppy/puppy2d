/**
 * @jest-environment jsdom
 */

import { PuppyVM, PuppyRuntimeError } from '../src/puppy2d';

const puppy = new PuppyVM(document.body, { jest: true });

test(`a = []`, () => {
  expect(puppy.eval(`
a = []
`, 'a')).toStrictEqual([]);
});

test(`a = [1]`, () => {
  expect(puppy.eval(`
a = [1]
`, 'a')).toStrictEqual([1]);
});

test(`a = [1,2]`, () => {
  expect(puppy.eval(`
a = [1,2]
`, 'a')).toStrictEqual([1, 2]);
});

test(`a.append(2)`, () => {
  expect(puppy.eval(`
a = [1]
a.append(2)
`, 'a')).toStrictEqual([1, 2]);
});

test(`a=[[1,2],[2,3]]`, () => {
  expect(puppy.eval(`
a=[[1,2],[2,3]]
`, 'a')).toStrictEqual([[1, 2], [2, 3]]);
});

test(`len(a)`, () => {
  expect(puppy.eval(`
a = [1,2]
x = len(a)
`, 'x')).toStrictEqual(2);
});

test(`a[0]`, () => {
  expect(puppy.eval(`
a = [1]
x = a[0]
`, 'x')).toBe(1);
});

test(`OutOfArrayIndex`, () => {
  expect(puppy.eval(`
a = [1]
x = a[1]
`, 'x')).toThrow(/PuppyRuntimeError/);
});

test(`a[0]=0`, () => {
  expect(puppy.eval(`
a = [1]
a[0] = 0
`, 'a')).toStrictEqual([0]);
});



