
//import { Common } from './core';
export { Puppy } from './puppy2d';
export { ErrorLog } from './lang/puppy';

// simple usage
import  { Puppy } from './puppy2d';

const settings: any = {
}

const puppy = new Puppy(document.body, settings);
puppy.load(`
print('Hello, World')
`);
puppy.start();
