import { Common, chooseColorScheme } from '../matter-ts/commons';
import { Vector, Vertices, Bounds } from '../matter-ts/geometry';
import { Body, Constraint, Composite, World } from '../matter-ts/body';
import { LibPython } from '../lang/libpython';

// shape setting

const common = (world: PuppyWorld, options: any) => {
  options.id = world.newId();
  if (options.zindex === undefined) {
    options.zindex = 1;
  }
  options.position = (!options.position) ? world.newVec() : options.position;
  if (!options.fillStyle) {
    if (options.isStatic) {
      options.fillStyle = world.colors[0];
    }
    else {
      options.fillStyle = Common.choose(world.colors);
    }
  }
  if (!options.opacity) {
    if (options.isStatic) {
      options.opacity = 0.4;
    }
    else if (options.isStatic) {
      options.opacity = 0.8;
    }
    else {
      options.opacity = 1;
    }
  }
  return options;
}

const initSize = (world: PuppyWorld, options: any, width = 100, height = width) => {
  options.width = options.width || width;
  options.height = options.height || height;
  if (options.width < 2.0) {
    options.width = world.width * options.width;
  }
  if (options.height < 2.0) {
    options.height = world.height * options.height;
  }
  return options;
}

const initVertices = (options: any, path: number[]) => {
  options.vertices = Vertices.fromPath(path);
  if (options.chamfer) {
    var chamfer = options.chamfer;
    options.vertices = Vertices.chamfer(options.vertices, chamfer.radius,
      chamfer.quality, chamfer.qualityMin, chamfer.qualityMax);
    delete options.chamfer;
  }
}

const getradius = (options: any, radius = 50): number => {
  if (options.width) {
    if (options.height) {
      return Math.min(options.width, options.height) / 2;
    }
    return options.width / 2;
  }
  if (options.height) {
    return options.height / 2;
  }
  return radius;
}

const _Polygon = (world: PuppyWorld, options: any, sides?: number, radius?: number) => {
  if (sides === undefined) {
    sides = options.sides !== undefined ? options.sides : 3;
  }
  if (radius === undefined) {
    radius = getradius(options, 50);
  }
  const theta = 2 * Math.PI / sides!;
  const path: number[] = [];
  const offset = theta * 0.5;
  for (var i = 0; i < sides!; i += 1) {
    var angle = offset + (i * theta),
      xx = Math.cos(angle) * radius,
      yy = Math.sin(angle) * radius;
    path.push(xx);
    path.push(yy);
  }
  initVertices(options, path);
  return options;
}

const _Circle = (world: PuppyWorld, options: any, radius?: number) => {
  radius = options.circleRadius = getradius(options, radius || 50);
  if (options.sides) {
    return _Polygon(world, options, options.sides, radius);
  }
  var sides = Math.ceil(Math.max(10, Math.min(25, radius)));
  if (sides % 2 === 1)
    sides += 1;
  return _Polygon(world, options, sides, radius);
}

const _Label = (world: PuppyWorld, options: any) => {
  if (!options.width) {
    var text = `_${options.textRef()}_`;
    if (options.caption) {
      text = `${options.caption}_${text}`;
    }
    options.width = world.fontWidth(text, options.font);
  }
  const width = options.width;
  const height = (!options.height) ? 40 : options.height;
  initVertices(options, [0, 0, width, 0, width, height, 0, height]);
  if (!options.fillStyle) {
    options.fillStyle = 'rgba(0,0,0,0)';
    options.opacity = 0;
  }
  if (!options.fontColor) {
    options.fontColor = world.colors[0];
  }
  return options;
}

export const PuppyShapeMap: { [key: string]: (world: PuppyWorld, options: any) => any } = {
  'rectangle': (world: PuppyWorld, options: any) => {
    const width = options.width = options.width || 100;
    const height = options.height = options.height || 100;
    initVertices(options, [0, 0, width, 0, width, height, 0, height]);
    return options;
  },
  'polygon': _Polygon,
  'circle': _Circle,
  'label': _Label,
  'variable': (world: PuppyWorld, options: any) => {
    const name = options.name;
    options.caption = options.caption || name;
    if (options.caption === '') {
      delete options.caption;
    }
    options.textRef = (body: Body) => {
      return `${world.vars[name]}`;
    }
    return _Label(world, options);
  },
}

/* composite */

const stackArray = (world: PuppyWorld, options: any) => {
  const width = (options.width = (!options.width) ? world.width * 0.5 : options.width);
  const height = (options.height = (!options.height) ? width : options.height);
  const columns = options.columns || 4;
  const rows = options.rows || columns;
  const margin = options.margin || 0;
  const partOptions = options.part || { shape: 'rectangle' }
  const pwidth = partOptions.width = (width - (columns - 1) * margin) / columns;
  const pheight = partOptions.height = (height - (rows - 1) * margin) / rows;
  const position = options.position;
  var yy = position.y - world.yscale(height / 2);
  const composite = world.newComposite();
  for (var row = 0; row < rows; row++) {
    var xx = position.x - (width / 2);
    for (var column = 0; column < columns; column++) {
      const opt = Object.assign({}, partOptions);
      opt.position = new Vector(xx + pwidth / 2, yy + world.yscale(pheight / 2));
      var body = world.newObject(opt);
      xx += pwidth + margin;
      composite.add(body);
    }
    yy += world.yscale(pheight + margin);
  }
  return composite;
}

const newtonsCradle = (world: PuppyWorld, options: any): Composite => {
  const width = (options.width = (!options.width) ? world.width * 0.5 : options.width);
  const height = (options.height = (!options.height) ? width : options.height);
  const num = options.columns || options.N || 5;
  const position = options.position;
  const separation = 1.9;
  const size = width / num / separation;
  const newtonsCradle = world.newComposite();
  const sx = position.x - (width / 2);
  const sy = position.y - world.yscale(height / 2);
  //console.log(`sx=${sx},sy=${sy}`);
  for (var i = 0; i < num; i++) {
    const cx = sx + i * (size * separation);
    const cy = sy + world.yscale(height - size);
    //console.log(`cx=${cx},cy=${cy}`);
    const parts = options.part || {};
    const circle = world.newBody({
      shape: parts.shape || 'circle',
      width: size * 2,
      position: world.newVec(cx, cy),
      inertia: parts.inertia || Infinity,
      restitution: parts.restitution || 1,
      friction: parts.friction || 0,
      frictionAir: parts.frictionAir || 0.0001,
      slop: parts.slop || 1
    });
    const constraint = world.newConstraint({
      pointA: world.newVec(cx, cy - world.yscale(height)),
      bodyB: circle,
    });
    newtonsCradle.addBody(circle);
    newtonsCradle.addConstraint(constraint);
  }
  return newtonsCradle;
}

const PuppyObjects: { [key: string]: (world: PuppyWorld, options: any) => any } = {
  'array': stackArray,
  'stack': stackArray,
  'newtonsCradle': newtonsCradle,
}

export class PuppyWorld extends World {
  public vm: any;
  public lib: LibPython;
  public pc = 0;  // used in if(puppy.pc++ % 16===0) yield 0;
  public vars: any = {};
  public colors: string[] = ['#000000', '#ff0000', '#00ff00', '#0000ff'];
  public frictionAir = 0.1;
  public font = 'bold 36pt sans-serif';
  public fontName = 'sans-serif';
  public fontColor = '#111111';
  public fontSize = 36;
  public fontScale = 0.9;

  public timestamp = 0;
  public darkmode = false;
  public background = '#F7F6EB';
  public wireframes = false;
  public tangible = false;
  public gyroscope = false;
  public isStillActive = true;

  public constructor(vm: any, options: any = {}) {
    super(Object.assign(options, { id: 0 }));
    this.vm = vm;
    this.lib = new LibPython(vm);
    this.font = this.boldFont(this.fontSize);
    this.World(options);
    this.colors = chooseColorScheme(options.colorScheme);
  }

  public newVec(ux?: number, uy?: number) {
    if (ux === undefined) {
      ux = this.bounds.min.x + ((this as any).width * Math.random() * 0.8);
    }
    if (uy === undefined) {
      uy = this.bounds.min.y + this.yscale((this as any).height * Math.random() * 0.8);
    }
    return new Vector(ux, uy);
  }

  public newBody(options: any = {}) {
    const shape: string = options.shape in PuppyShapeMap ? options.shape : 'rectangle';
    options = PuppyShapeMap[shape](this, options);
    const body = new Body(common(this, options));
    this.addBody(body);
    return body;
  }

  public newComposite(options: any = {}) {
    const composite = new Composite(common(this, options));
    this.addComposite(composite);
    return composite;
  }

  public newObject(options: any = {}) {
    const shape: string = options.shape;
    if (shape in PuppyObjects) {
      return PuppyObjects[shape](this, options);
    }
    return this.newBody(options);
  }

  public newConstraint(options: any = {}) {
    const constraint = new Constraint(options);
    this.addConstraint(constraint);
    return constraint;
  }

  public Rectangle(x: number, y: number, width: number, height: number, options: any = {}) {
    options = Object.assign(options, {
      shape: 'rectangle',
      position: this.newVec(x, y),
    });
    initSize(this, options, width, height);
    return this.newBody(options);
  }

  public Circle(x: number, y: number, width: number | undefined, options: any = {}) {
    options = Object.assign(options, {
      shape: 'circle',
      position: this.newVec(x, y),
    });
    initSize(this, options, width || 100);
    return this.newBody(options);
  }

  Rectangle3(x: number, y: number, width: number, options: any = {}) {
    return this.Rectangle(x, y, width, width, options);
  }

  Rectangle2(x: number, y: number, options: any = {}) {
    return this.Rectangle(x, y, options.width || 100, options.height || (options.width || 100), options);
  }

  Rectangle0(options: any = {}) {
    options.shape = 'rectangle';
    return this.newBody(options);
  }

  Circle2(x: number, y: number, options: any = {}) {
    return this.Circle(x, y, 100, options);
  }

  Circle0(options: any = {}) {
    options.shape = 'circle';
    return this.newBody(options);
  }

  private boldFont(fontSize: number) {
    return `bold ${(fontSize - 4) | 0}px ${this.fontName}`;
  }

  fontWidth(text: string, font?: string) {
    return this.vm.render.measureWidth(text, font || this.font);
  }

  public Variable(name: string, x: number, y: number, options: any = {}) {
    options = Object.assign(options, {
      shape: 'variable',
      position: this.newVec(x, y),
      name: name, caption: name,
      zindex: Infinity,
    });
    const width = this.width * 0.4;
    initSize(this, options, width, this.fontSize + 4);
    return this.newBody(options);
  }

  public print(text: string = '', options: any = {}) {
    this.vm.syslog('stdout', text + (options.end || '\n'));
    const world = this;
    const bounds: Bounds = this.vars['VIEWPORT'] || this.bounds;
    const x = bounds.max.x;
    const y = bounds.randomY(50);
    options = Object.assign({
      textRef: (body: Body) => text,
      position: new Vector(x, y),
      shape: 'label',
      zindex: Infinity,
      //fontColor: Common.choose(this.colors, 1),
    }, options);
    return this.newObject(options).addMotion((body: Body) => {
      body.translate2(-2, 0);
      if (body.position.x + body.bounds.getWidth() < world.bounds.min.x) {
        this.removeBody(body);
        return false;
      }
      world.isStillActive = true;
      return true;
    });
  }

  public print1(v1: any, options: any = {}) {
    const text = v1 === undefined ? '' : `${this.lib.str(v1)}`;
    this.print(text, options);
  }

  public print2(v1: any, v2: any, options: any = {}) {
    const sep = options.sep || ' ';
    const str = this.lib.str;
    const text = `${str(v1)}${sep}${str(v2)}`;
    this.print(text, options);
  }

  public print3(v1: any, v2: any, v3: any, options: any = {}) {
    const sep = options.sep || ' ';
    const str = this.lib.str;
    const text = `${str(v1)}${sep}${str(v2)}${sep}${str(v3)}`;
    this.print(text, options);
  }

  public print4(v1: any, v2: any, v3: any, v4: any, options: any = {}) {
    const sep = options.sep || ' ';
    const str = this.lib.str;
    const text = `${str(v1)}${sep}${str(v2)}${sep}${str(v3)}${sep}${str(v4)}`;
    this.print(text, options);
  }

  // public paint(x: number, y: number, radius = 5) {
  //   const options = {
  //     position: new Vector(x, y),
  //     shape: 'circle',
  //     width: radius * 2,
  //     zindex: 0,
  //   }
  //   this.timeToLive(this.newObject(options), 5000);
  // }

  public plot(x: number, y: number, options?: any) {
    options = options || {};
    options.position = new Vector(x, y);
    options.zindex = 0;
    if (!options.shape) {
      options.shape = 'circle';
    }
    if (!options.width) {
      options.width = 20;
    }
    const point = this.newObject(options);
    if (options.ttl) {
      this.timeToLive(point, options.ttl);
    }
  }

  public timeToLive(body: Body, time = 5000) {
    var tick = 0;
    body.addMotion((body: Body) => {
      tick += 16;
      //console.log(tick);
      if (tick > time) {
        this.removeBody(body);
        return false;
      }
      body.opacity = 0.7 * (1.0 - tick / time)
      return true;
    });
    return body;
  }

  public translation(body: Body, x: number, y: number, time = 5000) {
    var tick = 0;
    body.addMotion((body: Body) => {
      tick += 16;
      body.translate2(x, y);
      if (tick > time) {
        return false;
      }
      return true;
    });
    return body;
  }

  public Bye(body: Body) {
    const bounds = this.bounds;
    body.addMotion((body: Body) => {
      if (!Bounds.overlaps(body.bounds, bounds)) {
        this.removeBody(body);
        return false;
      }
      return true;
    });
    return body;
  }

  public Wrap(body: Body) {
    const bounds = this.bounds;
    body.addMotion((body: Body) => {
      if (body.bounds.max.x < bounds.min.x) {
        body.translate2(bounds.getWidth(), 0);
        return true;
      }
      if (bounds.max.x < body.bounds.min.x) {
        body.translate2(-bounds.getWidth(), 0);
        return true;
      }
      return true;
    });
    return body;
  }

  public trail(x: number, y: number, speed: number) {
    var hue = 250 + Math.round((1 - Math.min(1, speed / 10)) * 170);
    const options = {
      shape: 'rectangle',
      fillStyle: `hsl(${hue}, 100%, 55%)`,
      width: 3,
      height: 3,
      zindex: 0,
    }
    this.timeToLive(this.newBody(options), 3000);
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

  buffers: string[] = [];
  buffer_index = 0;

  public input(text: string = '') {
    if (this.buffer_index < this.buffers.length) {
      const line = this.buffers[this.buffer_index];
      return (function* () { return line })();
    }
    return this.vm.syscall('input', { text: text });
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

}
