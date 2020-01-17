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

test('0xff', () => {
  expect(puppy.eval(`x = 0xff`, 'x')).toStrictEqual(255);
});

test('0b0001', () => {
  expect(puppy.eval(`x = 0b0011`, 'x')).toStrictEqual(3);
});

test('3.14e-2', () => {
  expect(puppy.eval(`x = 3.14e-2`, 'x')).toBe(0.0314);
});

test(`'single'`, () => {
  expect(puppy.eval(`x = 'single'`, 'x')).toBe('single');
});

test(`"double"`, () => {
  expect(puppy.eval(`x = "double"`, 'x')).toBe('double');
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

// operator

test(`1+2*3`, () => {
  expect(puppy.eval(`x = 1+2*3`, 'x')).toBe(7);
});

test(`1*2+3`, () => {
  expect(puppy.eval(`x = 1*2+3`, 'x')).toBe(5);
});

test(`3-2-1`, () => {
  expect(puppy.eval(`x = 3-2-1`, 'x')).toBe(0);
});

test(`7/2`, () => {
  expect(puppy.eval(`x = 7/2`, 'x')).toBe(7 / 2);
});

test(`7//2`, () => {
  expect(puppy.eval(`x = 7//2`, 'x')).toBe((7 / 2 | 0));
});

test(`1==1`, () => {
  expect(puppy.eval(`x = 1 == 1`, 'x')).toBe(true);
});

test(`1!=1`, () => {
  expect(puppy.eval(`x = 1 != 1`, 'x')).toBe(false);
});

test(`1<1+1`, () => {
  expect(puppy.eval(`x = 1<1+1`, 'x')).toBe(true);
});

test(`1>1+1`, () => {
  expect(puppy.eval(`x = 1>1+1`, 'x')).toBe(false);
});

test(`2<=1+1`, () => {
  expect(puppy.eval(`x = 2<=1+1`, 'x')).toBe(true);
});

test(`2>=1+1`, () => {
  expect(puppy.eval(`x = 2>=1+1`, 'x')).toBe(true);
});

test(`global scope`, () => {
  expect(puppy.eval(`
x = 1
def f():
  x = 2
f()
`, 'x')).toStrictEqual(2);
});



