export class LibPython {
  world: any;

  public constructor(world: any) {
    this.world = world;
  }

  /* built-in functions  */

  /**
   * Return the absolute value of a number. 
   * The argument may be an integer or a floating point number.
   * @param x 
   */

  public abs(x: number) {
    return Math.abs(x);
  }

  public all(iterable: boolean[]) {
    for (const element of iterable) {
      if (!element) {
        return false;
      }
    }
    return true;
  }

  public any(iterable: boolean[]) {
    for (const element of iterable) {
      if (element) {
        return true;
      }
    }
    return false;
  }

  public bool(x: any) {
    return x ? true : false;
  }

  public chr(codePoint: number) {
    return String.fromCodePoint(codePoint);
  }

  public delattr(x: any, key: string) {
    delete x[key];
  }

  public filter<T>(f: (x: T) => boolean, iterable: T[]) {
    const es: T[] = [];
    for (const element of iterable) {
      if (f(element)) {
        es.push(element);
      }
    }
    return es;
  }

  public float(x?: any): number {
    if (typeof x === 'number') {
      return x;
    }
    if (typeof x === 'boolean') {
      return x ? 1.0 : 0.0;
    }
    if (typeof x === 'string') {
      const v = Number.parseFloat(x);
      return Number.isNaN(v) ? 0.0 : v;
    }
    return 0.0;
  }

  public getattr(x: any, key: string, defval: any): any {
    return x[key] !== undefined ? x[key] : defval;
  }

  public hasattr(x: any, key: string): any {
    return x[key] !== undefined;
  }


  public int(x: any, base = 10): number {
    if (typeof x === 'number') {
      return x | 0;
    }
    if (typeof x === 'boolean') {
      return x ? 1 : 0;
    }
    if (typeof x === 'string') {
      const v = Number.parseInt(x, base);
      return Number.isNaN(v) ? 0 : v;
    }
    return x | 0;
  }

  public len(x: any) {
    if (typeof x === 'string' || Array.isArray(x.length)) {
      return x.length;
    }
    return 0;
  }

  public map<X, Y>(f: (x: X) => Y, iterable: X[]): Y[] {
    const es: Y[] = [];
    for (const element of iterable) {
      es.push(f(element));
    }
    return es;
  }


  public max1(iterable: number[]) {
    return Math.max(...iterable);
  }

  public max(x: number, y: number, ...iterable: number[]) {
    const m = Math.max(x, y);
    if (iterable.length > 0) {
      return Math.max(m, Math.max(...iterable));
    }
    return m;
  }

  public min1(iterable: number[]) {
    return Math.min(...iterable);
  }

  public min(x: number, y: number, ...iterable: number[]) {
    const m = Math.min(x, y);
    if (iterable.length > 0) {
      return Math.min(m, Math.min(...iterable));
    }
    return m;
  }

  public range1(x: number) {
    return this.range(0, x, 0 < x ? 1 : -1);
  }

  public range2(x: number, y: number) {
    return this.range(x, y, x < y ? 1 : -1);
  }

  public range(start: number, end: number, step: number) {
    const xs: number[] = [];
    if (start <= end) {
      if (step < 0) {
        step = -step;
      }
      for (let i = start; i < end; i += step) {
        xs.push(i);
        if (xs.length > 10000000) {
          break; // for safety
        }
      }
    } else {
      if (step > 0) {
        step = -step;
      }
      for (let i = start; i > end; i += step) {
        xs.push(i);
        if (xs.length > 10000000) {
          break; // for safety
        }
      }
    }
    return xs;
  }

  public repr(obj: any): string {
    if (typeof obj === 'string') {
      if (obj.indexOf('"') == -1) {
        return `"${obj}"`
      }
      return `'${obj}'`
    }
    return this.str(obj);
  }

  public reversed(seq: any[] | string) {
    if (Array.isArray(seq)) {
      return seq.reverse();
    }
    return seq.split('').reverse().join('');
  }

  public round(n: number) {
    return Math.round(n);
  }

  public setattr(x: any, key: string, value: any) {
    x[key] = value;
  }

  public sorted(iterable: any[]) {
    return iterable.sort();
  }

  public str(obj: any): string {
    if (typeof obj === 'number' || typeof obj === 'string') {
      return `${obj}`;
    }
    if (typeof obj === 'boolean') {
      return obj ? 'True' : 'False';
    }
    if (Array.isArray(obj)) {
      return '[' + obj.map(x => this.repr(x)).join(', ') + ']';
    }
    if (obj === undefined) {
      return '';
    }
    if (obj.x && obj.y) {
      return `(${obj.x}, ${obj.y})`;
    }
    if (obj.text) {
      return obj.text;
    }
    return '{' + Object.keys(obj).map(key => `${key}: ${this.repr(obj[key])}`).join(', ') + '}'
  }

  /* operator */

  public anyAdd(x: any, y: any) {
    if (Array.isArray(x) && Array.isArray(y)) {
      return x.concat(y);
    }
    return x + y;
  }

  public anyMul(x: any, y: any) {
    if (typeof x === 'string') {
      let s = '';
      for (let i = 0; i < y; i += 1) {
        s += x;
      }
      return s;
    }
    if (Array.isArray(x)) {
      let a: any[] = [];
      for (let i = 0; i < y; i += 1) {
        a = a.concat(x);
      }
      return a;
    }
    return x * y;
  }

  public anyIn(x: any, a: any) {
    return a.indexOf(x) >= 0;
  }

  /* string/array (method) */

  public get(a: any, name: string, puppy?: any) {
    const v = a[name];
    if (v === undefined) {

    }
    return v;
  }

  public index(a: any, index: number, puppy?: any) {
    if (typeof a === 'string') {
      return a.charAt((index + a.length) % a.length);
    }
    if (Array.isArray(a)) {
      return a[(index + a.length) % a.length];
    }
    return undefined;
  }

  public slice(a: any, x: number, y?: number) {
    if (typeof a === 'string') {
      if (y == undefined) {
        y = a.length;
      }
      return a.substr(x, y - x);
    }
    if (Array.isArray(a)) {
      if (y == undefined) {
        y = a.length;
      }
      return a.slice(x, y);
    }
    return undefined;
  }

  public find(s: string, sub: string) {
    return s.indexOf(sub);
  }

  public join(s: string, list: [string]) {
    return list.join(s);
  }

  /* list */

  public append(xs: any[], x: any) {
    xs.push(x);
  }

  /* Matter.Body */

}

