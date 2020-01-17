/**
 * @jest-environment jsdom
 */

import { PuppyVM } from '../src/puppy2d';

const puppy = new PuppyVM(document.body, { jest: true });

test('True', () => {
  expect(puppy.eval(`x = True`, 'x')).toStrictEqual(true);
});

test('False', () => {
  expect(puppy.eval(`x = False`, 'x')).toStrictEqual(false);
});

test('1 < 2 and 1 < 3', () => {
  expect(puppy.eval(`x = 1 < 2 and 1 < 3`, 'x')).toStrictEqual((1 < 2) && (1 < 3));
});

test('1 < 2 and 1 > 3', () => {
  expect(puppy.eval(`x = 1 < 2 and 1 > 3`, 'x')).toStrictEqual((1 < 2) && (1 > 3));
});

test('1 > 2 and 1 < 3', () => {
  expect(puppy.eval(`x = 1 > 2 and 1 < 3`, 'x')).toStrictEqual((1 > 2) && (1 < 3));
});

test('1 > 2 and 1 > 3', () => {
  expect(puppy.eval(`x = 1 > 2 and 1 > 3`, 'x')).toStrictEqual((1 > 2) && (1 > 3));
});

test('1 < 2 or 1 < 3', () => {
  expect(puppy.eval(`x = 1 < 2 or 1 < 3`, 'x')).toStrictEqual((1 < 2) || (1 < 3));
});

test('1 < 2 or 1 > 3', () => {
  expect(puppy.eval(`x = 1 < 2 or 1 > 3`, 'x')).toStrictEqual((1 < 2) || (1 > 3));
});

test('1 > 2 or 1 < 3', () => {
  expect(puppy.eval(`x = 1 > 2 or 1 < 3`, 'x')).toStrictEqual((1 > 2) || (1 < 3));
});

test('1 > 2 or 1 > 3', () => {
  expect(puppy.eval(`x = 1 > 2 or 1 > 3`, 'x')).toStrictEqual((1 > 2) || (1 > 3));
});

test('not 1 > 2', () => {
  expect(puppy.eval(`x = not 1 > 2`, 'x')).toStrictEqual(!(1 > 2));
});

test('not 1 < 2', () => {
  expect(puppy.eval(`x = not 1 < 2`, 'x')).toStrictEqual(!(1 < 2));
});


test('1 if 1 < 2 else 2', () => {
  expect(puppy.eval(`x = 1 if 1 < 2 else 2`, 'x')).toStrictEqual((1 < 2) ? 1 : 2);
});

test('1 if 1 > 2 else 2', () => {
  expect(puppy.eval(`x = 1 if 1 > 2 else 2`, 'x')).toStrictEqual((1 > 2) ? 1 : 2);
});

