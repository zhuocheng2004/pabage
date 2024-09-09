
import { TokenType, tokenize } from '../src/tokenizer'


test('empty strings have no tokens', () => {
	const result = tokenize('');
	expect(result.err).toBeUndefined();
	expect(result.tokens).toEqual([]);
});

test('strings with only spaces/tabs/newlines have no tokens', () => {
	const texts = [
		' ', '  ', '   ', '          ',
		'\t', '\t\t', ' \t \t ',
		'\n', '\n\n', ' \n \r\n ', ' \t\n  \r\t \t  \n\n \r\n\n\r',
	];

	for (const text of texts) {
		const result = tokenize(text);
		expect(result.err).toBeUndefined();
		expect(result.tokens).toEqual([]);
	}
});

test('block/line comments have no tokens', () => {
	const texts = [
		'/**/', '/***/', '/*ABCDEFG123456*/', '/* 123 */', '/*\n\n*/', '/**\n *\n * TODO\n */',
		'//', '///', '////', '//ABC', '//TODO', '//1234',
		'/*//*/', '/*ABC//ABC\nABC*/', '/*ABC*/\n//123\n/*DEF*/', '//ABC\n//DEF\n', '//ABC/*\n/*DEF*///123'
	];

	for (const text of texts) {
		const result = tokenize(text);
		expect(result.err).toBeUndefined();
		expect(result.tokens).toEqual([]);
	}
});

test('identifier', () => {
	const samples = [
		[ ' a ', 1, [ 'a' ] ],  [ '_\n', 1, [ '_' ] ], [ '/*123*/abcd//ABC', 1, [ 'abcd' ] ],
		[ '\t  a123b\n', 1, [ 'a123b' ] ], [ '_ab12', 1, [ '_ab12' ] ], [ '__12ab', 1, [ '__12ab' ] ],
		[ 'Java_com_example_Main', 1, [ 'Java_com_example_Main' ] ],
		[ '_ZSt4copyIN4llvm11po_iteratorIPNS0_15MachineFunctionENS0_11SmallPtrSetIPNS0_17MachineBasicBlockELj8EEELb0ENS0_11GraphTraitsIS3_EEEESt20back_insert_iteratorISt6vectorIS6_SaIS6_EEEET0_T_SH_SG_', 
			1, [ '_ZSt4copyIN4llvm11po_iteratorIPNS0_15MachineFunctionENS0_11SmallPtrSetIPNS0_17MachineBasicBlockELj8EEELb0ENS0_11GraphTraitsIS3_EEEESt20back_insert_iteratorISt6vectorIS6_SaIS6_EEEET0_T_SH_SG_' ] ],
		[ ' A b _ ', 3, [ 'A', 'b', '_' ]],
		[ '/**/a b  c//ABC\nd\r\n', 4, [ 'a', 'b', 'c', 'd' ] ],
	];

	for (const sample of samples) {
		expect(sample[2].length).toBe(sample[1]);
		const result = tokenize(sample[0]);
		expect(result.err).toBeUndefined();
		const n = result.tokens.length;
		expect(n).toBe(sample[1]);
		for (let i = 0; i < n; i++) {
			const token = result.tokens[i];
			expect(token.type).toBe(TokenType.IDENTIFIER);
			expect(token.data).toBe(sample[2][i]);
		}
	}
});

test('number', () => {
	const samples = [
		[ '0', 1, [ 0 ] ], [ '1', 1, [ 1 ] ], [ '123', 1, [ 123 ] ], [ '123456789', 1, [ 123456789 ] ],
		[ '123.456', 1, [ 123.456 ] ], [ '789.', 1, [ 789.0 ] ], [ '.456', 1, [ 0.456 ] ],
		[ '123456789.98765', 1, [ 123456789.98765 ] ],
	];

	for (const sample of samples) {
		expect(sample[2].length).toBe(sample[1]);
		const result = tokenize(sample[0]);
		expect(result.err).toBeUndefined();
		const n = result.tokens.length;
		expect(n).toBe(sample[1]);
		for (let i = 0; i < n; i++) {
			const token = result.tokens[i];
			expect(token.type).toBe(TokenType.NUMBER);
			expect(token.data).toBe(sample[2][i]);
		}
	}
});

test('string', () => {
	const samples = [
		[ '""', 1, [ '' ] ], [ '" "', 1, [ ' ' ] ], [ '"ABC"', 1, [ 'ABC' ] ], 
		[ "''", 1, [ '' ] ], [ "' '", 1, [ ' ' ] ], [ "'ABC'", 1, [ 'ABC' ] ], 
		[ '"ABC\\n\\t123"', 1, [ 'ABC\n\t123' ] ], 
		[ '"//" \'/*\'', 2, [ '//', '/*' ] ],
	];

	for (const sample of samples) {
		expect(sample[2].length).toBe(sample[1]);
		const result = tokenize(sample[0]);
		expect(result.err).toBeUndefined();
		const n = result.tokens.length;
		expect(n).toBe(sample[1]);
		for (let i = 0; i < n; i++) {
			const token = result.tokens[i];
			expect(token.type).toBe(TokenType.STRING);
			expect(token.data).toBe(sample[2][i]);
		}
	}
});

test('dot', () => {
	const result = tokenize('a.b + 1.2');
	expect(result.err).toBeUndefined();
	const tokens = result.tokens;
	expect(tokens.length).toBe(5);
	expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
	expect(tokens[0].data).toBe('a');
	expect(tokens[1].type).toBe(TokenType.DOT);
	expect(tokens[2].type).toBe(TokenType.IDENTIFIER);
	expect(tokens[2].data).toBe('b');
	expect(tokens[3].type).toBe(TokenType.PLUS);
	expect(tokens[4].type).toBe(TokenType.NUMBER);
	expect(tokens[4].data).toBe(1.2);
});

test('misc', () => {
	const samples = [
		{
			text: '1 + (/*ABC*/2 - 3)//TODO',
			tokens: [
				{ type: TokenType.NUMBER, data: 1 },
				{ type: TokenType.PLUS },
				{ type: TokenType.LPAREN },
				{ type: TokenType.NUMBER, data: 2 },
				{ type: TokenType.MINUS },
				{ type: TokenType.NUMBER, data: 3 },
				{ type: TokenType.RPAREN },
			]
		},
		{
			text:	`
			/* demo function */
			fn add(x, y) {
				puts('Hello!\\n');	// print
				return x + y + 5.6;	// addition
			}
			`,
			tokens: [
				{ type: TokenType.IDENTIFIER, data: 'fn' },
				{ type: TokenType.IDENTIFIER, data: 'add' },
				{ type: TokenType.LPAREN },
				{ type: TokenType.IDENTIFIER, data: 'x' },
				{ type: TokenType.COMMA },
				{ type: TokenType.IDENTIFIER, data: 'y' },
				{ type: TokenType.RPAREN },
				{ type: TokenType.LBRACE },
				{ type: TokenType.IDENTIFIER, data: 'puts' },
				{ type: TokenType.LPAREN },
				{ type: TokenType.STRING, data: 'Hello!\n' },
				{ type: TokenType.RPAREN },
				{ type: TokenType.SEMICOLON },
				{ type: TokenType.IDENTIFIER, data: 'return' },
				{ type: TokenType.IDENTIFIER, data: 'x' },
				{ type: TokenType.PLUS },
				{ type: TokenType.IDENTIFIER, data: 'y' },
				{ type: TokenType.PLUS },
				{ type: TokenType.NUMBER, data: 5.6 },
				{ type: TokenType.SEMICOLON },
				{ type: TokenType.RBRACE },
			]
		}
	];

	for (const sample of samples) {
		const result = tokenize(sample.text);
		expect(result.err).toBeUndefined();
		const n = result.tokens.length;
		expect(n).toBe(sample.tokens.length);
		for (let i = 0; i < n; i++) {
			const token = result.tokens[i];
			const expected = sample.tokens[i];
			expect(token.type).toBe(expected.type);
			if (expected.data) {
				expect(token.data).toBe(expected.data);
			}
		}
	}
});
