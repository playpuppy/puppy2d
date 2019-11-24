import { Common, chooseColorScheme } from './matter-ts/commons';
import { Vector, Vertices, Bounds } from './matter-ts/geometry';
import { Body, Constraint, Composite, World } from './matter-ts/body';

// shape setting

const common = (world: any, options: any) => {
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

const initSize = (world: any, options: any, width = 100, height = width) => {
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

const _Polygon = (world: any, options: any, sides?: number, radius?: number) => {
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

const _Circle = (world: any, options: any, radius?: number) => {
  radius = options.circleRadius = getradius(options, radius || 50);
  if (options.sides) {
    return _Polygon(world, options, options.sides, radius);
  }
  var sides = Math.ceil(Math.max(10, Math.min(25, radius)));
  if (sides % 2 === 1)
    sides += 1;
  return _Polygon(world, options, sides, radius);
}

const _Label = (world: any, options: any) => {
  const width = (!options.width) ? 100 : options.width;
  const height = (!options.height) ? 30 : options.height;
  initVertices(options, [0, 0, width, 0, width, height, 0, height]);
  if (!options.fillStyle) {
    options.fillStyle = '#000000';
    options.opacity = 0;
  }
  if (!options.fontStyle) {
    options.fontStyle = chooseColorScheme(world.colors);
  }
  options.shape = 'label';
  return options;
}

export const PuppyShapeMap: { [key: string]: (world: any, options: any) => any } = {
  'rectangle': (world: any, options: any) => {
    const width = options.width || 100;
    const height = options.height || 100;
    initVertices(options, [0, 0, width, 0, width, height, 0, height]);
    return options;
  },
  'polygon': _Polygon,
  'circle': _Circle,
  'label': _Label,
  'variable': (world: any, options: any) => {
    const name = options.name;
    options.caption = options.caption || name;
    options.textRef = (body: Body) => {
      return `${world.vars[name]}`;
    }
    return _Label(world, options);
  },
}


/* composite */

const stackArray = (world: any, options: any) => {
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

const newtonsCradle = (world: any, options: any): Composite => {
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

export const PuppyObjects: { [key: string]: (world: any, options: any) => any } = {
  'array': stackArray,
  'stack': stackArray,
  'newtonsCradle': newtonsCradle,
}

export class ShapeWorld extends World {

  public constructor(options: any) {
    super(options);
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
    //console.log(`${body.zindex}`);
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

  public Variable(name: string, x: number, y: number, options: any = {}) {
    options = Object.assign(options, {
      shape: 'variable',
      position: this.newVec(x, y),
      name: name, caption: name,
      zindex: Infinity,
    });
    const width = this.width * 0.4;
    initSize(this, options, width, 50);
    return this.newBody(options);
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

  // public static Move(this: any, body: Body, x) {
  //   var tick = 0;
  //   (body as any).move = (body: Body) => {
  //     tick += 16;
  //     console.log(tick);
  //     if (tick > time) {
  //       this.removeBody(body);
  //       delete (body as any).move;
  //     }
  //     body.opacity = 0.7 * (1.0 - tick / time)
  //   }
  //   return body;
  // }

}