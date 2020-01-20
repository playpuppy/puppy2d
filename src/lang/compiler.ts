import { generate, ParseTree } from './puppy-parser';
import { Type, Types } from './types';
import { Symbol, PuppyModules, KEYTYPES, PackageSymbolMap, getField } from './package';
import { SourceError, PuppyCode } from './code';
import { Env, RootEnv, CompileCancelationError, Transpiler } from './environment';
import { messagefy } from './message';
import { PuppyTypeSystem, checkZenkaku } from './operator';

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
    return env.perror(t, 'UndefinedParseTree');
  }

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
    return env.perror(t, 'SyntaxError');
  }

  private getModule(env: Env, name: string, t: ParseTree, out: string[]) {
    const pkg = PuppyModules[name];
    if (pkg === undefined) {
      return env.perror(t.get('name'), 'UnknownPackageName');
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
    env.typeCheck(Types.Bool, t.cond, out);
    out.push(') ? (');
    const ty = this.conv(env, t.then, out);
    out.push(') : (');
    env.typeCheck(ty, t['else'], out);
    out.push('))');
    return ty;
  }

  public IfStmt(env: Env, t: ParseTree | any, out: string[]) {
    out.push('if (');
    env.typeCheck(Types.Bool, t.cond, out);
    out.push(') ');
    var cond = t.cond;
    this.preYield(cond, t.then);
    this.conv(env, t.then, out);
    if (t.elif !== undefined) {
      for (const stmt of t.elif.subs()) {
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
    env.typeCheck(Types.Bool, t.cond, out);
    out.push(') ');
    this.preYield(t.cond, t.then);
    this.conv(env, t.then, out);
    return Types.Void;
  }

  public ForStmt(env: Env, t: ParseTree | any, out: string[]) {
    const name = t.each.tokenize();
    const ty = env.varType(t.each);
    out.push(`for (let ${name} of `)
    env.typeCheck(Types.list(ty), t.list, out)
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
    env.typeCheck(Types.Bool, t.cond, out);
    out.push(') ');
    env.enterLoop();
    this.syncYield(t.cond, t.body);
    this.conv(env, t.body, out);
    env.exitLoop();
    return Types.Void
  }

  public FuncDecl(env: Env, t: ParseTree | any, out: string[]) {
    const name = t.tokenize('name');
    const types = [env.varType(t.name)];
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
      const ptype = env.varType(p.name);
      const symbol = lenv.declVar(pname, ptype);
      names.push(symbol.code);
      types.push(ptype);
    }
    const funcType = Types.func(...types);
    const defined = env.getSymbol(name);
    if (defined !== undefined) {
      env.checkImmutable(t.name, defined);
      if (defined.ty.accept(funcType, true)) {
        return env.perror(t.name, 'TypeError', [
          '@req', `${defined.ty}`, '@given', `${funcType}`,
        ]);
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
        env.typeCheck(funcEnv.returnType, t.expr, out);
      }
      else {
        out.push('return');
      }
    }
    else {
      env.pwarn(t, 'ReturnOnlyInFunction');
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
        env.typeCheck(symbol.ty, t.right, out);
      }
      else {
        const ty = env.varType(left);
        const out1: string[] = [];
        env.typeCheck(ty, t.right, out1);
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
      return env.perror(t, 'UndefinedName');
    }
    out.push(symbol.code);
    return symbol.ty;
  }

  public NameOrNLP(env: Env, t: ParseTree, out: string[]) {
    const name = t.tokenize();
    const symbol = env.getSymbol(name);
    if (symbol === undefined) {
      return env.perror(t, 'NLKeyValues');  //FIXME
    }
    out.push(symbol.code);
    return symbol.ty;
  }

  public SetName(env: Env, t: ParseTree, out: string[]) {
    const name = t.tokenize();
    const symbol = env.getSymbol(name);
    if (symbol === undefined) {
      return env.perror(t, 'UndefinedName');
    }
    env.checkImmutable(t, symbol);
    t.tag = 'Name';
    out.push(symbol.code);
    out.push(' = ');
    env.typeCheck(symbol.ty, t.get('right'), out);
    return Types.Void;
  }

  public And(env: Env, t: ParseTree | any, out: string[]) {
    env.typeCheck(Types.Bool, t.left, out);
    out.push(' && ');
    env.typeCheck(Types.Bool, t.right, out);
    return Types.Bool;
  }

  public Or(env: Env, t: ParseTree | any, out: string[]) {
    env.typeCheck(Types.Bool, t.left, out);
    out.push(' || ');
    env.typeCheck(Types.Bool, t.right, out);
    return Types.Bool;
  }

  public Not(env: Env, t: ParseTree | any, out: string[]) {
    out.push('!(');
    env.typeCheck(Types.Bool, t[0], out);
    out.push(')');
    return Types.Bool;
  }

  typeSystem = new PuppyTypeSystem();

  public Infix(env: Env, t: ParseTree | any, out: string[]) {
    const op = this.typeSystem.getBinaryOperator(env, t.name);
    const pat = this.typeSystem.getBinaryType(env, t.name, op);

    const out1: string[] = [];
    const out2: string[] = [];
    const ty1 = env.typeCheck(pat, t.left, out1, 'TypeError').realType();
    const ty2 = env.typeCheck(ty1, t.right, out2, 'BinaryTypeError').realType();
    const left = out1.join('');
    const right = out2.join('');

    /** */
    if (op === '==' || op === '!=') {
      out.push(`(${left} ${op}= ${right})`);
      return Types.Bool;
    }
    if (op === '+') {
      if ((ty1.isNumberType() && ty2.isNumberType()) ||
        (ty1.isStringType() && ty2.isStringType())) {
        out.push(`(${left} + ${right})`);
        return ty1;
      }
    }
    if (op === '//') {
      out.push(`((${left}/${right})|0)`);
      return Types.Int;
    }
    if (op === '**') {
      env.pwarn(t.name, 'Transition');
      out.push(`Math.pow(${left},${right})`);
      return Types.Int;
    }
    if (ty1.accept(ty2, true)) {
      out.push(`(${left} ${op} ${right})`);
      return (this.typeSystem.isComparator(op)) ? Types.Bool : ty1;
    }
    console.log(`FIXME: ${t.tokenize()} ${ty1} ${ty2}`);
    return env.perror(t, 'TypeError', ['@infix', op]);
  }

  public Unary(env: Env, t: ParseTree | any, out: string[]) {
    const op = this.typeSystem.getUnaryOperator(env, t.name);
    out.push(`${op}(`);
    env.typeCheck(Types.Int, t.expr, out);
    out.push(')');
    return Types.Int;
  }

  public Eq(env: Env, t: ParseTree | any, out: string[]) {
    const ty1 = env.typeCheck(Types.Any, t.left, out, 'TypeError').realType();
    out.push(`===`);
    env.typeCheck(ty1, t.right, out, 'BinaryTypeError').realType();
    return Types.Bool;
  }

  public Assign(env: Env, t: ParseTree | any, out: string[]) {
    env.perror(t, 'Unsupported');
    const ty1 = env.typeCheck(Types.Any, t.left, out).realType();
    out.push(`=`);
    env.typeCheck(ty1, t.right, out).realType();
    return ty1;
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
      return env.perror(t['name'], recv ? 'UndefinedMethod' : 'UndefinedFunction');
    }
    const args = t['params'].subs() as ParseTree[];
    if (recv !== undefined) {
      args.unshift(recv);
    }
    symbol = this.refineWithParamSize(env, symbol, name, args);
    var funcType = symbol.ty;
    if (!Types.isFuncType(funcType)) {
      return env.perror(t['name'], 'TypeError', [
        '@req', '@function', '@given', `${funcType}`
      ]);
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
      return env.perror(t['name'], 'MissingArguments', [
        '@psize', (recv) ? psize - 1 : psize,
        '@type', funcType,
      ])
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
      env.typeCheck(ty, args[i], out);
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
    env.typeCheck(field.base, t.recv, out);
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
    env.typeCheck(field.base, t['recv'], out);
    out.push(fmts[1]);
    env.typeCheck(field.ty, t['right'], out);
    out.push(fmts[2]);
    return Types.Void;
  }

  public IndexExpr(env: Env, t: ParseTree | any, out: string[]) {
    out.push('lib.getindex(');
    const ty = env.typeCheck(Types.union(Types.list(env.varType(t)), Types.String), t['recv'], out);
    out.push(',');
    env.typeCheck(Types.Int, t['index'], out);
    out.push(`${env.codemap(t)})`);
    return Types.isListType(ty) ? ty.ptype(0) : ty;
  }

  public SetIndexExpr(env: Env, t: ParseTree | any, out: string[]) {
    t.tag = 'IndexExpr';  // see SelfAssign
    out.push('lib.setindex(');
    const ty = env.typeCheck(Types.list(env.varType(t)), t['recv'], out);
    out.push(',')
    env.typeCheck(Types.Int, t['index'], out)
    out.push(',');
    env.typeCheck(ty.ptype(0), t['right'], out)
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
      env.typeCheck(ty, t.value, out);
    }
    return Types.Void
  }

  private checkRecovery(env: Env, t: ParseTree) {
    const subs = t.subs();
    if (subs.length > 0) {
      const tail = subs[subs.length - 1];
      if (tail.tag === 'RecoverP' || tail.tag === 'RecoverS' || tail.tag === 'RecoverB') {
        env.pwarn(tail, tail.tag);
        subs.pop();
      }
    }
    return subs;
  }

  public Tuple(env: Env, t: ParseTree, out: string[]) {
    const subs = this.checkRecovery(env, t);
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
    env.typeCheck(Types.Int, subs[0], out);
    out.push(',')
    env.typeCheck(Types.Int, subs[1], out);
    out.push(')')
    return Types.Vec;
  }

  public List(env: Env, t: ParseTree, out: string[]) {
    var ty = env.varType(t);
    out.push('[')
    for (const sub of this.checkRecovery(env, t)) {
      ty = env.typeCheck(ty, sub, out, 'TypeError');
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
    out.push(checkZenkaku(env, t));
    return Types.Int;
  }

  public Float(env: Env, t: ParseTree, out: string[]) {
    out.push(checkZenkaku(env, t));
    return Types.Float;
  }

  public Double(env: Env, t: ParseTree, out: string[]) {
    out.push(checkZenkaku(env, t));
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

