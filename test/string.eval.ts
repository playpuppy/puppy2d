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




