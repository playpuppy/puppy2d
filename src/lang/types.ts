/* Type System */

export class Type {
  value: any;

  public constructor(value: any) {
    this.value = value;
  }

  public isOptional() {
    return this.value !== undefined;
  }

  public getValue() {
    return this.value;
  }

  public toString() {
    return '?';
  }

  public rtype(): Type {
    return this;
  }
  public psize() {
    return 0;
  }
  public ptype(index: number): Type {
    return this;
  }

  public equals(ty: Type): boolean {
    return this.toString() === ty.toString();
  }

  public accept(ty: Type, update: boolean): boolean {
    return false;
  }

  public realType(): Type {
    return this;
  }

  public hasAlpha(): boolean {
    return false;
  }

  public toVarType(map: any): Type {
    return this;
  }

  public isPattern() {
    return false;
  }

}

export class BaseType extends Type {
  private name: string;

  constructor(name: string, value?: any) {
    super(value);
    this.name = name;
  }

  public toString() {
    return this.name;
  }

  public accept(ty: Type, update: boolean): boolean {
    const v = ty.realType();
    if (v instanceof BaseType) {
      return this.name === v.name;
    }
    if (v instanceof VarType) {
      return v.must(this, update);
    }
    return false;
  }

  public isPattern() {
    return (this.name === 'a' || this.name === 'b');
  }

  public hasAlpha(): boolean {
    return (this.name === 'a' || this.name === 'b');
  }

  public toVarType(map: any) {
    if (this.hasAlpha()) {
      const ty = map[this.name];
      if (ty === undefined) {
        map[this.name] = new VarType(map.env, map.t);
      }
      return map[this.name];
    }
    return this;
  }
}

class VoidType extends BaseType {

  constructor() {
    super('void');
  }

  public accept(ty: Type, update: boolean): boolean {
    const v = ty.realType();
    if (v instanceof VarType) {
      v.must(this, update);
    }
    return true;
  }
}

class AnyType extends BaseType {

  constructor() {
    super('any');
  }

  public accept(ty: Type, update: boolean): boolean {
    const v = ty.realType();
    if (v instanceof VoidType) {
      return false;
    }
    return true;
  }

  public isPattern() {
    return true;
  }

  public hasAlpha() {
    return true;
  }

  public toVarType(map: any) {
    return new VarType(map.env, map.t);
  }

}

class FuncType extends Type {
  private types: Type[];
  constructor(...types: Type[]) {
    super(undefined);
    this.types = types;
  }

  public toString() {
    const ss = ['(']
    for (var i = 1; i < this.types.length; i += 1) {
      if (i > 1) {
        ss.push(',');
      }
      ss.push(this.types[i].toString())
    }
    ss.push(')->')
    ss.push(this.types[0].toString());
    return ss.join('');
  }

  public rtype() {
    return this.types[0];
  }
  public psize() {
    return this.types.length - 1;
  }
  public ptype(index: number) {
    return this.types[index + 1];
  }

  public accept(ty: Type, update: boolean): boolean {
    const v = ty.realType();
    if (v instanceof FuncType && this.psize() == v.psize()) {
      for (var i = 0; i < this.types.length; i += 1) {
        if (!this.types[i].accept(v.types[i], update)) {
          return false;
        }
        return true;
      }
    }
    if (v instanceof VarType) {
      return v.must(this, update);
    }
    return false;
  }

  public isPattern() {
    for (const ty of this.types) {
      if (ty.isPattern()) return true;
    }
    return false;
  }

  public hasAlpha(): boolean {
    for (const ty of this.types) {
      if (ty.hasAlpha()) return true;
    }
    return false;
  }

  public toVarType(map: any) {
    if (this.hasAlpha()) {
      const v = [];
      for (const ty of this.types) {
        v.push(ty.toVarType(map));
      }
      return new FuncType(...v);
    }
    return this;
  }
}

class ListType extends Type {
  private param: Type;
  constructor(param: Type, isOptional?: any) {
    super(isOptional !== undefined);
    this.param = param;
  }

  public toString() {
    return `List[${this.param.toString()}]`;
  }

  public psize() {
    return 1;
  }
  public ptype(index: number) {
    return this.param;
  }

  public realType(): Type {
    const p = this.param.realType();
    if (p !== this.param) {
      return new ListType(p);
    }
    return this;
  }

  public accept(ty: Type, update: boolean): boolean {
    const v = ty.realType();
    if (v instanceof ListType) {
      if (this.param == Types.Any) {
        return true;
      }
      return this.param.accept(v.param, update);
    }
    if (v instanceof VarType) {
      return v.must(this, update);
    }
    return false;
  }

  public isPattern() {
    return this.param.isPattern();
  }

  public hasAlpha(): boolean {
    return this.param.hasAlpha();
  }

  public toVarType(map: any) {
    if (this.hasAlpha()) {
      return new ListType(this.param.toVarType(map));
    }
    return this;
  }
}

class UnionType extends Type {
  private types: Type[];
  constructor(...types: Type[]) {
    super(undefined);
    this.types = types;
  }

  public toString() {
    const ss = []
    for (var i = 0; i < this.types.length; i += 1) {
      if (i > 0) {
        ss.push('|');
      }
      ss.push(this.types[i].toString())
    }
    return ss.join('');
  }
  public psize() {
    return this.types.length;
  }

  public ptype(index: number) {
    return this.types[index];
  }

  public accept(ty: Type, update: boolean): boolean {
    for (const ty0 of this.types) {
      if (ty0.accept(ty, false)) {
        return true;
      }
    }
    console.log(`FAIL ${ty} ${this.toString()}`)
    return false;
  }

  public isPattern() {
    return true;
  }

  public hasAlpha(): boolean {
    for (const ty of this.types) {
      if (ty.hasAlpha()) {
        return true;
      }
    }
    return false;
  }

  public toVarType(map: any) {
    if (this.hasAlpha()) {
      const ts: Type[] = [];
      for (const ty of this.types) {
        ts.push(ty.toVarType(map));
      }
      return new UnionType(...ts);
    }
    return this;
  }
}

const union = (...types: Type[]) => {
  if (types.length === 1) {
    return types[0];
  }
  return new UnionType(...types);
}

//const tUndefined = new BaseType('undefined');

const EmptyNumberSet: number[] = [];

const unionSet = (a: number[], b: number[], c?: number[]) => {
  const A: number[] = [];
  for (const id of a) {
    if (A.indexOf(id) === -1) {
      A.push(id);
    }
  }
  for (const id of b) {
    if (A.indexOf(id) === -1) {
      A.push(id);
    }
  }
  if (c !== undefined) {
    for (const id of b) {
      if (A.indexOf(id) === -1) {
        A.push(id);
      }
    }
  }
  return A;
}


class VarType extends Type {
  private varMap: (Type | number[])[];
  private varid: number;
  private ref: any /*ParseTree | null*/;

  constructor(env: any /*Env*/, ref: any/*ParseTree*/) {
    super(false);
    this.varMap = env.getroot('@varmap');
    this.varid = this.varMap.length;
    this.varMap.push(EmptyNumberSet);
    this.ref = ref;
  }

  public toString() {
    const v = this.varMap[this.varid];
    if (v instanceof Type) {
      return v.toString();
    }
    return 'any';
  }

  public realType(): Type {
    const v = this.varMap[this.varid];
    return (v instanceof Type) ? v : this;
  }

  public accept(ty: Type, update: boolean): boolean {
    var v = this.varMap[this.varid];
    if (v instanceof Type && v !== this) {
      return v.accept(ty, update);
    }
    return this.must(ty.realType(), update);
  }

  public must(ty: Type, update: boolean): boolean {
    const v1 = ty.realType();
    if (update) {
      if (v1 instanceof VarType) {
        if (v1.varid === this.varid) {
          return true;
        }
        const u = unionSet(this.varMap[this.varid] as number[],
          this.varMap[v1.varid] as number[], [v1.varid, this.varid]);
        for (const id of u) {
          this.varMap[id] = u;
        }
        return true;
      }
      if (!v1.isPattern()) {
        const u = this.varMap[this.varid] as number[];
        for (const id of u) {
          this.varMap[id] = v1;
        }
        this.varMap[this.varid] = v1;
      }
    }
    return true;
  }

  public hasAlpha(): boolean {
    return false;
  }

}

class OptionType extends Type {
  constructor(options: any = {}) {
    super(options);
  }

  public toString() {
    return JSON.stringify(this.getValue);
  }

  public accept(ty: Type): boolean {
    const v = ty.realType();
    if (v instanceof OptionType) {
      return true;
    }
    return false;
  }

  public isPattern() {
    return false;
  }

  public hasAlpha(): boolean {
    return false;
  }

  public toVarType(map: any) {
    return this;
  }
}

export class Types {
  public static Any = new AnyType();
  public static Void = new VoidType();
  public static Bool = new BaseType('bool');
  public static Int = new BaseType('number');
  //  public static Int_ = new BaseType('Number', true);
  public static Float = Types.Int;
  //  public static Float_ = Types.Int_;
  public static String = new BaseType('string');
  //  public static String_ = new BaseType('String', true);
  public static A = new BaseType('a');
  public static B = new BaseType('b');
  public static ListA = new ListType(Types.A);
  public static ListB = new ListType(Types.B);
  public static ListInt = new ListType(Types.Int);
  public static ListString = new ListType(Types.String);
  public static ListAny = new ListType(Types.Any);
  public static Matter = new BaseType('object');
  public static Object = Types.Matter;
  public static Vec = new BaseType('Vec');
  public static Module = new BaseType('Module');

  public static Compr = union(Types.Int, Types.String);

  public static Color = Types.String;
  public static Option = new OptionType({});

  public static func(...types: Type[]) {
    return new FuncType(...types);
  }

  public static isFuncType(ty: Type) {
    return ty instanceof FuncType;
  }

  public static union(...types: Type[]) {
    return new UnionType(...types);
  }

  public static list(ty: Type) {
    return new ListType(ty);
  }

  public static isListType(ty: Type) {
    return ty instanceof ListType;
  }

  public static var(env: any, tree: any) {
    return new VarType(env, tree);
  }

  public static isVarType(ty: Type) {
    return ty instanceof VarType;
  }

  public static isUnionType(ty: Type) {
    return ty instanceof UnionType;
  }

} 
