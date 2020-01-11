import { PuppyVM, PuppyCode, PuppyWorld } from './puppyvm/vm';
//import { PuppyEditor } from './playground/editor';

const SampleCode: PuppyCode = {
  world: {},
  main: function* (world: PuppyWorld) {
    // world.Rectangle(0, 500, 1000, 100, { isStatic: true });
    // world.Rectangle(0, -500, 1000, 100, { isStatic: true });
    // world.Rectangle(500, 0, 100, 1000, { isStatic: true });
    // world.Rectangle(-500, 0, 100, 1000, { isStatic: true });

    // world.setGravity(0, -1.0);
    // world.newObject({
    //   shape: 'newtonsCradle',
    //   position: new Vector(0, 0),
    //   margin: 10,
    //   columns: 3,
    //   //part: { shape: 'rectangle' },
    // });
    // world.newObject({
    //   shape: 'array',
    //   position: new Vector(0, 0),
    //   margin: 10,
    //   part: { shape: 'circle', restitution: 1.0 },
    // });
    // const sensor: any = world.Rectangle(-200, 200, 260, 260, { frictionAir: 1, isSensor: true, isStatic: true });
    // sensor.moveover = (bodyA: Body, bodyB: Body) => {
    //   console.log(bodyA);
    //   console.log(bodyB);
    // }
    // world.Variable('TIME', 320, -400, { width: 260 });
    // world.Variable('MOUSE', 320, -440, { width: 260 });
    // world.vars['__anime__'] = (t: number) => {
    //   if (t === 0)
    //     world.print(`${t}`);
    // }
    //world.Rectangle(0, 0, 100, 100, { texture: 'bird.png' })
    for (var i = 0; i < 6; i++) {
      world.plot(Math.sin(i) * 80, Math.cos(i) * 80, {
        ttl: 5000, fillStyle: world.colors[0]
      });
      //world.print(`hoge hoge hoge hoge ${i}`);
      yield 100;
    }
    return 0;
  },
  symbols: {},
  errors: [],
  warnings: [],
  notices: [],
  codemap: [],
  code: '',
}


const puppy = new PuppyVM(
  document.getElementById('canvas')!,
  { code: SampleCode });

const editor = document.getElementById('editor')! as HTMLTextAreaElement;

const playdomino = document.getElementById('playdomino')!;
playdomino.addEventListener('click', (e) => {
  console.log(`run ${editor.innerText}`);
  puppy.load(editor.value);
}
// const editor = new PuppyEditor(document.body);
// editor.setModel(`
// print('Hello, World')
// def __keyup__(key, time):
//   print(key)
//   print(time)
// `, "python");
// editor.addLineHighLight(2, 2);
// //editor.addLineHighLight(4, 4, 'zenkaku');

// puppy.load(`
// print('Hello, World')
// def __keyup__(key, time):
//   print(key)
//   print(time)
// `);
// puppy.start();
