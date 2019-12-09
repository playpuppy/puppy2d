/**
 * @jest-environment jsdom
 */

import { PuppyVM, PuppyRuntimeError } from '../src/puppy2d';

const puppy = new PuppyVM(document.body, { jest: true });

test(`s = ''`, () => {
  expect(puppy.eval(`
s = ''
`, 's')).toStrictEqual('');
});

test(`s = 'あいう'`, () => {
  expect(puppy.eval(`
s = 'あいう'
`, 's')).toStrictEqual('あいう');
});

test(`len(s)`, () => {
  expect(puppy.eval(`
s = 'あいう'
n = len(s)
`, 'n')).toStrictEqual(3);
});

test(`'a' == 'b'`, () => {
  expect(puppy.eval(`
x = ('a' == 'b')
`, 'x')).toStrictEqual(false);
});

test(`'a' != 'b'`, () => {
  expect(puppy.eval(`
x = ('a' != 'b')
`, 'x')).toStrictEqual(true);
});

test(`'a' < 'b'`, () => {
  expect(puppy.eval(`
x = ('a' < 'b')
`, 'x')).toStrictEqual(true);
});

test(`'a' > 'b'`, () => {
  expect(puppy.eval(`
x = ('a' > 'b')
`, 'x')).toStrictEqual(false);
});

test(`f'{1+1}'`, () => {
  expect(puppy.eval(`
s = f'{1+1}'
`, 's')).toStrictEqual('2');
});

test(`'a' + 'b' + 'c'`, () => {
  expect(puppy.eval(`
s = 'a' + 'b' + 'c'
`, 's')).toStrictEqual('abc');
});

test(`s[0]`, () => {
  expect(puppy.eval(`
s = 'abc'
s2 = s[0]
`, 's2')).toStrictEqual('a');
});

test(`int(1.23)`, () => {
  expect(puppy.eval(`
x = int('1.23')
`, 'x')).toStrictEqual(1);
});

test(`float(1.23)`, () => {
  expect(puppy.eval(`
x = float('1.23')
`, 'x')).toStrictEqual(1.23);
});

test(`list('abc')`, () => {
  expect(puppy.eval(`
x = list('abc')
`, 'x')).toStrictEqual(['a', 'b', 'c']);
});

test(`'abc'.startswith('ab')`, () => {
  expect(puppy.eval(`
x = 'abc'.startswith('ab')
`, 'x')).toStrictEqual(true);
});


test(`isinstance('abc',str)`, () => {
  expect(puppy.eval(`
x = isinstance('abc',str)
`, 'x')).toStrictEqual(true);
});


