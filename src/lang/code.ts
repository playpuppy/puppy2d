
import { ParseTree } from './puppy-parser';

export type Source = {
  pos: number;
  row: number;
  col: number;
  len: number;
}

export type SourceEvent = Source & {
  type: 'error' | 'warning' | 'notice' | 'info';
  key: string;
  time: number;
  subject: string;
  params?: any[];
}

export const SourceError = (t: ParseTree, key: string, params?: any[]) => {
  const triple = t.begin();
  const e: SourceEvent = {
    type: 'error',
    key: key,
    time: 0,
    subject: t.tokenize(),
    pos: triple[0],
    row: triple[1],
    col: triple[2],
    len: t.length(),
    params: params
  };
  return e;
}

export type PuppyCode = {
  world: any;
  main: (puppy: any, codemap: any[]) => IterableIterator<number>;
  errors: SourceEvent[];
  warnings: SourceEvent[];
  notices: SourceEvent[];
  codemap: any[];
  symbols: any;
  code: string;
};

const JMessage: { [key: string]: string } = {
  'SyntaxError': '文法的に正しくありません',
  'TypeError': 'データの種類が一致しません',
  '@req': '正しいデータの種類：',
  '@given': '実際に与えられた種類：',
  'UnknownPackageName': 'PuppyはPythonの全てのライブラリが使えるわけではありません',

  'UndefinedName': '変数は使用する前に値を設定しましょう',
  'UndefinedFunctionName': '関数の定義を探すことができませんでした',

  'UnknownName': 'この名前はタイプミスかも知れません',

  'InferredPackage': 'ライブラリを自動インポートしました',
  '@inferred': '推論されたもの',
  '@fixme': 'コード',

  'OutofArrayIndexError': '配列の大きさを超えてアクセスしました',
  '@index': 'あなたが与えた位置：',
  '@length': '配列の大きさ 0 〜',

}

export const messagefy = (s: SourceEvent, lang = 'en') => {
  const msgs = JMessage;
  const buf = [];
  if (s.key in msgs) {
    buf.push(`(${s.key}) ${msgs[s.key]}`);
  }
  else {
    buf.push(`(${s.key})`);
  }
  if (s.params) {
    var c = 0;
    for (const p of s.params) {
      buf.push((c % 2 === 0) ? '\n ' : ' ');
      if (p in msgs) {
        buf.push(msgs[p]);
      }
      else {
        buf.push(`${p}`);
      }
      c += 1;
    }
  }
  return buf.join('');
}
