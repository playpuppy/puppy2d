import { utest } from '../src/lang/compiler';

test('HelloWorld', () => {
	expect(utest(`
print("hello,world")
`)).toBe('puppy.print1("hello,world")');
});

test('HelloWorld+', () => {
	expect(utest(`
print("hello,world", fontColor='red')
`)).toBe(`puppy.print1(\"hello,world\",{'fontColor': 'red',})`);
});

test('print(1,2)', () => {
	expect(utest(`
print(1,2)
`)).toBe('puppy.print2(1,2)');
});

test('あ', () => {
	expect(utest(`
あ=1
`)).toBe("vars['あ'] = 1");
});

test('重さ', () => {
	expect(utest(`
重さ=1
`)).toBe("vars['重さ'] = 1");
});

test('あ+=1', () => {
	expect(utest(`
あ=1
あ += 1
`)).toBe(`vars['あ'] = (vars['あ'] + 1)`);
});

test('1＋1', () => {
	expect(utest(`
a=1＋1
`)).toBe('Zenkaku');
});

// test('None', () => {
// 	expect(utest('None')).toBe('null');
// });

test('123', () => {
	expect(utest('123')).toBe('123');
});

test('true', () => {
	expect(utest('True')).toBe('true');
});

test('false', () => {
	expect(utest('False')).toBe('false');
});

test('+1', () => {
	expect(utest('+1')).toBe('+(1)');
});

test('~1', () => {
	expect(utest('~1')).toBe('~(1)');
});

test('-1', () => {
	expect(utest('-1')).toBe('-(1)');
});

test('1+2*3==1-2%3', () => {
	expect(utest('1+2*-3-4')).toBe('((1 + (2 * -(3))) - 4)');
});

// test('**', () => {
// 	expect(utest(`1*2**3+4`)).toBe("((1 * Math.pow(2,3)) + 4)");
// });

test('not', () => {
	expect(utest(`not 1 == 2 and 1 > 3`)).toBe("!((1 === 2)) && (1 > 3)");
});

test('//', () => {
	expect(utest(`1/2!=1//3`)).toBe("((1 / 2) !== ((1/3)|0))");
});

test('IfExpr', () => {
	expect(utest(`
x = 1
x + 1 if x > x else x + 1
`)).toBe("(((vars['x'] > vars['x'])) ? ((vars['x'] + 1)) : ((vars['x'] + 1)))");
});

test('f string', () => {
	expect(utest(`f'{1}{2}A{3}'`)).toBe("(lib.str(1)+lib.str(2)+'A'+lib.str(3))");
});

test('+=', () => {
	expect(utest(`
a=1
a+=1
`)).toBe("vars['a'] = (vars['a'] + 1)");
});

test('Circle(10,10)', () => {
	expect(utest(`
from puppy2d import *
Circle(10, 10)
`)).toBe("puppy.Circle2(10,10)");
});

test('Circle(10,10,50)', () => {
	expect(utest(`
from puppy2d import *
Circle(10,10,50)
`)).toBe("puppy.Circle(10,10,50)");
});

test('Circle(10,10,55, mass=100)', () => {
	expect(utest(`
from puppy2d import *
Circle(10, 10, 55, mass=100)
`)).toBe("puppy.Circle(10,10,55,{'mass': 100,})");
});

test('Circle(10,10,60, よく弾む)', () => {
	expect(utest(`
from puppy2d import *
Circle(10, 10, 60, よく弾む)
`)).toBe("NLKeyValues");
});

test('range(1)', () => {
	expect(utest(`
range(1)
`)).toBe("lib.range1(1)");
});

test('range(1,2)', () => {
	expect(utest(`
range(1,2)
`)).toBe("lib.range2(1,2)");
});

test('range(1,2,1)', () => {
	expect(utest(`
range(1,2,1)
`)).toBe("lib.range(1,2,1)");
});


test('c.width+=1', () => {
	expect(utest(`
from puppy2d import *
c = Circle(10, 10, 0)
c.width += 1
`)).toBe("vars['c'].setWidth((vars['c'].getWidth() + 1))");
});

test('c[0]+=1', () => {
	expect(utest(`
c = [1,2]
c[0] += 1
`)).toBe("lib.setindex(vars['c'],0,(lib.getindex(vars['c'],0,codemap[0]) + 1),codemap[0])");
});

test('c.width', () => {
	expect(utest(`
xs = []
xs.append(1)
`)).toBe("lib.append(vars['xs'],1)");
});

test('c.width', () => {
	expect(utest(`
from puppy2d import *
c = Circle(10,10,10)
c.setAngle(0.1)
`)).toBe("lib.setAngle(vars['c'],0.1)");
});

test('from math import', () => {
	expect(utest(`
from math import *
x = tan(1.0)
`)).toBe("vars['x'] = Math.tan(1.0)");
});

test('import math', () => {
	expect(utest(`
import math as m
m.sin(1)
`)).toBe("Math.sin(1)");
});

test('def succ(n)', () => {
	expect(utest(`
def succ(n):
  return n+1
succ(1)
`)).toBe("vars['succ'](1)");
});

test('def fibo(n)', () => {
	expect(utest(`
def fibo(n):
	if n > 1:
		return fibo(n-1)+fibo(n-2)
	return 1
`)).toBe("return 1");
});

test('Ball()', () => {
	expect(utest(`
from puppy2d import *
def Ball(x, y):
	Circle(x, y, 50)
Ball(1, 1)
`)).toBe("vars['Ball'](1,1)");
});

test('for in', () => {
	expect(utest(`
for x in range(1,2):
  for y in range(x,2):
    x+y
`)).toBe("(x + y)");
});

test('if/else', () => {
	expect(utest(`
if True:
	1
else:
	2
`)).toBe("2");
});

test('if/elif/else', () => {
	expect(utest(`
if True:
	1
elif True:
	2
elif True:
	3
else:
	4
`)).toBe("4");
});

test('(1)', () => {
	expect(utest(`(1)`)).toBe("(1)");
});

test('(1,2)', () => {
	expect(utest(`(1,2)`)).toBe("puppy.newVec(1,2)");
});

test('while', () => {
	expect(utest(`
while True:
	1
`)).toBe("1");
});

test('keyup', () => {
	expect(utest(`
def __keyup__(key, time):
	print(key)
`)).toBe('puppy.print1(key)');
})

