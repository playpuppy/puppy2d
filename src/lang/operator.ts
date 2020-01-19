import { ParseTree } from './puppy-parser';
import { Type, Types } from './types';
import { Env } from './environment';

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

export const emitJSBinary = (env: Env, t: ParseTree | any, out: string[]) => {
  const op = operator(t.tokenize('name'));
  if (op === undefined) {
    env.perror(t.get('name'), 'UndefinedOperator');
  }
  const out1: string[] = [];
  const out2: string[] = [];
  const ty1 = env.typeCheck(getLeftHandType(op), t['left'], out1).realType();
  const ty2 = env.typeCheck(getRightHandType(op, ty1), t['right'], out2).realType();
  const left = out1.join('');
  const right = out2.join('');

  /** */
  if (op === '==' || op === '!=') {
    out.push(`${left} ${op}= ${right}`);
    return Types.Bool;
  }
  if (op === '+') {
    if (ty1.isNumberType() && ty2.isNumberType()) {
      out.push(`(${left} + ${right})`);
      return Types.Int;
    }
    if (ty1.accept(ty2, true)) {
      out.push(`lib.anyAdd(${left},${right})`);
      return ty1;
    }
    env.perror(t, 'TypeError/Infix', ['@infix', op]);
  }
  if (op === '*') {
    if (ty1.isNumberType() && ty2.isNumberType()) {
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
  return Types.Void; // unreached
}

export const emitJSUnary = (env: Env, t: ParseTree | any, out: string[]) => {
  const op = t.tokenize('name');
  if (op === '!' || op === 'not') {
    out.push(`${op}(`);
    env.typeCheck(Types.Bool, t.expr, out);
    out.push(')');
    return Types.Bool;
  }
  else {
    out.push(`${op}(`);
    env.typeCheck(Types.Int, t.expr, out);
    out.push(')');
    return Types.Int;
  }
}
