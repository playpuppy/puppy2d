
//import { Common } from './core';

import { PuppyVM, PuppyOS } from './puppy2d';

export { PuppyVM, PuppyOS } from './puppy2d';
export { SourceEvent as ErrorLog } from './lang/code';

const puppyOS = new PuppyOS();
const puppy = puppyOS.newPuppyVM(document.body);

// puppy.load(`
// print('Hello, World')
// def __keyup__(key, time):
//   print(key)
//   print(time)
// `);
// puppy.start();
