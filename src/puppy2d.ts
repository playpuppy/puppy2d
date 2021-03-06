import { Common } from './matter-ts/commons'
import { Vector, Bounds } from './matter-ts/geometry'
//import { Body } from './matter-ts/body'
import { PuppyRender } from './puppyvm/render';
import { Engine, Runner } from './matter-ts/core';

import { PuppyCode, SourceEvent, SourceError } from './lang/code';
import { compile as PuppyCompile } from './lang/compiler';
import { LineEvent, OutputEvent, ActionEvent, newEventId } from './puppyos/events';
import { chooseColorScheme } from './puppyvm/color';
import { PuppyWorld } from './puppyvm/world';


const DefaultPuppyCode: PuppyCode = {
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
      yield 200;
    }
    // world.print(world.input('hoge'));
    // world.print(world.input('hogo'));
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
    const form = document.createElement('form');
    form.style.position = 'absolute';
    form.style.top = '10px';
    form.onsubmit = () => {
      const value = input.value;
      form.style.display = 'none';
      console.log(`input ${value}`);
      callback(value);
      element.removeChild(form);
      return false;
    }
    const caption = form.appendChild(document.createElement('div'));
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

class PuppyEventHandler {
  private eventMap: { [key: string]: ((event: any) => void)[] } = {};

  public addEventListener(key: string, callback: (event: any) => void) {
    if (this.eventMap[key] === undefined) {
      this.eventMap[key] = [];
    }
    this.eventMap[key].push(callback);
  }

  public trigger(key: string, event: any) {
    const callbacks = this.eventMap[key];
    if (callbacks !== undefined) {
      event.trigger = key;
      for (const callback of callbacks) {
        callback(event);
      }
    }
    //console.log(event); // for debugging
  }

  public syslog(channel: 'stdout' | 'stderr' | 'verbose' | 'debug', text: any) {
    if (channel in this.eventMap) {
      const event: OutputEvent = {
        id: newEventId(),
        type: channel,
        text: `${text}`,
      }
      this.trigger(channel, event);
    }
    console.log(`${channel} ${text}`);
  }
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
  engine: Engine | null = null;
  render: PuppyRender | null = null;
  runner: Runner | null = null;
  runtime: IterableIterator<number> | null = null;
  private syscalls: any;

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
    const world = this.engine === null
      ? new PuppyWorld(this, compiled) : this.engine.world as PuppyWorld;
    const runtime = compiled.main(world, compiled.codemap);
    for (var i = 0; i < 100; i += 1) {
      const res = runtime.next();
      if (res.done) {
        break;
      }
    }
    return variable === undefined ? world.vars : world.vars[variable];
  }

  private paused = false;

  public start() {
    this.stop();
    if (this.engine === null) {
      const world = new PuppyWorld(this, this.code);
      this.engine = new Engine(world);
      this.render = new PuppyRender(this.engine, this.element);
      this.runner = new Runner();
      this.runtime = this.code.main(world, this.code.codemap);
      const event: ActionEvent = { id: newEventId(), action: 'start', type: 'run' };
      this.trigger('start', event);
      this.trigger('action', event);

      /* start */
      this.paused = false;
      this.render!.start();  // FIXME
      Runner.run(this.runner, this.engine);
      this.execEach(this.runtime);
    }
  }

  public stop() {
    if (this.engine !== null) {
      this.runtime = null;
      if (this.render !== null) {
        this.render.stop();
        this.render.clear();
        this.render = null;
      }
      if (this.runner !== null) {
        Runner.stop(this.runner);
        this.runner = null;
      }
      this.engine.clear();
      this.engine = null;
      const event: ActionEvent = { id: newEventId(), type: 'dispose', action: 'end' };
      this.trigger('action', event);
    }
  }

  private execNext(runtime: IterableIterator<number>) {
    try {
      var time = 0;
      while (time === 0) {
        var res = runtime.next();
        if (res.done) return -1;
        time = res.value % 1000;
        if (time !== 0) {
          const event: LineEvent = { id: newEventId(), type: 'executed', row: res.value / 1000 };
          this.trigger('line', event);
        }
      }
      return time;
    }
    catch (e) {
      if (e instanceof PuppyRuntimeError) {
        e.event.time = this.engine!.timing.timestamp;
        this.trigger('errors', e.event);
      }
      else {
        this.syslog('debug', e);
      }
    }
  }

  private execEach(runtime: IterableIterator<number>) {
    if (runtime === this.runtime && runtime !== null) {
      if (this.paused) {
        setTimeout(() => { this.execEach(runtime) }, 100);
        return;
      }
      const interval = this.execNext(runtime);
      if (interval === -1) {
        const engine = this.engine;
        if (engine !== null) {
          const world: any = engine.world;
          world.isStillActive = false;
          setTimeout(() => {
            if (world.isStillActive) {
              this.execEach(runtime);
            }
            else {
              this.pause();
              const event: ActionEvent = { id: newEventId(), action: 'end', type: 'run' };
              this.trigger('end', event);
              this.trigger('action', event);
            }
          }, 5000);
        }
        return;
      }
      setTimeout(() => { this.execEach(runtime) }, interval);
    }
  }

  public pause(message = '▶︎') {
    if (this.engine !== null) {
      this.paused = true;
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
      this.paused = false;
      Runner.start(this.runner!, this.engine);
      const event: ActionEvent = { id: newEventId(), action: 'restart', type: 'run' };
      //this.trigger('start', event);
      this.trigger('action', event);
    }
    else {
      this.start();
    }
  }

  public step() {
    if (this.engine === null) {
      this.start();
      this.pause();
    }
    if (this.engine !== null && this.runtime !== null) {
      this.render!.start();
      // this.paused = false;
      // Runner.start(this.runner!, this.engine);
      var time = 1;
      var row = 0;
      while (time !== 0) {
        var res = this.runtime.next();
        if (res.done) {
          this.stop();
          return;
        }
        time = res.value % 1000;
        for (var delta = 0; delta >= time; delta += 1000 / 60) {
          this.engine.update();
        }
        row = res.value / 1000;
      }
      const event: LineEvent = { id: newEventId(), type: 'next', row: row }
      this.trigger('line', event);
      this.pause();
    }
  }

  // eval

  public syscall(name: string, data: any) {
    const world = this.engine!.world as PuppyWorld;
    world.vars['_'] = null;
    this.pause('');
    return this.syscall_(world, name, data);
  }

  async syscall_(world: PuppyWorld, name: string, data: any) {
    await this.syscalls[name](data, (res: any) => {
      world.vars['_'] = res;
      this.restart();
    })
    while (world.vars['_'] === null) {
      await this.wait();
    }
    return await world.vars['_'];
  }


  private async wait(msec = 100) {
    await new Promise(resolve => setTimeout(resolve, msec));
  }

}


export class PuppyOS extends PuppyEventHandler {
  private uid: string;
  private env: { [key: string]: any }
  private vm: PuppyVM | null = null;

  public constructor(uid = 'guest') {
    super();
    this.uid = uid;
    const data = window.sessionStorage.getItem(this.filePath('settings.json'));
    this.env = data ? JSON.parse(data) : {}
    this.env['USER'] = uid;
  }

  public newPuppyVM(element: HTMLElement) {
    this.vm = new PuppyVM(element, this);
    return this.vm;
  }

  private filePath(fileName = 'settings.json') {
    return `/puppy/${this.uid}/${fileName}`;
  }

  private parseKeyValue(keyValue: string): [string, any] {
    const pos = keyValue.indexOf('=');
    if (pos === -1) {
      return [keyValue, true];
    }
    return [keyValue.substring(0, pos), keyValue.substring(pos + 1)];
  }

  public getenv(key: string, value: any) {
    const data = this.env[key];
    return data || value;
  }

  public setenv(key: string, value: any) {
    const oldValue = this.env[key];
    this.env[key] = value;
    const data = JSON.stringify(this.env);
    window.sessionStorage.setItem(this.filePath('settings.json'), data);
    if (oldValue !== value) {
      this.trigger('changed', { key, value, oldValue, env: this.env })
    }
  }

  public save(fileName: string, data: any) {
    data = JSON.stringify(data);
    window.sessionStorage.setItem(this.filePath(fileName), data);
  }

  public exec(cmd: string, args: string[] = []) {
    switch (cmd) {
      case 'set':
        const pair = this.parseKeyValue(args[0]);
        this.setenv(pair[0], pair[1]);
        return;
      // case 'submit':
      //   this.submit(args[0], args[1]);
      //   return;
      default:
        this.trigger('undefined', { cmd, args })
    }
  }

  public shell(cmd: string) {
    if (cmd.startsWith('eval ') && this.vm !== null) {
      const source = cmd.substring(5);
      this.vm.eval(source);
    }
    const splited = cmd.split(' ');
    if (splited.length > 1) {
      const command = splited[0];
      const args = splited.slice(1);
      this.exec(command, args);
    }
    else {
      if (cmd.indexOf('=') !== 0) {
        this.exec('set', [cmd]);
      }
      else {
        this.exec(cmd, []);
      }
    }
  }

}