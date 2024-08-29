
const evaluate = require('./calc').evaluate;

test('0 = 0', () => {
	expect(evaluate('0')).toBe(0);
});

test('12345 = 12345', () => {
	expect(evaluate('12345')).toBe(12345);
});

test('+12345 = 12345', () => {
	expect(evaluate('+12345')).toBe(12345);
});

test('-12345 = -12345', () => {
	expect(evaluate('-12345')).toBe(-12345);
});

test('+/*comment*/12345 = 12345', () => {
	expect(evaluate('+/*comment*/12345')).toBe(12345);
});

test('((((1))/*ABC*/)) = 1', () => {
	expect(evaluate('((((1))/*ABC*/))')).toBe(1);
});

test('1+1 = 2', () => {
	expect(evaluate('1+1')).toBe(2);
});

test('1+2+3 = 6', () => {
	expect(evaluate('1+2+3')).toBe(6);
});

test('1+2+3+4 = 10', () => {
	expect(evaluate('1+2+3+4')).toBe(10);
});

test('1+2+3+4+5 = 15', () => {
	expect(evaluate('1+2+3+4+5')).toBe(15);
});

test('1-2+3-4 = -2', () => {
	expect(evaluate('1-2+3-4')).toBe(-2);
});

test('1-(2+3) = -4', () => {
	expect(evaluate('1-(2+3)')).toBe(-4);
});

test('1-(2+(3-(1+1)+2)-2) = -2', () => {
	expect(evaluate('1-(2+(3-(1+1)+2)-2) ')).toBe(-2);
});

test('2*3 + 5 = 11', () => {
	expect(evaluate('2*3 + 5')).toBe(11);
});

test('2 + 3*5 = 17', () => {
	expect(evaluate('2 + 3*5')).toBe(17);
});

test('2^0 = 1', () => {
	expect(evaluate('2^0')).toBe(1);
});

test('2^1 = 2', () => {
	expect(evaluate('2^1')).toBe(2);
});

test('2^-1 = 0.5', () => {
	expect(evaluate('2^-1')).toBe(0.5);
});

test('e^0 ~= 1', () => {
	expect(evaluate('e^0')).toBeCloseTo(1);
});

test('e^1 ~= e', () => {
	expect(evaluate('e^1')).toBeCloseTo(Math.E);
});

test('exp(0) ~= 1', () => {
	expect(evaluate('exp(0)')).toBeCloseTo(1);
});

test('exp(1) ~= e', () => {
	expect(evaluate('exp(1)')).toBeCloseTo(Math.E);
});

test('exp(2) ~= e^2', () => {
	expect(evaluate('exp(2)')).toBeCloseTo(Math.E * Math.E);
});

test('exp(1 - 4 / 2) ~= 1/e', () => {
	expect(evaluate('exp(1 - 4 / 2)')).toBeCloseTo(1 / Math.E);
});

test('cos(-1 + 1) ~= 1', () => {
	expect(evaluate('cos(-1 + 1)')).toBeCloseTo(1);
});

test('cos(1)^2 + sin(1)^2 ~= 1', () => {
	expect(evaluate('cos(1)^2 + sin(1)^2')).toBeCloseTo(1);
});

test('a = 1.234, b = cos(a), c = sin(a), d = b^2 + c^2 ~= 1', () => {
	expect(evaluate('a = 1.234, b = cos(a), c = sin(a), d = b^2 + c^2')).toBeCloseTo(1);
});
