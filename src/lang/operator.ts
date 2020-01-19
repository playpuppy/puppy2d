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

const updateZenkaku = () => {
  for (var c = 65; c <= 90; c++) {
    const a = String.fromCharCode(c);
    const z = String.fromCharCode(c + 65248);
    ZenkakuToASCII[z] = a;
  }
  for (var c = 97; c <= 122; c++) {
    const a = String.fromCharCode(c);
    const z = String.fromCharCode(c + 65248);
    ZenkakuToASCII[z] = a;
  }
}
updateZenkaku();

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

const PuppyUnaryOperator: { [key: string]: string } = {
  '+': '+', '-': '-', '~': '~',
}

const PuppyBinaryOperator: { [key: string]: string } = {
  'and': '&&', 'or': '||', 'not': '!',
  '<': '<', '>': '>', '<=': '<=', '>=': '>=',
  '==': '==', '!=': '!=', 'in': 'in',
  '+': '+', '-': '-', '*': '*', '//': '//', '/': '/', '%': '%', '**': '**',
  '<<': '<<', '>>': '>>', '|': '|', '&': '&', '^': '^',
  '+=': '+', '-=': '-', '*=': '*', '//=': '//', '/=': '/', '%=': '%',
  '<<=': '<<', '>>=': '>>', '|=': '|', '&=': '&', '^=': '^',
}

const LeftHandType: { [key: string]: Type } = {
  '+': Types.union(Types.Int, Types.String, Types.ListAny),
  '-': Types.Int, '**': Types.Int, '*': Types.Int,
  '/': Types.Int, '//': Types.Int, '%': Types.Int,
  '==': Types.Any, '!=': Types.Any, 'in': Types.Any,
  '<': Types.Compr, '<=': Types.Compr, '>': Types.Compr, '>=': Types.Compr,
  '^': Types.Int, '|': Types.Int, '&': Types.Int, '<<': Types.Int, '>>': Types.Int,
};

export class PuppyTypeSystem {

  public getUnaryOperator(env: Env, t: ParseTree): string {
    var op = checkZenkaku(env, t);
    op = PuppyUnaryOperator[op];
    if (op === undefined) {
      env.perror(t, 'Unsupported');
    }
    return op;
  }

  public getBinaryOperator(env: Env, t: ParseTree): string {
    var op = checkZenkaku(env, t);
    op = PuppyBinaryOperator[op];
    if (op === undefined) {
      env.perror(t, 'Unsupported');
    }
    return op;
  }

  public getBinaryType(env: Env, t: ParseTree, op: string): Type {
    const leftType = LeftHandType[op];
    if (leftType === undefined) {
      console.log(`FIXME undefined left type for '${op}'`);
      env.perror(t, 'Unsupported');
    }
    return leftType;
  }

  public isComparator(op: string) {
    return (LeftHandType[op] === Types.Compr);
  }
}

