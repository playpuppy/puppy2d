import { Type, Types as ts } from './types';

export class Symbol {
  public code: string;
  public ty: Type;
  public isMatter: boolean = false;
  public isMutable: boolean = false;
  public constructor(code: string, ty: Type, options?: any) {
    this.code = code;
    this.ty = ty.realType();
    if (options !== undefined) {
      this.isMatter = options.isMatter === undefined ? false : options.isMatter;
      this.isMutable = options.isMutable == undefined ? false : options.isMutable;
    }
  }
  public isGlobal() {
    return this.code.indexOf('vars[') == 0;
  }
}

const sym = (code: string, ty: Type, isMatter = false, isMutable = false) => {
  if (isMutable === true || isMatter === true) {
    return new Symbol(code, ty, { isMatter, isMutable });
  }
  return new Symbol(code, ty);
}

const tFuncFloatFloat = ts.func(ts.Float, ts.Float);
const tFuncFloatFloatFloat = ts.func(ts.Float, ts.Float, ts.Float);

const import_math = {
  'pi': sym('Math.PI', ts.Float),
  'sin': sym('Math.sin', tFuncFloatFloat),
  'cos': sym('Math.cos', tFuncFloatFloat),
  'tan': sym('Math.tan', tFuncFloatFloat),
  'sqrt': sym('Math.sqrt', tFuncFloatFloat),
  'log': sym('Math.log', tFuncFloatFloat),
  'log10': sym('Math.log10', tFuncFloatFloat),

  'pow': sym('Math.pow', tFuncFloatFloatFloat),
  'hypot': sym('Math.hypot', tFuncFloatFloatFloat),
  'gcd': sym('lib.gcd', tFuncFloatFloatFloat),
}

const Visual = true;

const import_python: { [key: string]: Symbol } = {
  'input@0': sym('await puppy.input', ts.func(ts.String)),
  'input': sym('await puppy.input', ts.func(ts.String, ts.String)),
  'print': sym('puppy.print', ts.func(ts.Void, ts.Any, ts.Option), Visual),

  //# 返値, 引数..None はなんでもいい
  'len': sym('lib.len', ts.func(ts.Int, ts.union(ts.String, ts.ListA))),
  //可変長引数
  'range@1': sym('lib.range1', ts.func(ts.ListInt, ts.Int)),
  'range@2': sym('lib.range2', ts.func(ts.ListInt, ts.Int, ts.Int)),
  'range': sym('lib.range', ts.func(ts.ListInt, ts.Int, ts.Int, ts.Int)),
  //append
  '.append': sym('lib.append', ts.func(ts.Void, ts.ListA, ts.A)),

  // 変換
  'int': sym('lib.int', ts.func(ts.Int, ts.union(ts.Bool, ts.String, ts.Int))),
  'float': sym('lib.float', ts.func(ts.Float, ts.union(ts.Bool, ts.String, ts.Int))),
  'str': sym('lib.str', ts.func(ts.String, ts.Any)),
  //'random': sym('Math.random', ts.func(t.Int)),
}

const import_random: { [key: string]: Symbol } = {
  'random': sym('Math.random', ts.func(ts.Int)),
}

const tFuncShape = ts.func(ts.Matter, ts.Option);
const tFuncShape2 = ts.func(ts.Matter, ts.Int, ts.Int, ts.Option);
const tFuncShape3 = ts.func(ts.Matter, ts.Int, ts.Int, ts.Int, ts.Option);
const tFuncShape4 = ts.func(ts.Matter, ts.Int, ts.Int, ts.Int, ts.Int, ts.Option);
const tFuncShape5 = ts.func(ts.Matter, ts.String, ts.Int, ts.Int, ts.Int, ts.Int, ts.Option);

const import_puppy2d: { [key: string]: Symbol } = {
  // # クラス
  'World': sym('puppy.world', tFuncShape),
  'Object': sym('puppy.Object', tFuncShape, Visual),
  'Rectangle': sym('puppy.Rectangle', tFuncShape4, Visual),
  'Circle': sym('puppy.Circle', tFuncShape3, Visual),
  'Polygon': sym('puppy.Polygon', tFuncShape3, Visual),
  'Variable': sym('puppy.Variable', tFuncShape5),
  'setGravity': sym('puppy.setGravity', ts.func(ts.Void, ts.Int, ts.Int)),

  // # 物体メソッド
  '.setPosition': sym('lib.setPosition', ts.func(ts.Void, ts.Matter, ts.Int, ts.Int)),
  '.applyForce': sym('lib.applyForce', ts.func(ts.Void, ts.Matter, ts.Int, ts.Int, ts.Int, ts.Int)),
  '.rotate': sym('lib.rotate', ts.func(ts.Void, ts.Matter, ts.Int)),
  '.scale': sym('lib.scale', ts.func(ts.Void, ts.Matter, ts.Int, ts.Int)),
  '.setAngle': sym('lib.setAngle', ts.func(ts.Void, ts.Matter, ts.Int)),
  '.setAngularVelocity': sym('lib.setAngularVelocity', ts.func(ts.Void, ts.Matter, ts.Int)),
  '.setDensity': sym('lib.setDensity', ts.func(ts.Void, ts.Matter, ts.Int)),
  '.setMass': sym('lib.setMass', ts.func(ts.Void, ts.Matter, ts.Int)),
  '.setStatic': sym('lib.setStatic', ts.func(ts.Void, ts.Matter, ts.Bool)),
  '.setVelocity': sym('lib.setVelocity', ts.func(ts.Void, ts.Matter, ts.Int)),
};

export const PuppyModules: { [key: string]: { [key: string]: Symbol } } = {
  '': import_python,
  'math': import_math,
  'random': import_random,
  'puppy2d': import_puppy2d,
};

export const PackageSymbolMap: any = {

};

const checkSymbolNames = () => {
  for (const pkgname of Object.keys(PuppyModules)) {
    for (const name of Object.keys(PuppyModules[pkgname])) {
      PackageSymbolMap[name] = pkgname;
    }
  }
}

checkSymbolNames();

export type Field = {
  base: Type;
  getter: string;
  setter: string;
  ty: Type;
}

const _field_ = (base: Type, getter: string, setter: string, ty: Type) => {
  return { base, getter, setter, ty } as Field;
}

const FIELDS: { [key: string]: Field } = {
  'x': _field_(ts.Vec, 'x', 'puppy.set("x",', ts.Int),
  'y': _field_(ts.Vec, 'y', 'puppy.set("y",', ts.Int),
  'position': _field_(ts.Object, 'position', 'puppy.setpos(', ts.Vec),
  'width': _field_(ts.Object, 'bounds.getWidth()', 'puppy.setwidth(', ts.Int),
  'height': _field_(ts.Object, 'bounds.getHeight()', 'puppy.setheight(', ts.Int),
  'fillStyle': _field_(ts.Object, 'fillStyle', "puppy.setlazy('fillStyle',", ts.String),
}

export const getField = (env: any, name: any, tree: any): Field => {
  var field = FIELDS[name];
  if (field === undefined) {
    const fields = env.getroot('@fields') as { [key: string]: Field };
    field = fields[name];
    if (field === undefined) {
      const ty = env.guessType(name, tree);
      field = _field_(ts.Object, name, `puppy.setlazy('${name}',`, ty);
      fields[name] = field;
    }
  }
  return field;
}

export const KEYTYPES: { [key: string]: Type } = {
  'x': ts.Int, 'y': ts.Int,  // Vec
  'position': ts.Vec,
  'width': ts.Int, 'height': ts.Int,

  'fillStyle': ts.Color,
  'strokeStyle': ts.Color,
  'lineWidth': ts.Int,
  'image': ts.String,
  'font': ts.String,
  'fontColor': ts.Color,

  'restitution': ts.Float,
  'angle': ts.Float,
  'mass': ts.Int, 'density': ts.Int, 'area': ts.Int,
  'friction': ts.Float, 'frictionStatic': ts.Float, 'airFriction': ts.Float,
  'torque': ts.Float, 'stiffness': ts.Float,
  'isSensor': ts.Bool,
  'isStatic': ts.Bool,
  'damping': ts.Float,
  'in': ts.func(ts.Void, ts.Matter, ts.Matter),
  'out': ts.func(ts.Void, ts.Matter, ts.Matter),
  'over': ts.func(ts.Void, ts.Matter, ts.Matter),
  'clicked': ts.func(ts.Void, ts.Matter),
  'textAlign': ts.String,
  'value': ts.Int,
  'message': ts.String,
}

//const ty1 = this.check(tleft(op), env, t['left'], out1);
//const ty2 = this.check(tright(op, ty1), env, t['right'], out2);
//return tbinary(env, t, ty1, out1.join(''), ty2, out1.join(''), out);


