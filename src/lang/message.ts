
import { SourceEvent } from './code';

const JMessage: { [key: string]: string | string[] } = {
  'SyntaxError': 'コードの書き方が間違っています',
  '?SyntaxError': [
    '[原因1] ()や[], {}が正しく対になっていない',
    '[原因2] "..."や\'...\'が正しく閉じられてない',
    '[原因3] , など、必要な記号を忘れている',
    '[原因4] インデント(字下げ)が揃っていない',
  ],
  'UndefinedName': '変数は使用する前に値を設定しましょう',
  'TypeError': 'データの種類が一致しません',
  '@req': '正しいデータの種類：',
  '@given': '実際に与えられた種類：',
  'UnknownPackageName': 'PuppyはPythonの全てのライブラリが使えるわけではありません',

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
    //buf.push(`(${s.key}) ${msgs[s.key]}`);
    buf.push(`${msgs[s.key]}`);
    const hint = `?${s.key}`;
    if (hint in msgs) {
      for (const s of msgs[hint]) {
        buf.push(`\n  ${s}`);
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
