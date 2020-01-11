import { generate, ParseTree } from './puppy-parser';
import { Type, BaseType, Types } from './types';
import { Symbol, PuppyModules, KEYTYPES, PackageSymbolMap, getField } from './package';
import { SourceError, PuppyCode } from './code';
const INDENT = '\t';

class ModuleType extends BaseType {
  constructor(name: string, value: any) {
    super(`${name}.`, value);
  }
}

class Env {
  private root: Env;
  private parent: Env | null;
  private vars: any;

  public constructor(env?: Env) {
    this.vars = {}
    if (env === undefined) {
      this.root = this;
      this.parent = null;
      this.vars['@varmap'] = [];
      this.vars['@errors'] = [];
      this.vars['@warnings'] = [];
      this.vars['@notices'] = [];
      this.vars['@tokens'] = [];
      this.vars['@names'] = {};
      this.vars['@fields'] = {};
      this.vars['@indent'] = INDENT;
    }
    else {
      this.root = env.root;
      this.parent = env;
    }
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

  public getroot(key: string, value?: any) {
    return this.root.vars[key] || value;
  }

  public setroot(key: string, value: any) {
    this.root.vars[key] = value;
    return value;
  }

  public getSymbol(name: string): Symbol {
    return this.get(name) as Symbol;
  }

  public varType(t: ParseTree) {
    return Types.var(this, t);
  }

  public guessType(name: string, tree: ParseTree) {
    const names: { [key: string]: Type } = this.getroot('@names');
    var ty = names[name];
    if (ty === undefined) {
      ty = names[name] = this.varType(tree);
    }
    return ty;
  }

  public from_import(pkg: any, list?: string[]) {
    for (const name of Object.keys(pkg)) {
      if (list === undefined || list.indexOf(name) !== -1) {
        this.vars[name] = pkg[name];
      }
    }
  }

  public setModule(name: string, options: any) {
    this.set(name, new Symbol('undefined', new ModuleType(name, options)));
  }

  public isModule(name: string) {
    const s = this.get(name) as Symbol;
    if (s !== undefined && s.ty instanceof ModuleType) {
      return true;
    }
    return false;
  }

  public getModule(pkgname: string, name: string) {
    const s = this.get(pkgname) as Symbol;
    if (s !== undefined && s.ty instanceof ModuleType) {
      const options = s.ty.getValue();
      return options[name];
    }
    return undefined;
  }

  public perror(t: ParseTree, key: string, params?: any[]) {
    const e = SourceError(t, key, params);
    const logs = this.getroot('@errors');
    logs.push(e);
    return e;
  }

  public pwarn(t: ParseTree, key: string, params?: any[]) {
    const e = SourceError(t, key, params);
    const logs = this.getroot('@warnings');
    logs.push(e);
    e.type = 'warning';
    return e;
  }

  public pnotice(t: ParseTree, key: string, params?: any[]) {
    const e = SourceError(t, key, params);
    const logs = this.getroot('@notices');
    logs.push(e);
    e.type = 'info';
    return e;
  }

  public tkid(t: ParseTree) {
    const tokens: ParseTree[] = this.getroot('@tokens');
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

  public setInLoop() {
    var nested = this.get('@inloop') || 0;
    this.set('@inloop', nested + 1);
    return nested + 1;
  }

  public inLoop() {
    return this.get('@inloop') !== undefined;
  }

  public setFunc(data: any) {
    this.set('@func', data)
    return data;
  }

  public inFunc() {
    return this.get('@func') !== undefined;
  }

  public foundFunc(t: ParseTree, symbol: Symbol) {
    if (symbol.isMatter) {
      const data = this.get('@func');
      if (data !== undefined) {
        data['isMatter'] = true;
      }
      // else {
      //   const row = t.begin()[1] * 1000;
      //   this.setroot('@yeild', row + 200);
      // }
    }
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
      const map = this.getroot('@utf8map');
      if (map === undefined) {
        this.setroot('@utf8map', {});
        return this.local(s);
      }
      var vname = map[name];
      if (vname === undefined) {
        const id = Object.keys(map).length;
        vname = `_v${id}`;
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

  public emitYield(t: ParseTree, out: string[]) {
    if (!this.inFunc()) {
      const indent = this.get('@indent');
      const row = t.begin()[1] * 1000 + 100;
      if (this.prevRow !== row) {
        out.push(`${indent}yield ${row};\n`);
        this.prevRow = row;
      }
    }
  }

  public emitAutoYield(t: ParseTree, out: string[]) {
    // if (!this.inFunc()) {
    //   const yieldparam = this.getroot('@yeild');
    //   if (yieldparam !== undefined) {
    //     out.push(`; yield ${yieldparam};\n`);
    //     this.setroot('@yeild', undefined);
    //     return yieldparam;
    //   }
    //   else {
    //     // const row = t.end()[1] * 1000;
    //     // out.push(`;yield ${row};\n`);
    //     out.push('\n');
    //   }
    // }
    // else {
    out.push('\n');
    // }
    return 0;
  }
}

class CompileCancelationError {
  constructor() {
    //uper();
  }
}

/* binary, unary operators */

const SupportedOperators: { [key: string]: string } = {
  'and': '&&', 'or': '||', 'not': '!',
  '<': '<', '>': '>', '<=': '<=', '>=': '>=',
  '==': '==', '!=': '!=', 'in': 'in',
  '+': '+', '-': '-', '*': '*', '//': '//', '/': '/', '**': '**',
  '<<': '<<', '>>': '>>', '|': '|', '&': '&', '^': '^',
  '+=': '+', '-=': '-', '*=': '*', '//=': '//', '/=': '/',
  '<<=': '<<', '>>=': '>>', '|=': '|', '&=': '&', '^=': '^',
}

const operator = (op: string) => {
  return SupportedOperators[op];
}

const LeftHandType: { [key: string]: Type } = {
  '+': Types.union(Types.Int, Types.String, Types.ListAny),
  '-': Types.Int, '**': Types.Int, '*': Types.Int,
  //'*': Types.union(Types.Int, Types.String, Types.ListAny),
  '/': Types.Int, '//': Types.Int, '%': Types.Int,
  '==': Types.Any, '!=': Types.Any, 'in': Types.Any,
  '<': Types.Compr, '<=': Types.Compr, '>': Types.Compr, '>=': Types.Compr,
  '^': Types.Int, '|': Types.Int, '&': Types.Int, '<<': Types.Int, '>>': Types.Int,
};

const getLeftHandType = (op: string) => {
  const ty = LeftHandType[op];
  if (ty === undefined) {
    console.log(`FIXME undefined '${op}'`);
    return Types.Any;
  }
  return ty;
}

const getRightHandType = (op: string, ty: Type) => {
  if (op == 'in') {
    return Types.union(Types.list(ty), Types.String);
  }
  return ty;  // 左と同じ型
}

class Transpiler {

  public constructor() {
  }

  public conv(env: Env, t: ParseTree, out: string[]) {
    if ((this as any)[t.tag] !== undefined) {
      return (this as any)[t.tag](env, t, out);
    }
    env.perror(t, 'UndefinedParseTree');
    return this.skip(env, t, out);
  }

  public skip(env: Env, t: ParseTree, out: string[]): Type {
    throw new CompileCancelationError();
  }

  public check(req: Type, env: Env, t: ParseTree, out: string[], key = 'TypeError') {
    const ty = this.conv(env, t, out);
    if (req !== undefined) {
      if (req.accept(ty, true)) {
        return ty;
      }
      const params = [
        '@req', req.toString(), '@given', ty.toString,
      ];
      env.perror(t, key);
      return this.skip(env, t, out);
    }
    return ty;
  }

  private checkBinary(env: Env, t: ParseTree, op: string, ty1: Type, left: string, ty2: Type, right: string, out: string[]) {
    if (op === '==' || op === '!=') {
      out.push(`${left} ${op}= ${right}`);
      return Types.Bool;
    }
    ty1 = ty1.realType();
    ty2 = ty2.realType();
    if (op === '+') {
      if (ty1 === Types.Int && ty2 === Types.Int) {
        out.push(`(${left} + ${right})`);
        return Types.Int;
      }
      if (ty1.accept(ty2, true)) {
        out.push(`lib.anyAdd(${left},${right})`);
        return ty1;
      }
      env.perror(t, 'TypeError', ['@infix', op]);
      return this.skip(env, t, out);
    }
    if (op === '*') {
      if (ty1 === Types.Int && ty2 === Types.Int) {
        out.push(`(${left} * ${right})`);
        return Types.Int;
      }
      out.push(`lib.anyMul(${left},${right})`);
      if (ty1 === Types.Int || Types.ListAny.accept(ty2, false)) return ty2;
      if (ty2 === Types.Int || Types.ListAny.accept(ty1, false)) return ty1;
      return ty1;
    }
    if (op === '//') {
      out.push(`((${left}/${right})|0)`);
      return Types.Int;
    }
    if (op === '**') {
      out.push(`Math.pow(${left},${right})`);
      return Types.Int;
    }
    if (ty1.accept(ty2, true)) {
      out.push(`(${left} ${op} ${right})`);
      if (LeftHandType[op] === Types.Compr) {
        return Types.Bool;
      }
      return ty1;
    }
    env.perror(t, 'TypeError', ['@infix', op]);
    return this.skip(env, t, out);
  }

  public err(env: Env, t: ParseTree, out: string[]) {
    env.perror(t, 'SyntaxError');
    return this.skip(env, t, out);
  }

  private getModule(env: Env, name: string, t: ParseTree, out: string[]) {
    const pkg = PuppyModules[name];
    if (pkg === undefined) {
      env.perror(t.get('name'), 'UnknownPackageName');
      return this.skip(env, t, out);
    }
    return pkg;
  }

  public FromDecl(env: Env, t: ParseTree, out: string[]) {
    const name = t.tokenize('name');
    const pkg = this.getModule(env, name, t, out);
    env.from_import(pkg); // FIXME
    return Types.Void;
  }

  public ImportDecl(env: Env, t: ParseTree, out: string[]) {
    const name = t.tokenize('name');
    const alias = t.tokenize('alias', name);
    const pkg = this.getModule(env, name, t, out);
    env.setModule(alias, pkg);
    return Types.Void;
  }

  public Source(env: Env, t: ParseTree, out: string[]) {
    for (const subtree of t.subs()) {
      try {
        const out2: string[] = [];
        env.emitYield(subtree, out2);
        out2.push(env.get('@indent'))
        this.conv(env, subtree, out2);
        env.emitAutoYield(subtree, out2);
        out.push(out2.join(''))
      }
      catch (e) {
        if (!(e instanceof CompileCancelationError)) {
          throw e;
        }
      }
    }
    return Types.Void;
  }

  public Block(penv: Env, t: ParseTree, out: string[]) {
    const indent = INDENT + penv.get('@indent');
    const env = new Env(penv);
    env.set('@indent', indent);
    out.push('{\n');
    env.emitYield(t, out);
    for (const subtree of t.subs()) {
      env.emitYield(subtree, out);
      out.push(indent);
      this.conv(env, subtree, out);
      env.emitAutoYield(subtree, out);
    }
    out.push(penv.get('@indent') + '}')
    return Types.Void;
  }

  public IfExpr(env: Env, t: ParseTree | any, out: string[]) {
    out.push('((');
    this.check(Types.Bool, env, t['cond'], out);
    out.push(') ? (');
    const ty = this.conv(env, t['then'], out);
    out.push(') : (');
    this.check(ty, env, t['else'], out);
    out.push('))');
    return ty;
  }

  public IfStmt(env: Env, t: ParseTree | any, out: string[]) {
    out.push('if (');
    this.check(Types.Bool, env, t['cond'], out);
    out.push(') ');
    this.conv(env, t['then'], out);
    if (t['elif'] !== undefined) {
      for (const stmt of t['elif'].subs()) {
        this.conv(env, stmt, out);
      }
    }
    if (t['else'] !== undefined) {
      out.push('else ');
      this.conv(env, t['else'], out);
    }
    return Types.Void;
  }

  public ElifStmt(env: Env, t: ParseTree | any, out: string[]) {
    out.push('else if (');
    this.check(Types.Bool, env, t['cond'], out);
    out.push(') ');
    this.conv(env, t['then'], out);
    return Types.Void;
  }

  public ForStmt(env: Env, t: ParseTree | any, out: string[]) {
    const name = t['each'].tokenize();
    const ty = env.varType(t['each']);
    out.push(`for (let ${name} of `)
    this.check(Types.list(ty), env, t['list'], out)
    out.push(')')
    const lenv = new Env(env);
    lenv.setInLoop();
    lenv.declVar(name, ty);
    this.conv(lenv, t['body'], out);
    env.emitYield(t, out);
    return Types.Void
  }

  public WhileStmt(env: Env, t: ParseTree | any, out: string[]) {
    out.push('while (');
    this.check(Types.Bool, env, t['cond'], out);
    out.push(') ');
    this.conv(env, t['body'], out);
    return Types.Void
  }


  public FuncDecl(env: Env, t: ParseTree | any, out: string[]) {
    const name = t.tokenize('name');
    const types = [env.varType(t['name'])];
    const names = [];
    const lenv = new Env(env);
    const funcData = lenv.setFunc({
      'name': name,
      'return': types[0],
      'hasReturn': false,
      'isMatter': false,
    });
    for (const p of t['params'].subs()) {
      const pname = p.tokenize('name');
      const ptype = env.varType(p['name']);
      const symbol = lenv.declVar(pname, ptype);
      names.push(symbol.code);
      types.push(ptype);
    }
    const funcType = Types.func(...types);
    const defined = env.getSymbol(name);
    if (defined !== undefined) {
      if (!defined.isMutable) {
        env.perror(t.name, 'RedefinedImmutable');
        return this.skip(env, t, out);
      }
      if (defined.ty.accept(funcType, true)) {
        env.perror(t.name, 'TypeError', [
          '@req', `${defined.ty}`, '@given', `${funcType}`,
        ]);
        return this.skip(env, t, out);
      }
    }
    const symbol = env.declVar(name, funcType);
    const defun = symbol.isGlobal() ? '' : 'var ';
    out.push(`${defun}${symbol.code} = (${names.join(', ')}) => `)
    this.conv(lenv, t['body'], out);
    symbol.isMatter = funcData['isMatter'];
    if (!funcData['hasReturn']) {
      types[0].accept(Types.Void, true);
    }
    //console.log(`DEFINED ${name} :: ${funcType}`)
    return Types.Void;
  }

  public FuncExpr(env: Env, t: ParseTree | any, out: string[]) {
    const types = [env.varType(t)];
    const names = [];
    const lenv = new Env(env);
    const funcData = lenv.setFunc({
      'return': types[0],
      'hasReturn': false,
    });
    for (const p of t['params'].subs()) {
      const pname = p.tokenize('name');
      const ptype = env.varType(p['name']);
      const symbol = lenv.declVar(pname, ptype);
      names.push(symbol.code)
      types.push(ptype)
    }
    const funcType = Types.func(...types);
    out.push(`(${names.join(', ')}) => `)
    this.conv(lenv, t['body'], out);
    if (!funcData['hasReturn']) {
      types[0].accept(Types.Void, true);
    }
    return funcType;
  }

  public Return(env: Env, t: ParseTree | any, out: string[]) {
    if (!env.inFunc()) {
      env.pwarn(t, 'ReturnOnlyInFunction');
      return Types.Void;
    }
    const funcData = env.get('@func');
    funcData['hasReturn'] = true;
    if (t['expr'] !== undefined) {
      out.push('return ');
      this.check(funcData['return'], env, t['expr'], out);
    }
    else {
      out.push('return');
    }
    return Types.Void;
  }

  public Continue(env: Env, t: ParseTree, out: string[]) {
    if (!env.inLoop()) {
      env.pwarn(t, 'ContinueOnlyInLoop');
      return Types.Void;
    }
    out.push('continue');
    return Types.Void;
  }

  public Break(env: Env, t: ParseTree, out: string[]) {
    if (!env.inLoop()) {
      env.pwarn(t, 'BreakOnlyInLoop');
      return Types.Void;
    }
    out.push('break');
    return Types.Void;
  }

  public Pass(env: Env, t: ParseTree, out: string[]) {
    return Types.Void;
  }

  public VarDecl(env: Env, t: ParseTree | any, out: string[]) {
    const left = t['left'] as ParseTree;
    if (left.tag === 'Name') {
      const name = left.tokenize();
      var symbol = env.get(name) as Symbol;
      if (symbol === undefined || (env.inFunc() && symbol.isGlobal())) {
        const ty = env.varType(left);
        const out1: string[] = [];
        this.check(ty, env, t['right'], out1);
        symbol = env.declVar(name, ty);
        const qual = symbol.isGlobal() ? '' : 'var ';
        out.push(`${qual}${symbol.code} = ${out1.join('')}`);
        return Types.Void;
      }
    }
    return this.conv(env, this.asSetter(left, t['right']), out);
  }

  private asSetter(t: ParseTree, right: ParseTree) {
    t.tag = `Set${t.tag}`;
    (t as any)['right'] = right;
    return t;
  }

  public Name(env: Env, t: ParseTree, out: string[]) {
    const name = t.tokenize();
    const symbol = env.get(name) as Symbol;
    if (symbol === undefined) {
      env.perror(t, 'UndefinedName');
      return this.skip(env, t, out);
    }
    out.push(symbol.code);
    return symbol.ty;
  }

  public SetName(env: Env, t: ParseTree, out: string[]) {
    const name = t.tokenize();
    const symbol = env.get(name) as Symbol;
    if (symbol === undefined) {
      env.perror(t, 'UndefinedName');
      return this.skip(env, t, out);
    }
    if (!symbol.isMutable) {
      env.perror(t, 'Immutable');
      return this.skip(env, t, out);
    }
    t.tag = 'Name';
    out.push(symbol.code);
    out.push(' = ');
    this.check(symbol.ty, env, t.get('right'), out);
    return Types.Void;
  }

  public And(env: Env, t: ParseTree | any, out: string[]) {
    this.check(Types.Bool, env, t['left'], out);
    out.push(' && ');
    this.check(Types.Bool, env, t['right'], out);
    return Types.Bool;
  }

  public Or(env: Env, t: ParseTree | any, out: string[]) {
    this.check(Types.Bool, env, t['left'], out);
    out.push(' || ');
    this.check(Types.Bool, env, t['right'], out);
    return Types.Bool;
  }

  public Not(env: Env, t: ParseTree | any, out: string[]) {
    out.push('!(');
    this.check(Types.Bool, env, t[0], out);
    out.push(')');
    return Types.Bool;
  }

  public Infix(env: Env, t: ParseTree | any, out: string[]) {
    const op = operator(t.tokenize('name'));
    if (op === undefined) {
      env.perror(t.get('name'), 'UndefinedOperator');
      return this.skip(env, t, out);
    }
    const out1: string[] = [];
    const out2: string[] = [];
    const ty1 = this.check(getLeftHandType(op), env, t['left'], out1);
    const ty2 = this.check(getRightHandType(op, ty1), env, t['right'], out2);
    return this.checkBinary(env, t, op, ty1, out1.join(''), ty2, out2.join(''), out);
  }

  public Unary(env: Env, t: ParseTree | any, out: string[]) {
    const op = t.tokenize('name');
    if (op === '!' || op === 'not') {
      out.push(`${op}(`);
      this.check(Types.Bool, env, t['expr'], out);
      out.push(')');
      return Types.Bool;
    }
    else {
      out.push(`${op}(`);
      this.check(Types.Int, env, t['expr'], out);
      out.push(')');
      return Types.Int;
    }
  }

  public ApplyExpr(env: Env, t: ParseTree | any, out: string[]): Type {
    const name = t.tokenize('name');
    const symbol = env.get(name) as Symbol;
    if (symbol === undefined) {
      const pkgname = PackageSymbolMap[name];
      if (pkgname !== undefined) {
        env.from_import(PuppyModules[pkgname]);
        env.pnotice(t['name'], 'InferredPackage', [
          '@inferred', pkgname,
          '@fixme', `from ${pkgname} import *`,
        ]);
        return this.ApplySymbolExpr(env, t, name, env.get(name) as Symbol, undefined, out); // Again
      }
    }
    return this.ApplySymbolExpr(env, t, name, symbol, undefined, out);
  }

  private ApplySymbolExpr(env: Env, t: ParseTree | any, name: string, symbol: Symbol, recv: ParseTree | undefined, out: string[]): Type {
    if (symbol === undefined) {
      env.perror(t['name'], 'UndefinedFunctionName');
      return this.skip(env, t, out);
    }
    const args = t['params'].subs() as ParseTree[];
    if (recv !== undefined) {
      args.unshift(recv);
    }
    symbol = this.refineWithParamSize(env, symbol, name, args);
    var funcType = symbol.ty;
    if (!Types.isFuncType(funcType)) {
      env.perror(t['name'], 'TypeError', [
        '@req', '@function', '@given', `${funcType}`
      ]);
      return this.skip(env, t, out);
    }
    out.push(symbol.code)
    out.push('(')
    if (funcType.hasAlpha()) {
      funcType = funcType.toVarType({ env, ref: t });
    }

    for (var i = 0; i < args.length; i += 1) {
      if (!(i < funcType.psize())) {
        env.pwarn(args[i], 'TooManyArguments');
        break;
      }
      if (i > 0) {
        out.push(',');
      }
      const ty = funcType.ptype(i);
      this.check(ty, env, args[i], out);
    }
    if (args.length < funcType.psize()) {
      if (!funcType.ptype(args.length)) {
        env.perror(t['name'], 'RequiredArguments',
          ['@req', `${funcType}`]
        );
        return this.skip(env, t, out);
      }
    }
    out.push(')');
    env.foundFunc(t, symbol);
    return funcType.rtype();
  }

  private refineWithParamSize(env: Env, symbol: Symbol, name: string, args: ParseTree[]) {
    var paramSize = 0;
    for (const arg of args) {
      if (arg.tag === 'Data') {
        break;
      }
      paramSize += 1;
    }
    const symbol2 = env.getSymbol(`${name}@${paramSize}`);
    if (symbol2 !== undefined) {
      return symbol2;
    }
    return symbol;
  }

  public MethodExpr(env: Env, t: ParseTree | any, out: string[]) {
    const recv = t.tokenize('recv');
    if (env.isModule(recv)) {
      const name = t.tokenize('name');
      const symbol = env.getModule(recv, name);
      return this.ApplySymbolExpr(env, t, name, symbol, undefined, out);
    }
    const methodname = `.${t.tokenize('name')}`;
    const symbol = env.get(methodname);
    return this.ApplySymbolExpr(env, t, methodname, symbol, t['recv'], out);
  }

  //"[#SelfAssign left=[#Name 'a'] name=[# '+='] right=[#Int '1']]"
  public SelfAssign(env: Env, t: ParseTree | any, out: string[]) {
    t.tag = 'Infix';
    this.conv(env, this.asSetter(t['left'], t), out);
    return Types.Void;
  }

  public GetExpr(env: Env, t: ParseTree | any, out: string[]) {
    const recv = t.tokenize('recv');
    if (env.isModule(recv)) {
      const symbol = env.getModule(recv, t.tokenize('name'));
      out.push(symbol.code);
      return symbol.ty;
    }
    const name = t.tokenize('name');
    const field = getField(env, name, t['name']);
    const fmts = field.getter.split('$');
    out.push(fmts[0]);
    this.check(field.base, env, t['recv'], out);
    out.push(fmts[1]);
    return field.ty;
  }

  public SetGetExpr(env: Env, t: ParseTree | any, out: string[]) {
    const recv = t.tokenize('recv');
    if (env.isModule(recv)) {
      env.perror(t, 'Immutable');
      return this.skip(env, t, out);
    }
    t.tag = 'GetExpr'; // see SelfAssign
    const name = t.tokenize('name');
    const field = getField(env, name, t['name']);
    const fmts = field.setter.split('$');
    out.push(fmts[0]);
    this.check(field.base, env, t['recv'], out);
    out.push(fmts[1]);
    this.check(field.ty, env, t['right'], out);
    out.push(fmts[2]);
    return Types.Void;
  }

  public IndexExpr(env: Env, t: ParseTree | any, out: string[]) {
    out.push('lib.getindex(');
    const ty = this.check(Types.union(Types.list(env.varType(t)), Types.String), env, t['recv'], out);
    out.push(',');
    this.check(Types.Int, env, t['index'], out);
    out.push(`${env.codemap(t)})`);
    return Types.isListType(ty) ? ty.ptype(0) : ty;
  }

  public SetIndexExpr(env: Env, t: ParseTree | any, out: string[]) {
    t.tag = 'IndexExpr';  // see SelfAssign
    out.push('lib.setindex(');
    const ty = this.check(Types.list(env.varType(t)), env, t['recv'], out);
    out.push(',')
    this.check(Types.Int, env, t['index'], out)
    out.push(',');
    this.check(ty.ptype(0), env, t['right'], out)
    out.push(`${env.codemap(t)})`);
    return Types.Void;
  }

  public Data(env: Env, t: ParseTree, out: string[]) {
    out.push('{');
    for (const sub of t.subs()) {
      this.conv(env, sub, out);
      out.push(',');
    }
    out.push('}');
    return Types.Option;
  }

  public NLPSymbol(env: Env, t: ParseTree | any, out: string[]) {
    env.perror(t, 'NLKeyValues');
    out.push(`unknown: '${t.tokenize()}'`);
    return Types.Void;
  }

  public NLKeyValue(env: Env, t: ParseTree | any, out: string[]) {
    env.perror(t, 'NLKeyValues');
    out.push(`unknown: '${t.tokenize()}'`);
    return Types.Void;
  }

  public KeyValue(env: Env, t: ParseTree | any, out: string[]) {
    const name = t.tokenize('name');
    out.push(`'${name}': `)
    const ty = (KEYTYPES as any)[name];
    if (ty === undefined) {
      env.pwarn(t['name'], 'UnknownName');
      this.conv(env, t['value'], out)
    }
    else {
      this.check(ty, env, t['value'], out);
    }
    return Types.Void
  }

  public Tuple(env: Env, t: ParseTree, out: string[]) {
    const subs = t.subs()
    if (subs.length > 2) {
      env.pwarn(t, 'SyntaxError/List'); //リストは[ ]で囲みましょう
      return this.List(env, t, out);
    }
    if (subs.length == 1) {
      out.push('(')
      const ty = this.conv(env, subs[0], out)
      out.push(')')
      return ty;
    }
    out.push('puppy.newVec(')
    this.check(Types.Int, env, subs[0], out);
    out.push(',')
    this.check(Types.Int, env, subs[1], out);
    out.push(')')
    return Types.Vec;
  }

  public List(env: Env, t: ParseTree, out: string[]) {
    var ty = env.varType(t);
    out.push('[')
    for (const sub of t.subs()) {
      ty = this.check(ty, env, sub, out, 'MustSameType');
      out.push(',')
    }
    out.push(']')
    return Types.list(ty);
  }

  public Format(env: Env, t: ParseTree, out: string[]) {
    var c = 0;
    out.push('(');
    for (const e of t.subs()) {
      if (c > 0) {
        out.push('+')
      }
      if (e.tag === 'StringPart') {
        out.push(`'${e.tokenize()}'`)
      }
      else {
        const out2: string[] = [];
        const ty = this.conv(env, e, out2);
        if (Types.String.accept(ty, false)) {
          out.push(out2.join(''));
        }
        else {
          out.push(`lib.str(${out2.join('')})`);
        }
      }
      c++;
    }
    out.push(')');
    return Types.String;
  }

  public TrueExpr(env: Env, t: ParseTree, out: string[]) {
    out.push('true');
    return Types.Bool;
  }

  public FalseExpr(env: Env, t: ParseTree, out: string[]) {
    out.push('false');
    return Types.Bool;
  }

  public Int(env: Env, t: ParseTree, out: string[]) {
    out.push(t.tokenize());
    return Types.Int;
  }

  public Float(env: Env, t: ParseTree, out: string[]) {
    out.push(t.tokenize());
    return Types.Float;
  }

  public Double(env: Env, t: ParseTree, out: string[]) {
    out.push(t.tokenize());
    return Types.Float;
  }

  public String(env: Env, t: ParseTree, out: string[]) {
    out.push(t.tokenize());  // FIXME
    return Types.String;
  }

  public Char(env: Env, t: ParseTree, out: string[]) {
    out.push(t.tokenize());  // FIXME
    return Types.String;
  }

  public MultiString(env: Env, t: ParseTree, out: string[]) {
    out.push(JSON.stringify(JSON.parse(t.tokenize())));
    return Types.String;
  }

}

const parser = generate('Source');

// const transpile = (s: string) => {
//   const t = parser(s);
//   const env = new Env();
//   env.from_import(PuppyModules['python']);
//   const ts = new Transpiler();
//   const out: string[] = [];
//   try {
//     ts.conv(env, t, out);
//   }
//   catch (e) {
//     if (!(e instanceof PuppyError)) {
//       throw e;
//     }
//   }
//   //console.log('DEBUG: ERROR LOGS')
//   //console.log(JSON.stringify(env.get('@logs')));
//   //console.log(env.get('@logs'));
//   return out.join('')
// }

export type Source = {
  source: string;
  lang?: string;
};

export const compile = (s: Source): PuppyCode => {
  //const start = performance.now();
  const t = parser(s.source);
  const env = new Env();
  env.from_import(PuppyModules['']);
  const ts = new Transpiler();
  const out: string[] = [];
  try {
    ts.conv(env, t, out);
  }
  catch (e) {
    if (!(e instanceof CompileCancelationError)) {
      throw e;
    }
  }

  const jscode = out.join('');
  const main = `
return {
  main: function*(puppy, codemap) {
\tconst lib = puppy.lib;
\tconst vars = puppy.vars;
${jscode}
  },
}`
  var code: any = {};
  try {
    code = (new Function(main))();
  }
  catch (e) {
    console.log(main);
    console.log(e);
    env.perror(t, 'CompileError', [
      '@log', e.toString(),
    ])
  }
  //const end = performance.now();
  code['world'] = {};
  code['code'] = jscode;
  code['errors'] = env.getroot('@errors');
  code['warnings'] = env.getroot('@warnings');
  code['notices'] = env.getroot('@notices');
  code['codemap'] = env.getroot('@tokens');
  code['symbols'] = env.getroot('@symbols');
  //code['time'] = end - start;
  return code as PuppyCode;
}

export const utest = (s: string) => {
  const src = { source: s };
  const code = compile(src);
  if (code.errors.length > 0) {
    return code.errors[0].key;
  }
  //console.log(code.code);
  const ss = code.code.split('\n');
  for (var i = ss.length - 1; i >= 0; i--) {
    var s = ss[i].trim();
    if (s !== '}' && s !== '') {
      const p = s.indexOf(';');
      return p !== -1 ? s.substring(0, p) : s;
    }
  }
  return '';
}

