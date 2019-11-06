import { Common } from './matter-ts/commons'
import { Vector, Vertices, Bounds } from './matter-ts/geometry'
import { Body, World, Composite, Constraint } from './matter-ts/body'
import { Render } from './matter-ts/render';
import { Engine, Runner } from './matter-ts/core';

import { Lib } from './lang/libpuppy2d';
import { compile as PuppyCompile, PuppyCode } from './lang/puppy';
import { ifError } from 'assert';
//import { Bodies } from './matter-ts/factory';

// puppy extension

const PuppyColorScheme: { [key: string]: string[] } = {
  pop: [
    '#de9610', '#c93a40', '#fff001', '#d06d8c', '#65ace4', '#a0c238',
    '#56a764', '#d16b16', '#cc528b', '#9460a0', '#f2cf01', '#0074bf',
  ],
  cute: [
    '#e2b2c0', '#fff353', '#a5d1f4', '#e4ad6d', '#d685b0', '#dbe159',
    '#7fc2ef', '#c4a6ca', '#eabf4c', '#f9e697', '#b3d3ac', '#eac7cd',
  ],
  dynamic: [
    '#b80117', '#222584', '#00904a', '#edc600', '#261e1c', '#6d1782',
    '#8f253b', '#a0c238', '#d16b16', '#0168b3', '#b88b26', '#c30068',
  ],
  gorgeous: [
    '#7d0f80', '#b08829', '#a03c44', '#018a9a', '#ab045c', '#391d2b',
    '#d5a417', '#546474', '#0f5ca0', '#d0b98d', '#d4c91f', '#c1541c',
  ],
  casual: [
    '#7b9ad0', '#f8e352', '#c8d627', '#d5848b', '#e5ab47', '#e1cea3',
    '#51a1a2', '#b1d7e4', '#66b7ec', '#c08e47', '#ae8dbc', '#c3cfa9',
  ],
  psychedelic: [
    '#b7007c', '#009b85', '#382284', '#e2c80f', '#009dc6', '#c4c829',
    '#95007e', '#d685b0', '#eee800', '#bf5116', '#b80e3b', '#0178bc',
  ],
  bright: [
    '#fff001', '#cb5393', '#a0c238', '#d78114', '#00a5e7', '#cd5638',
    '#0168b3', '#d685b0', '#00984b', '#f2cf01', '#6bb6bb', '#a563a0',
  ],
  fairytale: [
    '#cca9ca', '#9bcad0', '#dd9dbf', '#edef9c', '#aabade', '#f2dae8',
    '#c7ddae', '#a199c8', '#faede5', '#d5a87f', '#f7f06e', '#95bfe7',
  ],
  heavy: [
    '#000000', '#998c69', '#5c002f', '#244765', '#814523', '#5e2a58',
    '#1a653c', '#6a6a68', '#bf7220', '#5f556e', '#84762f', '#872226',
  ],
  impact: [
    '#c60019', '#fff001', '#1d4293', '#00984b', '#019fe6', '#c2007b',
    '#261e1c', '#7d0f80', '#dc9610', '#dbdf19', '#d685b0', '#a0c238',
  ],
  street: [
    '#33476a', '#211917', '#6c7822', '#c2007b', '#44aeea', '#5e3032',
    '#d16b16', '#c8d627', '#9193a0', '#816945', '#c50030', '#0080c9',
  ],
  cool: [
    '#b0d7f4', '#c0cbe9', '#eef0b1', '#44aeea', '#85beab', '#c4a6ca',
    '#f7f06e', '#c8d627', '#bcccd9', '#e4f0fc', '#f2dae8', '#6490cd',
  ],
  elegant: [
    '#ae8dbc', '#e3b3cd', '#d6ddf0', '#e5d57d', '#82c0cd', '#afc7a7',
    '#834e62', '#6a9176', '#7f7eb8', '#a04e90', '#dbbc86', '#c4c829',
  ],
  fresh: [
    '#70b062', '#c8d85b', '#f8e133', '#dbdf19', '#e3ab30', '#dd9dbf',
    '#a979ad', '#cd5638', '#399548', '#6bb6bb', '#f7f39c', '#9acce3',
  ],
  warm: [
    '#c59f22', '#dd9b9d', '#ebcc00', '#d6d11d', '#8d4f42', '#d8836e',
    '#f8e469', '#cbb586', '#e4aa01', '#eac287', '#f2d8bf', '#a6658d',
  ],
  soft: [
    '#f8e469', '#e7e0aa', '#d9de84', '#e4bd60', '#9ac29f', '#e3be87',
    '#edef9c', '#dd9b9d', '#b2d6d4', '#f5dfa6', '#ebeddf', '#e1d4e6',
  ],
  man: [
    '#23466e', '#4d639f', '#dfe0d8', '#1d695f', '#9aadbe', '#844f30',
    '#934e61', '#7e9895', '#77aad7', '#848a96', '#a76535', '#7e8639',
  ],
  woman: [
    '#7b0050', '#a8006d', '#bea620', '#a26c54', '#949b34', '#614983',
    '#cba777', '#de9610', '#bd8683', '#be87a6', '#bf5346', '#e1d0b4',
  ],
  boy: [
    '#0168b3', '#66b7ec', '#afd0ef', '#88b83e', '#b8b2d6', '#6bb6bb',
    '#5e4694', '#f2cf01', '#c6e2f8', '#d5dbcf', '#7a8bc3', '#e8e6f3',
  ],
  girl: [
    '#d06da3', '#c2d3ed', '#be91bc', '#c73576', '#f8e352', '#c8d627',
    '#e3b3cd', '#c6e0d5', '#e4ab5a', '#cb6c58', '#845d9e', '#82c0cd',
  ],
  smart: [
    '#4d639f', '#356c92', '#c9ced1', '#dfd4be', '#92a1a6', '#a67b2d',
    '#bda5bb', '#2c4b79', '#d6d680', '#babea5', '#ebc175', '#3a614f',
  ],
  light: [
    '#44aeea', '#b4cb32', '#b2b6db', '#b2d6d4', '#ebe9ae', '#0080c9',
    '#71b174', '#e4c4db', '#7da8db', '#eac39a', '#dbe585', '#6db5a9',
  ],
  stylish: [
    '#58656e', '#bac1c7', '#487ca3', '#dfd4be', '#004679', '#c0542d',
    '#a44682', '#9599b2', '#d6d680', '#8eb4d9', '#6c5776', '#499475',
  ],
  natural: [
    '#ba9648', '#87643e', '#c2b5d1', '#ba7d8c', '#b8ac60', '#797c85',
    '#f9ebd1', '#9cb1c2', '#81a47a', '#acb130', '#8b342a', '#acae98',
  ],
  spring: [
    '#dd9cb4', '#eeea55', '#ebc061', '#b2d6d4', '#f2dae8', '#c9d744',
    '#b8b2d6', '#afd0ef', '#d7847e', '#f8e352', '#b3ce5b', '#cbacbe',
  ],
  summer: [
    '#174e9e', '#68b8dd', '#d16b16', '#88b83e', '#f2cf01', '#019fe6',
    '#c60019', '#019c96', '#b0d7f4', '#fff001', '#0074bf', '#c83955',
  ],
  fall: [
    '#ae3c22', '#902342', '#c59f22', '#7e8639', '#eabd00', '#a49e2e',
    '#ac5238', '#9f832f', '#ba7c6f', '#875f3b', '#bba929', '#786b4b',
  ],
  winter: [
    '#a5aad4', '#6591b6', '#623d82', '#5f897b', '#858aa0', '#eff3f6',
    '#c2d3dd', '#4f616f', '#7f7073', '#42629f', '#674c51', '#b38da4',
  ],
  japan: [
    '#c3003a', '#3a546b', '#d5a02e', '#918d43', '#787cac', '#604439',
    '#6f2757', '#c1541c', '#565d63', '#afc9ca', '#baaa52', '#e2b2c0',
  ],
  euro: [
    '#bf541c', '#25a4b7', '#e4aa01', '#b2bfe1', '#ad438e', '#1d4293',
    '#b71232', '#e8e2be', '#b0bf30', '#6aa43e', '#6276b5', '#d7832d',
  ],
  nordic: [
    '#149bdf', '#dbdf19', '#c97a2b', '#945141', '#9abca4', '#a5a79a',
    '#e6d9b9', '#eabd00', '#bf545e', '#86b070', '#665e51', '#b59a4d',
  ],
  asian: [
    '#946761', '#b80040', '#4eacb8', '#7f1f69', '#c8b568', '#147472',
    '#1d518b', '#b1623b', '#95a578', '#b9b327', '#af508a', '#dab100',
  ],
}

export const chooseColorScheme = (key: string) => {
  const cs =
    key in PuppyColorScheme
      ? PuppyColorScheme[key]
      : PuppyColorScheme[Common.choose(Object.keys(PuppyColorScheme))];
  const targets = <HTMLCollectionOf<HTMLElement>>(
    document.getElementsByClassName('puppy-color')
  );
  for (let i = 0; i < targets.length; i += 1) {
    targets[i].style.backgroundColor = cs[i % cs.length];
    targets[i].style.borderColor = cs[i % cs.length];
  }
  return cs;
}

const colorToNumber = (colorString: string) => {
  colorString = colorString.replace('#', '');
  if (colorString.length == 3) {
    colorString = colorString.charAt(0) + colorString.charAt(0)
      + colorString.charAt(1) + colorString.charAt(1)
      + colorString.charAt(2) + colorString.charAt(2);
  }
  return {
    r: parseInt(colorString.charAt(0) + colorString.charAt(1), 16),
    g: parseInt(colorString.charAt(2) + colorString.charAt(3), 16),
    b: parseInt(colorString.charAt(4) + colorString.charAt(5), 16),
  }
}

const RGBtoHSV = (r: number, g: number, b: number) => {
  var max = Math.max(r, g, b), min = Math.min(r, g, b),
    d = max - min,
    h,
    s = (max === 0 ? 0 : d / max),
    v = max / 255;

  switch (max) {
    case min: h = 0; break;
    case r: h = (g - b) + d * (g < b ? 6 : 0); h /= 6 * d; break;
    case g: h = (b - r) + d * 2; h /= 6 * d; break;
    case b: h = (r - g) + d * 4; h /= 6 * d; break;
  }

  return {
    h: h,
    s: s,
    v: v
  };
}

const HSVtoRGB = (h: number, s: number, v: number) => {
  var r, g, b, i, f, p, q, t;
  i = Math.floor(h * 6);
  f = h * 6 - i;
  p = v * (1 - s);
  q = v * (1 - f * s);
  t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v, g = t, b = p; break;
    case 1: r = q, g = v, b = p; break;
    case 2: r = p, g = v, b = t; break;
    case 3: r = p, g = q, b = v; break;
    case 4: r = t, g = p, b = v; break;
    default: r = v, g = p, b = q; break;
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

const brightness = (color: string | string[]) => {
  if (Array.isArray(color)) {
    var d = 1;
    for (const c of color) {
      const rgb = colorToNumber(c);
      const hsv = RGBtoHSV(rgb.r, rgb.g, rgb.b);
      //console.log(`${c} ${hsv.v}`);
      d = Math.min(hsv.v, d);
    }
    return d;
  }
  const rgb = colorToNumber(color);
  const hsv = RGBtoHSV(rgb.r, rgb.g, rgb.b);
  return hsv.v;
}

const common = (world: PuppyWorld, options: any) => {
  options.id = world.newId();
  options.position = (!options.position) ? world.newVec() : options.position;
  if (!options.fillStyle) {
    if (options.isStatic) {
      options.fillStyle = world.colors[0];
    }
    else {
      options.fillStyle = Common.choose(world.colors);
    }
  }
  return options;
}

const getradius = (options: any, radius: number): number => {
  if (options.radius) {
    return options.radius as number;
  }
  if (options.width) {
    if (options.height) {
      return options.width + options.height / 4
    }
    return options.width / 2;
  }
  if (options.height) {
    return options.height / 2;
  }
  return radius;
}

const vertices = (options: any, path: number[]) => {
  options.vertices = Vertices.fromPath(path);
  if (options.chamfer) {
    var chamfer = options.chamfer;
    options.vertices = Vertices.chamfer(options.vertices, chamfer.radius,
      chamfer.quality, chamfer.qualityMin, chamfer.qualityMax);
    delete options.chamfer;
  }
}

const polygon = (world: PuppyWorld, options: any, sides: number, radius: number) => {
  const theta = 2 * Math.PI / sides;
  const path: number[] = [];
  const offset = theta * 0.5;
  for (var i = 0; i < sides; i += 1) {
    var angle = offset + (i * theta),
      xx = Math.cos(angle) * radius,
      yy = Math.sin(angle) * radius;
    //path += 'L ' + xx.toFixed(3) + ' ' + yy.toFixed(3) + ' ';
    path.push(xx);
    path.push(yy);
  }
  vertices(options, path);
  return options;
}

const label = (world: PuppyWorld, options: any) => {
  const width = (!options.width) ? 100 : options.width;
  const height = (!options.height) ? 30 : options.height;
  vertices(options, [0, 0, width, 0, width, height, 0, height]);
  if (!options.fillStyle) {
    options.fillStyle = '#000000';
    options.opacity = 0;
  }
  options.shape = 'ticker';
  return options;
}


export const PuppyShape: { [key: string]: (world: PuppyWorld, options: any) => any } = {
  'rectangle': (world: PuppyWorld, options: any) => {
    const width = (options.width = (!options.width) ? 100 : options.width);
    const height = (options.height = (!options.height) ? 100 : options.height);
    vertices(options, [0, 0, width, 0, width, height, 0, height]);
    return options;
  },
  'polygon': (world: PuppyWorld, options: any) => {
    const sides = options.sides ? options.sides : 3;
    const radius = getradius(options, 50);
    return polygon(world, options, sides, radius);
  },
  'circle': (world: PuppyWorld, options: any) => {
    const radius = options.circleRadius = getradius(options, 50);
    const maxSides = 25;
    var sides = Math.ceil(Math.max(10, Math.min(maxSides, radius)));
    if (sides % 2 === 1)
      sides += 1;
    return polygon(world, options, sides, radius);
  },
  'ticker': (world: PuppyWorld, options: any) => {
    return label(world, options);
  },
  'var': (world: PuppyWorld, options: any) => {
    const name = options.name;
    options.caption = options.caption || name;
    if (name === 'TIME') {
      options.textRef = (body: Body) => {
        return `${(world.timestamp / 1000) | 0}`;
      }
    }
    else {
      options.textRef = (body: Body) => {
        return `${world.vars[name]}`;
      }
    }
    return label(world, options);
  },
  'paint': (world: PuppyWorld, options: any) => {
    const radius = options.circleRadius = getradius(options, 10);
    const maxSides = 25;
    var sides = Math.ceil(Math.max(10, Math.min(maxSides, radius)));
    if (sides % 2 === 1)
      sides += 1;
    options.timeToLive = options.timeToLive || 1000;
    options.opacity = 0.5;
    if (!options.move) {
      options.move = (body: Body, timestamp: number) => {
        const timeToLive = (body as any).timeToLive--;
        if (timeToLive < 1000) {
          body.opacity = (timeToLive / 1000) * 0.5;
        }
        if (timeToLive < 0) {
          world.removeBody(body);
        }
      }
    }
    return polygon(world, options, sides, radius);
  },
}

const newtonsCradle = (world: PuppyWorld, options: any): Composite => {
  const width = (options.width = (!options.width) ? 300 : options.width);
  const height = (options.height = (!options.height) ? 200 : options.height);
  const num = options.N || 5;
  const position = options.position;
  const sx = position.x - (width / 2);
  const sy = position.y + (height / 2);
  const separation = 1.9;
  const size = width / num / separation;
  const newtonsCradle = world.newComposite();
  for (var i = 0; i < num; i++) {
    const cx = sx + i * (size * separation);
    const cy = sy - (height - size);
    const circle = world.newBody({
      shape: 'circle',
      width: size * 2,
      position: world.newVec(cx, cy),
      inertia: Infinity, restitution: 1, friction: 0, frictionAir: 0.0001, slop: 1
    });
    const constraint = world.newConstraint({
      pointA: world.newVec(cx + i * (size * separation), cy),
      bodyB: circle
    });
    newtonsCradle.addBody(circle);
    newtonsCradle.addConstraint(constraint);
  }
  return newtonsCradle;
}

const PuppyObjects: { [key: string]: (world: PuppyWorld, options: any) => any } = {
  'newtonsCradle': newtonsCradle,
}

const DefaultPuppyOption: any = {
  id: 0,
  width: 1000,
  height: 1000,
  gravity: new Vector(0, -1),
  background: '#F7F6EB',
}

export class PuppyWorld extends World {
  base: Puppy;
  public width: number;
  public height: number;
  public timestamp = 0;
  public colors: string[];
  public darkmode: boolean;
  public background = '';
  public vars: any = {};
  public lib: Lib;
  paints: Body[] = [];
  tickers: Body[] = [];

  public constructor(base: Puppy, options: any = {}) {
    super(Object.assign(options, { id: 0 }));
    this.base = base;
    this.width = options.width || 1000;
    this.height = options.height || this.width;
    this.bounds = new Bounds(-this.width / 2, this.height / 2, this.width / 2, -this.height / 2);
    this.colors = chooseColorScheme(options.colorScheme);
    console.log(`brightness ${brightness(this.colors)}`);
    this.darkmode = options.darkmode || brightness(this.colors) > 0.5;
    this.background = options.background || (this.darkmode ? '#F7F6EB' : 'black');
    this.lib = new Lib(base);
  }

  public allPaints() {
    return this.paints;
  }

  public allTickers() {
    return this.tickers;
  }

  private uniqueId = 1;

  public newId() {
    return this.uniqueId++;
  }

  public addBody(body: Body) {
    if (body.shape === 'paint') {
      this.paints.push(body);
      return this;
    }
    if (body.shape === 'ticker') {
      this.tickers.push(body);
      return this;
    }
    return super.addBody(body);
  }

  public removeBody(body: Body) {
    if (body.shape === 'paint') {
      const position = Common.indexOf(this.paints, body);
      if (position !== -1) {
        this.paints.splice(position, 1);
        this.setModified(true, true, false);
      }
      return this;
    }
    if (body.shape === 'ticker') {
      const position = Common.indexOf(this.tickers, body);
      if (position !== -1) {
        this.tickers.splice(position, 1);
        this.setModified(true, true, false);
      }
      return this;
    }
    return super.removeBody(body);
  }

  public newVec(ux?: number, uy?: number) {
    if (ux === undefined) {
      ux = this.bounds.min.x + (this.width * Math.random() * 0.8);
    }
    if (uy === undefined) {
      uy = this.bounds.min.y + (this.width * Math.random() * 0.8);
    }
    return new Vector(ux, uy);
  }

  public newBody(options: any = {}) {
    const shape: string = options.shape in PuppyShape ? options.shape : 'rectangle';
    options = PuppyShape[shape](this, options);
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
      shape: 'rectangle', position: this.newVec(x, y),
      width: width, height: height
    });
    return this.newBody(options);

  }

  public Circle(x: number, y: number, radius = 25, options: any = {}) {

  }

  public Variable(name: string, x: number, y: number, width: number, options: any = {}) {
    options = Object.assign(options, {
      shape: 'var', position: this.newVec(x, y), width: width,
      name: name, caption: name,
    });
    return this.newBody(options);
  }

  // from puppy vm

  // public async input(msg?: string) {
  //   const cahce = window.sessionStorage.getItem('/input/cahche');
  //   if (this.inTimeLeap && cahce) {
  //     return cahce;
  //   }
  //   this.runner!.enabled = false;
  //   const x = await getInputValue(msg ? msg : '');
  //   this.runner!.enabled = true;
  //   this.waitForRun(500);
  //   window.sessionStorage.setItem(`/input/cahche`, x);
  //   console.log(`input ${x}`);
  //   return x;
  // }

  // public async input0(console?: string) {
  //   this.runner!.enabled = false;
  //   const awaitForClick = target => {
  //     return new Promise(resolve => {
  //       // 処理A
  //       const listener = resolve; // 処理B
  //       target.addEventListener('click', listener, { once: true }); // 処理C
  //     });
  //   };
  //   const text = document.getElementById('inputtext') as HTMLInputElement;
  //   const f = async () => {
  //     const target = document.querySelector('#submitInput');
  //     let Text = '';
  //     document.getElementById('submitInput')!.onclick = () => {
  //       document.getElementById('myOverlay')!.style.display = 'none';
  //       Text = text.value;
  //       text.value = '';
  //     };
  //     await awaitForClick(target);
  //     return Text;
  //   };
  //   text.placeholder = console ? console : 'Input here';
  //   document.getElementById('myOverlay')!.style.display = 'block';
  //   const x = await f();
  //   this.runner!.enabled = true;
  //   this.waitForRun(500);
  //   return x;
  // }

  public paint(x: number, y: number, radius = 5, color?: string) {
    const options = {
      position: new Vector(x, y),
      shape: 'paint',
      radius: radius,
      fillStyle: color || Common.choose(this.colors, 1),
    }
    this.newObject(options);
  }

  public print(text: string, options: any = {}) {
    const world = this;
    const bounds: Bounds = this.vars['VIEWPORT'] || this.bounds;
    const x = bounds.max.x;
    const y = bounds.randomY(50);
    options = Object.assign({
      textRef: (body: Body) => `${text}`,
      position: new Vector(x, y),
      shape: 'ticker',
      fontColor: Common.choose(this.colors, 1),
      move: (body: Body, time: number) => {
        body.translate2(-2, 0);
        //body.position.dump(`print`);
        if (body.position.x + 100 < world.bounds.min.x) {
          console.log(`FIXME width=${body.bounds.min.x}`)
          //body.position.dump('removed');
          this.removeBody(body);
        }
      },
    }, options);
    this.newObject(options);
  }

  public line(linenum: number) {
    this.base.trigger('line', {
      status: 'executed',
      linenum: linenum
    });
  }

  private token(tkid: number, event: any) {
    return event;
  }

  public v(value: any, tkid: number) {
    this.base.trigger('variable', this.token(tkid, {
      value: value,
    }));
    return this.v;
  }

  public ckint(value: any, tkid: number) {
    if (typeof value !== 'number') {
      this.base.trigger('error', {
        status: 'runtime',
        value: value,
      });
    }
    return this.v;
  }

  public ckstr(value: any, tkid: number) {
    if (typeof value !== 'string') {
      this.base.trigger('error', {
        status: 'runtime',
        value: value,
      });
    }
    return this.v;
  }

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

// export type PuppyCode = {
//   world: any;
//   main: (puppy: any) => IterableIterator<number>;
//   errors: any[];
//   code: string;
// };

const trail = (body: Body, timestamp: number, world: PuppyWorld) => {
  if (Math.abs(body.position.x - body.positionPrev.x) > 2) {
    body.position.dump('moved');
    world.paint(body.position.x, body.position.y, 10, body.fillStyle);
  }
}

const DefaultPuppyCode: PuppyCode = {
  world: {},
  main: function* (world: PuppyWorld) {
    world.Rectangle(0, 500, 1000, 100, { isStatic: true });
    world.Rectangle(0, -500, 1000, 100, { isStatic: true });
    world.Rectangle(500, 0, 100, 1000, { isStatic: true });
    world.Rectangle(-500, 0, 100, 1000, { isStatic: true });

    world.Rectangle(200, 200, 60, 60, { frictionAir: 0.001, move: trail });
    world.Rectangle(200, -200, 60, 60, { frictionAir: 0.01, move: trail });
    world.Rectangle(-200, 200, 60, 60, { frictionAir: 0.1, move: trail });
    world.Rectangle(-200, -200, 60, 60, { frictionAir: 1, move: trail });

    world.Variable('TIME', 320, -400, 260);
    world.Variable('MOUSE', 320, -440, 260);
    for (var i = 0; i < 10; i++) {
      world.paint(Math.sin(i) * 100, Math.cos(i) * 100, 20);
      yield 200;
    }
    return 0;
  },
  errors: [],
  code: '',
}

export class Puppy {
  element: HTMLElement;
  public code = DefaultPuppyCode;
  public engine: Engine | null = null;
  public render: Render | null = null;
  public runner: Runner | null = null;
  runtime: IterableIterator<number> | null = null;

  public constructor(element: HTMLElement, options: any = {}) {
    this.element = element;
    this.load();
    this.start();
  }

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
    console.log(event); // for debugging
  }

  public load(source?: string, autorun = true) {
    if (source !== undefined) {
      var hasError = false;
      const compiled = PuppyCompile({ source });
      for (const error of compiled.errors) {
        if (error.type === 'error') {
          hasError = true;
          this.trigger('error', error);
        }
        else if (error.type === 'warning') {
          this.trigger('warning', error);
        }
        else {
          this.trigger('info', error);
        }
      }
      if (hasError) {
        return false;
      }
      if (!autorun) {
        return true;
      }
      this.code = compiled;
    }
    const world = new PuppyWorld(this, this.code);
    if (this.engine !== null) {
      this.unload();
    }
    this.engine = new Engine(world);
    this.render = new Render(this.engine, this.element);
    this.runner = new Runner();
    const hw = world.width / 2;
    const hh = world.height / 2;
    this.render.lookAt(new Bounds(-hw, hh, hw, -hh));
    this.runtime = this.code.main(world);
    return true;
  }

  private unload() {
    this.pause();
    if (this.render !== null) {
      this.render.clear();
      this.render = null;
    }
    if (this.engine !== null) {
      this.engine.clear();
      this.engine = null;
    }
  }

  //private running = false;
  private pausing = false;

  public start() {
    if (this.runner !== null && this.runtime != null) {
      //console.log(this.code);
      //this.running = true;
      this.pausing = false;
      this.render!.run('▶︎');  // FIXME
      Runner.run(this.runner, this.engine!);
      this.execAll(this.runtime);
    }
  }

  execAll(runtime: IterableIterator<number>) {
    if (this.pausing) {
      setTimeout(() => { this.execAll(runtime) }, 300);
    }
    else {
      const res = runtime.next();
      if (res.done) {
        setTimeout(() => {
          this.pause();
        }, 5000);
        return;
      }
      setTimeout(() => { this.execAll(runtime) }, res.value);
    }
  }

  public pause() {
    if (this.render !== null && this.runner !== null) {
      //this.running = true; // still runing
      this.pausing = true;
      this.render.stop('‖'); // FIXME
      Runner.stop(this.runner);
    }
  }

  // public async wait(msec: number) {
  //   await new Promise(resolve => setTimeout(resolve, msec));
  // }

  // public async waitForRun(interval: number) {
  //   while (this.waitRestart) {
  //     await this.wait(interval);
  //   }
  //   this.runner!.enabled = true;
  // }

  // public async execute_main() {
  // }
}