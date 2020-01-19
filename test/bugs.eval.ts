/**
 * @jest-environment jsdom
 */

import { PuppyVM } from '../src/puppy2d';

const puppy = new PuppyVM(document.body, { jest: true });

test(`sum(3)`, () => {
  expect(puppy.eval(`
def sum0(n):
  if n <= 1: return n
  return n + sum0(n-1)
x = sum0(3)
`, 'x')).toStrictEqual(6);
});

