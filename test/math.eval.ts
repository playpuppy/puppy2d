/**
 * @jest-environment jsdom
 */

import { Puppy } from '../src/puppy2d';

const puppy = new Puppy(document.body, { jest: true });

test('math.sin(0)', () => {
  expect(puppy.eval(`
import math
x = math.sin(0)
`, 'x')).toStrictEqual(Math.sin(0));
});

test('sin(0)', () => {
  expect(puppy.eval(`x = sin(0)`, 'x')).toStrictEqual(Math.sin(0));
});

test('cos(0)', () => {
  expect(puppy.eval(`x = cos(0)`, 'x')).toStrictEqual(Math.cos(0));
});

test('tan(0)', () => {
  expect(puppy.eval(`x = tan(0)`, 'x')).toStrictEqual(Math.tan(0));
});

test('asin(0)', () => {
  expect(puppy.eval(`x = asin(0)`, 'x')).toStrictEqual(Math.asin(0));
});

test('acos(0)', () => {
  expect(puppy.eval(`x = acos(0)`, 'x')).toStrictEqual(Math.acos(0));
});

test('atan(0)', () => {
  expect(puppy.eval(`x = atan(0)`, 'x')).toStrictEqual(Math.atan(0));
});

test('sinh(0)', () => {
  expect(puppy.eval(`x = sinh(0)`, 'x')).toStrictEqual(Math.sinh(0));
});

test('cosh(0)', () => {
  expect(puppy.eval(`x = cosh(0)`, 'x')).toStrictEqual(Math.cosh(0));
});

test('tanh(0)', () => {
  expect(puppy.eval(`x = tanh(0)`, 'x')).toStrictEqual(Math.tanh(0));
});

test('asinh(0)', () => {
  expect(puppy.eval(`x = asinh(0)`, 'x')).toStrictEqual(Math.asinh(0));
});

test('acosh(0)', () => {
  expect(puppy.eval(`x = acosh(0)`, 'x')).toStrictEqual(Math.acosh(0));
});

test('atanh(0)', () => {
  expect(puppy.eval(`x = atanh(0)`, 'x')).toStrictEqual(Math.atanh(0));
});

test('pi', () => {
  expect(puppy.eval(`
import math
x = math.pi
`, 'x')).toStrictEqual(Math.PI);
});

test('pi', () => {
  expect(puppy.eval(`
from math import *
x = pi
`, 'x')).toStrictEqual(Math.PI);
});
