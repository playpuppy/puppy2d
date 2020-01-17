/**
 * @jest-environment jsdom
 */

import { PuppyVM } from '../src/puppy2d';

const puppy = new PuppyVM(document.body, { jest: true });

test(`succ`, () => {
  expect(puppy.eval(`
def succ(n):
  return n+1
x = succ(1)
`, 'x')).toStrictEqual(2);
});

test(`sum(3)`, () => {
  expect(puppy.eval(`
def sum(n):
  if n <= 1: return n
  return n + sum(n-1)
x = sum(3)
`, 'x')).toStrictEqual(6);
});

test(`add(1,2)`, () => {
  expect(puppy.eval(`
def add(x, y):
  return x + y
x = add(1,2)
`, 'x')).toStrictEqual(3);
});

test(`add('A', 'a')`, () => {
  expect(puppy.eval(`
def add(x, y):
  return x + y
x = add('A','a')
`, 'x')).toStrictEqual('Aa');
});

test(`global scope`, () => {
  expect(puppy.eval(`
x = 1
def f():
  x = 2
f()
`, 'x')).toStrictEqual(2);
});

