
//import { Common } from './core';
import { Puppy } from './puppy2d';

const settings: any = {
}

const puppy = new Puppy(document.body, settings);
puppy.load(`
print('Hello, World')
`);
puppy.start();
