
//import { Common } from './core';

import { PuppyVM, PuppyOS } from './puppy2d';

const puppyOS = new PuppyOS();
const puppy = puppyOS.newPuppyVM(document.body);

// puppy.load(`
// print('Hello, World')
// def __keyup__(key, time):
//   print(key)
//   print(time)
// `);
// puppy.start();
