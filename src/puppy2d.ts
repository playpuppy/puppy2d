import { Common } from './matter-ts/commons'
import { Vector, Vertices, Bounds } from './matter-ts/geometry'
import { Body, World, Composite, Constraint } from './matter-ts/body'
import { PuppyRender } from './puppy-render';
import { Engine, Runner } from './matter-ts/core';

import { PuppyCode, SourceEvent, SourceError } from './lang/code';
import { compile as PuppyCompile } from './lang/compiler';
import { LineEvent, OutputEvent, ActionEvent, newEventId } from './events';
import { chooseColorScheme } from './color';
import { MatterWorld } from './matter';
import { assignmentExpression } from '@babel/types';
import { readFileSync } from 'fs';

export class PuppyWorld extends MatterWorld {
  public timestamp = 0;
  public colors: string[];
  public darkmode = false;
  public background = '#F7F6EB';
  public wireframes = false;
  public tangible = false;
  public gyroscope = false;

  public constructor(vm: PuppyVM, options: any = {}) {
    super(vm, Object.assign(options, { id: 0 }));
    this.World(options);
    this.colors = chooseColorScheme(options.colorScheme);
  }

  public World(options: any = {}) {
    if (options.screen) {
      this.screen = options.screen;
    }
    if (options.width || options.height) {
      this.width = options.width;
      this.height = options.height || this.width;
    }
    if (this.screen) {
      this.bounds = new Bounds(0, 0, this.width, this.height);
    }
    else {
      this.bounds = new Bounds(-this.width / 2, this.height / 2, this.width / 2, -this.height / 2);
    }
    if (typeof options.background === 'string') {
      this.background = options.background;
      if (this.vm.render !== null) {
        this.vm.render.applyBackground(options.background);
      }
    }
    if (options.gravity instanceof Vector) {
      this.gravity = options.gravity;
    }
    if (options.wireframes) {
      this.wireframes = options.wireframes;
    }
  }

  public setGravity(x: number, y: number) {
    this.gravity = new Vector(x, y);
  }

  public setViewport(x1: number, y1: number, x2: number, y2: number) {
    if (this.vm.render !== null) {
      this.vm.render.setViewport(x1, y1, x2, y2);
    }
  }

  // from puppy vm

  public paint(x: number, y: number, radius = 5) {
    const options = {
      position: new Vector(x, y),
      shape: 'circle',
      width: radius * 2,
      zindex: 0,
    }
    this.timeToLive(this.newObject(options), 5000);
  }

  public input(text: string = '') {
    // if(bufferをみる) {
    //   return buffer;
    // }
    return this.vm.syscall('input', { text });
  }

  public raise(codemap: any, key: string, params?: any[]) {
    this.vm.raise(codemap, key, params);
  }

  public getindex(list: any, index: number, codemap: any[], tkid: number) {
    if (Array.isArray(list) || typeof list === 'string') {
      if (0 <= index && index < list.length) {
        return list[index];
      }
      this.raise(codemap[tkid], 'OutofArrayIndex', ['@index', index, '@length', list.length]);
    }
    if (list.getindex && list.size) {
      if (0 <= index && index < list.size()) {
        return list.getindex(index);
      }
      this.raise(codemap[tkid], 'OutofArrayIndex', ['@index', index, '@length', list.size()]);
    }
    this.raise(codemap[tkid], 'TypeError/NotArray', ['@given', (typeof list)]);
  }

  public setindex(list: any, index: number, value: any, codemap: any[], tkid: number) {
    if (Array.isArray(list)) {
      if (0 <= index && index < list.length) {
        list[index] = value;
        return;
      }
      this.raise(codemap[tkid], 'OutofArrayIndex', ['@index', index, '@length', list.length]);
    }
    else if (list.setindex && list.size) {
      if (0 <= index && index < list.size()) {
        list.setindex(index, value);
        return;
      }
      this.raise(codemap[tkid], 'OutofArrayIndex', ['@index', index, '@length', list.size()]);
    }
    else {
      this.raise(codemap[tkid], 'TypeError/NotArray', ['@given', (typeof list)]);
    }
  }



  public fficall(name: string, ...params: any[]) {
    const callback = this.vars[name];
    if (callback !== undefined) {
      try {
        return callback(...params);
      }
      catch (e) {
        console.log(e);
      }
    }
  }


  // private token(tkid: number, event: any) {
  //   return event;
  // }

  // public v(value: any, tkid: number) {
  //   this.vm.trigger('variable', this.token(tkid, {
  //     value: value,
  //   }));
  //   return this.v;
  // }

  // public ckint(value: any, tkid: number) {
  //   if (typeof value !== 'number') {
  //     this.vm.trigger('error', {
  //       status: 'runtime',
  //       value: value,
  //     });
  //   }
  //   return this.v;
  // }

  // public ckstr(value: any, tkid: number) {
  //   if (typeof value !== 'string') {
  //     this.vm.trigger('error', {
  //       status: 'runtime',
  //       value: value,
  //     });
  //   }
  //   return this.v;
  // }

  public trace(log: any) {
    console.log(log);
    // this.settings.trace(log);
  }

  // lazy updates

  private lazyUpdates: (() => void)[] = [];

  public setLazy(key: string, target: any, value: any) {
    this.lazyUpdates.push(() => {
      target[key] = value;
    })
  }

  public updateLazies() {
    for (const f of this.lazyUpdates) {
      f();
    }
    this.lazyUpdates = [];
  }

  public setpos(target: Body, position: Vector) {
    this.lazyUpdates.push(() => {
      target.setPosition(position);
    })
  }
}

const DefaultPuppyCode: PuppyCode = {
  world: {},
  main: function* (world: PuppyWorld) {
    world.Rectangle(0, 500, 1000, 100, { isStatic: true });
    world.Rectangle(0, -500, 1000, 100, { isStatic: true });
    world.Rectangle(500, 0, 100, 1000, { isStatic: true });
    world.Rectangle(-500, 0, 100, 1000, { isStatic: true });

    world.setGravity(0, -1.0);
    // world.newObject({
    //   shape: 'newtonsCradle',
    //   position: new Vector(0, 0),
    //   margin: 10,
    //   columns: 3,
    //   //part: { shape: 'rectangle' },
    // });
    world.newObject({
      shape: 'array',
      position: new Vector(0, 0),
      margin: 10,
      part: { shape: 'circle', restitution: 1.0 },
    });
    const sensor: any = world.Rectangle(-200, 200, 260, 260, { frictionAir: 1, isSensor: true, isStatic: true });
    sensor.moveover = (bodyA: Body, bodyB: Body) => {
      console.log(bodyA);
      console.log(bodyB);
    }
    world.Variable('TIME', 320, -400, { width: 260 });
    world.Variable('MOUSE', 320, -440, { width: 260 });
    for (var i = 0; i < 20; i++) {
      world.paint(Math.sin(i) * 100, Math.cos(i) * 100, 20);
      //world.print(`${i}`);
      yield 200;
    }
    // world.World({ wireframes: true });
    for (var i = 0; i < 40; i++) {
      world.paint(Math.sin(i) * 100, Math.cos(i) * 100, 20);
      //world.print(`${i}`);
      yield 200;
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

const initSyscalls = (element: HTMLElement, options: any) => {
  const syscalls: { [key: string]: any } = {}

  const defaultInput = (msg: string = '', callback: (res: any) => void) => {
    //vars['_'] = (); yield -1; x = vars['']
    const form = document.createElement('form');
    form.onsubmit = () => {
      const value = input.value;
      form.style.display = 'none';
      element.removeChild(form);
      callback(value);
      return false;
    }
    const caption = form.appendChild(document.createElement('div'));
    caption.innerText = msg;
    const input = form.appendChild(document.createElement('input'));
    input.placeholder = '';
    const submit = form.appendChild(document.createElement('button'));
    submit.type = 'submit';
    submit.onclick = () => {
      const value = input.value;
      form.style.display = 'none';
      element.removeChild(form);
      callback(value);
    }
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

  //

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




  async syscall(name: string, data: any) {
    const world = this.engine!.world as PuppyWorld;
    this.pause('');
    world.vars['_'] = null;
    this.syscalls[name](data, (res: any) => {
      world.vars['_'] = res;
      this.restart();
    })
    while (world.vars['_'] === null) {
      await this.wait();
    }
    return world.vars['_'];
  }

  private async wait(msec = 100) {
    await new Promise(resolve => setTimeout(resolve, msec));
  }

}


export class PuppyOS extends PuppyEventHandler {
  private uid: string;
  private env: { [key: string]: any }

  public constructor(uid = 'guest') {
    super();
    this.uid = uid;
    const data = window.sessionStorage.getItem(this.filePath('settings.json'));
    this.env = data ? JSON.parse(data) : {}
    this.env['USER'] = uid;
  }

  public newPuppyVM(element: HTMLElement) {
    return new PuppyVM(element, this);
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
      case 'submit':
        this.submit(args[0], args[1]);
        return;
      default:
        this.trigger('undefined', { cmd, args })
    }
  }

  public shell(command: string) {
    const args = command.split(' ');
  }

  public submit(url: string, text: string) {

  }


}