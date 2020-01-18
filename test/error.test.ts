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

test('ERR 1+"1"', () => {
	expect(utest(`
1+"1"
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


