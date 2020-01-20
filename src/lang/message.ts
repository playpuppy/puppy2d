
import { SourceEvent } from './code';

const JMessage: { [key: string]: string | string[] } = {
  'CompileError': 'コンパイラの致命的なエラーです',
  '?CompileError': [
    'ソースコードを編集してエラーがでなくなれば、システムは安全に回復します',
    'Puppy 開発チームに連絡していただけると助かります',
  ],

  'SyntaxError': '文法的に、かなり間違っています.',
  '?SyntaxError': [
    '[原因1] ()や[], {}が正しく対になっていない',
    '[原因2] "..."や\'...\'が正しく閉じられてない',
    '[原因3] , など、必要な記号を忘れている',
    '[原因4] インデント(字下げ)が揃っていない',
  ],

  'UndefinedParseTree': 'Puppyではサポートされていない構文です.',
  'UndefinedOperator': 'Puppyではサポートされていない演算子です.',
  'Transition': 'Python以外の言語を学ぶときに困るかもしれません',

  'UndefinedName': 'はじめて用いる変数名です.',
  '?UndefinedName': [
    '変数名を打ち間違えていないか確認してください.',
    '新しい変数は使用する前に、値を設定しましょう.'
  ],
  'UndefinedFunction': '定義されていない関数名です.',
  '?UndefinedFunction': [
    '関数名を打ち間違えていないか確認してください.',
    '関数は使用する前に、def 文で定義しましょう.'
  ],
  'UndefinedMethod': '未定義なメソッドです.',
  '?UndefinedMethod': [
    'メソッド名を打ち間違えていないか確認してください.',
    'Puppyは、Pythonの全てのメソッドをサポートしているわけではありません.',
  ],
  'Immutable': '定義済みの名前は、変更できません.',
  '?Immutable': ['別の名前をつけてみましょう.'],

  'UnknownPackageName': 'サポート外のライブラリです',
  '?UnknownPackageName': [
    'Puppyは、Pythonの全てのライブラリが使えるわけではありません',
    'Pythonのソースコードをそのまま貼り付けてはいけません'],

  'TypeError': '値の種類が一致しません',
  '@req': '必要な値の種類：',
  '@given': 'コード上の種類：',
  'BinaryTypeError': '演算子の左辺と右辺の種類が一致しません',

  'MissingArguments': 'パラメータの数が足りません',
  'TooManyArguments': '引数（パラメータ）の数が多すぎます',
  '@psize': '必要なパラメータの数：',
  '@type': '型情報：',

  'UnknownName': 'タイプミスかも知れません',
  'Zenkaku': '全角文字は使わないようにしましょう',
  'BadAssign': 'もしかしたら、等しいかどうかの比較？',
  '?BadAssign': [
    '比較するときは、= ではなく、== を使いましょう'
  ],
  'RecoverS': 'たぶん、この辺りで ] を閉じ忘れています',
  'RecoverP': 'たぶん、この辺りで ) を閉じ忘れています',
  'RecoverB': 'たぶん、この辺りで } を閉じ忘れています',

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
    //buf.push(`(${s.key}) ${msgs[s.key]}`);
    buf.push(`${msgs[s.key]}`);
    const hint = `?${s.key}`;
    if (hint in msgs) {
      for (const s of msgs[hint]) {
        buf.push(`\n${s}`);
      }
    }
  }
  else {
    buf.push(`${s.key}`);
  }
  if (s.params) {
    var c = 0;
    for (const p of s.params) {
      if (c == 0) {
        if (p in msgs) {
          buf.push(`\n ${msgs[p]}`);
        }
        else {
          c = -2;
        }
      }
      else if (c === 1) {
        buf.push(` ${p}`);
        c = -1;
      }
      c += 1;
    }
  }
  return buf.join('');
}
