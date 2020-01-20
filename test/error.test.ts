import { utest } from '../src/lang/compiler';

// error

test('SyntaxError', () => {
	expect(utest(`
print('hi',
`)).toBe("SyntaxError");
});

test('UndefinedName', () => {
	expect(utest(`
x=x+1
`)).toBe("UndefinedName");
});

test('UndefinedName', () => {
	expect(utest(`
x+=1
`)).toBe("UndefinedName");
});

test('UndefinedFunctionName', () => {
	expect(utest(`
f()
`)).toBe("UndefinedFunction");
});

test('UnknownPackageName', () => {
	expect(utest(`
import numpy2
`)).toBe("UnknownPackageName");
});

test('Immutable', () => {
	expect(utest(`
print = 1
`)).toBe("Immutable");
});

test('ERR True+True', () => {
	expect(utest(`
True+True
`)).toBe("TypeError");
});

test('ERR "" * 3', () => {
	expect(utest(`
"" * 3
`)).toBe("TypeError");
});


test('ERR 1+"1"', () => {
	expect(utest(`
1+"1"
`)).toBe("BinaryTypeError");
});

test('ERR True*True', () => {
	expect(utest(`
True*True
`)).toBe("TypeError");
});

test('print()', () => {
	expect(utest(`
print()
`)).toBe('MissingArguments');
});

test('UndefinedMethod', () => {
	expect(utest(`
s = '';
s.startsWith_('hi');
`)).toBe("UndefinedMethod");
});


test('MissingArguments', () => {
	expect(utest(`
max();
`)).toBe("MissingArguments");
});

test('TooManyArguments', () => {
	expect(utest(`
max(1,2,width=0);
`)).toBe("TooManyArguments");
});

test('TooManyArguments', () => {
	expect(utest(`
max(1,2,3);
`)).toBe("TooManyArguments");
});

// test('Boolean?', () => {
// 	expect(utest(`
// a = 1
// if a = 1: pass
// `)).toBe("MissingArgument");
// });

// warning

test('UnknownName', () => {
	expect(utest(`
Circle(0, 0, hoge=1)
`)).toBe("UnknownName");
});

test('**', () => {
	expect(utest(`1*2**3+4`)).toBe("Transition");
});

test('BadAssign', () => {
	expect(utest(`
a = 1
if a = 1: pass
`)).toBe("BadAssign");
});

test('BadAssign', () => {
	expect(utest(`
a = 1
if a = 1 and a = 1: pass
`)).toBe("BadAssign");
});

test('RecoverS', () => {
	expect(utest(`
a = ([1, 2)
`)).toBe("RecoverS");
});

test('RecoverP', () => {
	expect(utest(`
a = [(1, 2]
`)).toBe("RecoverP");
});

test('１２３', () => {
	expect(utest(`
a = １２３
`)).toBe("Zenkaku");
});

test('１２３.４', () => {
	expect(utest(`
a = １２３.４
`)).toBe("Zenkaku");
});

test('””', () => {
	expect(utest(`
””
`)).toBe("Zenkaku");
});

test('"”', () => {
	expect(utest(`
"”
`)).toBe("Zenkaku");
});
