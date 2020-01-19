/* Type System */

export class Type {
  value: any;

  public constructor(value: any) {
    this.value = value;
  }

  public getValue() {
    return this.value;
  }

  public toString() {
    return '?';
  }

  public isOptional() {
    return this.value !== undefined;
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

  public toVarType(tenv: TypeEnv): Type {
    return this;
  }

  public isPattern() {
    return false;
  }

  public isBoolType() {
    return false;
  }

  public isNumberType() {
    return false;
  }

  public isStringType() {
    return false;
  }

}

export class BaseType extends Type {
  protected name: string;

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
    return false;
  }

  public hasAlpha(): boolean {
    return false;
  }

  public toVarType(tenv: TypeEnv): Type {
    return this;
  }

  public isBoolType() {
    return this.name === 'boolean';
  }

  public isNumberType() {
    return this.name === 'number';
  }

  public isStringType() {
    return this.name === 'string';
  }
}

class AlphaType extends BaseType {
  constructor(name: string) {
    super(name);
  }

  public isPattern() {
    return false;
  }

  public hasAlpha(): boolean {
    return true;
  }

  public toVarType(tenv: TypeEnv | any) {
    var ty = tenv[this.name];
    if (ty === undefined) {
      ty = new VarType(tenv.vartypes, tenv.varids, tenv.ref);
      tenv[this.name] = ty;
    }
    return ty;
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

  public toVarType(tenv: TypeEnv) {
    return new VarType(tenv.vartypes, tenv.varids, tenv.ref) as Type;
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

  public toVarType(tenv: TypeEnv) {
    if (this.hasAlpha()) {
      const v = [];
      for (const ty of this.types) {
        v.push(ty.toVarType(tenv));
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

  public toVarType(tenv: TypeEnv) {
    if (this.hasAlpha()) {
      return new ListType(this.param.toVarType(tenv));
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

  public toVarType(tenv: TypeEnv) {
    if (this.hasAlpha()) {
      const ts: Type[] = [];
      for (const ty of this.types) {
        ts.push(ty.toVarType(tenv));
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

export type TypeEnv = {
  vartypes: VarType[];
  varids: (Type | number[])[];
  ref: any;
}

export class VarType extends Type {
  static readonly EmptyNumberSet: number[] = [];
  private varid: number;
  private vartypes: VarType[];
  private varids: (Type | number[])[];
  private ref: any /*ParseTree | null*/;

  constructor(vartypes: VarType[], varids: (Type | number[])[], ref: any/*ParseTree*/) {
    super(undefined);
    this.vartypes = vartypes;
    this.varids = varids;
    this.varid = this.varids.length;
    this.vartypes.push(this);
    this.varids.push(VarType.EmptyNumberSet);
    this.ref = ref;
  }

  public toString() {
    const v = this.varids[this.varid];
    if (v instanceof Type) {
      return v.toString();
    }
    return 'any';
  }

  public realType(): Type {
    const v = this.varids[this.varid];
    return (v instanceof Type) ? v : this;
  }

  public accept(ty: Type, update: boolean): boolean {
    var v = this.varids[this.varid];
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
        const u = unionSet(this.varids[this.varid] as number[],
          this.varids[v1.varid] as number[], [v1.varid, this.varid]);
        for (const id of u) {
          this.varids[id] = u;
        }
        return true;
      }
      if (!v1.isPattern()) {
        const u = this.varids[this.varid] as number[];
        for (const id of u) {
          this.varids[id] = v1;
        }
        this.varids[this.varid] = v1;
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
  public static Bool = new BaseType('boolean');
  public static Int = new BaseType('number');
  public static Float = Types.Int;
  public static String = new BaseType('string');
  public static A = new AlphaType('a');
  public static B = new AlphaType('b');
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

  public static isVarFuncType(ty: Type) {
    if (ty instanceof FuncType) {
      if (ty.psize() > 0) {
        const t = ty.ptype(ty.psize() - 1);
        return t instanceof OptionType;
      }
    }
    return false;
  }

  public static isOptionType(ty: Type) {
    return ty instanceof OptionType;
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

  public static var(vartypes: VarType[], varids: (Type | number[])[], tree: any) {
    return new VarType(vartypes, varids, tree);
  }

  public static isVarType(ty: Type) {
    return ty instanceof VarType;
  }

  public static isUnionType(ty: Type) {
    return ty instanceof UnionType;
  }

} 
