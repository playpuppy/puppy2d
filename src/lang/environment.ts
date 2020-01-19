import { ParseTree } from './puppy-parser';
import { Type, BaseType, VarType, Types } from './types';
import { Symbol } from './package';
import { SourceError, SourceEvent } from './code';

class ModuleType extends BaseType {
  constructor(name: string, value: any) {
    super(`${name}.`, value);
  }
}

export type FunctionContext = {
  name: string;
  returnType: Type;
  hasReturn: boolean;
  isSync: boolean;
}

export class CompileCancelationError {
  constructor() {
    //uper();
  }
}

export class Env {
  public static readonly INDENT = '\t';
  public root: RootEnv;
  protected parent: Env | null;
  protected vars: { [key: string]: Symbol };
  public indent = Env.INDENT;
  protected loopNest = 0;
  public funcEnv: FunctionContext | null = null;

  constructor(parent?: Env) {
    this.vars = {}
    if (this instanceof RootEnv) {
      this.root = this;
      this.parent = null;
      this.funcEnv = null;
    }
    else {
      this.root = parent!.root;
      this.parent = parent!;
      this.funcEnv = parent!.funcEnv;
      this.indent = parent!.indent;
    }
  }

  public newEnv(indent: string) {
    const env = new Env(this);
    env.indent = indent;
    return env;
  }

  public getRoot() {
    return this.root;
  }

  public getParent() {
    return this.parent;
  }

  public get(key: string, value?: any) {
    var e: Env | null = this;
    while (e !== null) {
      const v = e.vars[key];
      if (v !== undefined) {
        return v;
      }
      e = e.parent;
    }
    return value;
  }

  public has(key: string) {
    return this.get(key) !== undefined;
  }

  public set(key: string, value: any) {
    this.vars[key] = value;
    return value;
  }

  public getSymbol(name: string): Symbol {
    return this.get(name) as Symbol;
  }

  // error, handling
  public perror(t: ParseTree, key: string, params?: any[]) {
    const e = SourceError(t, key, params);
    this.root.errors.push(e);
    throw new CompileCancelationError();
    //return e;
  }

  public pwarn(t: ParseTree, key: string, params?: any[]) {
    const e = SourceError(t, key, params);
    e.type = 'warning';
    this.root.warnings.push(e);
    return e;
  }

  public pnotice(t: ParseTree, key: string, params?: any[]) {
    const e = SourceError(t, key, params);
    e.type = 'info';
    this.root.notices.push(e);
    return e;
  }

  // module 

  public setModule(name: string, options: any) {
    this.set(name, new Symbol('undefined', new ModuleType(name, options)));
  }

  public isModule(name: string) {
    const s = this.getSymbol(name);
    if (s !== undefined && s.ty instanceof ModuleType) {
      return true;
    }
    return false;
  }

  public getModule(pkgname: string, name: string) {
    const s = this.getSymbol(pkgname);
    if (s !== undefined && s.ty instanceof ModuleType) {
      const options = s.ty.getValue();
      return options[name];
    }
    return undefined;
  }

  public from_import(pkg: any, list?: string[]) {
    for (const name of Object.keys(pkg)) {
      if (list === undefined || list.indexOf(name) !== -1) {
        this.vars[name] = pkg[name];
      }
    }
  }

  // type 

  public varType(t: ParseTree) {
    return Types.var(this.root.vartypes, this.root.varids, t) as Type;
  }

  public guessType(name: string, tree: ParseTree) {
    const names: { [key: string]: Type } = this.root.names;
    var ty = names[name];
    if (ty === undefined) {
      ty = names[name] = this.varType(tree);
    }
    return ty;
  }





  public tkid(t: ParseTree) {
    const tokens: ParseTree[] = this.root.tokens;
    for (var i = 0; i < tokens.length; i++) {
      if (tokens[i] === t) {
        return i;
      }
    }
    const tkid = tokens.length;
    tokens.push(t);
    return tkid;
  }

  public codemap(t: ParseTree) {
    return `,codemap[${this.tkid(t)}]`;
  }

  public enterLoop() {
    this.loopNest += 1;
  }

  public exitLoop() {
    this.loopNest -= 1;
  }

  public inLoop() {
    return this.loopNest !== 0;
  }

  public setFunc(funcEnv: FunctionContext) {
    this.funcEnv = funcEnv;
    return funcEnv;
  }

  public inFunc() {
    return this.funcEnv !== null;
  }

  public isSync() {
    if (this.funcEnv) {
      return this.funcEnv.isSync;
    }
    return true;
  }

  public setSync() {
    if (this.funcEnv) {
      this.funcEnv.isSync = true;
    }
    return true;
  }

  private isUtf8Name(s: string) {
    for (var i = 0; i < s.length; i += 1) {
      if (s.charCodeAt(i) > 128) {
        return true;
      }
    }
    return false;
  }

  private local(s: string): string {
    if (this.isUtf8Name(s)) {
      const map = this.root.utf8names;
      var vname = map[name];
      if (vname === undefined) {
        const id = Object.keys(map).length;
        vname = `_v${id}/*${s}*/`;
        map[name] = vname;
      }
      return vname as string;
    }
    return s;
  }

  public declVar(name: string, ty: Type) {
    var code = (this.inFunc() || this.inLoop()) ? this.local(name) : `vars['${name}']`
    const symbol = new Symbol(code, ty);
    symbol.isMutable = true;
    return this.set(name, symbol) as Symbol;
  }

  private prevRow = -1;

  emitYield(t: ParseTree, out: string[]) {
    if (!this.inFunc()) {
      const indent = this.indent;
      const row = t.begin()[1] * 1000 + 200;
      if (this.prevRow !== row) {
        out.push(`${indent}yield ${row};\n`);
        this.prevRow = row;
      }
    }
  }

  emitSyncYield(t: ParseTree, out: string[]) {
    const indent = this.indent;
    const row = t.begin()[1] * 1000 + 0;
    out.push(`${indent}if(puppy.pc++ % 16 === 0) yield ${row};\n`);
  }

  public emitAutoYield(t: ParseTree, out: string[]) {
    out.push('\n');
    return 0;
  }

  checkImmutable(t: ParseTree, symbol: Symbol | null) {
    if (symbol === null || !symbol.isMutable) {
      this.perror(t, 'Immutable');
    }
  }
}

export class RootEnv extends Env {
  vartypes: VarType[] = [];
  varids: (Type | number[])[] = [];
  errors: SourceEvent[] = [];
  warnings: SourceEvent[] = [];
  notices: SourceEvent[] = [];
  tokens: ParseTree[] = [];
  utf8names: string[] = [];
  names = {};
  fields = {};

  public constructor() {
    super();
    this.root = this;
    this.parent = null;
  }
}
