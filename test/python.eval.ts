/**
 * @jest-environment jsdom
 */

import { Puppy } from '../src/puppy2d';

const puppy = new Puppy(document.body, { jest: true });

test('True', () => {
  expect(puppy.eval(`x = True`, 'x')).toStrictEqual(true);
});

test('False', () => {
  expect(puppy.eval(`x = False`, 'x')).toStrictEqual(false);
});


test('[]', () => {
  expect(puppy.eval(`x = []`, 'x')).toStrictEqual([]);
});

test('[1]', () => {
  expect(puppy.eval(`x = [1]`, 'x')).toStrictEqual([1]);
});

test('[1,2]', () => {
  expect(puppy.eval(`x = [1,2]`, 'x')).toStrictEqual([1, 2]);
});

test('range(3)', () => {
  expect(puppy.eval(`x = range(3)`, 'x')).toStrictEqual([0, 1, 2]);
});

test('range(1,3)', () => {
  expect(puppy.eval(`x = range(1,3)`, 'x')).toStrictEqual([1, 2]);
});

test('range(3,0,-1)', () => {
  expect(puppy.eval(`x = range(3,0,-1)`, 'x')).toStrictEqual([3, 2, 1]);
});
