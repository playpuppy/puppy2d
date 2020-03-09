import { Engine, Runner } from '../matter-ts/core';
import { PuppyRender } from './render';

import { PuppyCode, SourceEvent, SourceError } from '../lang/code';
import { compile as PuppyCompile } from '../lang/compiler';
import { LineEvent, OutputEvent, ActionEvent, newEventId } from '../puppyos/events';
import { PuppyOS, PuppyEventHandler } from '../puppyos/os';
import { PuppyWorld } from './world';
import { PuppyStopify } from './stopify';

export { PuppyOS } from '../puppyos/os';
export { PuppyWorld } from './world';
export { PuppyCode } from '../lang/code';

const DefaultPuppyCode: PuppyCode = {
  world: {},
  main: function* (world: PuppyWorld) {
    for (var i = 0; i < 6; i++) {
      world.plot(Math.sin(i) * 80, Math.cos(i) * 80, {
        ttl: 5000, fillStyle: world.colors[0]
      });
      //world.print(`hoge hoge hoge hoge ${i}`);
      yield 200;
    }
    // world.vars['f'] = function* (a: number) {
    //   for (var i = a; i < 6; i++) {
    //     yield (yield () => world.vars['g'](0)) + i * 10;
    //   }
    //   return 'Hi';
    // }
    // world.vars['g'] = function* (a: number) {
    //   yield 50;
    //   yield 50;
    //   return 100;
    // }
    // console.log(yield () => world.vars['f'](1));
    return 0;
  },
  symbols: {},
  errors: [],
  warnings: [],
  notices: [],
  codemap: [],
  code: '',
}

const initSyscalls = (element: HTMLElement, options: any) => {
  const syscalls: { [key: string]: any } = {}

  const defaultInput = (options: any, callback: (res: any) => void) => {
    //vars['_'] = (); yield -1; x = vars['']
    console.log(`defaultInput`);
    console.log(element);
    //element.style.position = 'absolute'; // FIXME
    const form = document.createElement('form');
    form.style.position = 'relative';
    form.style.top = '-50px';
    form.onsubmit = () => {
      const value = input.value;
      form.style.display = 'none';
      console.log(`input ${value}`);
      callback(value);
      element.style.position = '';
      element.removeChild(form);
      return false;
    }
    const caption = form.appendChild(document.createElement('span'));
    caption.innerText = options.text || '';
    const input = form.appendChild(document.createElement('input'));
    input.placeholder = '';
    // const submit = form.appendChild(document.createElement('button'));
    // submit.type = 'submit';
    // submit.onclick = () => {
    //   const value = input.value;
    //   form.style.display = 'none';
    //   element.removeChild(form);
    //   callback(value);
    // }
    element.appendChild(form);
  }
  syscalls['input'] = options.input || defaultInput;
  return syscalls;
}


export class PuppyRuntimeError extends Error {
  event: SourceEvent;
  public constructor(event: SourceEvent) {
    super(`${event.key}`);
    this.name = 'PuppyRuntimeError';
    this.event = event;
  }
}


export class PuppyVM extends PuppyEventHandler {
  element: HTMLElement;
  os: PuppyOS;
  code: PuppyCode;
  world: PuppyWorld | null = null;
  engine: Engine | null = null;
  render: PuppyRender | null = null;
  runner: Runner | null = null;
  runtime: PuppyStopify | null = null;
  private syscalls: any;
  endingCPS: NodeJS.Timeout | null = null;

  public constructor(element: HTMLElement, options: any = {}) {
    super();
    this.element = element;
    this.syscalls = initSyscalls(element, options);
    this.os = options.os || new PuppyOS();
    this.code = options.code || DefaultPuppyCode;
    if (!options.jest) {
      this.load();
      this.start();
    }
  }

  // render control

  public resize(width: number, height: number) {
    if (this.render !== null) {
      this.render.resize(width, height);
    }
  }

  public setWireframes(wireframes: boolean, time?: number) {
    if (this.render !== null) {
      const currentWireframes = this.render.options.wireframes;
      this.render.options.wireframes = wireframes;
      if (time !== undefined) {
        const render = this.render;
        setTimeout(() => {
          render.options.wireframes = currentWireframes;
        }, time);
      }
    }
  }

  //
  public raise(tokenmap: any, key: string, params?: any[]) {
    if (this.code !== null) {
      const event: SourceEvent = SourceError(tokenmap, key, params);
      throw new PuppyRuntimeError(event);
    }
    else {
      console.log(`unthrown ${key}`);
    }
  }

  private compile(source: string) {
    const compiled = PuppyCompile({ source });
    const event: ActionEvent = { id: newEventId(), action: 'end', type: 'compile' };
    this.trigger('action', event);
    this.trigger('info', compiled.notices);
    this.trigger('warning', compiled.warnings);
    this.trigger('error', compiled.errors);
    return compiled;
  }

  public load(source?: string, autorun = true) {
    if (source !== undefined) {
      const compiled = this.compile(source);
      if (compiled.errors.length > 0) {
        return false;
      }
      this.syslog('verbose', compiled.code);
      this.code = compiled;
      if (autorun) {
        this.start();
      }
    }
    return true;
  }

  public eval(source: string, variable?: string) {
    const compiled = this.compile(source);
    const world = this.world === null
      ? new PuppyWorld(this, compiled) : this.world as PuppyWorld;
    const stopify = new PuppyStopify(false);
    stopify.start(compiled.main(this.world, compiled.codemap));
    return variable === undefined ? world.vars : world.vars[variable];
  }

  // control machine 

  public reset() {
    if (this.endingCPS !== null) {
      console.log('TODO: ending CPS');
      clearTimeout(this.endingCPS);
      this.endingCPS = null;
    }
    if (this.runtime !== null) {
      this.runtime.pause();
      this.runtime = null;
    }
    if (this.render !== null) {
      this.render.stop();
      this.render.clear();
      this.render = null;
    }
    if (this.runner !== null) {
      Runner.stop(this.runner);
      this.runner = null;
    }
    if (this.engine !== null) {
      this.engine.clear();
      this.engine = null;
      // const event: ActionEvent = { id: newEventId(), type: 'dispose', action: 'end' };
      // this.trigger('action', event);
    }
  }

  public start() {
    this.reset();
    if (this.engine === null) {
      this.world = new PuppyWorld(this, this.code);
      this.engine = new Engine(this.world);
      this.render = new PuppyRender(this.engine, this.element);
      this.runner = new Runner();
      this.runtime = new PuppyStopify();

      /* start */
      this.render!.start();  // FIXME
      Runner.run(this.runner, this.engine);
      const ending = () => {
        const engine = this.engine;
        if (engine !== null) {
          const world: any = engine.world;
          world.isStillActive = false;
          this.endingCPS = setTimeout(() => {
            if (world.isStillActive) {
              ending();
            }
            else {
              this.pause();
            }
          }, 10000);
        }
      }
      this.runtime.start(
        this.code.main(this.world, this.code.codemap),
        ending);
      // this.runtime = this.code.main(world, this.code.codemap);
      // const event: ActionEvent = { id: newEventId(), action: 'start', type: 'run' };
      // this.trigger('start', event);
      // this.trigger('action', event);
      // this.execEach(this.runtime);
    }
  }

  public pause(message = '▶︎') {
    if (this.engine !== null) {
      this.runtime?.pause();
      this.render!.stop(message); // FIXME
      Runner.stop(this.runner!);
      const event: ActionEvent = { id: newEventId(), action: 'pause', type: 'run' };
      //this.trigger('end', event);
      this.trigger('action', event);
    }
  }

  public restart(message = '‖') {
    if (this.engine !== null) {
      this.render!.start(message);
      Runner.start(this.runner!, this.engine);
      this.runtime?.run();
      const event: ActionEvent = { id: newEventId(), action: 'restart', type: 'run' };
      //this.trigger('start', event);
      this.trigger('action', event);
    }
    else {
      this.start();
    }
  }

  public syscall(name: string, data: any) {
    //this.pause();
    var executed = false;
    var retval: any = undefined;
    this.syscalls[name](data, (res: any) => {
      retval = res;
      executed = true;
      //this.restart();
    });
    const sync = function* () {
      while (!executed) {
        yield 300;
      }
      return retval;
    }
    return sync();
  }

}

