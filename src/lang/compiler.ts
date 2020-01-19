import { generate, ParseTree } from './puppy-parser';
import { Type, BaseType, Types } from './types';
import { Symbol, PuppyModules, KEYTYPES, PackageSymbolMap, getField } from './package';
import { SourceError, PuppyCode } from './code';
import { Env, RootEnv, CompileCancelationError, Transpiler } from './environment';
import { messagefy } from './message';
import { emitJSBinary } from './operator';

const ZenkakuToASCII: { [key: string]: string } = {
  '＋': '+', 'ー': '-', '＊': '*', '／': '/', '％': '%',
  '＝': '=', '＆': '&', '｜': '|', '！': '!',
  '＜': '<', '＞': '>', '＾': '^',
  '０': '0', '１': '1', '２': '2', '３': '3', '４': '4',
  '５': '5', '６': '6', '７': '7', '８': '8', '９': '9',
}

const zenkakuToASCII = (s: string) => {
  const buf = []
  for (const c of s) {
    if (c in ZenkakuToASCII) {
      buf.push(ZenkakuToASCII[c]);
    }
    else {
      buf.push(c);
    }
  }
  return buf.join('');
}

const checkZenkaku = (env: Env, t: ParseTree) => {
  const name = t.tokenize();
  for (const c of name) {
    if (c in ZenkakuToASCII) {
      env.pwarn(t, 'Zenkaku');
      return zenkakuToASCII(name);
    }
  }
  return name;
}

/* binary, unary operators */

const SupportedOperators: { [key: string]: string } = {
  'and': '&&', 'or': '||', 'not': '!',
  '<': '<', '>': '>', '<=': '<=', '>=': '>=',
  '==': '==', '!=': '!=', 'in': 'in',
  '+': '+', '-': '-', '*': '*', '//': '//', '/': '/', '%': '%', '**': '**',
  '<<': '<<', '>>': '>>', '|': '|', '&': '&', '^': '^',
  '+=': '+', '-=': '-', '*=': '*', '//=': '//', '/=': '/', '%=': '%',
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

class JSTranspiler extends Transpiler {

  public autoPuppyMode = true;

  public constructor() {
    super();
  }

  public conv(env: Env, t: ParseTree, out: string[]): Type {
    if ((this as any)[t.tag] !== undefined) {
      return (this as any)[t.tag](env, t, out);
    }
    console.log(`FIXME: undefined parse tree ${t.tag}`);
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

  // private checkBinary(env: Env, t: ParseTree, op: string, ty1: Type, left: string, ty2: Type, right: string, out: string[]) {
  //   if (op === '==' || op === '!=') {
  //     out.push(`${left} ${op}= ${right}`);
  //     return Types.Bool;
  //   }
  //   ty1 = ty1.realType();
  //   ty2 = ty2.realType();
  //   if (op === '+') {
  //     if (ty1 === Types.Int && ty2 === Types.Int) {
  //       out.push(`(${left} + ${right})`);
  //       return Types.Int;
  //     }
  //     if (ty1.accept(ty2, true)) {
  //       out.push(`lib.anyAdd(${left},${right})`);
  //       return ty1;
  //     }
  //     env.perror(t, 'TypeError', ['@infix', op]);
  //     return this.skip(env, t, out);
  //   }
  //   if (op === '*') {
  //     if (ty1 === Types.Int && ty2 === Types.Int) {
  //       out.push(`(${left} * ${right})`);
  //       return Types.Int;
  //     }
  //     out.push(`lib.anyMul(${left},${right})`);
  //     if (ty1 === Types.Int || Types.ListAny.accept(ty2, false)) return ty2;
  //     if (ty2 === Types.Int || Types.ListAny.accept(ty1, false)) return ty1;
  //     return ty1;
  //   }
  //   if (op === '//') {
  //     out.push(`((${left}/${right})|0)`);
  //     return Types.Int;
  //   }
  //   if (op === '**') {
  //     out.push(`Math.pow(${left},${right})`);
  //     return Types.Int;
  //   }
  //   if (ty1.accept(ty2, true)) {
  //     out.push(`(${left} ${op} ${right})`);
  //     if (LeftHandType[op] === Types.Compr) {
  //       return Types.Bool;
  //     }
  //     return ty1;
  //   }
  //   env.perror(t, 'TypeError', ['@infix', op]);
  //   return this.skip(env, t, out);
  // }

  public err(env: Env, t: ParseTree, out: string[]) {
    const inputs = t.inputs;
    var pos = t.spos - 1;
    if (pos > 0 && inputs.charAt(pos) === '\n') {
      while (pos > 0 && inputs.charAt(pos) === '\n') {
        pos--;
      }
      console.log(`TODO: syntax error position: ${t.spos} => ${pos + 1}`)
      t.spos = pos + 1;
    }
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
    if (name === 'puppy2d') {
      this.autoPuppyMode = false;
    }
    return Types.Void;
  }

  public ImportDecl(env: Env, t: ParseTree, out: string[]) {
    const name = t.tokenize('name');
    const alias = t.tokenize('alias', name);
    const pkg = this.getModule(env, name, t, out);
    env.setModule(alias, pkg);
    if (name === 'puppy2d') {
      this.autoPuppyMode = false;
    }
    return Types.Void;
  }

  public Source(env: Env, t: ParseTree, out: string[]) {
    for (const subtree of t.subs()) {
      try {
        const out2: string[] = [];
        env.emitYield(subtree, out2);
        out2.push(env.get('@indent'))
        this.conv(env, subtree, out2);
        out2.push(`\n`);
        //env.emitAutoYield(subtree, out2);
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

  private syncYield(cond: ParseTree | any, body: ParseTree | any, ) {
    body.syncYield = cond;
  }

  private preYield(cond: ParseTree | any, body: ParseTree | any) {
    body.preYield = cond;
  }

  private emitPreYield(env: Env, body: ParseTree | any, out: string[]) {
    if (body.syncYield) {
      if (env.inFunc()) {
        env.emitSyncYield(body.syncYield, out);
      }
      else {
        env.emitYield(body.syncYield, out);
      }
    }
    if (body.preYield) {
      env.emitYield(body.preYield, out);
    }
  }

  public Block(penv: Env, t: ParseTree, out: string[]) {
    const env = penv.newEnv(Env.INDENT + penv.indent);
    out.push('{\n');
    this.emitPreYield(env, t, out);
    for (const subtree of t.subs()) {
      env.emitYield(subtree, out);
      out.push(env.indent);
      this.conv(env, subtree, out);
      out.push(`\n`);
      //env.emitAutoYield(subtree, out);
    }
    out.push(penv.indent + '}')
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
    var cond = t.cond;
    this.preYield(cond, t.then);
    this.conv(env, t['then'], out);
    if (t['elif'] !== undefined) {
      for (const stmt of t['elif'].subs()) {
        cond = stmt.cond;
        this.conv(env, stmt, out);
      }
    }
    if (t['else'] !== undefined) {
      out.push('else ');
      this.preYield(cond, t.else);
      this.conv(env, t['else'], out);
    }
    return Types.Void;
  }

  public ElifStmt(env: Env, t: ParseTree | any, out: string[]) {
    out.push('else if (');
    this.check(Types.Bool, env, t['cond'], out);
    out.push(') ');
    this.preYield(t.cond, t.then);
    this.conv(env, t['then'], out);
    return Types.Void;
  }

  public ForStmt(env: Env, t: ParseTree | any, out: string[]) {
    const name = t.each.tokenize();
    const ty = env.varType(t.each);
    out.push(`for (let ${name} of `)
    this.check(Types.list(ty), env, t.list, out)
    out.push(')')
    const lenv = env.newEnv(env.indent);
    lenv.enterLoop();
    lenv.declVar(name, ty);
    this.preYield(t.each, t.body);
    this.conv(lenv, t.body, out);
    lenv.exitLoop();
    return Types.Void
  }

  public WhileStmt(env: Env, t: ParseTree | any, out: string[]) {
    env.setSync();
    out.push('while (');
    this.check(Types.Bool, env, t['cond'], out);
    out.push(') ');
    this.syncYield(t.cond, t.body);
    this.conv(env, t['body'], out);
    return Types.Void
  }



  public FuncDecl(env: Env, t: ParseTree | any, out: string[]) {
    const name = t.tokenize('name');
    const types = [env.varType(t['name'])];
    const names = [];
    const lenv = env.newEnv(env.indent);
    const funcEnv = lenv.setFunc({
      name: name,
      returnType: types[0],
      hasReturn: false,
      isSync: false,
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
      env.checkImmutable(t.name, defined);
      if (defined.ty.accept(funcType, true)) {
        env.perror(t.name, 'TypeError', [
          '@req', `${defined.ty}`, '@given', `${funcType}`,
        ]);
        return this.skip(env, t, out);
      }
    }
    const symbol = env.declVar(name, funcType);
    const out2: string[] = [];
    this.conv(lenv, t['body'], out2);
    // symbol.isMatter = funcData['isMatter'];
    symbol.isSync = funcEnv.isSync;
    const defun = symbol.isGlobal() ? '' : 'var ';
    if (symbol.isSync) {
      out.push(`${defun}${symbol.code} = function* (${names.join(', ')}) ${out2.join('')}`)
    }
    else {
      out.push(`${defun}${symbol.code} = (${names.join(', ')}) => ${out2.join('')}`)
    }
    //this.conv(lenv, t['body'], out);
    if (!funcEnv.hasReturn) {
      types[0].accept(Types.Void, true);
    }
    console.log(`DEFINED ${name} :: ${funcType}`)
    return Types.Void;
  }

  public FuncExpr(env: Env, t: ParseTree | any, out: string[]) {
    const types = [env.varType(t)];
    const names = [];
    const lenv = env.newEnv(env.indent);
    const funcEnv = lenv.setFunc({
      name: '',
      returnType: types[0],
      hasReturn: false,
      isSync: false,
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
    if (!funcEnv.hasReturn) {
      types[0].accept(Types.Void, true);
    }
    return funcType;
  }

  public Return(env: Env, t: ParseTree | any, out: string[]) {
    if (env.funcEnv) {
      const funcEnv = env.funcEnv;
      funcEnv.hasReturn = true;
      if (t.expr !== undefined) {
        out.push('return ');
        this.check(funcEnv.returnType, env, t.expr, out);
      }
      else {
        out.push('return');
      }
    }
    else {
      env.pwarn(t, 'ReturnOnlyInFunction');
    }
    return Types.Void;
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
    const left = t.left as ParseTree;
    if (left.tag === 'NameOrNLP') {
      left.tag = 'Name';
    }
    if (left.tag === 'Name') {
      const name = left.tokenize();
      const symbol = env.getSymbol(name);
      if (symbol !== undefined) {
        env.checkImmutable(left, symbol);
        out.push(`${symbol.code} = `);
        this.check(symbol.ty, env, t.right, out);
      }
      else {
        const ty = env.varType(left);
        const out1: string[] = [];
        this.check(ty, env, t.right, out1);
        const symbol1 = env.declVar(name, ty);
        const qual = symbol1.isGlobal() ? '' : 'var ';
        out.push(`${qual}${symbol1.code} = ${out1.join('')}`);
        if (this.autoPuppyMode && symbol1.isGlobal()) {
          out.push(`;puppy.v('${name}')`);
        }
      }
      return Types.Void;
    }
    return this.conv(env, this.asSetter(left, t['right']), out);
  }

  private asSetter(t: ParseTree | any, right: ParseTree) {
    if (t.tag === 'NameOrNLP') {
      t.tag = 'Name';
    }
    t.tag = `Set${t.tag}`;
    t.right = right;
    return t;
  }

  public Name(env: Env, t: ParseTree, out: string[]) {
    const name = t.tokenize();
    const symbol = env.getSymbol(name);
    if (symbol === undefined) {
      env.perror(t, 'UndefinedName');
      return this.skip(env, t, out);
    }
    out.push(symbol.code);
    return symbol.ty;
  }

  public NameOrNLP(env: Env, t: ParseTree, out: string[]) {
    const name = t.tokenize();
    const symbol = env.getSymbol(name);
    if (symbol === undefined) {
      env.perror(t, 'NLKeyValues');  //FIXME
      return this.skip(env, t, out);
    }
    out.push(symbol.code);
    return symbol.ty;
  }

  public SetName(env: Env, t: ParseTree, out: string[]) {
    const name = t.tokenize();
    const symbol = env.getSymbol(name);
    if (symbol === undefined) {
      env.perror(t, 'UndefinedName');
      return this.skip(env, t, out);
    }
    env.checkImmutable(t, symbol);
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
    return emitJSBinary(env, t, out);
    // const op = operator(t.tokenize('name'));
    // if (op === undefined) {
    //   env.perror(t.get('name'), 'UndefinedOperator');
    //   return this.skip(env, t, out);
    // }
    // const out1: string[] = [];
    // const out2: string[] = [];
    // const ty1 = this.check(getLeftHandType(op), env, t['left'], out1);
    // const ty2 = this.check(getRightHandType(op, ty1), env, t['right'], out2);
    // return this.checkBinary(env, t, op, ty1, out1.join(''), ty2, out2.join(''), out);
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
    const symbol = env.getSymbol(name);
    if (symbol === undefined) {
      const pkgname = PackageSymbolMap[name];
      if (pkgname !== undefined) {
        env.from_import(PuppyModules[pkgname]);
        env.pnotice(t['name'], 'InferredPackage', [
          '@inferred', pkgname,
          '@fixme', `from ${pkgname} import *`,
        ]);
        if (pkgname === 'puppy2d') {
          this.autoPuppyMode = false;
        }
        return this.ApplySymbolExpr(env, t, name, env.get(name) as Symbol, undefined, out); // Again
      }
    }
    return this.ApplySymbolExpr(env, t, name, symbol, undefined, out);
  }

  private ApplySymbolExpr(env: Env, t: ParseTree | any, name: string, symbol: Symbol, recv: ParseTree | undefined, out: string[]): Type {
    if (symbol === undefined) {
      env.perror(t['name'], recv ? 'UndefinedMethod' : 'UndefinedFunction');
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
    if (symbol.isSync) {
      env.setSync();
      out.push('(yield ()=>')
    }
    out.push(symbol.code)
    out.push('(')
    if (funcType.hasAlpha()) {
      const root = env.root;
      funcType = funcType.toVarType({
        vartypes: root.vartypes,
        varids: root.varids,
        ref: t
      });
    }
    //console.log(`FIXME ${symbol.code} args.length=${args.length} funcType.psize=${funcType.psize()}`)
    const psize = Types.isVarFuncType(funcType) ? funcType.psize() - 1 : funcType.psize();
    if (args.length < psize) {
      env.perror(t['name'], 'MissingArguments', [
        '@psize', (recv) ? psize - 1 : psize,
        '@type', funcType,
      ])
      return this.skip(env, t, out);
    }
    for (var i = 0; i < args.length; i += 1) {
      if (!(i < funcType.psize())) {
        env.pwarn(args[i], 'TooManyArguments', [
          '@psize', (recv) ? psize - 1 : psize,
          '@type', funcType,
        ]);
        break;
      }
      if (i > 0) {
        out.push(',');
      }
      const ty = funcType.ptype(i);
      this.check(ty, env, args[i], out);
    }
    // if (args.length < funcType.psize()) {
    //   if (!funcType.ptype(args.length)) {
    //     env.perror(t['name'], 'MissingArgument',
    //       ['@req', `${funcType}`]
    //     );
    //     return this.skip(env, t, out);
    //   }
    // }
    out.push(')');
    if (symbol.isSync) {
      out.push(')')
    }
    //env.foundFunc(t, symbol);
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
      env.checkImmutable(t.recv, null);
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
  const ts = new JSTranspiler();
  const env = new RootEnv(ts);
  env.from_import(PuppyModules['']);
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
  code['errors'] = env.errors;
  code['warnings'] = env.warnings;
  code['notices'] = env.notices;
  code['codemap'] = env.tokens;
  //code['symbols'] = env.symbols;
  //code['time'] = end - start;
  return code as PuppyCode;
}

export const utest = (s: string) => {
  const src = { source: s };
  const code = compile(src);
  if (code.errors.length > 0) {
    console.log(messagefy(code.errors[0]))
    return code.errors[0].key;
  }
  if (code.warnings.length > 0) {
    console.log(messagefy(code.warnings[0]))
    return code.warnings[0].key;
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

