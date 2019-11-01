
//import { Common } from './core';
import { Vector, Bounds } from './geometry';
import { Body, Composite, World } from './body';
import { Detector } from './collision';
import { Render } from './render';
//import { Constraint } from './constraint';
import { Bodies, Composites } from './factory';
import { Engine, Runner } from './core';
import { Puppy } from './puppy2d';

const puppy = new Puppy(document.body);
puppy.load();
puppy.start();

// // create engine
// const world = new PuppyWorld();
// console.log(world);

// const engine = new Engine(world);
// console.log(engine);

// const render = new Render(engine, document.body);

// //fit the render viewport to the scene
// render.lookAt(new Bounds(-500, 500, 500, -500));

// //console.log(Bodies.rectangle(600, 100, 60, 60, { frictionAir: 0.1 }));

// world.newBody({
//   shape: 'rectangle', position: world.newVec(0, 500),
//   width: 1000, height: 100, isStatic: true,
// });

// world.newBody({
//   shape: 'rectangle', position: world.newVec(0, -500),
//   width: 1000, height: 100, isStatic: true,
// });

// world.newBody({
//   shape: 'rectangle', position: world.newVec(500, 0),
//   width: 100, height: 1000, isStatic: true,
// });

// world.newBody({
//   shape: 'rectangle', position: world.newVec(-500, 0),
//   width: 100, height: 1000, isStatic: true,
// });

// world.newBody({
//   shape: 'rectangle',
//   position: world.newVec(100, 100),
//   width: 60, height: 60,
//   frictionAir: 0.001,
// });

// world.newBody({
//   shape: 'rectangle',
//   position: world.newVec(-100, 100),
//   width: 60, height: 60,
//   frictionAir: 0.001,
// });

// world.newBody({
//   shape: 'rectangle',
//   position: world.newVec(100, -100),
//   width: 60, height: 60,
//   frictionAir: 0.1,
// });

// world.newBody({
//   shape: 'rectangle',
//   position: world.newVec(-100, -100),
//   width: 60, height: 60,
//   frictionAir: 0.1,
// });

// render.run();

// //create runner
// var runner = new Runner();
// Runner.run(runner, engine);

