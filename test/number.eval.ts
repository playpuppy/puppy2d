/**
 * @jest-environment jsdom
 */

import { PuppyVM, PuppyRuntimeError } from '../src/puppy2d';

const puppy = new PuppyVM(document.body, { jest: true });

test(`n = 1`, () => {
  expect(puppy.eval(`
n = 1
`, 'n')).toStrictEqual(1);
});

test(`n = 2+3`, () => {
  expect(puppy.eval(`
n = 2+3
`, 'n')).toStrictEqual(2 + 3);
});

test(`n = 2*3`, () => {
  expect(puppy.eval(`
n = 2*3
`, 'n')).toStrictEqual(2 * 3);
});

test(`n = 7/3`, () => {
  expect(puppy.eval(`
n = 7/3
`, 'n')).toStrictEqual(7 / 3);
});

test(`n = 7//3`, () => {
  expect(puppy.eval(`
n = 7//3
`, 'n')).toStrictEqual((7 / 3) | 0);
});

test(`n = 7%3`, () => {
  expect(puppy.eval(`
n = 7%3
`, 'n')).toStrictEqual(7 % 3);
});

test(`n = 1+2*3`, () => {
  expect(puppy.eval(`
n = 1+2*3
`, 'n')).toStrictEqual(1 + 2 * 3);
});

test(`n = 1*2+3`, () => {
  expect(puppy.eval(`
n = 1*2+3
`, 'n')).toStrictEqual(1 * 2 + 3);
});

test(`n = (1+2)*3`, () => {
  expect(puppy.eval(`
n = (1+2)*3
`, 'n')).toStrictEqual((1 + 2) * 3);
});

test(`1 == 1.0`, () => {
  expect(puppy.eval(`
x = (1 == 1.0)
`, 'x')).toStrictEqual(true);
});

test(`1 == 0`, () => {
  expect(puppy.eval(`
x = (1 == 0)
`, 'x')).toStrictEqual(false);
});

test(`1 != 1.0`, () => {
  expect(puppy.eval(`
x = (1 != 1.0)
`, 'x')).toStrictEqual(false);
});

test(`1 != 0`, () => {
  expect(puppy.eval(`
x = (1 != 0)
`, 'x')).toStrictEqual(true);
});

test(`1 < 2`, () => {
  expect(puppy.eval(`
x = (1 < 2)
`, 'x')).toStrictEqual(true);
});

test(`2 < 1`, () => {
  expect(puppy.eval(`
x = (2 < 1)
`, 'x')).toStrictEqual(false);
});

test(`1 <= 2`, () => {
  expect(puppy.eval(`
x = (1 <= 2)
`, 'x')).toStrictEqual(true);
});

test(`2 <= 1`, () => {
  expect(puppy.eval(`
x = (2 <= 1)
`, 'x')).toStrictEqual(false);
});

test(`1 <= 1`, () => {
  expect(puppy.eval(`
x = (1 <= 1)
`, 'x')).toStrictEqual(true);
});

test(`1 > 2`, () => {
  expect(puppy.eval(`
x = (1 > 2)
`, 'x')).toStrictEqual(false);
});

test(`2 > 1`, () => {
  expect(puppy.eval(`
x = (2 > 1)
`, 'x')).toStrictEqual(true);
});

test(`1 >= 2`, () => {
  expect(puppy.eval(`
x = (1 >= 2)
`, 'x')).toStrictEqual(false);
});

test(`2 >= 1`, () => {
  expect(puppy.eval(`
x = (2 >= 1)
`, 'x')).toStrictEqual(true);
});

test(`1 >= 1`, () => {
  expect(puppy.eval(`
x = (1 <= 1)
`, 'x')).toStrictEqual(true);
});

test(`2 << 2`, () => {
  expect(puppy.eval(`
x = (2 << 2)
`, 'x')).toStrictEqual(2 << 2);
});

test(`17 >> 2`, () => {
  expect(puppy.eval(`
x = (17 >> 2)
`, 'x')).toStrictEqual(17 >> 2);
});

test(`0xff`, () => {
  expect(puppy.eval(`
x = 0xff
`, 'x')).toStrictEqual(0xff);
});

test(`int(1.23)`, () => {
  expect(puppy.eval(`
x = int(1.23)
`, 'x')).toStrictEqual(1);
});

test(`float(1.23)`, () => {
  expect(puppy.eval(`
x = float(1.23)
`, 'x')).toStrictEqual(1.23);
});


